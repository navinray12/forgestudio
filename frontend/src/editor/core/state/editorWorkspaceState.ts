export type LeftSidebarTab = "elements" | "navigator" | "templates";

/**
 * EditorWorkspaceState
 * Strongly typed interface for sidebar navigation tabs and workspace layer container collapsing UI state.
 */
export interface EditorWorkspaceState {
  leftSidebarTab: LeftSidebarTab;
  activeSidebarTab: string;
  collapsedContainers: Record<string, boolean>;
}
