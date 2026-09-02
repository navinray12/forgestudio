import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { pluginCompatibilityHandler } from "../controllers/plugin.controller.js";

const router = Router();

/** POST /api/v1/plugins/check-compatibility – any authenticated user may call this */
router.post("/check-compatibility", requireAuth, pluginCompatibilityHandler);

export default router;
