import { Router, type RequestHandler, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../utils/app-error.js";
import type { createWorkspaceMembersService } from "../services/workspace-members.service.js";
const uuid = z.uuid();
const role = z.enum(["ADMIN", "MEMBER"]);
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError("Invalid workspace request", 400, "VALIDATION_ERROR");
  return result.data;
}
function intent(req: Request, requireKey = true): string {
  if (req.get("X-Forge-Intent") !== "workspace-command") throw new AppError("Workspace command header required", 403, "REQUEST_INTENT_REQUIRED");
  return requireKey ? parse(uuid, req.get("Idempotency-Key")) : "";
}
function version(req: Request, id: string): number {
  const match = /^"([a-f0-9-]+):(\d+)"$/i.exec(req.get("If-Match") || "");
  if (!match || match[1] !== id || !Number.isSafeInteger(Number(match[2])) || Number(match[2]) < 1)
    throw new AppError("Refresh the resource before changing it", 428, "VERSION_REQUIRED");
  return Number(match[2]);
}
export function createWorkspaceMembersRouter(auth: RequestHandler, service: ReturnType<typeof createWorkspaceMembersService>, createWorkspace: (userId: string, name: string) => Promise<any>) {
  const router = Router();
  router.use(auth);
  router.use((req, res, next) => {
    if (res.locals.user.status !== "ACTIVE") { next(new AppError("Account is not active", 403, "ACCOUNT_INACTIVE")); return; }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !req.is("application/json")) { next(new AppError("JSON request required", 415, "JSON_REQUIRED")); return; }
    next();
  });
  router.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false, keyGenerator: (_req: Request, res: Response) => res.locals.user.id,
    message: { error: { code: "RATE_LIMITED", message: "Too many workspace requests; try again shortly" } } }));
  const handler = (run: (req: Request, res: any) => Promise<unknown>): RequestHandler => async (req, res, next) => {
    try { const value = await run(req, res); if (!res.headersSent) res.json(value); }
    catch (error: any) { next(["P2021", "P2022", "42P01", "42703"].includes(error?.code) ? new AppError("Workspace Members database migration is required", 503, "WORKSPACE_MIGRATION_REQUIRED") : error); }
  };
  router.get("/", handler(async (_req, res) => ({ success: true, workspaces: await service.list(res.locals.user.id) })));
  router.post("/", handler(async (req, res) => {
    intent(req); const input = parse(z.object({ name: z.string().trim().min(1).max(100) }).strict(), req.body);
    const workspace = await createWorkspace(res.locals.user.id, input.name); res.status(201); return { success: true, workspace };
  }));
  router.post("/invitations/:invitationId/resolve", handler(async (req, res) => {
    intent(req, false); const input = parse(z.object({ token: z.string().regex(/^[\w-]{43}$/) }).strict(), req.body);
    return service.resolve(res.locals.user.id, parse(uuid, req.params.invitationId), input.token);
  }));
  router.get("/:id", handler(async (req, res) => {
    const workspace = await service.read(res.locals.user.id, parse(uuid, req.params.id));
    res.setHeader("ETag", `"${workspace.id}:${workspace.version}"`); return { success: true, workspace };
  }));
  router.get("/:id/invitations", handler(async (req, res) => ({ success: true, invitations: await service.invitations(res.locals.user.id, parse(uuid, req.params.id)) })));
  router.post("/:id/invitations", handler(async (req, res) => {
    const key = intent(req); const input = parse(z.object({ email: z.string().trim().toLowerCase().max(254).email(), role }).strict(), req.body);
    res.status(201); return service.invite(res.locals.user.id, parse(uuid, req.params.id), input.email, input.role, key);
  }));
  for (const action of ["renew", "revoke"] as const) router.post(`/:id/invitations/:invitationId/${action}`, handler(async (req, res) => {
    const key = intent(req); parse(z.object({}).strict(), req.body);
    const id = parse(uuid, req.params.invitationId);
    return service.changeInvitation(res.locals.user.id, parse(uuid, req.params.id), id, action === "renew" ? "RENEW" : "REVOKE", version(req, id), key);
  }));
  router.post("/:id/invitations/:invitationId/accept", handler(async (req, res) => {
    intent(req); const input = parse(z.object({ token: z.string().regex(/^[\w-]{43}$/) }).strict(), req.body);
    return service.accept(res.locals.user.id, parse(uuid, req.params.id), parse(uuid, req.params.invitationId), input.token);
  }));
  router.patch("/:id/member-role", handler(async (req, res) => {
    intent(req); const id = parse(uuid, req.params.id); const input = parse(z.object({ userId: uuid, role }).strict(), req.body);
    return service.changeRole(res.locals.user.id, id, input.userId, input.role, version(req, id));
  }));
  return router;
}
