import { describe, it, expect, vi } from "vitest";
import { useEditorWorkspaceState } from "../state/useEditorWorkspaceState";

describe("useEditorWorkspaceState Contract & Helpers", () => {
  it("exposes passed workspace state pointers correctly", () => {
    const setLeftSidebarTab = vi.fn();
    const setActiveSidebarTab = vi.fn();
    const setCollapsedContainers = vi.fn();

    const state = useEditorWorkspaceState({
      leftSidebarTab: "elements",
      setLeftSidebarTab,
      activeSidebarTab: "widgets",
      setActiveSidebarTab,
      collapsedContainers: { c_1: true },
      setCollapsedContainers,
    });

    expect(state.leftSidebarTab).toBe("elements");
    expect(state.activeSidebarTab).toBe("widgets");
    expect(state.isContainerCollapsed("c_1")).toBe(true);
    expect(state.isContainerCollapsed("c_2")).toBe(false);
  });

  it("setSidebarTab updates leftSidebarTab pointer", () => {
    const setLeftSidebarTab = vi.fn();
    const setActiveSidebarTab = vi.fn();
    const setCollapsedContainers = vi.fn();

    const state = useEditorWorkspaceState({
      leftSidebarTab: "elements",
      setLeftSidebarTab,
      activeSidebarTab: "widgets",
      setActiveSidebarTab,
      collapsedContainers: {},
      setCollapsedContainers,
    });

    state.setSidebarTab("navigator");
    expect(setLeftSidebarTab).toHaveBeenCalledWith("navigator");
  });

  it("expandContainer and collapseContainer update collapsedContainers record", () => {
    const setLeftSidebarTab = vi.fn();
    const setActiveSidebarTab = vi.fn();
    const setCollapsedContainers = vi.fn();

    const state = useEditorWorkspaceState({
      leftSidebarTab: "elements",
      setLeftSidebarTab,
      activeSidebarTab: "widgets",
      setActiveSidebarTab,
      collapsedContainers: {},
      setCollapsedContainers,
    });

    state.collapseContainer("container_abc");
    expect(setCollapsedContainers).toHaveBeenCalledTimes(1);

    state.expandContainer("container_abc");
    expect(setCollapsedContainers).toHaveBeenCalledTimes(2);
  });
});
