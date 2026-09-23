import type { ElementStyles } from "../../../pages/editor/WebsiteEditor";
import type { AtomicVariable } from "./variables.types";
import type { AtomicClass } from "./classes.types";

export type StyleSourceType = "direct" | "variable";

export interface PropertyVariableBinding {
  source: StyleSourceType;
  variableKey?: string;
  variableId?: string;
  directValue?: string;
}

export interface ResolvedPropertyResult {
  value: string;
  isVariable: boolean;
  variableKey?: string;
  variableId?: string;
  isMissing?: boolean;
  isCircular?: boolean;
  rawVariable?: AtomicVariable;
}

export interface ResolvedClassStyle {
  resolvedStyles: Partial<ElementStyles>;
  missingVariables: string[];
  circularVariables: string[];
}

export interface VariableClassUsageInfo {
  variableId: string;
  variableKey: string;
  referencingClasses: AtomicClass[];
  usageCount: number;
}
