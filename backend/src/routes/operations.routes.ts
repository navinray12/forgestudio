import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { authorizeCapability } from "../services/permission.service.js";
import {
  getHealthHandler,
  getOperationalStatusHandler,
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
  updateAdminUserStatusHandler,
  getAdminWebsitesHandler,
} from "../controllers/operations.controller.js";

const router = Router();

// Public / Cluster health probe (unauthenticated for load balancers and orchestrators)
router.get("/health", getHealthHandler);
router.get("/status", getOperationalStatusHandler);

// Protected Operations Endpoints
router.get("/jobs", requireAuth, listJobsHandler);
router.post("/jobs/process-next", requireAuth, processNextJobHandler);
router.post("/jobs/:id/retry", requireAuth, retryJobHandler);
router.post("/jobs/:id/cancel", requireAuth, cancelJobHandler);
router.delete("/jobs/purge", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), purgeCompletedJobsHandler);
router.get("/alerts", requireAuth, getAlertsHandler);

// Admin & Super Admin Operations Endpoints
router.get("/admin/stats", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), getAdminStatsHandler);
router.get("/admin/users", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), getAdminUsersHandler);
router.put("/admin/users/:userId/status", requireAuth, requireRole(["SUPER_ADMIN"]), updateAdminUserStatusHandler);
router.get("/admin/websites", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), getAdminWebsitesHandler);

// Website Operational Actions
router.post("/websites/:id/schedule-publish", requireAuth, authorizeCapability("PUBLISH"), schedulePublishHandler);
router.post("/websites/:id/cancel-scheduled-publish", requireAuth, authorizeCapability("PUBLISH"), cancelScheduledPublishHandler);
router.post("/websites/:id/promote", requireAuth, authorizeCapability("PUBLISH"), promoteDeploymentHandler);

export default router;
