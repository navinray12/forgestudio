import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authorizeCapability } from "../services/permission.service.js";
import {
  getHealthHandler,
  getOperationalStatusHandler,
  listJobsHandler,
  processNextJobHandler,
  getAlertsHandler,
  schedulePublishHandler,
  promoteDeploymentHandler,
} from "../controllers/operations.controller.js";

const router = Router();

// Public / Cluster health probe (unauthenticated for load balancers and orchestrators)
router.get("/health", getHealthHandler);
router.get("/status", getOperationalStatusHandler);

// Protected Operations Endpoints
router.get("/jobs", requireAuth, listJobsHandler);
router.post("/jobs/process-next", requireAuth, processNextJobHandler);
router.get("/alerts", requireAuth, getAlertsHandler);

// Website Operational Actions
router.post("/websites/:id/schedule-publish", requireAuth, authorizeCapability("PUBLISH"), schedulePublishHandler);
router.post("/websites/:id/promote", requireAuth, authorizeCapability("PUBLISH"), promoteDeploymentHandler);

export default router;
