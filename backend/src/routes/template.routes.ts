import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  createTemplateHandler,
  getUserTemplatesHandler,
  getPublicTemplateHandler,
  toggleShareHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from "../controllers/template.controller.js";

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
