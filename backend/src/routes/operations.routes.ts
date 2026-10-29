import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { authorizeCapability } from "../services/permission.service.js";
import {
  getHealthHandler,
  getOperationalStatusHandler,
  getAdminMonitoringHandler,
  listJobsHandler,
  processNextJobHandler,
  retryJobHandler,
  cancelJobHandler,
  purgeCompletedJobsHandler,
  getAlertsHandler,
  schedulePublishHandler,
  cancelScheduledPublishHandler,
  promoteDeploymentHandler,
  getAdminStatsHandler,
  getAdminUsersHandler,
  getAdminUserDetailsHandler,
  updateAdminUserStatusHandler,
  updateAdminUserRoleHandler,
  getAdminWebsitesHandler,
  getAdminWebsiteDetailsHandler,
  updateAdminWebsiteModerationHandler,
  getAdminAuditLogsHandler,
  exportAdminAuditLogsCsvHandler,
} from "../controllers/operations.controller.js";

const router = Router();

// Public health probe (unauthenticated for load balancers)
router.get("/health", getHealthHandler);
router.get("/status", getOperationalStatusHandler);

// Admin & Super Admin Core Operations Endpoints
const adminRoles = ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"];
const superAdminOnly = ["SUPER_ADMIN"];

router.get("/admin/stats", requireAuth, requireRole(adminRoles), getAdminStatsHandler);
router.get("/admin/users", requireAuth, requireRole(adminRoles), getAdminUsersHandler);
router.get("/admin/users/:userId", requireAuth, requireRole(adminRoles), getAdminUserDetailsHandler);
router.put("/admin/users/:userId/status", requireAuth, requireRole(adminRoles), updateAdminUserStatusHandler);
router.put("/admin/users/:userId/role", requireAuth, requireRole(adminRoles), updateAdminUserRoleHandler);

router.get("/admin/websites", requireAuth, requireRole(adminRoles), getAdminWebsitesHandler);
router.get("/admin/websites/:websiteId", requireAuth, requireRole(adminRoles), getAdminWebsiteDetailsHandler);
router.put("/admin/websites/:websiteId/moderation", requireAuth, requireRole(adminRoles), updateAdminWebsiteModerationHandler);

router.get("/admin/audit-logs", requireAuth, requireRole(adminRoles), getAdminAuditLogsHandler);
router.get("/admin/audit-logs/export", requireAuth, requireRole(adminRoles), exportAdminAuditLogsCsvHandler);

router.get("/admin/monitoring", requireAuth, requireRole(adminRoles), getAdminMonitoringHandler);
router.get("/alerts", requireAuth, requireRole(adminRoles), getAlertsHandler);

// Super Admin Only: Background Worker & Infrastructure Job Queue
router.get("/jobs", requireAuth, requireRole(superAdminOnly), listJobsHandler);
router.post("/jobs/process-next", requireAuth, requireRole(superAdminOnly), processNextJobHandler);
router.post("/jobs/:id/retry", requireAuth, requireRole(superAdminOnly), retryJobHandler);
router.post("/jobs/:id/cancel", requireAuth, requireRole(superAdminOnly), cancelJobHandler);
router.delete("/jobs/purge", requireAuth, requireRole(superAdminOnly), purgeCompletedJobsHandler);

// Website Operational Actions
router.post("/websites/:id/schedule-publish", requireAuth, authorizeCapability("PUBLISH"), schedulePublishHandler);
router.post("/websites/:id/cancel-scheduled-publish", requireAuth, authorizeCapability("PUBLISH"), cancelScheduledPublishHandler);
router.post("/websites/:id/promote", requireAuth, authorizeCapability("PUBLISH"), promoteDeploymentHandler);

export default router;
