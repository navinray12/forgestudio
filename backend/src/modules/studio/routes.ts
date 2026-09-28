import { randomUUID } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { pgPool } from "../../config/prisma.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { StudioRepository, type SitePatch } from "./repository.js";
import { id, name, object, revision, scope, siteQuery, StudioError, trustedOrigin } from "./domain.js";

const repository = new StudioRepository(pgPool);
const router = Router();
router.use(requireAuth);
router.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false, keyGenerator: (_req, res) => String(res.locals.user.id) }));
router.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // Cookie-authenticated writes require both a verified Origin and a non-simple request header.
    if (req.get("X-Studio-Request") !== "1" || !trustedOrigin(req.get("Origin"), process.env.FRONTEND_URL, process.env.NODE_ENV === "production")) {
      return res.status(403).json({ success: false, error: { code: "ORIGIN_REJECTED", message: "Request origin is not allowed" } });
    }
  }
  next();
});

function route(run: (req: Request, actorId: string) => Promise<Record<string, unknown>>, status = 200) {
  return async (req: Request, res: Response) => {
    const requestId = randomUUID();
    res.setHeader("X-Request-Id", requestId);
    try {
      const result = await run(req, id(res.locals.user?.id));
      res.status(status).json({ success: true, ...result });
    } catch (error) {
      if (error instanceof StudioError) return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message, requestId } });
      const code = (error as { code?: string })?.code;
      if (code === "23505") return res.status(409).json({ success: false, error: { code: "CONFLICT", message: "That name already exists in this workspace", requestId } });
      if (code === "23503" || code === "23514" || code === "40001" || code === "40P01") return res.status(409).json({ success: false, error: { code: "CONFLICT", message: "The resource changed. Refresh and retry.", requestId } });
      // Missing migrations and database failures are never disguised as an empty dashboard.
      console.error("Studio request failed", { requestId, code: code ?? "UNKNOWN" });
      return res.status(503).json({ success: false, error: { code: "STUDIO_UNAVAILABLE", message: "Studio is unavailable. Check database connectivity and apply the Studio migration.", requestId } });
    }
  };
}

router.get("/bootstrap", route(async (_req, actor) => repository.bootstrap(actor)));
router.get("/sites", route(async (req, actor) => repository.list(actor, siteQuery(req.query))));
router.post("/sites", route(async (req, actor) => {
  const body = object(req.body, ["name", "workspaceId", "folderId", "sourceSiteId", "operationId"]);
  const site = await repository.createSite(actor, name(body.name), scope(body.workspaceId), body.folderId === undefined || body.folderId === null ? null : id(body.folderId), body.sourceSiteId === undefined || body.sourceSiteId === null ? null : id(body.sourceSiteId), id(body.operationId, "operationId"));
  return { site };
}, 201));
router.patch("/sites/:siteId", route(async (req, actor) => {
  const body = object(req.body, ["name", "folderId", "archived", "revision"]);
  if (!Object.keys(body).some(key => key !== "revision")) throw new StudioError("At least one change is required");
  const patch: SitePatch = { revision: revision(body.revision) };
  if (body.name !== undefined) patch.name = name(body.name);
  if (body.folderId !== undefined) patch.folderId = body.folderId === null ? null : id(body.folderId);
  if (body.archived !== undefined) {
    if (typeof body.archived !== "boolean") throw new StudioError("archived must be a boolean");
    patch.archived = body.archived;
  }
  return repository.patchSite(actor, id(req.params.siteId), patch);
}));
router.put("/sites/:siteId/favorite", route(async (req, actor) => {
  const body = object(req.body, ["favorite"]);
  if (typeof body.favorite !== "boolean") throw new StudioError("favorite must be a boolean");
  await repository.bookmark(actor, id(req.params.siteId), body.favorite);
  return {};
}));
router.post("/workspaces", route(async (req, actor) => {
  const body = object(req.body, ["name", "operationId"]);
  return { workspace: await repository.createWorkspace(actor, name(body.name), id(body.operationId, "operationId")) };
}, 201));
router.patch("/workspaces/:workspaceId", route(async (req, actor) => {
  const body = object(req.body, ["name"]);
  await repository.renameWorkspace(actor, id(req.params.workspaceId), name(body.name));
  return {};
}));
router.get("/workspaces/:workspaceId/members", route(async (req, actor) => ({ members: await repository.members(actor, id(req.params.workspaceId)) })));
router.post("/folders", route(async (req, actor) => {
  const body = object(req.body, ["name", "workspaceId"]);
  return { folder: await repository.createFolder(actor, scope(body.workspaceId), name(body.name)) };
}, 201));
router.patch("/folders/:folderId", route(async (req, actor) => {
  const body = object(req.body, ["name", "workspaceId"]);
  await repository.changeFolder(actor, id(req.params.folderId), scope(body.workspaceId), name(body.name));
  return {};
}));
router.delete("/folders/:folderId", route(async (req, actor) => {
  const body = object(req.body, ["workspaceId"]);
  await repository.changeFolder(actor, id(req.params.folderId), scope(body.workspaceId), null);
  return {};
}));
router.get("/activity", route(async (req, actor) => {
  object(req.query, ["workspaceId"]);
  return { events: await repository.activity(actor, scope(req.query.workspaceId)) };
}));
export default router;
