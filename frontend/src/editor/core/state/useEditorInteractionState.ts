import { useCallback } from "react";
import type { DropPosition, EditorInteractionState } from "./editorInteractionState";

export interface UseEditorInteractionStateOptions {
  draggingId: string | null;
  setDraggingId: (id: string | null | ((prev: string | null) => string | null)) => void;
  dropTargetId: string | null;
  setDropTargetId: (id: string | null | ((prev: string | null) => string | null)) => void;
  dropPosition: DropPosition;
  setDropPosition: (pos: DropPosition | ((prev: DropPosition) => DropPosition)) => void;
}

/**
 * useEditorInteractionState
 * React adapter hook providing a structured interaction state boundary over existing transient drag-and-drop state pointers.
 * Does NOT maintain duplicate local React state.
 */
export function useEditorInteractionState(options: UseEditorInteractionStateOptions) {
  const {
    draggingId,
    setDraggingId,
    dropTargetId,
    setDropTargetId,
    dropPosition,
    setDropPosition,
  } = options;

  const startDragging = useCallback(
    (id: string) => {
      setDraggingId(id);
    },
    [setDraggingId]
  );

  const stopDragging = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
    setDropPosition(null);
  }, [setDraggingId, setDropTargetId, setDropPosition]);

  const setDropTarget = useCallback(
    (id: string | null, position: DropPosition = null) => {
      setDropTargetId(id);
      setDropPosition(position);
    },
    [setDropTargetId, setDropPosition]
  );

  const clearDropTarget = useCallback(() => {
    setDropTargetId(null);
    setDropPosition(null);
  }, [setDropTargetId, setDropPosition]);

  return {
    draggingId,
    setDraggingId,
    dropTargetId,
    setDropTargetId,
    dropPosition,
    setDropPosition,
    startDragging,
    stopDragging,
    setDropTarget,
    clearDropTarget,
  };
}
