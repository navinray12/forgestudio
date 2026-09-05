import type { EditorElement } from "../../../pages/editor/WebsiteEditor";

export interface PageSettingsData {
  title?: string;
  description?: string;
  path?: string;
  backgroundColor?: string;
  customHead?: string;
  isMaintenanceMode?: boolean;
  siteLanguage?: string;
  [key: string]: unknown;
}

export interface RevisionItem {
  id: string;
  websiteId: string;
  timestamp: number;
  description: string;
  elements: EditorElement[];
  pageSettings?: PageSettingsData;
  elementCount: number;
  author?: string;
  version?: number;
}

export interface RestoreConfirmationState {
  isOpen: boolean;
  revision: RevisionItem | null;
}

export type RevisionFilter = "all" | "today" | "week";
