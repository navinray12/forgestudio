import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getAuditLogsHandler } from "../controllers/auditLog.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getAuditLogsHandler);

export default router;
