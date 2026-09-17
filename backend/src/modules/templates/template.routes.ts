/**
 * @file Templates: HTTP route registration and middleware order. File responsibility: template routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import {
  createTemplateHandler,
  getUserTemplatesHandler,
  getPublicTemplateHandler,
  toggleShareHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from "./template.controller.js";

const router = Router();

// Public route for viewing shared templates without authentication
router.get("/public/:shareToken", getPublicTemplateHandler);

// Protect all remaining template endpoints with authentication
router.use(requireAuth);

router.post("/", createTemplateHandler);
router.get("/", getUserTemplatesHandler);
router.post("/:id/share", toggleShareHandler);
router.patch("/:id", updateTemplateHandler);
router.delete("/:id", deleteTemplateHandler);

export default router;
