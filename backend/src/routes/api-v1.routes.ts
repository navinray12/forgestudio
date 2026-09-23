import { Router } from "express";
import { authenticateApiV1, requireApiV1Scope } from "../middlewares/api-v1.auth.js";
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

// 1. Unauthenticated Public Runtime Route
router.get("/websites/public/:id", getPublicWebsiteHandler);

// 2. Authenticated Public API v1 Routes
const v1Auth = [authenticateApiV1];

// Websites CRUD
router.get("/websites", ...v1Auth, requireApiV1Scope("websites:read"), listWebsitesHandler);
router.post("/websites", ...v1Auth, requireApiV1Scope("websites:write"), createWebsiteHandler);
router.get("/websites/:id", ...v1Auth, requireApiV1Scope("websites:read"), getWebsiteByIdHandler);
router.put("/websites/:id", ...v1Auth, requireApiV1Scope("websites:write"), updateWebsiteHandler);

// Pages
router.get("/websites/:id/pages", ...v1Auth, requireApiV1Scope("websites:read"), getPagesHandler);
router.put("/websites/:id/pages", ...v1Auth, requireApiV1Scope("websites:write"), updatePagesHandler);

// Publishing & Deployments
router.post("/websites/:id/publish", ...v1Auth, requireApiV1Scope("publish:write"), publishWebsiteV1Handler);
router.get("/websites/:id/deployments", ...v1Auth, requireApiV1Scope("websites:read"), getDeploymentsV1Handler);
router.post("/websites/:id/deployments/:deploymentId/rollback", ...v1Auth, requireApiV1Scope("publish:write"), rollbackDeploymentV1Handler);

export default router;
