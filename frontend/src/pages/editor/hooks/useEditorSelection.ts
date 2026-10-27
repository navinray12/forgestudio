import { useState, type Dispatch, type MouseEvent, type SetStateAction } from "react";

import { getAllElementIds } from "../state/editorTree";
import type { EditorElement, ElementState } from "../types";

interface UseEditorSelectionOptions {
  elements: EditorElement[];
  setActiveElementState: Dispatch<SetStateAction<ElementState>>;
}

export interface EditorSelectionController {
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  selectElement: (id: string | null, event?: MouseEvent) => void;
}

/**
 * Owns the editor's single and range-selection rules.
 *
 * Callers retain the setters because page switches, deletion and audit
 * navigation intentionally reset or focus selection outside pointer events.
 */
export function useEditorSelection({
  elements,
  setActiveElementState,
}: UseEditorSelectionOptions): EditorSelectionController {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectElement = (id: string | null, event?: MouseEvent) => {
    setActiveElementState("normal");
    if (!id) {
      setSelectedId(null);
      setSelectedIds([]);
      return;
    }

    if (event && (event.ctrlKey || event.metaKey)) {
      setSelectedIds((previous) => {
        const updated = previous.includes(id)
          ? previous.filter((item) => item !== id)
          : [...previous, id];
        setSelectedId(updated.length > 0 ? updated[updated.length - 1] : null);
        return updated;
      });
      return;
    }

    if (event?.shiftKey && selectedId && elements.length > 0) {
      const allIds = getAllElementIds(elements);
      const startIndex = allIds.indexOf(selectedId);
      const endIndex = allIds.indexOf(id);
      if (startIndex !== -1 && endIndex !== -1) {
        const firstIndex = Math.min(startIndex, endIndex);
        const lastIndex = Math.max(startIndex, endIndex);
        const rangeIds = allIds.slice(firstIndex, lastIndex + 1);
        setSelectedIds((previous) => Array.from(new Set([...previous, ...rangeIds])));
        setSelectedId(id);
        return;
      }
    }

    setSelectedId(id);
    setSelectedIds([id]);
  };

  return {
    selectedId,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    selectElement,
  };
}
