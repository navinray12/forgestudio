/**
 * @file Atomic editor feature: controlled Component types. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
export interface EditablePropertyConfig {
  key: string;
  label: string;
  category: "content" | "style" | "layout";
  isEditable: boolean;
  defaultValue?: string;
  description?: string;
}

export interface ComponentLockSettings {
  componentId: string;
  allowedEditableKeys: string[];
}

export interface InstancePropertyOverride {
  instanceId: string;
  componentId: string;
  overrides: Record<string, string>; // propertyKey -> overrideValue
}

export interface ResolvedComponentProperty {
  key: string;
  label: string;
  category: "content" | "style" | "layout";
  isEditable: boolean;
  defaultValue: string;
  effectiveValue: string;
  isOverridden: boolean;
}
