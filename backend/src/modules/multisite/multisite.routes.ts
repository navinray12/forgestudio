/**
 * @file Multisite: HTTP route registration and middleware order. File responsibility: multisite routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import * as multisiteController from "./multisite.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/network", multisiteController.createNetwork);
router.get("/networks", multisiteController.listNetworks);
router.delete("/network/:id", multisiteController.deleteNetwork);

export default router;
