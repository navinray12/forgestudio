import { Router, type RequestHandler } from "express";
import { z } from "zod";

const workspaceSelection = z.union([z.literal("personal"), z.uuid()]);
const createSiteInput = z.object({ name: z.string().trim().min(1).max(120), workspaceId: workspaceSelection });
interface DashboardDependencies {
  requireAuth: RequestHandler;
  listWorkspaces: (userId: string) => Promise<{ workspaces: unknown[]; personalSiteCount: number }>;
  listSites: (userId: string, workspaceId: string, includeArchived?: boolean) => Promise<unknown>;
  setSiteArchived?: (userId: string, websiteId: string, workspaceId: string, archived: boolean) => Promise<unknown>;
  createSite: (userId: string, name: string, workspaceId: string) => Promise<unknown>;
  updateProfile: (userId: string, fullName: string) => Promise<unknown>;
}
// Inject services so route contracts can be tested without opening a database connection.
export function createDashboardRouter(deps: DashboardDependencies) {
  const router = Router();
  router.get("/workspaces", deps.requireAuth, async (_req, res, next) => {
    try { res.json({ success: true, ...await deps.listWorkspaces(res.locals.user.id) }); } catch (error) { next(error); }
  });
  router.get("/dashboard/sites", deps.requireAuth, async (req, res, next) => {
    const parsed = workspaceSelection.safeParse(req.query.workspaceId ?? "personal");
    if (!parsed.success) { res.status(400).json({ message: "Invalid workspace selection" }); return; }
    if (req.query.includeArchived !== undefined && !["true", "false"].includes(req.query.includeArchived as string)) { res.status(400).json({ message: "Invalid archive filter" }); return; }
    try { res.json({ success: true, websites: await deps.listSites(res.locals.user.id, parsed.data, req.query.includeArchived === "true") }); } catch (error) { next(error); }
  });
  router.patch("/dashboard/sites/:id/archive", deps.requireAuth, async (req, res, next) => {
    const input = z.object({ workspaceId: workspaceSelection, archived: z.boolean() }).strict().safeParse(req.body);
    const id = z.uuid().safeParse(req.params.id);
    if (!input.success || !id.success) { res.status(400).json({ message: "A valid site, workspace and archive state are required" }); return; }
    try {
      if (!deps.setSiteArchived) throw new Error("Archive service unavailable");
      res.json({ success: true, ...await deps.setSiteArchived(res.locals.user.id, id.data, input.data.workspaceId, input.data.archived) as object });
    } catch (error) { next(error); }
  });
  router.post("/dashboard/sites", deps.requireAuth, async (req, res, next) => {
    const parsed = createSiteInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "A site name and valid workspace are required" }); return; }
    try { res.status(201).json({ success: true, website: await deps.createSite(res.locals.user.id, parsed.data.name, parsed.data.workspaceId) }); } catch (error) { next(error); }
  });
  router.patch("/auth/profile", deps.requireAuth, async (req, res, next) => {
    const parsed = z.object({ fullName: z.string().trim().min(1).max(120) }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Provide a full name of 1 to 120 characters" }); return; }
    try { res.json({ success: true, user: await deps.updateProfile(res.locals.user.id, parsed.data.fullName) }); } catch (error) { next(error); }
  });
  return router;
}
