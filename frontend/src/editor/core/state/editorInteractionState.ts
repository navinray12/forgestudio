export type DropPosition = "before" | "after" | "inside" | null;

/**
 * EditorInteractionState
 * Strongly typed interface for transient drag-and-drop canvas interaction UI state.
 */
export interface EditorInteractionState {
  draggingId: string | null;
  dropTargetId: string | null;
  dropPosition: DropPosition;
}
