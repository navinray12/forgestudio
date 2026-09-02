import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { createApiKeyHandler, getApiKeysHandler, revokeApiKeyHandler } from "../controllers/developer.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/keys", getApiKeysHandler);
router.post("/keys", createApiKeyHandler);
router.delete("/keys/:id", revokeApiKeyHandler);

export default router;
