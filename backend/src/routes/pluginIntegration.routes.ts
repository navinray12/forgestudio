import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import * as integrationController from "../controllers/pluginIntegration.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/save", integrationController.saveIntegration);
router.get("/list/:websiteId", integrationController.listIntegrations);
router.post("/sync", integrationController.syncPluginData);

export default router;
