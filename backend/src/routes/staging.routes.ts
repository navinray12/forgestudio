import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getStagingHandler,
  createStagingHandler,
  promoteStagingHandler,
  deleteStagingHandler,
} from "../controllers/staging.controller.js";

const router = Router({ mergeParams: true });

router.get("/:websiteId/staging", requireAuth, getStagingHandler);
router.post("/:websiteId/staging", requireAuth, createStagingHandler);
router.post("/:websiteId/staging/promote", requireAuth, promoteStagingHandler);
router.delete("/:websiteId/staging", requireAuth, deleteStagingHandler);

export default router;
