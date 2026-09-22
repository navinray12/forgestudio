import { Request, Response } from "express";
import * as siteSecurityService from "../publishing/siteSecurity.service.js";
import { transferWebsiteOwnership } from "../websites/website.service.js";

export async function getSecurityOverview(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const data = await siteSecurityService.getHostingSecurityOverview(websiteId, userId);
    return res.status(200).json({ success: true, ...data });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export async function updateSiteLock(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const lock = await siteSecurityService.updateSiteLock(websiteId, req.body, userId);
    return res.status(200).json({
      success: true,
      siteLock: lock,
      message: lock.enabled ? "Password protection shield enabled" : "Password protection disabled",
    });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

export async function updatePrivacy(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const privacy = await siteSecurityService.updatePrivacyAndMaintenance(websiteId, req.body, userId);
    return res.status(200).json({
      success: true,
      privacy,
      message: "Search privacy and maintenance mode updated",
    });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

export async function updateFirewall(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const firewall = await siteSecurityService.updateIpFirewall(websiteId, req.body, userId);
    return res.status(200).json({
      success: true,
      ipFirewall: firewall,
      message: "IP firewall rules updated successfully",
    });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

export async function runSecurityAudit(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const result = await siteSecurityService.runSecurityAudit(websiteId, userId);
    return res.status(200).json({
      success: true,
      audit: result,
      message: `Security audit complete. Health score: ${result.score}/100 (${result.status})`,
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export async function purgeCache(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const result = await siteSecurityService.purgeHostingCache(websiteId, userId);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export async function updateCdn(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const cdn = await siteSecurityService.updateCdnSettings(websiteId, req.body, userId);
    return res.status(200).json({
      success: true,
      cdn,
      message: cdn.cloudflareEnabled ? "Cloudflare CDN edge caching enabled" : "Cloudflare CDN edge caching disabled",
    });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

export async function transferOwnership(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const targetEmail = String(req.body.targetEmail || "");
    const result = await transferWebsiteOwnership(websiteId, userId, targetEmail);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

export async function getHostingLogs(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const result = await siteSecurityService.getHostingLogs(websiteId, userId);
    return res.status(200).json({ success: true, logs: result.logs });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}
