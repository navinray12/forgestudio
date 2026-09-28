export type View = "all" | "favorites" | "archived" | "shared";
export type Panel = "sites" | "activity" | "workspace" | "apps" | "cms" | "developer" | "billing" | "performance";
export interface Workspace { id: string; name: string; role: string; canManage: boolean }
export interface Folder { id: string; name: string }
export interface Site {
  id: string; name: string; slug: string; status: string; workspaceId: string | null;
  folderId: string | null; archivedAt: string | null; favorite: boolean; revision: number;
  canManage: boolean; pageCount: number; createdAt: string; updatedAt: string; lastPublishedAt: string | null;
}
export interface SiteResult { sites: Site[]; folders: Folder[]; total: number; page: number; limit: number }
export interface Bootstrap { workspaces: Workspace[]; plan: { name: string; websiteLimit: number } }
export interface ActivityEvent { id: string; action: string; label: string; createdAt: string; siteId: string | null }
export interface Member { id: string; fullName: string | null; email: string | null; role: string }
export type DialogState = {
  type: "create" | "copy" | "rename" | "move" | "archive" | "folder" | "renameFolder" | "deleteFolder" | "workspace" | "renameWorkspace";
  site?: Site; folder?: Folder;
};
