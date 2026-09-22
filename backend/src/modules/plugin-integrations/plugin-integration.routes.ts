/**
 * @file Plugin integrations: HTTP route registration and middleware order. File responsibility: plugin integration routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import * as integrationController from "./plugin-integration.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/save", integrationController.saveIntegration);
router.get("/list/:websiteId", integrationController.listIntegrations);
router.post("/sync", integrationController.syncPluginData);

export default router;
