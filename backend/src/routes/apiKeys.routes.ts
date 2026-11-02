import { Router, type Request, type Response } from "express";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { keyManagementLimiter } from "../middlewares/api-v1.rateLimiter.js";
import {
  listApiKeysHandler,
  createApiKeyHandler,
  revokeApiKeyHandler,
  rotateApiKeyHandler,
} from "../controllers/apiKeys.controller.js";

const router = Router();
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

// Endpoints strictly for authenticated standard sessions managing their integrations
router.use(requireAuth);
router.use((req, res, next) => {
  if (res.locals.user.status !== "ACTIVE") {
    res.status(403).json({ message: "An active account is required." });
    return;
  }
  if (
    req.method !== "GET" &&
    req.headers.origin &&
    req.headers.origin !== new URL(process.env.FRONTEND_URL || "http://localhost:5173").origin
  ) {
    res.status(403).json({ message: "This request is not allowed." });
    return;
  }
  if (req.method === "POST" && req.path === "/" && !req.is("application/json")) {
    res.status(415).json({ message: "JSON is required." });
    return;
  }
  next();
});

router.get("/sdk", (_req, res, next) => {
  res.download(fileURLToPath(new URL("../sdk/client.ts", import.meta.url)), "client.ts", (e) => {
    if (e) next(e);
  });
});

router.get("/", listApiKeysHandler);
router.post("/", keyManagementLimiter, createApiKeyHandler);
router.post("/:id/revoke", keyManagementLimiter, revokeApiKeyHandler);
router.post("/:id/rotate", keyManagementLimiter, rotateApiKeyHandler);

export default router;
