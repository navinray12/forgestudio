import { Router } from "express";
import { getWebsiteKitsHandler, applyWebsiteKitHandler } from "./websiteKit.controller.js";
import { requireAuth } from "./session-authentication.middleware.js";

const router = Router();

// GET /api/v1/website-kits
router.get("/", getWebsiteKitsHandler);

// POST /api/v1/website-kits/apply
router.post("/apply", requireAuth, applyWebsiteKitHandler);

export default router;
