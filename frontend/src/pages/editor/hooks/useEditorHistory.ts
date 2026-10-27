import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import type { EditorElement } from "../types";

const MAX_HISTORY_ENTRIES = 50;

function cloneElements(elements: EditorElement[]): EditorElement[] {
  return JSON.parse(JSON.stringify(elements)) as EditorElement[];
}

interface UseEditorHistoryOptions {
  elements: EditorElement[];
  setElements: Dispatch<SetStateAction<EditorElement[]>>;
}

export interface EditorHistoryController {
  history: EditorElement[][];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  resetHistory: (elements: EditorElement[]) => void;
}

/** Owns editor snapshot recording and undo/redo traversal. */
export function useEditorHistory({
  elements,
  setElements,
}: UseEditorHistoryOptions): EditorHistoryController {
  const [history, setHistory] = useState<EditorElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    setHistory((previous) => {
      const sliced = historyIndex >= 0 ? previous.slice(0, historyIndex + 1) : previous;
      const updated = [...sliced, cloneElements(elements)];
      if (updated.length > MAX_HISTORY_ENTRIES) updated.shift();
      return updated;
    });

    setHistoryIndex(historyIndex >= 0 ? Math.min(historyIndex + 1, MAX_HISTORY_ENTRIES - 1) : 0);
    // This intentionally records only element changes. Including historyIndex
    // would create a second snapshot when traversing history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  const undo = () => {
    if (historyIndex > 0 && history[historyIndex - 1]) {
      isUndoRedoAction.current = true;
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setElements(cloneElements(history[nextIndex]));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      isUndoRedoAction.current = true;
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElements(cloneElements(history[nextIndex]));
    }
  };

  const resetHistory = (nextElements: EditorElement[]) => {
    setHistory([nextElements]);
    setHistoryIndex(0);
  };

  return { history, historyIndex, undo, redo, resetHistory };
}
