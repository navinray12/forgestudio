/**
 * @file Forms: HTTP route registration and middleware order. File responsibility: form routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import {
  submitFormHandler,
  getWebsiteSubmissionsHandler,
  deleteSubmissionHandler,
  exportSubmissionsHandler,
} from "./form.controller.js";

const router = Router();

// Public submission endpoint
router.post("/submit", submitFormHandler);

// Protected endpoints for website owners to inspect leads
router.get("/:websiteId/submissions", requireAuth, getWebsiteSubmissionsHandler);
router.delete("/:websiteId/submissions/:submissionId", requireAuth, deleteSubmissionHandler);
router.get("/:websiteId/export", requireAuth, exportSubmissionsHandler);

export default router;
