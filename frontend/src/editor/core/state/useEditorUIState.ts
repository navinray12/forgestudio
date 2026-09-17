import { useCallback } from "react";
import type { EditorSelectionState } from "./editorUIState";

export interface UseEditorUIStateOptions {
  selectedId: string | null;
  selectedIds: string[];
  hoveredId: string | null;
  setSelectedId: (id: string | null | ((prev: string | null) => string | null)) => void;
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setHoveredId: (id: string | null | ((prev: string | null) => string | null)) => void;
}

/**
 * useEditorUIState
 * React adapter hook providing a structured selection/hover state boundary over existing editor state pointers.
 * Does NOT maintain duplicate local React state.
 */
export function useEditorUIState(options: UseEditorUIStateOptions) {
  const {
    selectedId,
    selectedIds,
    hoveredId,
    setSelectedId,
    setSelectedIds,
    setHoveredId,
  } = options;

  const selectSingle = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setSelectedIds(id ? [id] : []);
    },
    [setSelectedId, setSelectedIds]
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedIds([]);
  }, [setSelectedId, setSelectedIds]);

  const clearHover = useCallback(() => {
    setHoveredId(null);
  }, [setHoveredId]);

  return {
    selectedId,
    selectedIds,
    hoveredId,
    setSelectedId,
    setSelectedIds,
    setHoveredId,
    selectSingle,
    clearSelection,
    clearHover,
  };
}
