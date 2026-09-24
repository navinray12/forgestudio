import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getExperimentsHandler,
  createExperimentHandler,
  updateExperimentHandler,
  concludeExperimentHandler,
  deleteExperimentHandler,
  recordImpressionHandler,
  recordConversionHandler,
} from "../controllers/experiment.controller.js";

const router = Router({ mergeParams: true });

// Public telemetry endpoints for live site visitors
router.post("/:id/experiments/:expId/impression", recordImpressionHandler);
router.post("/:id/experiments/:expId/conversion", recordConversionHandler);

// Authenticated management endpoints for site owners / editors
router.get("/:id/experiments", requireAuth, getExperimentsHandler);
router.post("/:id/experiments", requireAuth, createExperimentHandler);
router.put("/:id/experiments/:expId", requireAuth, updateExperimentHandler);
router.post("/:id/experiments/:expId/conclude", requireAuth, concludeExperimentHandler);
router.delete("/:id/experiments/:expId", requireAuth, deleteExperimentHandler);

export default router;
