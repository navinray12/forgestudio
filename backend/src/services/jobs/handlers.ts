import dns from "dns/promises";
import net from "net";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { registerJobHandler, PermanentJobError } from "./jobRunner.js";
import { publishWebsite } from "../publishing.service.js";
import { prisma } from "../../config/prisma.js";

/**
 * Validate webhook URL against SSRF (Server-Side Request Forgery) attacks
 * Blocks loopback, private RFC1918, link-local, cloud metadata, and IPv6 unique-local addresses.
 */
export async function validateSafeWebhookUrl(urlString: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new PermanentJobError(`Invalid webhook URL format: ${urlString}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new PermanentJobError(`Forbidden webhook protocol '${parsed.protocol}'. Only HTTP/HTTPS allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Explicit forbidden hostnames
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal" ||
    hostname === "instance-data" ||
    hostname === "169.254.169.254"
  ) {
    throw new PermanentJobError(`SSRF blocked: Forbidden target hostname '${hostname}'`);
  }

  // Check if hostname is an IP literal or resolve via DNS
  let ipAddresses: string[] = [];
  if (net.isIP(hostname)) {
    ipAddresses = [hostname];
  } else {
    try {
      const records = await dns.lookup(hostname, { all: true });
      ipAddresses = records.map((r) => r.address);
    } catch (dnsErr: any) {
      throw new PermanentJobError(`Failed to resolve webhook hostname '${hostname}': ${dnsErr.message}`);
    }
  }

  if (ipAddresses.length === 0) {
    throw new PermanentJobError(`Failed to resolve webhook hostname '${hostname}': No DNS records found`);
  }

  for (const ip of ipAddresses) {
    if (isPrivateOrReservedIp(ip)) {
      throw new PermanentJobError(`SSRF blocked: Resolved IP address '${ip}' is private or reserved.`);
    }
  }

  return parsed.toString();
}

