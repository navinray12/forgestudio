import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as sftpController from "../controllers/sftp.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/config", sftpController.saveSftpConfig);
router.get("/config/:websiteId", sftpController.getSftpConfig);
router.post("/sync", sftpController.syncSftpFiles);

export default router;
