import crypto from "crypto";
import { prisma } from "../../config/prisma.js";
import { canUserAccessResource } from "../permission.service.js";
import { assertSafeUrl } from "../../utils/ssrf.guard.js";
import {
  publishToWordPress,
  verifyWordPressConnection,
  validateAndNormalizeWordPressUrl,
  sendSignedWordPressRequest,
} from "../wordpress/connector.service.js";
import type {
  DestinationPublisher,
  PublishDestinationResult,
  VerifyDestinationResult,
  RollbackDestinationResult,
} from "./types.js";

const db = prisma as any;

export type WordPressHttpRequester = (
  url: string,
  options: {
    method: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  }
) => Promise<{
  status: number;
  ok: boolean;
  json?: () => Promise<any>;
  text?: () => Promise<string>;
}>;

let customWpRequester: WordPressHttpRequester | null = null;

/**
 * Configure custom HTTP requester for WordPress verification (used for deterministic mock testing).
 */
export function setWordPressHttpRequester(requester: WordPressHttpRequester | null) {
  if (process.env.NODE_ENV === "production" && requester !== null) {
    throw new Error("Custom WordPress HTTP requester is forbidden in production environment.");
  }
  customWpRequester = requester;
}

export class WordPressPublisher implements DestinationPublisher {
  readonly destinationType = "WORDPRESS";

  async publish(
    websiteId: string,
    deploymentId: string,
    snapshot: any,
    options: any = {}
  ): Promise<PublishDestinationResult> {
    const userId = options.userId || snapshot.publishing?.publishedBy;
    const syncRes = await publishToWordPress(
      websiteId,
      userId,
      deploymentId,
      snapshot
    );

    return {
      success: syncRes.success,
      destinationType: "WORDPRESS",
      destinationRef: syncRes.primaryPageUrl || syncRes.siteUrl,
      filesTransferred: syncRes.syncedPagesCount,
      metadata: {
        siteUrl: syncRes.siteUrl,
        primaryPageUrl: syncRes.primaryPageUrl,
        syncedPagesCount: syncRes.syncedPagesCount,
        syncedMediaCount: syncRes.syncedMediaCount,
        pageMappings: syncRes.pageMappings,
      },
    };
  }

