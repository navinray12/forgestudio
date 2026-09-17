import type { VariableType } from "./variables.types";

export interface ExportedVariableItem {
  name: string;
  key: string;
  value: string;
  type: VariableType;
  description?: string;
  category?: string;
}

export interface ExportedVariablesPayload {
  version: string;
  type: "variables";
  exportedAt: string;
  variables: ExportedVariableItem[];
}

export type ConflictResolutionMode = "keep_existing" | "replace_existing" | "create_new";

export interface VariableConflictItem {
  importedItem: ExportedVariableItem;
  existingItem?: {
    id: string;
    name: string;
    key: string;
    value: string;
    type: VariableType;
  };
  resolution: ConflictResolutionMode;
}
