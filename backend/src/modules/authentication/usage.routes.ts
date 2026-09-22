import { Router } from "express";
import { requireAuth } from "./session-authentication.middleware.js";
import { getMyUsageHandler } from "./usage.controller.js";

const router = Router();

// Authenticated: Get centralized telemetry and quota usage breakdown (F-450, F-452)
router.get("/usage", requireAuth, getMyUsageHandler);

export default router;