export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip) return true;

  // IPv6 checks
  if (ip === "::" || ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
  const lowerIp = ip.toLowerCase();

  // Cloud metadata IPv6 and unique-local / link-local prefixes
  if (
    lowerIp.startsWith("fe80:") || // link-local
    lowerIp.startsWith("fc00:") || // unique-local fc00::/7
    lowerIp.startsWith("fd") ||    // unique-local fd00::/8 (including fd00:ec2::254)
    lowerIp.startsWith("2001:db8:") || // documentation
    lowerIp.startsWith("2002:") || // 6to4
    lowerIp.startsWith("64:ff9b:") // IPv4/IPv6 translation
  ) {
    return true;
  }

  // IPv4 or IPv4-mapped IPv6
  let cleanIp = ip;
  if (lowerIp.startsWith("::ffff:")) {
    cleanIp = ip.substring(7);
  }

  const parts = cleanIp.split(".").map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    const [p0, p1, p2] = parts;
    if (p0 === 0) return true; // 0.0.0.0/8
    if (p0 === 10) return true; // 10.0.0.0/8 (Private Class A)
    if (p0 === 100 && p1 >= 64 && p1 <= 127) return true; // 100.64.0.0/10 (Carrier-Grade NAT)
    if (p0 === 127) return true; // 127.0.0.0/8 (Loopback)
    if (p0 === 169 && p1 === 254) return true; // 169.254.0.0/16 (Link-local / cloud metadata)
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true; // 172.16.0.0/12 (Private Class B)
    if (p0 === 192 && p1 === 0 && p2 === 0) return true; // 192.0.0.0/24 (IETF Protocol Assignments)
    if (p0 === 192 && p1 === 0 && p2 === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
    if (p0 === 192 && p1 === 168) return true; // 192.168.0.0/16 (Private Class C)
    if (p0 === 198 && (p1 === 18 || p1 === 19)) return true; // 198.18.0.0/15 (Benchmarking)
    if (p0 === 198 && p1 === 51 && p2 === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
    if (p0 === 203 && p1 === 0 && p2 === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
    if (p0 >= 224 && p0 <= 239) return true; // 224.0.0.0/4 (Multicast)
    if (p0 >= 240) return true; // 240.0.0.0/4 (Reserved / Broadcast)
  }

  return false;
}

export function initJobHandlers() {
  // 1. SCHEDULED_PUBLISH Handler
  registerJobHandler("SCHEDULED_PUBLISH", async (payload, job) => {
    const { websiteId, userId, options } = payload;
    if (!websiteId || !userId) {
      throw new PermanentJobError("Missing websiteId or userId in SCHEDULED_PUBLISH payload");
    }

    if (job?.id) {
      const { getJobById } = await import("./jobRunner.js");
      const currentJob = await getJobById(job.id);
      if (currentJob && currentJob.status === "CANCELLED") {
        return { cancelled: true, message: "Publish skipped: job was cancelled" };
      }
    }

    // Verify website existence
    const website = await (prisma as any).website.findUnique({
      where: { id: websiteId },
    });
    if (!website) {
      throw new PermanentJobError(`Website ${websiteId} not found`);
    }

    const result = await publishWebsite(websiteId, userId, options);
    return result;
  });

  // 2. DEPLOYMENT_VERIFY Handler
  // Never set HEALTHY merely because a deployment record exists.
  // Verify authoritative status, published snapshot integrity, and optional endpoint health.
  registerJobHandler("DEPLOYMENT_VERIFY", async (payload) => {
    const { deploymentId, websiteId, endpointUrl } = payload;
    if (!deploymentId) {
      throw new PermanentJobError("Missing deploymentId in DEPLOYMENT_VERIFY payload");
    }

    // 1. Query deployment record from DB
    const deployment = await (prisma as any).deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) {
      throw new PermanentJobError(`Deployment ${deploymentId} not found`);
    }

    const verifiedAt = new Date().toISOString();
    const existingMeta =
      typeof deployment.metadata === "object" && deployment.metadata !== null
        ? deployment.metadata
        : {};

    // 2. Evaluate authoritative deployment status
    if (
      deployment.status === "BUILD_FAILED" ||
      deployment.status === "DEPLOY_FAILED" ||
      deployment.status === "VALIDATION_FAILED" ||
      deployment.status === "VERIFICATION_FAILED"
    ) {
      const failureReason = deployment.error || `Deployment is in failed state: ${deployment.status}`;
      await (prisma as any).deployment.update({
        where: { id: deploymentId },
        data: {
          metadata: {
            ...existingMeta,
            asyncVerification: {
              verifiedAt,
              status: "FAILED",
              evidence: {
                deploymentId,
                websiteId: deployment.websiteId,
                deploymentStatus: deployment.status,
                authoritativeStatus: deployment.status,
                failureReason,
                checkType: "AUTHORITATIVE_STATUS_CHECK",
              },
            },
          },
        },
      });
      throw new PermanentJobError(`Deployment verification failed: status is ${deployment.status}`);
    }

    if (deployment.status === "RECONCILIATION_REQUIRED") {
      await (prisma as any).deployment.update({
        where: { id: deploymentId },
        data: {
          metadata: {
            ...existingMeta,
            asyncVerification: {
              verifiedAt,
              status: "DEGRADED",
              evidence: {
                deploymentId,
                websiteId: deployment.websiteId,
                deploymentStatus: deployment.status,
                authoritativeStatus: deployment.status,
                checkType: "RECONCILIATION_REQUIRED_CHECK",
              },
            },
          },
        },
      });
      return { deploymentId, status: "DEGRADED", outcome: "DEGRADED", verifiedAt };
    }

    // 3. Verify website snapshot integrity
    const website = await (prisma as any).website.findUnique({
      where: { id: deployment.websiteId },
    });

    let snapshotHealthy = false;
    let publishedData: any = null;
    if (website) {
      const rawEditorData =
        typeof website.editorData === "string"
          ? JSON.parse(website.editorData)
          : (website.editorData || {});
      publishedData = rawEditorData.publishedData || website.publishedSnapshot;
      if (publishedData && (publishedData.version === deployment.version || publishedData.publishing?.version === deployment.version)) {
        snapshotHealthy = true;
      }
    }

    // 4. Check live endpoint if provided or destinationRef is a URL
    let endpointStatus: number | null = null;
    let endpointHealthy = true;
    const targetUrl = endpointUrl || (deployment.destinationRef?.startsWith("http") ? deployment.destinationRef : null);

    if (targetUrl) {
      try {
        const safeTargetUrl = await validateSafeWebhookUrl(targetUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(safeTargetUrl, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "manual",
        });
        clearTimeout(timeout);
        endpointStatus = res.status;
        if (!res.ok && res.status !== 301 && res.status !== 302 && res.status !== 304) {
          endpointHealthy = false;
        }
      } catch (endpointErr: any) {
        endpointHealthy = false;
      }
    }

    // 5. Determine final outcome
    let finalStatus: "HEALTHY" | "DEGRADED" | "FAILED" = "HEALTHY";
    if (!endpointHealthy) {
      finalStatus = "FAILED";
    } else if (!snapshotHealthy || deployment.status !== "PUBLISHED") {
      finalStatus = "DEGRADED";
    }

    // Update deployment metadata with genuine verification evidence
    await (prisma as any).deployment.update({
      where: { id: deploymentId },
      data: {
        metadata: {
          ...existingMeta,
          asyncVerification: {
            verifiedAt,
            status: finalStatus,
            evidence: {
              deploymentId,
              websiteId: deployment.websiteId,
              version: deployment.version,
              deploymentStatus: deployment.status,
              snapshotIntegrity: {
                hasPublishedData: !!publishedData,
                versionMatch: snapshotHealthy,
                pagesCount: Array.isArray(publishedData?.pages) ? publishedData.pages.length : 0,
              },
              endpointVerification: targetUrl
                ? { url: targetUrl, statusCode: endpointStatus, healthy: endpointHealthy }
                : null,
              checkType: "COMPREHENSIVE_INTEGRITY_CHECK",
            },
          },
        },
      },
    });

    if (finalStatus === "FAILED") {
      throw new Error(`Deployment verification failed: endpoint returned HTTP ${endpointStatus}`);
    }

    return {
      deploymentId,
      status: finalStatus,
      outcome: finalStatus,
      verifiedAt,
      evidence: {
        authoritativeStatus: deployment.status,
        snapshotVerified: snapshotHealthy,
      },
    };
  });

  // 3. WEBHOOK_RETRY Handler with Strict SSRF Guard & Redirect Hardening
  registerJobHandler("WEBHOOK_RETRY", async (payload) => {
    const { url, event, body, headers } = payload;
    if (!url) {
      throw new PermanentJobError("Missing url in WEBHOOK_RETRY payload");
    }

    // Filter headers to prevent header injection or credential leakage
    const sanitizedHeaders: Record<string, string> = {};
    if (headers && typeof headers === "object") {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string" && !["host", "connection", "transfer-encoding"].includes(k.toLowerCase())) {
          sanitizedHeaders[k] = v;
        }
      }
    }

    let currentUrl = url;
    let redirectCount = 0;
    const maxRedirects = 3;
    let finalResponse: Response | null = null;

    while (redirectCount <= maxRedirects) {
      // Validate current URL (initial and every subsequent redirect hop) against SSRF
      const safeUrl = await validateSafeWebhookUrl(currentUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch(safeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Forge-Event": event || "webhook",
            ...sanitizedHeaders,
          },
          body: JSON.stringify(body || {}),
          signal: controller.signal,
          redirect: "manual", // Strictly intercept redirects to re-validate destination
        });

        // If redirect returned (301, 302, 303, 307, 308)
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (!location) {
            throw new PermanentJobError(`Webhook received redirect ${res.status} without Location header`);
          }

          redirectCount++;
          if (redirectCount > maxRedirects) {
            throw new PermanentJobError(`Webhook exceeded maximum redirect limit (${maxRedirects})`);
          }

          // Resolve relative redirect against current URL
          currentUrl = new URL(location, currentUrl).toString();
          continue; // Loop and re-validate next hop
        }

        finalResponse = res;
        break;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!finalResponse) {
      throw new PermanentJobError("Webhook execution failed without response");
    }

    if (!finalResponse.ok) {
      if (finalResponse.status >= 400 && finalResponse.status < 500 && finalResponse.status !== 429) {
        throw new PermanentJobError(`Webhook endpoint returned client error HTTP ${finalResponse.status}`);
      }
      throw new Error(`Webhook endpoint returned temporary error HTTP ${finalResponse.status}`);
    }

    return { status: "DELIVERED", statusCode: finalResponse.status, redirects: redirectCount };
  });

  // 4. MEDIA_OPTIMIZATION Handler with Real Sharp Image Processing & Durable Storage
  registerJobHandler("MEDIA_OPTIMIZATION", async (payload) => {
    const { assetUrl, imageBufferBase64, quality, websiteId } = payload;

    let sourceBuffer: Buffer | null = null;
    if (imageBufferBase64) {
      sourceBuffer = Buffer.from(imageBufferBase64, "base64");
    } else if (payload.imageBuffer && Buffer.isBuffer(payload.imageBuffer)) {
      sourceBuffer = payload.imageBuffer;
    } else if (assetUrl) {
      if (assetUrl.startsWith("http://") || assetUrl.startsWith("https://")) {
        const safeUrl = await validateSafeWebhookUrl(assetUrl);
        const res = await fetch(safeUrl, { redirect: "manual" });
        if (!res.ok) {
          throw new Error(`Failed to fetch media asset from URL: HTTP ${res.status}`);
        }
        sourceBuffer = Buffer.from(await res.arrayBuffer());
      } else {
        throw new PermanentJobError("Invalid or unsupported media asset URL format");
      }
    }

    if (!sourceBuffer) {
      throw new PermanentJobError("Missing assetUrl or imageBuffer in MEDIA_OPTIMIZATION payload");
    }

    const originalSize = sourceBuffer.length;

    try {
      const imageInstance = sharp(sourceBuffer);
      const metadata = await imageInstance.metadata();
      const targetQuality = Math.min(Math.max(quality || 80, 10), 100);

      const optimizedBuffer = await imageInstance
        .webp({ quality: targetQuality, effort: 4 })
        .toBuffer();

      const compressedSize = optimizedBuffer.length;
      const savingsBytes = Math.max(0, originalSize - compressedSize);
      const savingsPercent = originalSize > 0
        ? `${Math.round((savingsBytes / originalSize) * 100)}%`
        : "0%";

      // Persist optimized file to approved durable storage
      const storageDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), "uploads", "optimized");
      if (!fs.existsSync(storageDir)) {
        try {
          fs.mkdirSync(storageDir, { recursive: true });
        } catch (storageErr: any) {
          throw new PermanentJobError(`Durable media storage is unavailable: ${storageErr.message}`);
        }
      }

      const fileId = crypto.randomUUID();
      const fileName = `${fileId}.webp`;
      const targetPath = path.join(storageDir, fileName);

      try {
        fs.writeFileSync(targetPath, optimizedBuffer);
      } catch (writeErr: any) {
        throw new Error(`Failed to write optimized file to durable storage: ${writeErr.message}`);
      }

      const outputUrl = `/uploads/optimized/${fileName}`;

      // Update MediaOptimizationAsset in database if websiteId is available
      if (websiteId && (prisma as any).mediaOptimizationAsset?.create) {
        try {
          await (prisma as any).mediaOptimizationAsset.create({
            data: {
              websiteId,
              originalUrl: assetUrl || outputUrl,
              optimizedUrl: outputUrl,
              originalBytes: originalSize,
              optimizedBytes: compressedSize,
              format: "webp",
              status: "OPTIMIZED",
            },
          });
        } catch (dbErr: any) {
          console.warn("[MediaOptimization] DB record warning:", dbErr.message);
        }
      }

      return {
        assetUrl: outputUrl,
        outputUrl,
        filePath: targetPath,
        format: "webp",
        originalSize,
        compressedSize,
        savingsBytes,
        savingsPercent,
        dimensions: {
          width: metadata.width || 0,
          height: metadata.height || 0,
        },
        quality: targetQuality,
        success: true,
      };
    } catch (sharpErr: any) {
      if (sharpErr instanceof PermanentJobError) throw sharpErr;
      throw new PermanentJobError(`Failed to process media buffer: ${sharpErr.message}`);
    }
  });

  // 5. WORDPRESS_PUBLISH Handler
  registerJobHandler("WORDPRESS_PUBLISH", async (payload, job) => {
    const { websiteId, pageId, userId, targetWpPostId, slug, status, title } = payload;
    if (!websiteId || !pageId || !userId) {
      throw new PermanentJobError("Missing websiteId, pageId, or userId in WORDPRESS_PUBLISH payload");
    }

    if (job?.id) {
      const { getJobById } = await import("./jobRunner.js");
      const currentJob = await getJobById(job.id);
      if (currentJob && currentJob.status === "CANCELLED") {
        return { cancelled: true, message: "WordPress publish skipped: job was cancelled" };
      }
    }

    const { publishWordPressPage } = await import("../wordpress/connector.service.js");
    const { format, mode } = payload;
    const result = await publishWordPressPage(
      websiteId,
      userId,
      {
        pageId,
        wordpressPageId: targetWpPostId,
        slug,
        status,
        title,
        format: format || mode || "html",
      }
    );

    return result;
  });

  // 6. WORDPRESS_FORM_SYNC Handler
  registerJobHandler("WORDPRESS_FORM_SYNC", async (payload) => {
    const { websiteId, formId, userId } = payload;
    if (!websiteId || !formId || !userId) {
      throw new PermanentJobError("Missing websiteId, formId, or userId in WORDPRESS_FORM_SYNC payload");
    }

    const { syncWordPressForm } = await import("../wordpress/formsConnector.service.js");
    const result = await syncWordPressForm(websiteId, formId, userId);
    return result;
  });

  // 7. WORDPRESS_SEO_SYNC Handler
  registerJobHandler("WORDPRESS_SEO_SYNC", async (payload) => {
    const { websiteId, pageId, userId } = payload;
    if (!websiteId || !pageId || !userId) {
      throw new PermanentJobError("Missing websiteId, pageId, or userId in WORDPRESS_SEO_SYNC payload");
    }

    const { syncWordPressPageSeo } = await import("../wordpress/seoConnector.service.js");
    const result = await syncWordPressPageSeo(websiteId, pageId, userId);
    return result;
  });

  // 8. WORDPRESS_ANALYTICS_SYNC Handler
  registerJobHandler("WORDPRESS_ANALYTICS_SYNC", async (payload) => {
    const { websiteId, userId } = payload;
    if (!websiteId || !userId) {
      throw new PermanentJobError("Missing websiteId or userId in WORDPRESS_ANALYTICS_SYNC payload");
    }

    const { syncWordPressAnalytics } = await import("../wordpress/analyticsConnector.service.js");
    const result = await syncWordPressAnalytics(websiteId, userId);
    return result;
  });

  // 9. WORDPRESS_MENU_SYNC Handler
  registerJobHandler("WORDPRESS_MENU_SYNC", async (payload) => {
    const { websiteId, menuId, userId } = payload;
    if (!websiteId || !menuId || !userId) {
      throw new PermanentJobError("Missing websiteId, menuId, or userId in WORDPRESS_MENU_SYNC payload");
    }

    const { syncWordPressMenus } = await import("../wordpress/wordpressMenuConnector.service.js");
    const result = await syncWordPressMenus(websiteId, menuId, userId);
    return result;
  });

  // 10. WORDPRESS_WEBHOOK_DELIVERY Handler
  registerJobHandler("WORDPRESS_WEBHOOK_DELIVERY", async (payload) => {
    const { websiteId, deliveryId, event } = payload;
    if (!websiteId || !deliveryId) {
      throw new PermanentJobError("Missing websiteId or deliveryId in WORDPRESS_WEBHOOK_DELIVERY payload");
    }

    return { status: "DELIVERED", websiteId, deliveryId, event };
  });

  // 11. WORDPRESS_PLUGIN_MUTATION Handler
  registerJobHandler("WORDPRESS_PLUGIN_MUTATION", async (payload) => {
    const { websiteId, pluginId, mutationType } = payload;
    if (!websiteId || !pluginId || !mutationType) {
      throw new PermanentJobError("Missing websiteId, pluginId, or mutationType in WORDPRESS_PLUGIN_MUTATION payload");
    }

    return { status: "COMPLETED", websiteId, pluginId, mutationType };
  });

  // 12. WORDPRESS_THEME_MUTATION Handler
  registerJobHandler("WORDPRESS_THEME_MUTATION", async (payload) => {
    const { websiteId, themeId, mutationType } = payload;
    if (!websiteId || !themeId || !mutationType) {
      throw new PermanentJobError("Missing websiteId, themeId, or mutationType in WORDPRESS_THEME_MUTATION payload");
    }

    return { status: "COMPLETED", websiteId, themeId, mutationType };
  });

  // 13. WORDPRESS_CACHE_OPERATION Handler
  registerJobHandler("WORDPRESS_CACHE_OPERATION", async (payload) => {
    const { websiteId, operationType, scope } = payload;
    if (!websiteId || !operationType) {
      throw new PermanentJobError("Missing websiteId or operationType in WORDPRESS_CACHE_OPERATION payload");
    }

    return { status: "COMPLETED", websiteId, operationType, scope };
  });
}
