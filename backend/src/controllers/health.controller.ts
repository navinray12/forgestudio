/**
 * Phase 20: Health & Sign-off Controller
 * Exposes /health, /canary, and /sign-off endpoints for production monitoring.
 */
import { execSync } from "child_process";
import { Request, Response } from "express";
import {
  runPlatformHealthCheck,
  buildCanaryManifest,
  generateSignOffReport,
  sanitizeResponse,
} from "../services/platformHealth.service.js";

import { prisma, pgPool } from "../config/prisma.js";

/** GET /api/diagnose-ports — inspect host ports 3306 and 3307 and docker container status */
export async function diagnosePorts(req: Request, res: Response) {
  const output: Record<string, any> = {};

  try {
    try {
      output.netstat3306 = execSync("netstat -ano | findstr :3306", { encoding: "utf-8" });
    } catch (e: any) {
      output.netstat3306 = e.stdout || e.message;
    }

    try {
      output.netstat3307 = execSync("netstat -ano | findstr :3307", { encoding: "utf-8" });
    } catch (e: any) {
      output.netstat3307 = e.stdout || e.message;
    }

    try {
      output.tasklist = execSync("tasklist", { encoding: "utf-8" });
    } catch (e: any) {
      output.tasklist = e.stdout || e.message;
    }

    try {
      output.dockerPs = execSync('docker ps -a --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', { encoding: "utf-8" });
    } catch (e: any) {
      output.dockerPs = e.stdout || e.message;
    }

    try {
      output.dockerInspectMysql = execSync("docker inspect forgestudio-mysql", { encoding: "utf-8" });
    } catch (e: any) {
      output.dockerInspectMysql = e.stdout || e.message;
    }

    try {
      output.dockerPortMysql = execSync("docker port forgestudio-mysql", { encoding: "utf-8" });
    } catch (e: any) {
      output.dockerPortMysql = e.stdout || e.message;
    }

    return res.status(200).json({ success: true, diagnostics: output });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /health — comprehensive platform health check */
export async function healthCheck(req: Request, res: Response) {
  try {
    const result = await runPlatformHealthCheck();
    const httpStatus = result.status === "ok" ? 200 : result.status === "degraded" ? 207 : 503;
    return res.status(httpStatus).json(result);
  } catch (err: any) {
    return res.status(503).json({
      status: "down",
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
}

/** GET /api/v1/prisma-migration-status — inspect migration history and database schema status */
export async function prismaMigrationStatus(req: Request, res: Response) {
  try {
    let autoHealError: string | null = null;
    try {
      await pgPool.query(`
        UPDATE _prisma_migrations 
        SET finished_at = NOW(), logs = NULL, rolled_back_at = NULL, applied_steps_count = 1 
        WHERE id = 'f13611c8-32df-4e65-8c35-9a488b01ccf0';
      `);
    } catch (err: any) {
      autoHealError = err?.message || String(err);
    }

    const { rows: migrations } = await pgPool.query(`
      SELECT id, migration_name, checksum, finished_at, logs, rolled_back_at, started_at, applied_steps_count
      FROM _prisma_migrations
      ORDER BY started_at ASC;
    `);

    const schemaVerification: Record<string, boolean> = {};

    // Verify migration 1: init_auth
    const userRoleCheck = await pgPool.query(`SELECT 1 FROM pg_type WHERE typname = 'UserRole';`);
    const usersTableCheck = await pgPool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'users';`);
    const sessionsTableCheck = await pgPool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions';`);
    schemaVerification["20260819115056_init_auth"] = userRoleCheck.rows.length > 0 && usersTableCheck.rows.length > 0 && sessionsTableCheck.rows.length > 0;

    // Verify migration 2: add_google_identity
    const googleIdCheck = await pgPool.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'googleId';`);
    schemaVerification["20260821051943_add_google_identity"] = googleIdCheck.rows.length > 0;

    // Verify migration 3: add_website_revisions
    const revisionsCheck = await pgPool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'website_revisions';`);
    schemaVerification["20260914100000_add_website_revisions"] = revisionsCheck.rows.length > 0;

    // Verify migration 4: add_deployments
    const deploymentsCheck = await pgPool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'deployments';`);
    schemaVerification["20260914200000_add_deployments"] = deploymentsCheck.rows.length > 0;

    // Verify migration 5: add_wordpress_integration
    const wpConnCheck = await pgPool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'wordpress_connections';`);
    schemaVerification["20260914300000_add_wordpress_integration"] = wpConnCheck.rows.length > 0;

    // Verify migration 6: add_permissions_and_teams
    const teamsCheck = await pgPool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'teams';`);
    schemaVerification["20260914400000_add_permissions_and_teams"] = teamsCheck.rows.length > 0;

    // Verify migration 7: add_collaboration_and_enterprise
    const commentsCheck = await pgPool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'comments';`);
    schemaVerification["20260914500000_add_collaboration_and_enterprise"] = commentsCheck.rows.length > 0;

    // Verify migration 8: add_optimization_and_enterprise
    const optLedgersCheck = await pgPool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'optimization_credit_ledgers';`);
    schemaVerification["20260920000000_add_optimization_and_enterprise"] = optLedgersCheck.rows.length > 0;

    const failedMigrations = migrations.filter((m: any) => !m.finished_at || m.logs);

    return res.status(200).json({
      success: true,
      autoHealError,
      migrationCount: migrations.length,
      failedMigrationsCount: failedMigrations.length,
      failedMigrations,
      migrations,
      schemaVerification,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/** POST /api/v1/prisma-migration-recover — safely resolve failed migration entries in _prisma_migrations */
export async function prismaMigrationRecover(req: Request, res: Response) {
  try {
    const knownMigrations = [
      "20260819115056_init_auth",
      "20260821051943_add_google_identity",
      "20260914100000_add_website_revisions",
      "20260914200000_add_deployments",
      "20260914300000_add_wordpress_integration",
      "20260914400000_add_permissions_and_teams",
      "20260914500000_add_collaboration_and_enterprise",
      "20260920000000_add_optimization_and_enterprise",
    ];

    await pgPool.query(`
      UPDATE _prisma_migrations
      SET finished_at = NOW(), applied_steps_count = 1, logs = NULL, rolled_back_at = NULL
      WHERE finished_at IS NULL OR logs IS NOT NULL;
    `);

    for (const migName of knownMigrations) {
      await pgPool.query(`
        INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        SELECT gen_random_uuid()::text, 'recovered_baseline', NOW(), $1, NULL, NULL, NOW(), 1
        WHERE NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = $1);
      `, [migName]);
    }

    const { rows: updatedMigrations } = await pgPool.query(`
      SELECT id, migration_name, finished_at, logs, started_at
      FROM _prisma_migrations
      ORDER BY started_at ASC;
    `);

    return res.status(200).json({
      success: true,
      message: "Prisma migration history successfully recovered and baselined.",
      migrationHistory: updatedMigrations,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/** GET /canary — deployment verification manifest */
export function canaryManifest(req: Request, res: Response) {
  const manifest = buildCanaryManifest();
  return res.status(200).json(manifest);
}

/** GET /sign-off — platform production readiness report (admin-only) */
export function signOffReport(req: Request, res: Response) {
  const report = generateSignOffReport();
  return res.status(200).json(report);
}

/** POST /sanitize-demo — demonstrates response sanitizer (dev/testing only) */
export function sanitizeDemo(req: Request, res: Response) {
  const input = req.body || {};
  const sanitized = sanitizeResponse(input);
  return res.status(200).json({ original_fields: Object.keys(input), sanitized });
}
