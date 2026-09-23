import { Router } from "express";
import { requireAuth } from "./session-authentication.middleware.js";
import {
  activateLicenseHandler,
  deactivateLicenseHandler,
  transferLicenseHandler,
  getMyLicensesHandler,
  generateUserLicenseHandler,
} from "./license.controller.js";

const router = Router();

// Public / API: Activate a license for a website domain (F-440, F-441, F-443)
router.post("/activate", activateLicenseHandler);

// Public / API: Deactivate a domain under a license (F-442)
router.post("/deactivate", deactivateLicenseHandler);

// Public / API: Transfer license between domains (F-442, F-443)
router.post("/transfer", transferLicenseHandler);

// Authenticated: Get all licenses and active domains for current user (F-441, F-447, F-448)
router.get("/my-licenses", requireAuth, getMyLicensesHandler);

// Authenticated: Provision or retrieve license for active plan (F-440, F-451)
router.post("/generate", requireAuth, generateUserLicenseHandler);

export default router;
