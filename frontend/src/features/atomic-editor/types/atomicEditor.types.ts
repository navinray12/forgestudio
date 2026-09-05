export type AtomicEditorSection = "variables" | "classes" | "global-elements" | "components";

export interface AtomicSectionConfig {
  id: AtomicEditorSection;
  label: string;
  icon: string;
  description: string;
}

