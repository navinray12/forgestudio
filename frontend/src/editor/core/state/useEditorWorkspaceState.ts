import { useCallback } from "react";
import type { LeftSidebarTab, EditorWorkspaceState } from "./editorWorkspaceState";

export interface UseEditorWorkspaceStateOptions {
  leftSidebarTab: LeftSidebarTab;
  setLeftSidebarTab: (tab: LeftSidebarTab | ((prev: LeftSidebarTab) => LeftSidebarTab)) => void;
  activeSidebarTab: string;
  setActiveSidebarTab: (tab: string | ((prev: string) => string)) => void;
  collapsedContainers: Record<string, boolean>;
  setCollapsedContainers: (
    containers: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void;
}

/**
 * useEditorWorkspaceState
 * React adapter hook providing a structured workspace state boundary over existing editor state pointers.
 * Does NOT maintain duplicate local React state.
 */
export function useEditorWorkspaceState(options: UseEditorWorkspaceStateOptions) {
  const {
    leftSidebarTab,
    setLeftSidebarTab,
    activeSidebarTab,
    setActiveSidebarTab,
    collapsedContainers,
    setCollapsedContainers,
  } = options;

  const setSidebarTab = useCallback(
    (tab: LeftSidebarTab) => {
      setLeftSidebarTab(tab);
    },
    [setLeftSidebarTab]
  );

  const toggleContainerCollapsed = useCallback(
    (containerId: string) => {
      setCollapsedContainers((prev) => ({
        ...prev,
        [containerId]: !prev[containerId],
      }));
    },
    [setCollapsedContainers]
  );

  const isContainerCollapsed = useCallback(
    (containerId: string): boolean => {
      return Boolean(collapsedContainers[containerId]);
    },
    [collapsedContainers]
  );

  const expandContainer = useCallback(
    (containerId: string) => {
      setCollapsedContainers((prev) => ({
        ...prev,
        [containerId]: false,
      }));
    },
    [setCollapsedContainers]
  );

  const collapseContainer = useCallback(
    (containerId: string) => {
      setCollapsedContainers((prev) => ({
        ...prev,
        [containerId]: true,
      }));
    },
    [setCollapsedContainers]
  );

  return {
    leftSidebarTab,
    setLeftSidebarTab,
    activeSidebarTab,
    setActiveSidebarTab,
    collapsedContainers,
    setCollapsedContainers,
    setSidebarTab,
    toggleContainerCollapsed,
    isContainerCollapsed,
    expandContainer,
    collapseContainer,
  };
}
