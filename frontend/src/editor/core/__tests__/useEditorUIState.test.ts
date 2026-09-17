import { describe, it, expect, vi } from "vitest";
import { useEditorUIState } from "../state/useEditorUIState";

describe("useEditorUIState Contract & Helpers", () => {
  it("exposes passed selection pointers correctly", () => {
    const setSelectedId = vi.fn();
    const setSelectedIds = vi.fn();
    const setHoveredId = vi.fn();

    const state = useEditorUIState({
      selectedId: "el_123",
      selectedIds: ["el_123"],
      hoveredId: "el_456",
      setSelectedId,
      setSelectedIds,
      setHoveredId,
    });

    expect(state.selectedId).toBe("el_123");
    expect(state.selectedIds).toEqual(["el_123"]);
    expect(state.hoveredId).toBe("el_456");
  });

  it("selectSingle updates both selectedId and selectedIds atomically", () => {
    const setSelectedId = vi.fn();
    const setSelectedIds = vi.fn();
    const setHoveredId = vi.fn();

    const state = useEditorUIState({
      selectedId: null,
      selectedIds: [],
      hoveredId: null,
      setSelectedId,
      setSelectedIds,
      setHoveredId,
    });

    state.selectSingle("el_999");
    expect(setSelectedId).toHaveBeenCalledWith("el_999");
    expect(setSelectedIds).toHaveBeenCalledWith(["el_999"]);
  });

  it("clearSelection resets both selectedId and selectedIds", () => {
    const setSelectedId = vi.fn();
    const setSelectedIds = vi.fn();
    const setHoveredId = vi.fn();

    const state = useEditorUIState({
      selectedId: "el_1",
      selectedIds: ["el_1", "el_2"],
      hoveredId: null,
      setSelectedId,
      setSelectedIds,
      setHoveredId,
    });

    state.clearSelection();
    expect(setSelectedId).toHaveBeenCalledWith(null);
    expect(setSelectedIds).toHaveBeenCalledWith([]);
  });

  it("clearHover resets hoveredId independently", () => {
    const setSelectedId = vi.fn();
    const setSelectedIds = vi.fn();
    const setHoveredId = vi.fn();

    const state = useEditorUIState({
      selectedId: "el_1",
      selectedIds: ["el_1"],
      hoveredId: "el_2",
      setSelectedId,
      setSelectedIds,
      setHoveredId,
    });

    state.clearHover();
    expect(setHoveredId).toHaveBeenCalledWith(null);
    expect(setSelectedId).not.toHaveBeenCalled();
    expect(setSelectedIds).not.toHaveBeenCalled();
  });
});
