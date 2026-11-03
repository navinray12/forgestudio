import { randomUUID } from "node:crypto";
import { AppError } from "../utils/app-error.js";
import type { createDashboardServices } from "./dashboard.service.js";

type WorkspaceType = "STANDARD" | "DEVELOPER";
const fields = { id: true, name: true, ownerId: true, settings: true, updatedAt: true, lifecycleStatus: true };
// Explicit selections/INSERT columns keep this flow compatible with existing workspace schemas.
// workspaceType and command identity are additive JSON settings; editor/publishing data is untouched.
export function createWorkspaceDashboardServices(db: any, listWorkspaces: ReturnType<typeof createDashboardServices>["listDashboardWorkspaces"]) {
  async function list(userId: string) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status !== "ACTIVE") throw new AppError("Account is not active", 403, "ACCOUNT_INACTIVE");
    const result = await listWorkspaces(userId);
    const allIds = result.workspaces.flatMap(workspace => workspace.aliases);
    const sites = allIds.length ? await db.website.findMany({ where: { workspaceId: { in: allIds },
      OR: [{ userId }, { collaborators: { some: { userId } } }] }, select: { workspaceId: true, archivedAt: true } }) : [];
    return { ...result, workspaces: result.workspaces.map(workspace => ({ ...workspace,
      siteCount: sites.filter((site: any) => workspace.aliases.includes(site.workspaceId) && !site.archivedAt).length,
      archivedSiteCount: sites.filter((site: any) => workspace.aliases.includes(site.workspaceId) && !!site.archivedAt).length,
    })) };
  }
  async function create(userId: string, name: string, workspaceType: WorkspaceType, key: string) {
    return db.$transaction(async (tx: any) => {
      // Serialize retries for this owner without adding a command table or changing migration history.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true } });
      if (!user || user.status !== "ACTIVE") throw new AppError("Account is not active", 403, "ACCOUNT_INACTIVE");
      const existing = await tx.workspace.findFirst({ where: { ownerId: userId, settings: { path: ["dashboardCreateKey"], equals: key } }, select: fields });
      if (existing) {
        if (existing.settings.dashboardCreateName !== name || existing.settings.workspaceType !== workspaceType)
          throw new AppError("This request was already used for another workspace. Please start a new request.", 409, "IDEMPOTENCY_CONFLICT");
        return existing;
      }
      const id = randomUUID();
      const settings = { workspaceType, dashboardCreateKey: key, dashboardCreateName: name };
      const rows = await tx.$queryRaw`INSERT INTO workspaces (id, "ownerId", name, slug, settings, "createdAt", "updatedAt")
        VALUES (${id}::uuid, ${userId}::uuid, ${name}, ${`workspace-${id}`}, ${JSON.stringify(settings)}::jsonb, NOW(), NOW())
        RETURNING id, name, "ownerId", settings, "updatedAt", "lifecycleStatus"`;
      await tx.workspaceMember.create({ data: { workspaceId: id, userId, role: "OWNER" } });
      await tx.auditLog.create({ data: { userId, action: "WORKSPACE_CREATED", targetResource: `workspace:${id}`, details: { name, workspaceType } } });
      return rows[0];
    });
  }
  async function rename(userId: string, workspaceId: string, name: string, expectedUpdatedAt: string) {
    return db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
      const [user, membership, workspace] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { status: true } }),
        tx.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } }),
        tx.workspace.findUnique({ where: { id: workspaceId }, select: fields }),
      ]);
      if (!user || user.status !== "ACTIVE") throw new AppError("Account is not active", 403, "ACCOUNT_INACTIVE");
      if (!membership || !workspace) throw new AppError("Workspace not found or access denied", 404, "NOT_FOUND");
      if (!(["OWNER", "ADMIN"].includes(membership.role)) || membership.role === "OWNER" && workspace.ownerId !== userId)
        throw new AppError("Only workspace owners and admins can rename a workspace", 403, "FORBIDDEN");
      if (workspace.lifecycleStatus !== "ACTIVE") throw new AppError("This workspace is read only", 409, "WORKSPACE_READ_ONLY");
      if (new Date(workspace.updatedAt).getTime() !== new Date(expectedUpdatedAt).getTime())
        throw new AppError("This workspace changed. Refresh the list and try again.", 409, "WORKSPACE_CHANGED");
      const updated = await tx.workspace.update({ where: { id: workspaceId }, data: { name, updatedAt: new Date(Math.max(Date.now(), new Date(workspace.updatedAt).getTime() + 1)),
        settings: { ...(workspace.settings || {}), dashboardName: name } }, select: fields });
      await tx.auditLog.create({ data: { userId, action: "WORKSPACE_RENAMED", targetResource: `workspace:${workspaceId}`, details: { name } } });
      return updated;
    });
  }
  return { list, create, rename };
}
