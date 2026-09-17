import type { ForgeEditorDocument, PageConfig } from "../types";

/**
 * EditorDocumentState
 * State contract representing the document layer and active page pointer.
 */
export interface EditorDocumentState {
  document: ForgeEditorDocument | null;
  activePageId: string;
}
