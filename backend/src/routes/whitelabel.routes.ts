import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getWhiteLabelHandler,
  updateWhiteLabelHandler,
  resolvePublicBrandingHandler,
} from "../controllers/whitelabel.controller.js";

const router = Router();

// Authenticated: Get white-label configuration (F-446)
router.get("/whitelabel", requireAuth, getWhiteLabelHandler);

// Authenticated: Update white-label configuration (Agency plan gated - F-446, F-452)
router.put("/whitelabel", requireAuth, updateWhiteLabelHandler);

// Public: Resolve branding and watermark status for website runtime (F-446)
router.get("/whitelabel/resolve/:websiteId", resolvePublicBrandingHandler);

export default router;
