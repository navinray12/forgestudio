/**
 * Phase 20: Health & Sign-off Controller
 * Exposes /health, /canary, and /sign-off endpoints for production monitoring.
 */
import { Request, Response } from "express";
import {
  runPlatformHealthCheck,
  buildCanaryManifest,
  generateSignOffReport,
  sanitizeResponse,
} from "../services/platformHealth.service.js";

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
