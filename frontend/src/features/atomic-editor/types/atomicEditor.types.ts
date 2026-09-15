/**
 * @file Atomic editor feature: atomic Editor types. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
export type AtomicEditorSection = "variables" | "classes" | "global-elements" | "components";

export interface AtomicSectionConfig {
  id: AtomicEditorSection;
  label: string;
  icon: string;
  description: string;
}

