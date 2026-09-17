import { useCallback } from "react";
import type { EditorElement, ForgeEditorDocument } from "../types";
import type { EditorHistoryState } from "./editorHistoryState";
import type { EditorCommand } from "../commands/commands";
import { executeCommand } from "../commands/commandExecutor";

export interface UseEditorHistoryOptions {
  history: EditorElement[][];
  historyIndex: number;
  setHistory: (history: EditorElement[][] | ((prev: EditorElement[][]) => EditorElement[][])) => void;
  setHistoryIndex: (index: number | ((prev: number) => number)) => void;
  elements: EditorElement[];
  setElements: (elements: EditorElement[] | ((prev: EditorElement[]) => EditorElement[])) => void;
  handleUndo?: () => void;
  handleRedo?: () => void;
}

/**
 * useEditorHistory
 * Controlled adapter hook linking the command system to the active WebsiteEditor undo/redo history.
 * Does NOT maintain duplicate local React state or a second history stack.
 */
export function useEditorHistory(options: UseEditorHistoryOptions) {
  const {
    history,
    historyIndex,
    setHistory,
    setHistoryIndex,
    elements,
    setElements,
    handleUndo,
    handleRedo,
  } = options;

  const canUndo = historyIndex > 0 && Boolean(history[historyIndex - 1]);
  const canRedo = historyIndex < history.length - 1 && Boolean(history[historyIndex + 1]);

  const undo = useCallback(() => {
    if (handleUndo) {
      handleUndo();
      return;
    }
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }, [canUndo, handleUndo, history, historyIndex, setElements, setHistoryIndex]);

  const redo = useCallback(() => {
    if (handleRedo) {
      handleRedo();
      return;
    }
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }, [canRedo, handleRedo, history, historyIndex, setElements, setHistoryIndex]);

  /**
   * dispatchCommand
   * Executes a command on the current element tree via commandExecutor and updates elements state.
   */
  const dispatchCommand = useCallback(
    (command: EditorCommand): EditorElement[] => {
      const tempDoc: ForgeEditorDocument = {
        version: 1,
        homePageId: "home",
        pages: [],
        siteSettings: { siteName: "Site" },
        globalStyles: {
          colors: {
            primary: "#000000",
            secondary: "#ffffff",
            accent: "#0066cc",
            background: "#ffffff",
            text: "#333333",
          },
          typography: {
            fontFamily: "sans-serif",
            headingFontFamily: "sans-serif",
            baseFontSize: "16px",
            h1Size: "32px",
            h2Size: "24px",
            h3Size: "20px",
            lineHeight: "1.5",
          },
          buttonStyles: {
            borderRadius: "4px",
            padding: "8px 16px",
            backgroundColor: "#000000",
            textColor: "#ffffff",
          },
        },
        siteParts: {},
        navigation: [],
        publishing: { status: "DRAFT" },
        deployment: { provider: "none" },
        elements,
        pageSettings: {},
        popups: [],
        pageCss: "",
        globalSettings: {},
      };

      const updatedDoc = executeCommand(tempDoc, command);
      const nextElements = updatedDoc.elements || elements;
      setElements(nextElements);
      return nextElements;
    },
    [elements, setElements]
  );

  return {
    history,
    historyIndex,
    canUndo,
    canRedo,
    undo,
    redo,
    dispatchCommand,
    setHistory,
    setHistoryIndex,
  };
}
