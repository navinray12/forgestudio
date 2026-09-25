import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { createElementorCloudHandler, getElementorCloudHandler } from "../controllers/elementorCloud.controller.js";

const router = Router();

// Elementor Cloud Managed Hosting Bundle (X-804)
router.post("/", requireAuth, createElementorCloudHandler);
router.get("/:websiteId", requireAuth, getElementorCloudHandler);

export default router;
