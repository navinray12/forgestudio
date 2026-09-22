/**
 * @file Api keys: HTTP route registration and middleware order. File responsibility: api keys routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { requireAuth } from "../authentication/session-authentication.middleware.js";
import { listApiKeysHandler, createApiKeyHandler, revokeApiKeyHandler } from "./api-keys.controller.js";

const router = Router();

// Endpoints strictly for authenticated standard sessions managing their integrations
router.use(requireAuth);

router.get("/", listApiKeysHandler);
router.post("/", createApiKeyHandler);
router.post("/:id/revoke", revokeApiKeyHandler);

export default router;
