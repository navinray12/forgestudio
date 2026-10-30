/**
 * Phase 19: Custom Domain Controller
 * Manages custom domains per website: add, list, verify, set primary, remove.
 */
import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import {
  validateDomain,
  createDomainRecord,
  simulateVerificationCheck,
  verifyDomainDns,
  getDnsInstructions,
  isValidDomainStatusTransition,
  setOnePrimary,
  getPrimaryDomain,
  initiateSslProvisioning,
  getDomainDiagnosticStatus,
  isDomainRegisteredAnywhere,
  processExpiringSslCertificates,
  type DomainVerificationMethod,
} from "../services/domains/customDomain.service.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getAuthorizedWebsite(websiteId: string, userId?: string) {
  if (!websiteId || !userId) return null;
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return null;
  if (website.userId !== userId) {
    const collab = await (prisma as any).websiteCollaborator?.findFirst?.({ where: { websiteId, userId } });
    if (!collab) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.role as string)) return null;
    }
  }
  return website;
}

function readDomains(website: any): any[] {
  const ed: any = website.editorData || {};
  return Array.isArray(ed.customDomains) ? ed.customDomains : [];
}

async function writeDomains(websiteId: string, website: any, domains: any[]) {
  const ed: any = website.editorData || {};
  return prisma.website.update({
    where: { id: websiteId },
    data: { editorData: { ...ed, customDomains: domains } },
  });
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** GET /api/websites/:websiteId/domains */
export async function listDomains(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website).map((d: any) => ({
      ...d,
      dnsRecords: getDnsInstructions(d.domain, d.verificationToken),
    }));
    return res.status(200).json({ success: true, domains, primary: getPrimaryDomain(domains) || null });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

import { AppError } from "../utils/app-error.js";

// In-flight concurrency set to prevent duplicate verification bursts per domain
const inFlightVerifications = new Set<string>();

/** POST /api/websites/:websiteId/domains */
export async function addDomain(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    let domain: string;
    try {
      domain = validateDomain(String(req.body.domain || ""));
    } catch (valErr: any) {
      return res.status(400).json({
        success: false,
        code: "INVALID_HOSTNAME",
        message: valErr.message,
      });
    }

    const method: DomainVerificationMethod = ["TXT", "CNAME", "FILE"].includes(req.body.method)
      ? req.body.method
      : "TXT";

    // Atomically claim domain inside a transaction protected by PostgreSQL advisory lock
    const record = await prisma.$transaction(async (tx) => {
      // 1. Acquire transaction-level advisory lock on normalized domain name
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'custom_domain_claim:' + domain}))`;

      // 2. Query whether domain is registered on any other website
      const matches: any[] = await tx.$queryRaw`
        SELECT id
        FROM websites
        WHERE ("editorData"->'customDomains') IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof("editorData"->'customDomains') = 'array'
                THEN "editorData"->'customDomains'
                ELSE '[]'::jsonb
              END
            ) AS elem
            WHERE LOWER(elem->>'domain') = ${domain}
          )
      `;

      if (matches && matches.some((w: any) => w.id !== websiteId)) {
        throw new AppError(
          "Domain is already connected to another website. If you own this domain, remove it from the other website first.",
          409,
          "DOMAIN_CONFLICT"
        );
      }

      // 3. Re-read target website inside the transaction with lock to prevent race on same website
      const currentSite = await tx.website.findUnique({ where: { id: websiteId } });
      if (!currentSite) {
        throw new AppError("Website not found or unauthorized", 404, "WEBSITE_NOT_FOUND");
      }

      const ed: any = currentSite.editorData || {};
      const currentDomains: any[] = Array.isArray(ed.customDomains) ? ed.customDomains : [];

      if (currentDomains.some((d: any) => d.domain.toLowerCase() === domain.toLowerCase())) {
        throw new AppError("Domain is already connected to this website", 409, "DOMAIN_ALREADY_EXISTS");
      }

      const newRecord = createDomainRecord(domain, websiteId, method, currentDomains.length === 0);
      newRecord.status = "pending";
      newRecord.sslEnabled = false;

      const updatedDomains = [...currentDomains, newRecord];
      await tx.website.update({
        where: { id: websiteId },
        data: { editorData: { ...ed, customDomains: updatedDomains } },
      });

      return newRecord;
    });

    const dnsRecords = getDnsInstructions(record.domain, record.verificationToken);

    return res.status(201).json({
      success: true,
      domain: { ...record, dnsRecords },
      instructions: buildVerificationInstructions(record),
      dnsRecords,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.code === "DOMAIN_CONFLICT" || err.code === "DOMAIN_ALREADY_EXISTS" ? 409 : 500);
    return res.status(statusCode).json({
      success: false,
      code: err.code || "INTERNAL_ERROR",
      message: err.message,
    });
  }
}

/** POST /api/websites/:websiteId/domains/:domain/verify */
export async function verifyDomain(req: Request, res: Response) {
  const websiteId = String(req.params.websiteId || "");
  const domainName = decodeURIComponent(String(req.params.domain || "")).toLowerCase();
  const userId = res.locals.user?.id || (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const verificationKey = `${websiteId}:${domainName}`;
  if (inFlightVerifications.has(verificationKey)) {
    return res.status(429).json({
      success: false,
      code: "RATE_LIMITED",
      message: "A DNS verification check is already in progress for this domain. Please wait for it to complete.",
    });
  }

  inFlightVerifications.add(verificationKey);
  try {
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website);
    const idx = domains.findIndex((d: any) => d.domain.toLowerCase() === domainName);
    if (idx === -1) return res.status(404).json({ success: false, message: "Domain not found" });

    const record = domains[idx];

    // Protection against aggressive repeated DNS queries (3-second cooldown)
    if (record.lastCheckedAt) {
      const elapsed = Date.now() - new Date(record.lastCheckedAt).getTime();
      if (elapsed < 3000) {
        return res.status(429).json({
          success: false,
          code: "RATE_LIMITED",
          message: "Please wait a few seconds between verification attempts to allow DNS propagation.",
        });
      }
    }

    // Perform authoritative server-side DNS verification
    const check = await verifyDomainDns(record);

    const now = new Date().toISOString();
    if (check.success) {
      domains[idx] = {
        ...record,
        status: "active",
        verifiedAt: now,
        lastCheckedAt: now,
        sslStatus: record.sslStatus || "PENDING",
        sslEnabled: record.sslStatus === "ACTIVE" && Boolean(record.sslEnabled),
      };
    } else {
      domains[idx] = {
        ...record,
        status: "failed",
        lastCheckedAt: now,
      };
    }

    await writeDomains(websiteId, website, domains);

    const dnsRecords = getDnsInstructions(record.domain, record.verificationToken);

    return res.status(200).json({
      success: check.success,
      domain: { ...domains[idx], dnsRecords },
      dnsRecords,
      message: check.success
        ? "Domain DNS verified and ownership confirmed successfully"
        : check.reason || "DNS verification check failed. Propagation may take time.",
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    inFlightVerifications.delete(verificationKey);
  }
}

/** PATCH /api/websites/:websiteId/domains/:domain/primary */
export async function setDomainPrimary(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const domainName = decodeURIComponent(String(req.params.domain || "")).toLowerCase();
    const userId = res.locals.user?.id || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website);
    const target = domains.find((d: any) => d.domain.toLowerCase() === domainName);
    if (!target) return res.status(404).json({ success: false, message: "Domain not found" });
    if (target.status !== "active") {
      return res.status(400).json({ success: false, message: "Only verified, active domains can be set as primary" });
    }

    const updated = setOnePrimary(domains, domainName);
    await writeDomains(websiteId, website, updated);

    return res.status(200).json({ success: true, domains: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** DELETE /api/websites/:websiteId/domains/:domain */
export async function removeDomain(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const domainName = decodeURIComponent(String(req.params.domain || "")).toLowerCase();
    const userId = res.locals.user?.id || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website);
    const filtered = domains.filter((d: any) => d.domain.toLowerCase() !== domainName);
    if (filtered.length === domains.length) return res.status(404).json({ success: false, message: "Domain not found" });

    // If removed domain was primary, promote another active domain if available
    const removedWasPrimary = domains.find((d: any) => d.domain.toLowerCase() === domainName)?.isPrimary;
    let finalDomains = filtered;
    if (removedWasPrimary && finalDomains.length > 0) {
      const activeIdx = finalDomains.findIndex((d: any) => d.status === "active");
      if (activeIdx !== -1) {
        finalDomains[activeIdx].isPrimary = true;
      } else {
        finalDomains[0].isPrimary = true;
      }
    }

    await writeDomains(websiteId, website, finalDomains);
    return res.status(200).json({ success: true, message: "Domain removed" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** GET /api/websites/:websiteId/domains/:domain/status */
export async function getDomainStatus(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const domainName = decodeURIComponent(String(req.params.domain || "")).toLowerCase();
    const userId = res.locals.user?.id || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website);
    const record = domains.find((d: any) => d.domain.toLowerCase() === domainName);
    if (!record) return res.status(404).json({ success: false, message: "Domain not found" });

    const diagnostics = getDomainDiagnosticStatus(record);
    const dnsRecords = getDnsInstructions(record.domain, record.verificationToken);

    return res.status(200).json({
      success: true,
      diagnostics,
      domain: { ...record, dnsRecords },
      dnsRecords,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /api/websites/:websiteId/domains/:domain/ssl/provision */
export async function provisionDomainSsl(req: Request, res: Response) {
  const websiteId = String(req.params.websiteId || "");
  const domainName = decodeURIComponent(String(req.params.domain || "")).toLowerCase();
  const userId = res.locals.user?.id || (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const sslKey = `ssl:${websiteId}:${domainName}`;
  if (inFlightVerifications.has(sslKey)) {
    return res.status(429).json({
      success: false,
      code: "RATE_LIMITED",
      message: "SSL certificate provisioning is already in progress for this domain. Please wait for it to complete.",
    });
  }

  inFlightVerifications.add(sslKey);
  let acquiredLock = false;
  try {
    // Cross-instance concurrency protection: acquire PostgreSQL session-level advisory lock
    try {
      const lockRows: any[] = await prisma.$queryRaw`
        SELECT pg_try_advisory_lock(hashtext(${'ssl_prov:' + domainName})) AS locked
      `;
      acquiredLock = Boolean(lockRows && lockRows[0] && lockRows[0].locked);
    } catch {
      // Fallback to in-process locking if DB does not support advisory locks
      acquiredLock = true;
    }

    if (!acquiredLock) {
      return res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message: "SSL certificate provisioning is already in progress for this domain across backend instances. Please wait.",
      });
    }

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website);
    const idx = domains.findIndex((d: any) => d.domain.toLowerCase() === domainName);
    if (idx === -1) return res.status(404).json({ success: false, message: "Domain not found" });

    // Prerequisite: Domain must be verified and active before SSL issuance
    if (domains[idx].status !== "active") {
      return res.status(400).json({
        success: false,
        code: "DOMAIN_NOT_VERIFIED",
        message: "Domain DNS must be verified before SSL certificate provisioning can be initiated.",
      });
    }

    const provisionResult = await initiateSslProvisioning(domains[idx], websiteId);
    domains[idx] = provisionResult.domain;

    await writeDomains(websiteId, website, domains);

    const diagnostics = getDomainDiagnosticStatus(provisionResult.domain);
    const dnsRecords = getDnsInstructions(provisionResult.domain.domain, provisionResult.domain.verificationToken);

    return res.status(provisionResult.success ? 200 : 400).json({
      success: provisionResult.success,
      code: provisionResult.errorCode,
      domain: { ...provisionResult.domain, dnsRecords },
      diagnostics,
      dnsRecords,
      message: provisionResult.message,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    if (acquiredLock) {
      await prisma.$queryRaw`
        SELECT pg_advisory_unlock(hashtext(${'ssl_prov:' + domainName}))
      `.catch(() => {});
    }
    inFlightVerifications.delete(sslKey);
  }
}

/** POST /api/websites/domains/process-expirations */
export async function triggerProcessSslExpirations(req: Request, res: Response) {
  try {
    const userId = res.locals.user?.id || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const windowDays = req.body?.windowDays ? Number(req.body.windowDays) : 30;
    const summary = await processExpiringSslCertificates(windowDays);
    return res.status(200).json({ success: true, summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildVerificationInstructions(record: any): Record<string, string> {
  switch (record.verificationMethod) {
    case "TXT":
      return {
        type: "DNS TXT Record",
        host: `_forgestudio-verify.${record.domain}`,
        value: record.verificationToken,
        ttl: "300",
      };
    case "CNAME":
      return {
        type: "DNS CNAME Record",
        host: `verify.${record.domain}`,
        value: record.cnamTarget || "verify.forgestudio.app",
        ttl: "300",
      };
    case "FILE":
      return {
        type: "File Verification",
        url: `http://${record.domain}/.well-known/forgestudio-verify.txt`,
        content: record.verificationToken,
      };
    default:
      return {};
  }
}

import { acmeChallengeStore } from "../services/domains/acmeChallengeStore.js";

/**
 * GET /.well-known/acme-challenge/:token
 * Public endpoint for Let's Encrypt / ACME HTTP-01 challenge verification.
 * Does NOT require authentication.
 */
export function handleAcmeHttp01Challenge(req: Request, res: Response) {
  const token = String(req.params.token || "").trim();
  if (!token || !/^[a-zA-Z0-9_-]{10,128}$/.test(token)) {
    return res.status(404).type("text/plain").send("Invalid or missing challenge token");
  }

  const challenge = acmeChallengeStore.getChallenge(token);
  if (!challenge) {
    return res.status(404).type("text/plain").send("Challenge token not found or expired");
  }

  // RFC 8555 Section 8.3: Content-Type text/plain or application/octet-stream
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  return res.status(200).send(challenge.keyAuthorization);
}

