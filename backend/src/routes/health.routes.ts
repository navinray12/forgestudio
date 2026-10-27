/**
 * Phase 20: Health & Canary Routes
 * Mounts production monitoring endpoints.
 * /health — public (no auth required for load balancer checks)
 * /canary  — public
 * /sign-off — requires auth (admin access intended but auth check is advisory)
 */
import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
  healthCheck,
  canaryManifest,
  signOffReport,
  sanitizeDemo,
  prismaMigrationStatus,
  prismaMigrationRecover,
  diagnosePorts,
  readinessCheck,
} from "../controllers/health.controller.js";

const router = Router();

// Public monitoring endpoints
router.get("/health", healthCheck);
router.get("/ready", readinessCheck);
router.get("/canary", canaryManifest);
router.get("/prisma-migration-status", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), prismaMigrationStatus);
router.post("/prisma-migration-recover", requireAuth, requireRole(["SUPER_ADMIN"]), prismaMigrationRecover);
router.get("/diagnose-ports", requireAuth, requireRole(["SUPER_ADMIN"]), diagnosePorts);

// Admin sign-off and utilities (auth recommended but not blocking for ops teams)
router.get("/sign-off", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), signOffReport);
router.post("/dev/sanitize-demo", requireAuth, requireRole(["ADMIN", "SUPER_ADMIN"]), sanitizeDemo);

export default router;
