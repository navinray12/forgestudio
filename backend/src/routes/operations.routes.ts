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
  getAdminAIInfrastructureHandler,
  updateAdminAIRouteHandler,
  getAdminStudioObservabilityHandler,
} from "../controllers/operations.controller.js";
import {getAiInfrastructureHandler,updateAiRouteHandler,checkAiProviderHandler} from "../controllers/aiInfrastructure.controller.js";

const router = Router();

// Public / Cluster health probe (unauthenticated for load balancers and orchestrators)
router.get("/health", getHealthHandler);
router.get("/status", getOperationalStatusHandler);

// Protected Operations Endpoints (Restricted to Platform Admins)
router.get("/jobs", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), listJobsHandler);
router.post("/jobs/process-next", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), processNextJobHandler);
router.post("/jobs/:id/retry", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), retryJobHandler);
router.post("/jobs/:id/cancel", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), cancelJobHandler);
router.delete("/jobs/purge", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), purgeCompletedJobsHandler);
router.get("/alerts", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), getAlertsHandler);

// Admin & Super Admin Operations Endpoints
router.get("/admin/stats", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), getAdminStatsHandler);
router.get("/admin/users", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), getAdminUsersHandler);
router.put("/admin/users/:userId/status", requireAuth, requireRole(["SUPER_ADMIN"]), updateAdminUserStatusHandler);
router.get("/admin/websites", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), getAdminWebsitesHandler);
router.get("/admin/ai-infrastructure", requireAuth, requireRole(["SUPER_ADMIN"]), getAiInfrastructureHandler);
router.put("/admin/ai-infrastructure/routes/:feature", requireAuth, requireRole(["SUPER_ADMIN"]), updateAiRouteHandler);
router.post("/admin/ai-infrastructure/providers/:provider/check", requireAuth, requireRole(["SUPER_ADMIN"]), checkAiProviderHandler);
router.get("/admin/ai-infrastructure", requireAuth, requireRole(["SUPER_ADMIN"]), getAdminAIInfrastructureHandler);
router.put("/admin/ai-infrastructure/routes", requireAuth, requireRole(["SUPER_ADMIN"]), updateAdminAIRouteHandler);
router.get("/admin/studio-observability", requireAuth, requireRole(["SUPER_ADMIN"]), getAdminStudioObservabilityHandler);

// Website Operational Actions
router.post("/websites/:id/schedule-publish", requireAuth, authorizeCapability("PUBLISH"), schedulePublishHandler);
router.post("/websites/:id/cancel-scheduled-publish", requireAuth, authorizeCapability("PUBLISH"), cancelScheduledPublishHandler);
router.post("/websites/:id/promote", requireAuth, authorizeCapability("PUBLISH"), promoteDeploymentHandler);

export default router;
