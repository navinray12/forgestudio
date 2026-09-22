import { Router } from "express";
import { requireAuth } from "./session-authentication.middleware.js";
import { getAuditLogsHandler } from "./auditLog.controller.js";

const router = Router();

router.use(requireAuth);
router.get("/", getAuditLogsHandler);

export default router;
