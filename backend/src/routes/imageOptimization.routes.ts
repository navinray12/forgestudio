import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authorizeCapability } from "../services/permission.service.js";
import {
  optimizeImageHandler,
  getOptimizationStatsHandler,
} from "../controllers/imageOptimization.controller.js";

const router = Router({ mergeParams: true });

// Require authentication before all image optimization endpoints
router.use(requireAuth);

router.post("/:id/images/optimize-image", authorizeCapability("EDIT"), optimizeImageHandler);
router.get("/:id/images/stats", authorizeCapability("VIEW"), getOptimizationStatsHandler);

export default router;
