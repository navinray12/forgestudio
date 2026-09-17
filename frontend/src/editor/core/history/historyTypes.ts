import type { ForgeEditorDocument } from "../types/document";

export interface DocumentHistoryEntry {
  document: ForgeEditorDocument;
  timestamp: number;
  label?: string;
}

export interface DocumentHistoryState {
  entries: DocumentHistoryEntry[];
  index: number;
  maxEntries: number;
}

export interface HistoryOptions {
  maxEntries?: number;
  label?: string;
}
