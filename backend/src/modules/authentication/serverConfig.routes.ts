import { Router } from "express";
import { requireAuth } from "./session-authentication.middleware.js";
import {
  getServerConfig,
  updateServerConfig,
  getWebsiteSftp,
  testWebsiteSftp,
} from "./serverConfig.controller.js";

const router = Router({ mergeParams: true });

// Server Resources & PHP Runtime Configuration
router.get("/:websiteId/server-config", requireAuth, getServerConfig);
router.put("/:websiteId/server-config", requireAuth, updateServerConfig);

// SFTP Connection Management
router.get("/:websiteId/sftp", requireAuth, getWebsiteSftp);
router.post("/:websiteId/sftp/test", requireAuth, testWebsiteSftp);

export default router;
