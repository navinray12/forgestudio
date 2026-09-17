/**
 * @file Atomic editor feature: atomic Editor Service. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { AtomicSectionConfig, AtomicEditorSection } from "../types/atomicEditor.types";

export const ATOMIC_SECTIONS: AtomicSectionConfig[] = [
  {
    id: "variables",
    label: "Variables",
    icon: "🎨",
    description: "Manage design system variables including colors, typography, and spacing tokens.",
  },
  {
    id: "classes",
    label: "Classes",
    icon: "🏷️",
    description: "Manage global utility classes and reusable CSS style rules.",
  },
  {
    id: "global-elements",
    label: "Global Elements",
    icon: "🌐",
    description: "Manage shared elements synchronized across multiple locations in your site.",
  },
  {
    id: "components",
    label: "Components",
    icon: "🧩",
    description: "Manage atomic UI components and reusable design symbol structures.",
  },
];

/**
 * Get Atomic Sections.
 */
export function getAtomicSections(): AtomicSectionConfig[] {
  return ATOMIC_SECTIONS;
}

/**
 * Get Section Config.
 * @param sectionId Section Id supplied to this operation (type: AtomicEditorSection).
 */
export function getSectionConfig(sectionId: AtomicEditorSection): AtomicSectionConfig | undefined {
  return ATOMIC_SECTIONS.find((s) => s.id === sectionId);
}
