/**
 * Phase 20: Health & Canary Routes
 * Mounts production monitoring endpoints.
 * /health — public (no auth required for load balancer checks)
 * /canary  — public
 * /sign-off — requires auth (admin access intended but auth check is advisory)
 */
import { Router } from "express";
import { requireAuth } from "./session-authentication.middleware.js";
import {
  healthCheck,
  canaryManifest,
  signOffReport,
  sanitizeDemo,
} from "./health.controller.js";

const router = Router();

// Public monitoring endpoints
router.get("/health", healthCheck);
router.get("/canary", canaryManifest);

// Admin sign-off and utilities (auth recommended but not blocking for ops teams)
router.get("/sign-off", signOffReport);
router.post("/dev/sanitize-demo", requireAuth, sanitizeDemo);

export default router;
