import { useState, useRef, useEffect, useCallback } from "react";
import type { EditorElement } from "../types";
import { findTreeElement } from "../utils";

interface UseEditorHistoryProps {
  elements: EditorElement[];
  setElements: React.Dispatch<React.SetStateAction<EditorElement[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  maxHistory?: number;
  isLoadingWebsite?: boolean;
}

export function useEditorHistory({
  elements,
  setElements,
  selectedId,
  setSelectedId,
  setSelectedIds,
  maxHistory = 50,
  isLoadingWebsite = false,
}: UseEditorHistoryProps) {
  const [history, setHistory] = useState<EditorElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoActionRef = useRef<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  // Initialize or record changes to history
  useEffect(() => {
    if (isLoadingWebsite) return;

    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false;
      return;
    }

    // Protection against initial empty state before website data arrives
    if (!isInitializedRef.current) {
      if (elements.length > 0) {
        setHistory([JSON.parse(JSON.stringify(elements))]);
        setHistoryIndex(0);
        isInitializedRef.current = true;
      }
      return;
    }

    // Check if the current elements actually differ from the latest history snapshot
    setHistory((prev) => {
      const currentSnapshotStr = JSON.stringify(elements);
      const currentIndex = historyIndex >= 0 ? historyIndex : prev.length - 1;
      const latestInHistoryStr = prev[currentIndex] ? JSON.stringify(prev[currentIndex]) : null;

      if (currentSnapshotStr === latestInHistoryStr) {
        return prev;
      }

      // Drop redo forward branch and append new snapshot
      const sliced = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : prev;
      const updated = [...sliced, JSON.parse(JSON.stringify(elements))];

      // Enforce bounded history queue
      if (updated.length > maxHistory) {
        updated.shift();
      }
      return updated;
    });

    setHistoryIndex((prevIndex) => {
      if (prevIndex < 0) return 0;
      return Math.min(prevIndex + 1, maxHistory - 1);
    });
  }, [elements, isLoadingWebsite, maxHistory]);

  /**
   * Reset history stack (e.g. on page switch or revision restoration)
   */
  const resetHistory = useCallback((initialSnapshot: EditorElement[]) => {
    const clone = JSON.parse(JSON.stringify(initialSnapshot || []));
    setHistory([clone]);
    setHistoryIndex(0);
    isInitializedRef.current = true;
  }, []);

  /**
   * Undo to previous snapshot
   */
  const undo = useCallback(() => {
    if (historyIndex > 0 && history[historyIndex - 1]) {
      isUndoRedoActionRef.current = true;
      const targetIndex = historyIndex - 1;
      const targetSnapshot: EditorElement[] = JSON.parse(JSON.stringify(history[targetIndex]));
      setHistoryIndex(targetIndex);
      setElements(targetSnapshot);

      // Preserve selection if element still exists in restored snapshot
      if (selectedId) {
        const stillExists = findTreeElement(targetSnapshot, selectedId);
        if (!stillExists) {
          setSelectedId(null);
          setSelectedIds([]);
        }
      }
    }
  }, [historyIndex, history, selectedId, setElements, setSelectedId, setSelectedIds]);

  /**
   * Redo to next snapshot
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      isUndoRedoActionRef.current = true;
      const targetIndex = historyIndex + 1;
      const targetSnapshot: EditorElement[] = JSON.parse(JSON.stringify(history[targetIndex]));
      setHistoryIndex(targetIndex);
      setElements(targetSnapshot);

      // Preserve selection if element still exists
      if (selectedId) {
        const stillExists = findTreeElement(targetSnapshot, selectedId);
        if (!stillExists) {
          setSelectedId(null);
          setSelectedIds([]);
        }
      }
    }
  }, [historyIndex, history, selectedId, setElements, setSelectedId, setSelectedIds]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

  return {
    history,
    historyIndex,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  };
}
