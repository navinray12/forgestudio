import { describe, it, expect, vi } from "vitest";
import { useEditorInteractionState } from "../state/useEditorInteractionState";

describe("useEditorInteractionState Contract & Helpers", () => {
  it("exposes passed interaction state pointers correctly", () => {
    const setDraggingId = vi.fn();
    const setDropTargetId = vi.fn();
    const setDropPosition = vi.fn();

    const state = useEditorInteractionState({
      draggingId: "el_1",
      setDraggingId,
      dropTargetId: "el_2",
      setDropTargetId,
      dropPosition: "inside",
      setDropPosition,
    });

    expect(state.draggingId).toBe("el_1");
    expect(state.dropTargetId).toBe("el_2");
    expect(state.dropPosition).toBe("inside");
  });

  it("startDragging sets draggingId pointer", () => {
    const setDraggingId = vi.fn();
    const setDropTargetId = vi.fn();
    const setDropPosition = vi.fn();

    const state = useEditorInteractionState({
      draggingId: null,
      setDraggingId,
      dropTargetId: null,
      setDropTargetId,
      dropPosition: null,
      setDropPosition,
    });

    state.startDragging("el_xyz");
    expect(setDraggingId).toHaveBeenCalledWith("el_xyz");
  });

  it("stopDragging resets dragging, dropTarget, and dropPosition pointers", () => {
    const setDraggingId = vi.fn();
    const setDropTargetId = vi.fn();
    const setDropPosition = vi.fn();

    const state = useEditorInteractionState({
      draggingId: "el_1",
      setDraggingId,
      dropTargetId: "el_2",
      setDropTargetId,
      dropPosition: "after",
      setDropPosition,
    });

    state.stopDragging();
    expect(setDraggingId).toHaveBeenCalledWith(null);
    expect(setDropTargetId).toHaveBeenCalledWith(null);
    expect(setDropPosition).toHaveBeenCalledWith(null);
  });

  it("setDropTarget updates dropTargetId and dropPosition atomically", () => {
    const setDraggingId = vi.fn();
    const setDropTargetId = vi.fn();
    const setDropPosition = vi.fn();

    const state = useEditorInteractionState({
      draggingId: "el_1",
      setDraggingId,
      dropTargetId: null,
      setDropTargetId,
      dropPosition: null,
      setDropPosition,
    });

    state.setDropTarget("el_container", "inside");
    expect(setDropTargetId).toHaveBeenCalledWith("el_container");
    expect(setDropPosition).toHaveBeenCalledWith("inside");
  });

  it("clearDropTarget resets dropTargetId and dropPosition", () => {
    const setDraggingId = vi.fn();
    const setDropTargetId = vi.fn();
    const setDropPosition = vi.fn();

    const state = useEditorInteractionState({
      draggingId: "el_1",
      setDraggingId,
      dropTargetId: "el_2",
      setDropTargetId,
      dropPosition: "before",
      setDropPosition,
    });

    state.clearDropTarget();
    expect(setDropTargetId).toHaveBeenCalledWith(null);
    expect(setDropPosition).toHaveBeenCalledWith(null);
  });
});
