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

interface HistoryState {
  history: EditorElement[][];
  historyIndex: number;
}

function cloneSnapshot<T>(data: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data));
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
  const [historyState, setHistoryState] = useState<HistoryState>(() => {
    if (!isLoadingWebsite && elements && elements.length > 0) {
      const initialClone = cloneSnapshot(elements);
      return {
        history: [initialClone],
        historyIndex: 0,
      };
    }
    return {
      history: [],
      historyIndex: -1,
    };
  });

  const isUndoRedoActionRef = useRef<boolean>(false);
  const snapshotStringCache = useRef<WeakMap<EditorElement[], string>>(new WeakMap());

  // Initialize or record changes to history
  useEffect(() => {
    if (isLoadingWebsite) return;

    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false;
      return;
    }

    if (elements.length === 0) return;

    setHistoryState((prevState) => {
      const { history, historyIndex } = prevState;

      // Protection against initial empty state before website data arrives
      if (history.length === 0) {
        const currentSnapshotStr = JSON.stringify(elements);
        const snapshot: EditorElement[] = JSON.parse(currentSnapshotStr);
        snapshotStringCache.current.set(snapshot, currentSnapshotStr);
        return {
          history: [snapshot],
          historyIndex: 0,
        };
      }

      const currentIndex = historyIndex >= 0 ? historyIndex : history.length - 1;
      const currentSnapshot = history[currentIndex];

      // Quick reference check: identical reference means no changes were made
      if (currentSnapshot && elements === currentSnapshot) {
        return prevState;
      }

      // Serialize current elements once
      const currentSnapshotStr = JSON.stringify(elements);

      // Fast cache lookup for previous snapshot's string (O(1) without re-stringifying)
      let latestInHistoryStr = currentSnapshot ? snapshotStringCache.current.get(currentSnapshot) : null;
      if (latestInHistoryStr === undefined && currentSnapshot) {
        latestInHistoryStr = JSON.stringify(currentSnapshot);
        snapshotStringCache.current.set(currentSnapshot, latestInHistoryStr);
      }

      // Check if current elements actually differ from the latest history snapshot
      if (currentSnapshotStr === latestInHistoryStr) {
        return prevState;
      }

      // Drop redo forward branch and append new snapshot
      // Re-use currentSnapshotStr to avoid double stringification
      const sliced = historyIndex >= 0 ? history.slice(0, historyIndex + 1) : history;
      const newSnapshot: EditorElement[] = JSON.parse(currentSnapshotStr);
      snapshotStringCache.current.set(newSnapshot, currentSnapshotStr);

      const updated = [...sliced, newSnapshot];

      // Enforce bounded history queue
      if (updated.length > maxHistory) {
        updated.shift();
      }

      const nextIndex = Math.min(
        historyIndex >= 0 ? historyIndex + 1 : updated.length - 1,
        maxHistory - 1
      );

      return {
        history: updated,
        historyIndex: nextIndex,
      };
    });
  }, [elements, isLoadingWebsite, maxHistory]);

  /**
   * Reset history stack (e.g. on page switch or revision restoration)
   */
  const resetHistory = useCallback((initialSnapshot: EditorElement[]) => {
    const safeSnapshot = initialSnapshot || [];
    const str = JSON.stringify(safeSnapshot);
    const clone: EditorElement[] = JSON.parse(str);
    snapshotStringCache.current.set(clone, str);
    setHistoryState({
      history: [clone],
      historyIndex: 0,
    });
  }, []);

  /**
   * Undo to previous snapshot
   */
  const undo = useCallback(() => {
    if (historyState.historyIndex > 0 && historyState.history[historyState.historyIndex - 1]) {
      isUndoRedoActionRef.current = true;
      const targetIndex = historyState.historyIndex - 1;
      const targetSnapshot: EditorElement[] = cloneSnapshot(historyState.history[targetIndex]);
      setHistoryState((prev) => ({
        ...prev,
        historyIndex: targetIndex,
      }));
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
  }, [historyState, selectedId, setElements, setSelectedId, setSelectedIds]);

  /**
   * Redo to next snapshot
   */
  const redo = useCallback(() => {
    if (
      historyState.historyIndex >= 0 &&
      historyState.historyIndex < historyState.history.length - 1 &&
      historyState.history[historyState.historyIndex + 1]
    ) {
      isUndoRedoActionRef.current = true;
      const targetIndex = historyState.historyIndex + 1;
      const targetSnapshot: EditorElement[] = cloneSnapshot(historyState.history[targetIndex]);
      setHistoryState((prev) => ({
        ...prev,
        historyIndex: targetIndex,
      }));
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
  }, [historyState, selectedId, setElements, setSelectedId, setSelectedIds]);

  const canUndo = historyState.historyIndex > 0;
  const canRedo =
    historyState.historyIndex >= 0 &&
    historyState.historyIndex < historyState.history.length - 1;

  return {
    history: historyState.history,
    historyIndex: historyState.historyIndex,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  };
}
