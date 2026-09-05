import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { listApiKeysHandler, createApiKeyHandler, revokeApiKeyHandler } from "../controllers/apiKeys.controller.js";

const router = Router();

// Endpoints strictly for authenticated standard sessions managing their integrations
router.use(requireAuth);

router.get("/", listApiKeysHandler);
router.post("/", createApiKeyHandler);
router.post("/:id/revoke", revokeApiKeyHandler);

export default router;
