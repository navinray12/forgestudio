import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authorizeCapability } from "../services/permission.service.js";
import * as sftpController from "../controllers/sftp.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/config", authorizeCapability("MANAGE_INTEGRATIONS"), sftpController.saveSftpConfig);
router.get("/config/:websiteId", authorizeCapability("VIEW"), sftpController.getSftpConfig);
router.post("/sync", authorizeCapability("PUBLISH"), sftpController.syncSftpFiles);
router.post("/verify", authorizeCapability("MANAGE_INTEGRATIONS"), sftpController.verifySftpConfig);

export default router;
