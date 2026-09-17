/**
 * @file Sftp connections: HTTP route registration and middleware order. File responsibility: sftp routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import * as sftpController from "./sftp.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/config", sftpController.saveSftpConfig);
router.get("/config/:websiteId", sftpController.getSftpConfig);
router.post("/sync", sftpController.syncSftpFiles);

export default router;
