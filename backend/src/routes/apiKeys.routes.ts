import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { keyManagementLimiter } from "../middlewares/api-v1.rateLimiter.js";
import {
  listApiKeysHandler,
  createApiKeyHandler,
  revokeApiKeyHandler,
  rotateApiKeyHandler,
} from "../controllers/apiKeys.controller.js";

const router = Router();

// Endpoints strictly for authenticated standard sessions managing their integrations
router.use(requireAuth);

router.get("/", listApiKeysHandler);
router.post("/", keyManagementLimiter, createApiKeyHandler);
router.post("/:id/revoke", keyManagementLimiter, revokeApiKeyHandler);
router.post("/:id/rotate", keyManagementLimiter, rotateApiKeyHandler);

export default router;
