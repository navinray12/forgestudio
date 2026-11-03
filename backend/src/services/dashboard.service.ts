import { AppError } from "../utils/app-error.js";
type DashboardWorkspaceRow = { id: string; name: string; slug: string; ownerId: string;
  owner: { fullName: string | null }; _count: { members: number }; settings?: any; members?: { role: string }[]; updatedAt?: Date; lifecycleStatus?: string };

// Both legacy personal slug formats describe the same owner's personal space.
function isPersonalWorkspace(row: DashboardWorkspaceRow, userId: string) {
  return row.ownerId === userId && /^personal-(?:default|ws)-/.test(row.slug);
}

export function mapDashboardWorkspaces(rows: DashboardWorkspaceRow[], userId: string) {
  const candidates = rows.filter(row => isPersonalWorkspace(row, userId));
  const primary = candidates.find(row => row.slug.startsWith("personal-ws-")) || (candidates.length === 1 ? candidates[0] : undefined);
  // Only collapse a legacy alias that has no additional members to reconcile.
  const personal = primary ? candidates.filter(row => row.id === primary.id || row._count.members === 1) : [];
  return rows.filter(row => !personal.includes(row) || row.id === primary?.id).map(row => ({
    id: row.id,
    name: row.settings?.dashboardName || ((row.id === primary?.id || candidates.length === 1 && row.id === candidates[0].id) && row.owner.fullName?.trim()
      ? `${row.owner.fullName.trim()}'s Workspace` : row.name),
    aliases: row.id === primary?.id ? personal.map(item => item.id) : [row.id],
    workspaceType: row.settings?.workspaceType === "DEVELOPER" ? "DEVELOPER" as const : "STANDARD" as const,
    userRole: row.members?.[0]?.role || (row.ownerId === userId ? "OWNER" : "MEMBER"),
    lifecycleStatus: row.lifecycleStatus || "ACTIVE",
    updatedAt: row.updatedAt,
  }));
}
// Inject dependencies to test tenant isolation without database startup side effects.
export function createDashboardServices(db: any, createWebsite: (options: { userId: string; name: string; workspaceId: string | null }) => Promise<unknown>) {
  async function mappedWorkspaces(userId: string) {
    const rows = await db.workspace.findMany({
      where: { members: { some: { userId } } },
      select: { id: true, name: true, slug: true, ownerId: true, settings: true, updatedAt: true, lifecycleStatus: true, members: { where: { userId }, select: { role: true } }, owner: { select: { fullName: true } },
        _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });
    return mapDashboardWorkspaces(rows, userId);
  }
  async function listDashboardWorkspaces(userId: string) {
    // Only existing columns are selected; Members columns are deployed separately.
    const [workspaces, personalSiteCount] = await Promise.all([
      mappedWorkspaces(userId),
      db.website.count({ where: { workspaceId: null, OR: [{ userId }, { collaborators: { some: { userId } } }] } }),
    ]);
    return { workspaces, personalSiteCount };
  }
  async function requireDashboardWorkspace(userId: string, workspaceId: string, write = false) {
    if (workspaceId === "personal") return;
    const membership = await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
    if (!membership) throw new AppError("Workspace not found or access denied", 404, "NOT_FOUND");
    if (write && !["OWNER", "ADMIN", "EDITOR"].includes(membership.role)) throw new AppError("Workspace is read only", 403, "FORBIDDEN");
  }
  async function listDashboardSites(userId: string, workspaceId: string, includeArchived = false) {
    await requireDashboardWorkspace(userId, workspaceId);
    const group = workspaceId === "personal" ? null : (await mappedWorkspaces(userId)).find(item => item.aliases.includes(workspaceId));
    if (workspaceId !== "personal" && !group) throw new AppError("Workspace not found or access denied", 404, "NOT_FOUND");
    // Keep the editor's existing owner/collaborator authorization contract.
    try { return await db.website.findMany({
      where: { ...(includeArchived ? {} : { archivedAt: null }), workspaceId: group && group.aliases.length > 1 ? { in: group.aliases } : workspaceId === "personal" ? null : workspaceId,
        OR: [{ userId }, { collaborators: { some: { userId } } }] },
      select: { id: true, userId: true, name: true, slug: true, status: true, archivedAt: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }); } catch (error: any) {
      if (error?.code === "P2022" && /archivedAt/.test(JSON.stringify(error.meta || {}) + error.message))
        throw new AppError("Site archive storage is not ready. Please ask your administrator to apply the website archive migration, then retry.", 503, "ARCHIVE_STORAGE_NOT_READY");
      throw error;
    }
  }
  async function setDashboardSiteArchived(userId: string, websiteId: string, workspaceId: string, archived: boolean) {
    // Resolve aliases and visibility using exactly the same scope as the dashboard.
    const sites = await listDashboardSites(userId, workspaceId, true);
    const site = sites.find((item: any) => item.id === websiteId);
    if (!site) throw new AppError("Site not found or access denied", 404, "NOT_FOUND");
    if (site.userId !== userId) throw new AppError("Only the owner can archive or restore this site", 403, "FORBIDDEN");
    await requireDashboardWorkspace(userId, workspaceId, true);
    // Conditional, idempotent update: never save a stale website/editor snapshot.
    const result = await db.website.updateMany({
      where: { id: websiteId, userId, archivedAt: archived ? null : { not: null },
        workspaceId: workspaceId === "personal" ? null : { in: (await mappedWorkspaces(userId)).find(item => item.aliases.includes(workspaceId))!.aliases } },
      data: { archivedAt: archived ? new Date() : null },
    });
    return { id: websiteId, archived, changed: result.count > 0 };
  }
  async function createDashboardSite(userId: string, name: string, workspaceId: string) {
    await requireDashboardWorkspace(userId, workspaceId, true);
    const group = workspaceId === "personal" ? null : (await mappedWorkspaces(userId)).find(item => item.aliases.includes(workspaceId));
    if (workspaceId !== "personal" && !group) throw new AppError("Workspace not found or access denied", 404, "NOT_FOUND");
    return createWebsite({ userId, name, workspaceId: group?.id || null });
  }
  async function updateDashboardProfile(userId: string, fullName: string) {
    return db.user.update({ where: { id: userId }, data: { fullName }, select: { id: true, fullName: true } });
  }

  return { setDashboardSiteArchived, requireDashboardWorkspace, listDashboardWorkspaces, listDashboardSites, createDashboardSite, updateDashboardProfile };
}
