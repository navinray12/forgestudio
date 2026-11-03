export interface DashboardWorkspaceOption { id: string; name: string; aliases?: string[]; workspaceType?: "STANDARD" | "DEVELOPER"; userRole?: string; lifecycleStatus?: string; updatedAt?: string }

export function showPersonalWorkspace(workspaces: DashboardWorkspaceOption[], personalSiteCount: number) {
  return personalSiteCount > 0 || workspaces.length === 0;
}

export function resolveDashboardWorkspace(workspaces: DashboardWorkspaceOption[], personalSiteCount: number, saved: string | null) {
  const actual = workspaces.find(item => item.id === saved || item.aliases?.includes(saved || ""));
  if (actual) return actual.id;
  if (saved === "personal" && showPersonalWorkspace(workspaces, personalSiteCount)) return "personal";
  return workspaces[0]?.id || "personal";
}
