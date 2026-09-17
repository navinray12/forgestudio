import type { EditorState, ForgeEditorDocument, EditorElement, PageConfig } from "../types";
import { getElementById, getActivePage } from "../selectors/documentSelectors";

/**
 * selectDocument
 * Returns document from editor state.
 */
export function selectDocument(state: EditorState): ForgeEditorDocument | null {
  return state?.document || null;
}

/**
 * selectSelectedElement
 * Returns currently selected element object from editor state.
 */
export function selectSelectedElement(state: EditorState): EditorElement | null {
  if (!state?.document || !state?.ui?.selectedId) return null;
  return getElementById(state.document, state.ui.selectedId);
}

/**
 * selectActivePage
 * Returns current active page config object from editor state.
 */
export function selectActivePage(state: EditorState): PageConfig | null {
  if (!state?.document) return null;
  return getActivePage(state.document, state.identity?.pageId);
}

/**
 * selectActiveDevice
 * Returns current active device mode ("desktop" | "tablet" | "mobile").
 */
export function selectActiveDevice(state: EditorState): "desktop" | "tablet" | "mobile" {
  return state?.ui?.activeDevice || "desktop";
}

/**
 * selectIsDirty
 * Returns boolean indicating whether there are unsaved operations/history changes.
 */
export function selectIsDirty(state: EditorState): boolean {
  if (!state?.operation) return false;
  return (state.operation.historyIndex || 0) > 0;
}
