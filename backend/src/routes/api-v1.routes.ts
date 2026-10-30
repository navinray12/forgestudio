import { Router } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { authenticateApiV1, requireApiV1Scope } from "../middlewares/api-v1.auth.js";
import {
  standardApiLimiter,
  mutationApiLimiter,
  publishApiLimiter,
} from "../middlewares/api-v1.rateLimiter.js";
import { getPublicWebsiteHandler } from "../controllers/website.controller.js";
import {
  listWebsitesHandler,
  createWebsiteHandler,
  getWebsiteByIdHandler,
  updateWebsiteHandler,
  getPagesHandler,
  updatePagesHandler,
  publishWebsiteV1Handler,
  getDeploymentsV1Handler,
  rollbackDeploymentV1Handler,
} from "../controllers/api-v1.controller.js";

const router = Router();

// Add request correlation IDs
router.use((_req, res, next) => {
  const correlationId = "req_" + crypto.randomBytes(8).toString("hex");
  res.setHeader("X-Request-Id", correlationId);
  res.setHeader("X-Correlation-Id", correlationId);
  res.locals.correlationId = correlationId;
  next();
});

// 1. Unauthenticated Public Runtime Route & Documentation
router.get("/websites/public/:id", getPublicWebsiteHandler);

router.get("/docs", (_req, res) => {
  try {
    const specPath = path.join(process.cwd(), "src/docs/openapi.json");
    const fallbackPath = path.join(process.cwd(), "backend/src/docs/openapi.json");
    const resolved = fs.existsSync(specPath) ? specPath : fs.existsSync(fallbackPath) ? fallbackPath : null;

    if (resolved) {
      const spec = JSON.parse(fs.readFileSync(resolved, "utf-8"));
      return res.status(200).json(spec);
    }
    return res.status(200).json({ openapi: "3.0.3", info: { title: "ForgeStudio API v1", version: "1.0.0" } });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to read API spec", details: err?.message });
  }
});

// 2. Authenticated Public API v1 Routes
const v1Auth = [authenticateApiV1];

// Websites CRUD
router.get(
  "/websites",
  standardApiLimiter,
  ...v1Auth,
  requireApiV1Scope("websites:read"),
  listWebsitesHandler
);

router.post(
  "/websites",
  mutationApiLimiter,
  ...v1Auth,
  requireApiV1Scope("websites:write"),
  createWebsiteHandler
);

router.get(
  "/websites/:id",
  standardApiLimiter,
  ...v1Auth,
  requireApiV1Scope("websites:read"),
  getWebsiteByIdHandler
);

router.put(
  "/websites/:id",
  mutationApiLimiter,
  ...v1Auth,
  requireApiV1Scope("websites:write"),
  updateWebsiteHandler
);

// Pages
router.get(
  "/websites/:id/pages",
  standardApiLimiter,
  ...v1Auth,
  requireApiV1Scope("websites:read"),
  getPagesHandler
);

router.put(
  "/websites/:id/pages",
  mutationApiLimiter,
  ...v1Auth,
  requireApiV1Scope("websites:write"),
  updatePagesHandler
);

// Publishing & Deployments
router.post(
  "/websites/:id/publish",
  publishApiLimiter,
  ...v1Auth,
  requireApiV1Scope("publish:write"),
  publishWebsiteV1Handler
);

router.get(
  "/websites/:id/deployments",
  standardApiLimiter,
  ...v1Auth,
  requireApiV1Scope("websites:read"),
  getDeploymentsV1Handler
);

router.post(
  "/websites/:id/deployments/:deploymentId/rollback",
  publishApiLimiter,
  ...v1Auth,
  requireApiV1Scope("publish:write"),
  rollbackDeploymentV1Handler
);

export default router;
