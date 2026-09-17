import type { EditorElement } from "../types";

/**
 * EditorHistoryState
 * Strongly typed interface for editor active-page undo/redo history stack state.
 */
export interface EditorHistoryState {
  history: EditorElement[][];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}
