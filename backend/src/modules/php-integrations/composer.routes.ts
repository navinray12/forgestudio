/**
 * @file Php integrations: HTTP route registration and middleware order. File responsibility: composer routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import { getComposerStatus, validateComposer, installDependencies } from "./composer.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/status", getComposerStatus);
router.post("/validate", validateComposer);
router.post("/install", installDependencies);

export default router;
