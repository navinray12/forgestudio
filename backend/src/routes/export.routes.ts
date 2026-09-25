import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getCodePreview,
  downloadProjectZip,
  downloadHelloThemeZip,
  previewHelloThemeFiles,
} from "../controllers/export.controller.js";

const router = Router({ mergeParams: true });

// Code Generation Preview (F-745 -> F-755)
router.get("/:websiteId/export/preview", requireAuth, getCodePreview);
router.get("/:websiteId/export/zip", requireAuth, downloadProjectZip);

// Hello Theme Companion WordPress Theme (X-786)
router.get("/hello-theme/download", downloadHelloThemeZip);
router.get("/hello-theme/preview", previewHelloThemeFiles);

export default router;
