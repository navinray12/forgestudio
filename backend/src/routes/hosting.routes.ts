import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getSecurityOverview,
  updateSiteLock,
  updatePrivacy,
  updateFirewall,
  runSecurityAudit,
  purgeCache,
  updateCdn,
  transferOwnership,
  getHostingLogs,
} from "../controllers/hosting.controller.js";

const router = Router({ mergeParams: true });

// Security & Firewall
router.get("/:websiteId/security", requireAuth, getSecurityOverview);
router.put("/:websiteId/security/site-lock", requireAuth, updateSiteLock);
router.put("/:websiteId/security/privacy", requireAuth, updatePrivacy);
router.put("/:websiteId/security/firewall", requireAuth, updateFirewall);
router.post("/:websiteId/security/scan", requireAuth, runSecurityAudit);

// Cache & CDN Management
router.post("/:websiteId/cache/purge", requireAuth, purgeCache);
router.put("/:websiteId/cdn", requireAuth, updateCdn);

// Website Ownership Transfer
router.post("/:websiteId/transfer", requireAuth, transferOwnership);

// Hosting & Operational Logs
router.get("/:websiteId/hosting-logs", requireAuth, getHostingLogs);

export default router;
