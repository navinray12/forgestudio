import type { ElementStyles } from "../../../pages/editor/WebsiteEditor";
import type { ClassScope } from "./classes.types";

export interface ExportedClassItem {
  name: string;
  key: string;
  styles: Partial<ElementStyles>;
  description?: string;
  isGlobal?: boolean;
  scope?: ClassScope;
}

export interface ExportedClassesPayload {
  version: string;
  type: "classes";
  exportedAt: string;
  classes: ExportedClassItem[];
}

export type ClassConflictResolutionMode = "keep_existing" | "replace_existing" | "create_new";

export interface ClassConflictItem {
  importedItem: ExportedClassItem;
  existingItem?: {
    id: string;
    name: string;
    key: string;
    styles: Partial<ElementStyles>;
    isGlobal?: boolean;
    scope?: ClassScope;
  };
  resolution: ClassConflictResolutionMode;
}
