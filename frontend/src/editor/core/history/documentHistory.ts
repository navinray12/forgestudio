import type { ForgeEditorDocument } from "../types/document";
import type {
  DocumentHistoryEntry,
  DocumentHistoryState,
} from "./historyTypes";

const DEFAULT_MAX_ENTRIES = 50;

/**
 * Deep clones a ForgeEditorDocument to ensure absolute snapshot isolation.
 * Prevents future live document mutations from modifying past history snapshots.
 */
export function cloneDocument(doc: ForgeEditorDocument): ForgeEditorDocument {
  if (typeof structuredClone === "function") {
    return structuredClone(doc);
  }
  return JSON.parse(JSON.stringify(doc)) as ForgeEditorDocument;
}

/**
 * Creates an initial DocumentHistoryState with a baseline document snapshot.
 */
export function createDocumentHistory(
  initialDocument: ForgeEditorDocument,
  maxEntries: number = DEFAULT_MAX_ENTRIES
): DocumentHistoryState {
  const safeMax = Math.max(1, maxEntries);
  const clonedDoc = cloneDocument(initialDocument);
  const initialEntry: DocumentHistoryEntry = {
    document: clonedDoc,
    timestamp: Date.now(),
    label: "Initial State",
  };

  return {
    entries: [initialEntry],
    index: 0,
    maxEntries: safeMax,
  };
}

/**
 * Pushes a new document snapshot onto history.
 * Truncates any existing redo branch and enforces maximum entries limit.
 */
export function pushDocumentSnapshot(
  state: DocumentHistoryState,
  newDocument: ForgeEditorDocument,
  label?: string
): DocumentHistoryState {
  const clonedDoc = cloneDocument(newDocument);
  const newEntry: DocumentHistoryEntry = {
    document: clonedDoc,
    timestamp: Date.now(),
    label,
  };

  // Truncate redo branch (keep entries 0..state.index)
  const truncatedEntries = state.index >= 0 ? state.entries.slice(0, state.index + 1) : [];
  const nextEntries = [...truncatedEntries, newEntry];

  // Enforce max entries limit
  if (nextEntries.length > state.maxEntries) {
    nextEntries.shift();
  }

  const nextIndex = nextEntries.length - 1;

  return {
    entries: nextEntries,
    index: nextIndex,
    maxEntries: state.maxEntries,
  };
}

/**
 * Moves history index back by one if possible.
 */
export function undoDocumentHistory(state: DocumentHistoryState): DocumentHistoryState {
  if (state.index <= 0) {
    return state;
  }
  return {
    ...state,
    index: state.index - 1,
  };
}

/**
 * Moves history index forward by one if possible.
 */
export function redoDocumentHistory(state: DocumentHistoryState): DocumentHistoryState {
  if (state.index >= state.entries.length - 1) {
    return state;
  }
  return {
    ...state,
    index: state.index + 1,
  };
}

/**
 * Gets a cloned snapshot of the document at the current history index.
 */
export function getCurrentDocumentSnapshot(
  state: DocumentHistoryState
): ForgeEditorDocument | null {
  if (state.index < 0 || state.index >= state.entries.length) {
    return null;
  }
  return cloneDocument(state.entries[state.index].document);
}

/**
 * Checks if undo is possible.
 */
export function canUndoDocumentHistory(state: DocumentHistoryState): boolean {
  return state.index > 0;
}

/**
 * Checks if redo is possible.
 */
export function canRedoDocumentHistory(state: DocumentHistoryState): boolean {
  return state.index < state.entries.length - 1;
}
