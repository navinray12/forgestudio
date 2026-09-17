/**
 * @file Plugin compatibility: HTTP route registration and middleware order. File responsibility: plugin compat routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { getPlugins, activatePlugin } from "./plugin-compat.controller.js";
import { requireAuth } from "../authentication/session-authentication.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", getPlugins as any);
router.post("/:pluginId/activate", activatePlugin as any);

export default router;
