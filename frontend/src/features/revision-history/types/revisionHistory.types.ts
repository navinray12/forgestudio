/**
 * @file Revision history feature: revision History types. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
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
  revisionType?: "MANUAL" | "PUBLISH" | "CHECKPOINT" | "RESTORE" | string;
  createdAt?: string;
  createdBy?: string;
  pageCount?: number;
  pages?: any[];
  siteParts?: any;
  globalSettings?: any;
  breakpoints?: any[];
  popups?: any[];
  pageCss?: string;
  homePageId?: string;
}

export interface RestoreConfirmationState {
  isOpen: boolean;
  revision: RevisionItem | null;
}

export type RevisionFilter = "all" | "today" | "week";
