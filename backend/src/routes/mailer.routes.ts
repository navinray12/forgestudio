import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { authorizeCapability } from "../services/permission.service.js";
import {
  getMailerConfigHandler,
  saveMailerConfigHandler,
  testMailerConnectionHandler,
  getDeliveryLogsHandler,
} from "../controllers/mailer.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/:id/mailer/config", authorizeCapability("VIEW"), getMailerConfigHandler);
router.put("/:id/mailer/config", authorizeCapability("EDIT"), saveMailerConfigHandler);
router.post("/:id/mailer/test", authorizeCapability("EDIT"), testMailerConnectionHandler);
router.get("/:id/mailer/logs", authorizeCapability("VIEW"), getDeliveryLogsHandler);

export default router;
