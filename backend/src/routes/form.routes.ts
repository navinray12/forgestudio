import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  submitFormHandler,
  getWebsiteSubmissionsHandler,
  deleteSubmissionHandler,
  exportSubmissionsHandler,
} from "../controllers/form.controller.js";

const router = Router();

// Public submission endpoint (F-270 - F-278)
router.post("/submit", submitFormHandler);

// Protected endpoints for website owners to inspect leads
router.get("/:websiteId/submissions", requireAuth, getWebsiteSubmissionsHandler);
router.delete("/:websiteId/submissions/:submissionId", requireAuth, deleteSubmissionHandler);
router.get("/:websiteId/export", requireAuth, exportSubmissionsHandler);

export default router;
