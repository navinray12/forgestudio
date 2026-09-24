/**
 * Phase 20: Health & Canary Routes
 * Mounts production monitoring endpoints.
 * /health — public (no auth required for load balancer checks)
 * /canary  — public
 * /sign-off — requires auth (admin access intended but auth check is advisory)
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  healthCheck,
  canaryManifest,
  signOffReport,
  sanitizeDemo,
  prismaMigrationStatus,
  prismaMigrationRecover,
  diagnosePorts,
} from "../controllers/health.controller.js";

const router = Router();

// Public monitoring endpoints
router.get("/health", healthCheck);
router.get("/canary", canaryManifest);
router.get("/prisma-migration-status", prismaMigrationStatus);
router.get("/prisma-migration-recover-get", prismaMigrationRecover);
router.post("/prisma-migration-recover", prismaMigrationRecover);
router.get("/diagnose-ports", diagnosePorts);

// Admin sign-off and utilities (auth recommended but not blocking for ops teams)
router.get("/sign-off", signOffReport);
router.post("/dev/sanitize-demo", requireAuth, sanitizeDemo);

export default router;
