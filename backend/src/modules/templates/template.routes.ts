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
  getLibraryTemplatesHandler,
  getWebsiteKitsHandler,
  adminBulkSeedHandler,
  toggleShareHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from "./template.controller.js";

const router = Router();

// Public discovery endpoints
router.get("/public/:shareToken", getPublicTemplateHandler);
router.get("/library", getLibraryTemplatesHandler);
router.get("/kits", getWebsiteKitsHandler);

// Admin-only seed endpoint
router.post("/admin/seed", requireAuth, adminBulkSeedHandler);

// Authenticated user template management
router.post("/", requireAuth, createTemplateHandler);
router.get("/", requireAuth, getUserTemplatesHandler);
router.post("/:id/share", requireAuth, toggleShareHandler);
router.patch("/:id", requireAuth, updateTemplateHandler);
router.delete("/:id", requireAuth, deleteTemplateHandler);

export default router;

