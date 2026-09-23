/**
 * @file Media: HTTP route registration and middleware order. File responsibility: upload routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import { handleImageUpload } from "./upload.middleware.js";

const router = Router();

// Protect image upload with authentication
router.use(requireAuth);

router.post("/image", handleImageUpload);

export default router;
