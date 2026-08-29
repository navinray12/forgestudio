import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getWebsitesHandler,
  getWebsiteByIdHandler,
  createWebsiteHandler,
  updateWebsiteHandler,
  deleteWebsiteHandler,
} from "../controllers/website.controller.js";

const router = Router();

// Protect all website endpoints with authentication
router.use(requireAuth);

router.get("/", getWebsitesHandler);
router.post("/", createWebsiteHandler);
router.get("/:id", getWebsiteByIdHandler);
router.put("/:id", updateWebsiteHandler);
router.delete("/:id", deleteWebsiteHandler);

export default router;
