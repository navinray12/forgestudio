/**
 * EditorSelectionState
 * Strongly typed interface for element selection and hover UI state.
 */
export interface EditorSelectionState {
  selectedId: string | null;
  selectedIds: string[];
  hoveredId: string | null;
}
