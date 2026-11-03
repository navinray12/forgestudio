import { Router, type RequestHandler, type Request, type Response } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { AppError } from "../utils/app-error.js";
import type { createWorkspaceDashboardServices } from "../services/workspace-dashboard.service.js";
const name = z.string().trim().min(1).max(120);
export function createWorkspaceDashboardRouter(auth: RequestHandler, service: ReturnType<typeof createWorkspaceDashboardServices>) {
  const router = Router();
  const limit = rateLimit({ windowMs: 60_000, limit: 20, keyGenerator: (_req: Request, res: Response) => String(res.locals.user.id), standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: "WORKSPACE_RATE_LIMIT", message: "Too many workspace changes. Please try again in a minute." } } });
  router.get("/dashboard/workspaces", auth, async (_req, res, next) => {
    try { res.json({ success: true, ...await service.list(res.locals.user.id) }); } catch (error) { next(error); }
  });
  router.post("/dashboard/workspaces", auth, limit, async (req, res, next) => {
    const input = z.object({ name, workspaceType: z.enum(["STANDARD", "DEVELOPER"]) }).strict().safeParse(req.body);
    const key = z.uuid().safeParse(req.get("Idempotency-Key"));
    try {
      if (req.get("X-Forge-Intent") !== "workspace-command") throw new AppError("Workspace command header required", 403, "REQUEST_INTENT_REQUIRED");
      if (!input.success || !key.success) throw new AppError("Provide a name of 1–120 characters, a workspace type and request key", 400, "VALIDATION_ERROR");
      res.status(201).json({ success: true, workspace: await service.create(res.locals.user.id, input.data.name, input.data.workspaceType, key.data) });
    } catch (error) { next(error); }
  });
  router.patch("/dashboard/workspaces/:id", auth, limit, async (req, res, next) => {
    const id = z.uuid().safeParse(req.params.id);
    const input = z.object({ name, expectedUpdatedAt: z.iso.datetime() }).strict().safeParse(req.body);
    try {
      if (req.get("X-Forge-Intent") !== "workspace-command") throw new AppError("Workspace command header required", 403, "REQUEST_INTENT_REQUIRED");
      if (!input.success || !id.success) throw new AppError("Provide a valid workspace, name and revision", 400, "VALIDATION_ERROR");
      res.json({ success: true, workspace: await service.rename(res.locals.user.id, id.data, input.data.name, input.data.expectedUpdatedAt) });
    } catch (error) { next(error); }
  });
  return router;
}
