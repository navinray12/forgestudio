import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getMyUsageHandler } from "../controllers/usage.controller.js";

const router = Router();

// Authenticated: Get centralized telemetry and quota usage breakdown (F-450, F-452)
router.get("/usage", requireAuth, getMyUsageHandler);

export default router;
