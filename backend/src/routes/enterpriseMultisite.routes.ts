/**
 * Phase 19: Custom Domain & Backup Routes
 * Mounts domain management and website backup endpoints.
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  listDomains,
  addDomain,
  verifyDomain,
  setDomainPrimary,
  removeDomain,
} from "../controllers/customDomain.controller.js";
import {
  listBackups,
  createBackup,
  getBackup,
  restoreBackup,
  deleteBackup,
  getBackupPolicy,
  updateBackupPolicy,
} from "../controllers/backup.controller.js";

const router = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// Custom Domain Routes — /api/websites/:websiteId/domains
// ---------------------------------------------------------------------------
router.get("/:websiteId/domains", requireAuth, listDomains);
router.post("/:websiteId/domains", requireAuth, addDomain);
router.post("/:websiteId/domains/:domain/verify", requireAuth, verifyDomain);
router.patch("/:websiteId/domains/:domain/primary", requireAuth, setDomainPrimary);
router.delete("/:websiteId/domains/:domain", requireAuth, removeDomain);

// ---------------------------------------------------------------------------
// Backup Routes — /api/websites/:websiteId/backups
// ---------------------------------------------------------------------------
router.get("/:websiteId/backups", requireAuth, listBackups);
router.post("/:websiteId/backups", requireAuth, createBackup);
router.get("/:websiteId/backups/policy", requireAuth, getBackupPolicy);
router.put("/:websiteId/backups/policy", requireAuth, updateBackupPolicy);
router.get("/:websiteId/backups/:backupId", requireAuth, getBackup);
router.post("/:websiteId/backups/:backupId/restore", requireAuth, restoreBackup);
router.delete("/:websiteId/backups/:backupId", requireAuth, deleteBackup);

export default router;
