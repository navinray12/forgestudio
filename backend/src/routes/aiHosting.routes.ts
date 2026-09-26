import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { handleAiHostingTool } from "../controllers/aiHosting.controller.js";

const router = Router({ mergeParams: true });

// AI Hosting Assistant (F-479 -> F-483)
router.post("/:websiteId/ai/hosting", requireAuth, handleAiHostingTool);
router.post("/ai/hosting", requireAuth, handleAiHostingTool);

export default router;
