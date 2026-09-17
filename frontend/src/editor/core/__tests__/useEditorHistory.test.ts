import { describe, it, expect, vi } from "vitest";
import { useEditorHistory } from "../state/useEditorHistory";
import type { EditorElement } from "../types";

describe("useEditorHistory Contract & Helpers", () => {
  const sampleElements: EditorElement[] = [
    { id: "el_1", type: "heading", content: "Original" },
  ];

  it("calculates canUndo and canRedo accurately based on historyIndex and history bounds", () => {
    const setHistory = vi.fn();
    const setHistoryIndex = vi.fn();
    const setElements = vi.fn();

    const stateAtStart = useEditorHistory({
      history: [sampleElements],
      historyIndex: 0,
      setHistory,
      setHistoryIndex,
      elements: sampleElements,
      setElements,
    });

    expect(stateAtStart.canUndo).toBe(false);
    expect(stateAtStart.canRedo).toBe(false);

    const stateWithUndoRedo = useEditorHistory({
      history: [sampleElements, sampleElements, sampleElements],
      historyIndex: 1,
      setHistory,
      setHistoryIndex,
      elements: sampleElements,
      setElements,
    });

    expect(stateWithUndoRedo.canUndo).toBe(true);
    expect(stateWithUndoRedo.canRedo).toBe(true);
  });

  it("undo delegates to handleUndo callback when provided", () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();

    const state = useEditorHistory({
      history: [sampleElements, sampleElements],
      historyIndex: 1,
      setHistory: vi.fn(),
      setHistoryIndex: vi.fn(),
      elements: sampleElements,
      setElements: vi.fn(),
      handleUndo,
      handleRedo,
    });

    state.undo();
    expect(handleUndo).toHaveBeenCalledTimes(1);
  });

  it("redo delegates to handleRedo callback when provided", () => {
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();

    const state = useEditorHistory({
      history: [sampleElements, sampleElements],
      historyIndex: 0,
      setHistory: vi.fn(),
      setHistoryIndex: vi.fn(),
      elements: sampleElements,
      setElements: vi.fn(),
      handleUndo,
      handleRedo,
    });

    state.redo();
    expect(handleRedo).toHaveBeenCalledTimes(1);
  });

  it("dispatchCommand executes commandExecutor and passes updated elements to setElements", () => {
    const setElements = vi.fn();

    const state = useEditorHistory({
      history: [sampleElements],
      historyIndex: 0,
      setHistory: vi.fn(),
      setHistoryIndex: vi.fn(),
      elements: sampleElements,
      setElements,
    });

    const result = state.dispatchCommand({
      type: "UPDATE_PROPS",
      elementId: "el_1",
      props: { content: "Dispatched Title" },
    });

    expect(result[0].content).toBe("Dispatched Title");
    expect(setElements).toHaveBeenCalledWith(result);
  });
});