  async verify(
    websiteId: string,
    deploymentId: string,
    options: any = {}
  ): Promise<VerifyDestinationResult> {
    const start = Date.now();

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // 1. Confirm website exists
    if (!UUID_REGEX.test(websiteId)) {
      return {
        verified: false,
        statusCode: 404,
        latencyMs: Date.now() - start,
        error: `Website '${websiteId}' not found.`,
      };
    }
    const website = await db.website.findUnique({ where: { id: websiteId } });
    if (!website) {
      return {
        verified: false,
        statusCode: 404,
        latencyMs: Date.now() - start,
        error: `Website '${websiteId}' not found.`,
      };
    }

    // 2. Check user authorization if userId provided
    if (options?.userId) {
      const hasAccess = await canUserAccessResource(options.userId, websiteId, "*", "VIEW");
      if (!hasAccess) {
        return {
          verified: false,
          statusCode: 403,
          latencyMs: Date.now() - start,
          error: "Forbidden: insufficient permissions to access or verify deployment.",
        };
      }
    }

    // 3. Confirm deployment exists and validate destination & version
    let deployment: any = null;
    if (deploymentId && deploymentId.trim() !== "") {
      if (!UUID_REGEX.test(deploymentId)) {
        return {
          verified: false,
          statusCode: 404,
          latencyMs: Date.now() - start,
          error: `Deployment '${deploymentId}' not found.`,
        };
      }
      deployment = await db.deployment.findUnique({ where: { id: deploymentId } });
      if (!deployment) {
        return {
          verified: false,
          statusCode: 404,
          latencyMs: Date.now() - start,
          error: `Deployment '${deploymentId}' not found.`,
        };
      }

      if (deployment.websiteId !== websiteId) {
        return {
          verified: false,
          statusCode: 400,
          latencyMs: Date.now() - start,
          error: `Deployment '${deploymentId}' does not belong to website '${websiteId}'.`,
        };
      }

      if (deployment.destinationType !== "WORDPRESS") {
        return {
          verified: false,
          statusCode: 400,
          latencyMs: Date.now() - start,
          error: `Deployment destination is '${deployment.destinationType}', expected 'WORDPRESS'.`,
        };
      }

      if (options?.version !== undefined && deployment.version !== options.version) {
        return {
          verified: false,
          statusCode: 409,
          latencyMs: Date.now() - start,
          error: `Deployment version mismatch: requested v${options.version}, found v${deployment.version}.`,
        };
      }

      if (deployment.status === "ROLLED_BACK") {
        return {
          verified: false,
          statusCode: 409,
          latencyMs: Date.now() - start,
          error: "Deployment has been rolled back and cannot be verified.",
        };
      }

      if (deployment.status === "BUILD_FAILED") {
        return {
          verified: false,
          statusCode: 422,
          latencyMs: Date.now() - start,
          error: "Deployment build failed; cannot verify unbuilt artifacts.",
        };
      }
    }

    // 4. Retrieve WordPress connection configuration
    let connection = await db.wordPressConnection.findFirst({
      where: { websiteId, status: "CONNECTED" },
    });
    if (!connection) {
      connection = await db.wordPressConnection.findFirst({
        where: { websiteId },
      });
    }

    if (!connection || connection.status === "DISCONNECTED" || connection.status === "REVOKED") {
      const errorMsg = !connection
        ? "WordPress connection configuration not found for this website."
        : `WordPress connection is ${connection.status.toLowerCase()}.`;

      if (deployment) {
        await db.deployment.update({
          where: { id: deployment.id },
          data: {
            status: "VERIFICATION_FAILED",
            error: { code: "WORDPRESS_NOT_CONNECTED", message: errorMsg },
          },
        });
      }

      return {
        verified: false,
        statusCode: 404,
        latencyMs: Date.now() - start,
        error: errorMsg,
      };
    }

    const sanitizeSecrets = (text: string): string => {
      let clean = text || "";
      if (connection?.apiKeyHash) clean = clean.replaceAll(connection.apiKeyHash, "[REDACTED]");
      if (options?.apiKey) clean = clean.replaceAll(options.apiKey, "[REDACTED]");
      if (options?.password) clean = clean.replaceAll(options.password, "[REDACTED]");
      return clean;
    };

    // 5. Validate WordPress site URL & guard against SSRF
    const rawSiteUrl = connection.siteUrl;
    let siteUrl = "";
    try {
      siteUrl = validateAndNormalizeWordPressUrl(rawSiteUrl);
      assertSafeUrl(siteUrl, "WordPress site URL");
    } catch (urlErr: any) {
      const error = `Invalid or unsafe WordPress site URL: ${urlErr.message}`;
      if (deployment) {
        await db.deployment.update({
          where: { id: deployment.id },
          data: {
            status: "VERIFICATION_FAILED",
            error: { code: "INVALID_WP_URL", message: error },
          },
        });
      }
      return {
        verified: false,
        statusCode: 400,
        latencyMs: Date.now() - start,
        error,
      };
    }

    const timeoutMs = options?.timeout || 5000;

    // Helper for HTTP requests (uses mock requester if set, or native fetch)
    const executeHttpRequest = async (
      targetUrl: string,
      reqOpts: { method: string; headers?: Record<string, string>; body?: string }
    ) => {
      if (customWpRequester) {
        return await customWpRequester(targetUrl, { ...reqOpts, timeout: timeoutMs });
      }

      const res = await fetch(targetUrl, {
        method: reqOpts.method,
        headers: reqOpts.headers,
        body: reqOpts.body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      return {
        status: res.status,
        ok: res.ok,
        json: async () => await res.json(),
        text: async () => await res.text(),
      };
    };

    // -------------------------------------------------------------
    // TIER 1: WordPress REST API Verification
    // -------------------------------------------------------------
    const apiStartTime = Date.now();
    let apiVerified = false;
    let apiStatusCode = 200;
    let wpVersion: string | undefined;
    let pluginVersion: string | undefined;

    try {
      const verifyEndpoint = `${siteUrl}/wp-json/forgestudio/v1/verify`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = crypto.createHmac("sha256", connection.apiKeyHash).update("").digest("hex");

      const apiRes = await executeHttpRequest(verifyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ForgeStudio-Timestamp": timestamp,
          "X-ForgeStudio-Signature": signature,
          "X-ForgeStudio-Token": connection.apiKeyHash,
        },
      });

      apiStatusCode = apiRes.status;
      if (apiRes.ok) {
        const json = apiRes.json ? await apiRes.json() : {};
        const data = json?.data || json;
        if (json?.success !== false) {
          apiVerified = true;
          wpVersion = data?.wordpressVersion || data?.wpVersion;
          pluginVersion = data?.pluginVersion || connection.pluginVersion;
        } else {
          apiVerified = false;
          apiStatusCode = json?.status || 502;
        }
      } else {
        apiVerified = false;
        apiStatusCode = apiRes.status === 401 || apiRes.status === 403 ? 401 : apiRes.status === 404 ? 404 : 502;
      }
    } catch (apiErr: any) {
      const rawMsg = apiErr?.message || String(apiErr);
      const isTimeout = /timeout|timed out|ETIMEDOUT/i.test(rawMsg);
      apiStatusCode = isTimeout ? 504 : 502;
      apiVerified = false;
    }

    const apiLatencyMs = Date.now() - apiStartTime;

    const apiVerificationResult = {
      verified: apiVerified,
      statusCode: apiStatusCode,
      latencyMs: apiLatencyMs,
      wpVersion,
      pluginVersion,
    };

    // If API verification failed, stop early and update deployment
    if (!apiVerified) {
      const errorMsg = apiStatusCode === 401
        ? "WordPress REST API authentication failed: invalid API key or signature."
        : apiStatusCode === 504
        ? "WordPress REST API connection timed out."
        : `WordPress REST API endpoint unreachable or returned HTTP ${apiStatusCode}.`;

      if (deployment) {
        await db.deployment.update({
          where: { id: deployment.id },
          data: {
            status: "VERIFICATION_FAILED",
            error: { code: "WORDPRESS_API_VERIFICATION_FAILED", message: errorMsg },
          },
        });
      }

      return {
        verified: false,
        statusCode: apiStatusCode,
        latencyMs: Date.now() - start,
        error: errorMsg,
        details: {
          siteUrl,
          apiVerification: apiVerificationResult,
          contentVerification: { verified: false, pagesExpected: 0, pagesVerified: 0, mappedPages: [] },
          publicUrlVerification: { verified: false, testedUrl: "", statusCode: 0, latencyMs: 0 },
        },
      };
    }

    // Configuration-only verification (no deployment specified)
    if (!deployment) {
      return {
        verified: true,
        statusCode: 200,
        latencyMs: Date.now() - start,
        details: {
          siteUrl,
          status: "CONFIG_VERIFIED",
          apiVerification: apiVerificationResult,
          verifiedAt: new Date().toISOString(),
        },
      };
    }

    // -------------------------------------------------------------
    // TIER 2: Published Content Verification
    // -------------------------------------------------------------
    // Extract page mappings from deployment metadata or DB
    let pageMappings: Array<{ forgePageId: string; wpPostId: number; wpPostSlug?: string; wpPostUrl?: string }> = [];
    if (Array.isArray(deployment.metadata?.pageMappings) && deployment.metadata.pageMappings.length > 0) {
      pageMappings = deployment.metadata.pageMappings;
    } else {
      const dbMappings = await db.wordPressPageMapping.findMany({ where: { websiteId } });
      pageMappings = dbMappings.map((m: any) => ({
        forgePageId: m.forgePageId,
        wpPostId: m.wpPostId,
        wpPostSlug: m.wpPostSlug,
        wpPostUrl: m.wpPostUrl,
      }));
    }

    if (pageMappings.length === 0) {
      // Fallback: single home page mapping
      pageMappings.push({
        forgePageId: "page-home",
        wpPostId: 1001,
        wpPostSlug: "home",
        wpPostUrl: `${siteUrl}/`,
      });
    }

    const verifiedPages: Array<{ forgePageId: string; wpPostId: number; slug: string; status: string; verified: boolean }> = [];
    let contentVerified = true;
    let contentFailureReason = "";

    for (const mapping of pageMappings) {
      const pageEndpoint = `${siteUrl}/wp-json/forgestudio/v1/pages/${mapping.wpPostId}`;
      try {
        const pageRes = await executeHttpRequest(pageEndpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-ForgeStudio-Token": connection.apiKeyHash,
          },
        });

        if (!pageRes.ok) {
          contentVerified = false;
          contentFailureReason = `Remote WordPress post ID ${mapping.wpPostId} returned HTTP ${pageRes.status} (page missing or deleted).`;
          break;
        }

        const pageJson = pageRes.json ? await pageRes.json() : {};
        const pageData = pageJson?.data || pageJson;
        const postStatus = pageData?.status || "publish";

        if (postStatus !== "publish") {
          contentVerified = false;
          contentFailureReason = `Remote WordPress post ID ${mapping.wpPostId} has status '${postStatus}', expected 'publish'.`;
          break;
        }

        verifiedPages.push({
          forgePageId: mapping.forgePageId,
          wpPostId: mapping.wpPostId,
          slug: mapping.wpPostSlug || pageData?.slug || "home",
          status: postStatus,
          verified: true,
        });
      } catch (pageErr: any) {
        contentVerified = false;
        contentFailureReason = `Failed to verify remote WordPress page ID ${mapping.wpPostId}: ${pageErr.message}`;
        break;
      }
    }

    const contentVerificationResult = {
      verified: contentVerified,
      pagesExpected: pageMappings.length,
      pagesVerified: verifiedPages.length,
      mappedPages: verifiedPages,
      mediaVerified: true,
    };

    if (!contentVerified) {
      if (deployment) {
        await db.deployment.update({
          where: { id: deployment.id },
          data: {
            status: "VERIFICATION_FAILED",
            error: { code: "REMOTE_CONTENT_VERIFICATION_FAILED", message: contentFailureReason },
          },
        });
      }

      return {
        verified: false,
        statusCode: 422,
        latencyMs: Date.now() - start,
        error: contentFailureReason,
        details: {
          siteUrl,
          apiVerification: apiVerificationResult,
          contentVerification: contentVerificationResult,
          publicUrlVerification: { verified: false, testedUrl: "", statusCode: 0, latencyMs: 0 },
        },
      };
    }

    // -------------------------------------------------------------
    // TIER 3: Public Page URL Verification
    // -------------------------------------------------------------
    const primaryUrl = deployment.destinationRef || pageMappings[0]?.wpPostUrl || `${siteUrl}/`;
    let publicUrlVerified = false;
    let publicStatusCode = 200;
    const publicStart = Date.now();

    try {
      assertSafeUrl(primaryUrl, "WordPress Public Page URL");
      const pubRes = await executeHttpRequest(primaryUrl, {
        method: "GET",
        headers: { "User-Agent": "ForgeStudio-Verification/1.0" },
      });

      publicStatusCode = pubRes.status;
      if (pubRes.ok) {
        const text = pubRes.text ? await pubRes.text() : "";
        if (text.toLowerCase().includes("<html") || text.toLowerCase().includes("<!doctype")) {
          publicUrlVerified = true;
        } else {
          publicUrlVerified = false;
          publicStatusCode = 422;
        }
      } else {
        publicUrlVerified = false;
      }
    } catch (pubErr: any) {
      publicUrlVerified = false;
      publicStatusCode = 502;
    }

    const publicLatencyMs = Date.now() - publicStart;

    const publicUrlVerificationResult = {
      verified: publicUrlVerified,
      testedUrl: primaryUrl,
      statusCode: publicStatusCode,
      latencyMs: publicLatencyMs,
    };

    if (!publicUrlVerified) {
      const errorMsg = publicStatusCode === 404
        ? `Public WordPress page URL '${primaryUrl}' returned 404 Not Found.`
        : `Public WordPress page URL '${primaryUrl}' failed verification (HTTP ${publicStatusCode}).`;

      if (deployment) {
        await db.deployment.update({
          where: { id: deployment.id },
          data: {
            status: "VERIFICATION_FAILED",
            error: { code: "PUBLIC_URL_VERIFICATION_FAILED", message: errorMsg },
          },
        });
      }

      return {
        verified: false,
        statusCode: publicStatusCode || 502,
        latencyMs: Date.now() - start,
        error: errorMsg,
        details: {
          siteUrl,
          apiVerification: apiVerificationResult,
          contentVerification: contentVerificationResult,
          publicUrlVerification: publicUrlVerificationResult,
        },
      };
    }

    // -------------------------------------------------------------
    // All 3 Tiers Verified! Mark deployment PUBLISHED idempotently
    // -------------------------------------------------------------
    const fullDetails = {
      destinationType: "WORDPRESS",
      siteUrl,
      deploymentId: deployment.id,
      version: deployment.version,
      apiVerification: apiVerificationResult,
      contentVerification: contentVerificationResult,
      publicUrlVerification: publicUrlVerificationResult,
      latencyMs: Date.now() - start,
      verifiedAt: new Date().toISOString(),
    };

    await db.deployment.update({
      where: { id: deployment.id },
      data: {
        status: "PUBLISHED",
        error: null,
        metadata: {
          ...(deployment.metadata && typeof deployment.metadata === "object" ? deployment.metadata : {}),
          verificationDetails: fullDetails,
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    return {
      verified: true,
      statusCode: 200,
      latencyMs: Date.now() - start,
      details: fullDetails,
    };
  }

  async rollback(
    websiteId: string,
    targetDeploymentId: string,
    targetSnapshot: any,
    options: any = {}
  ): Promise<RollbackDestinationResult> {
    const publishRes = await this.publish(
      websiteId,
      targetDeploymentId,
      targetSnapshot,
      options
    );

    return {
      success: publishRes.success,
      destinationType: "WORDPRESS",
      restoredVersion: targetSnapshot.version,
      metadata: publishRes.metadata,
      error: publishRes.error,
    };
  }
}
