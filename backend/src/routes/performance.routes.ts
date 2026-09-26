import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authorizeCapability } from "../services/permission.service.js";
import {
  runPerformanceAuditHandler,
  getPerformanceMetricsHandler,
} from "../controllers/performance.controller.js";

const router = Router({ mergeParams: true });

// Require authentication before all performance metrics and audit endpoints
router.use(requireAuth);

router.post("/:id/performance/audit", authorizeCapability("VIEW"), runPerformanceAuditHandler);
router.get("/:id/performance/metrics", authorizeCapability("VIEW"), getPerformanceMetricsHandler);

export default router;
