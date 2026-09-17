import type { EditorElement, PageConfig } from "../../../pages/editor/types";

// Re-export core types for clean access
export type { ElementType, EditorElement, PageConfig, DeviceMode } from "../../../pages/editor/types";

export interface EditorIdentity {
  websiteId?: string;
  pageId?: string;
  readOnly: boolean;
}

export interface EditorDocumentState {
  elements: EditorElement[];
  pages: PageConfig[];
  activePageId: string;
  pageSettings: Record<string, any>;
  siteParts: {
    header?: { enabled?: boolean; elements?: EditorElement[] };
    footer?: { enabled?: boolean; elements?: EditorElement[] };
  };
  globalSettings: Record<string, any>;
  popups: any[];
  pageCss: string;
  publishing: Record<string, any>;
}

export interface EditorUIState {
  selectedId: string | null;
  selectedIds: string[];
  hoveredId: string | null;
  activeDevice: "desktop" | "tablet" | "mobile";
  canvasMode: "page" | "header" | "footer";
  activeSidebarTab: string;
  leftSidebarTab: "elements" | "navigator" | "templates";
  isPreview: boolean;
  isFullScreenCanvas: boolean;
}

export interface EditorOperationState {
  history: EditorElement[][];
  historyIndex: number;
  loading: boolean;
  saving: boolean;
  saveMessage: string;
  errorMessage: string;
}

export interface EditorState {
  identity: EditorIdentity;
  document: any; // ForgeEditorDocument
  ui: EditorUIState;
  operation: EditorOperationState;
}
