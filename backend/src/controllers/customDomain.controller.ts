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
  isValidDomainStatusTransition,
  setOnePrimary,
  getPrimaryDomain,
  type DomainVerificationMethod,
} from "../services/domains/customDomain.service.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getAuthorizedWebsite(websiteId: string, userId?: string) {
  const website = await prisma.website.findUnique({ where: { id: websiteId } });
  if (!website) return null;
  if (userId && website.userId !== userId) {
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
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website);
    return res.status(200).json({ success: true, domains, primary: getPrimaryDomain(domains) || null });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** POST /api/websites/:websiteId/domains */
export async function addDomain(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domain = validateDomain(String(req.body.domain || ""));
    const method: DomainVerificationMethod = ["TXT", "CNAME", "FILE"].includes(req.body.method)
      ? req.body.method
      : "TXT";

    const domains = readDomains(website);
    if (domains.some((d: any) => d.domain === domain)) {
      return res.status(409).json({ success: false, message: "Domain already added to this website" });
    }

    const record = createDomainRecord(domain, websiteId, method, domains.length === 0);
    await writeDomains(websiteId, website, [...domains, record]);

    return res.status(201).json({
      success: true,
      domain: record,
      instructions: buildVerificationInstructions(record),
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

/** POST /api/websites/:websiteId/domains/:domain/verify */
export async function verifyDomain(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const domainName = decodeURIComponent(String(req.params.domain || "")).toLowerCase();
    const userId = res.locals.user?.id || (req as any).user?.id;

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website);
    const idx = domains.findIndex((d: any) => d.domain === domainName);
    if (idx === -1) return res.status(404).json({ success: false, message: "Domain not found" });

    const record = domains[idx];
    const check = simulateVerificationCheck(record);

    const now = new Date().toISOString();
    if (check.success) {
      domains[idx] = { ...record, status: "active", verifiedAt: now, lastCheckedAt: now, sslEnabled: true };
    } else {
      domains[idx] = { ...record, status: "failed", lastCheckedAt: now };
    }

    await writeDomains(websiteId, website, domains);

    return res.status(200).json({
      success: check.success,
      domain: domains[idx],
      message: check.success ? "Domain verified and SSL provisioned" : check.reason,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/** PATCH /api/websites/:websiteId/domains/:domain/primary */
export async function setDomainPrimary(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const domainName = decodeURIComponent(String(req.params.domain || "")).toLowerCase();
    const userId = res.locals.user?.id || (req as any).user?.id;

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website);
    const target = domains.find((d: any) => d.domain === domainName);
    if (!target) return res.status(404).json({ success: false, message: "Domain not found" });
    if (target.status !== "active") {
      return res.status(400).json({ success: false, message: "Only active domains can be set as primary" });
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

    const website = await getAuthorizedWebsite(websiteId, userId);
    if (!website) return res.status(404).json({ success: false, message: "Website not found or unauthorized" });

    const domains = readDomains(website);
    const filtered = domains.filter((d: any) => d.domain !== domainName);
    if (filtered.length === domains.length) return res.status(404).json({ success: false, message: "Domain not found" });

    await writeDomains(websiteId, website, filtered);
    return res.status(200).json({ success: true, message: "Domain removed" });
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
