import type { FormFieldConfig, FormFieldType } from "../types/atomicForm.types";

/**
 * Sanitizes a label into a valid camelCase field name key
 */
export function sanitizeFieldName(label: string): string {
  const cleaned = label
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/\s+/g, "");

  if (!cleaned) return "field";
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

/**
 * Creates a default form field with sensible initial settings
 */
export function createDefaultField(label: string, type: FormFieldType = "text"): FormFieldConfig {
  const name = sanitizeFieldName(label);
  const id = `field-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const base: FormFieldConfig = {
    id,
    name,
    label,
    type,
    required: false,
    placeholder: `Enter ${label.toLowerCase()}...`,
  };

  if (type === "select" || type === "radio") {
    base.options = [
      { label: "Option 1", value: "option-1" },
      { label: "Option 2", value: "option-2" },
    ];
  }

  return base;
}
