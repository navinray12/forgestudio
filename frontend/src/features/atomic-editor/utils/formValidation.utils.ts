import type { FormFieldConfig, FormValidationResult } from "../types/atomicForm.types";

/**
 * Validates form submission values against field configurations
 */
export function validateFormValues(
  fields: FormFieldConfig[],
  values: Record<string, any>
): FormValidationResult {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const val = values[field.name];
    const strVal = val !== undefined && val !== null ? String(val).trim() : "";

    // Required check
    if (field.required && !strVal) {
      errors[field.name] = `${field.label} is required.`;
      continue;
    }

    if (!strVal) continue;

    // Email format check
    if (field.type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strVal)) {
        errors[field.name] = `Please enter a valid email address.`;
      }
    }

    // URL format check
    if (field.type === "url") {
      try {
        new URL(strVal);
      } catch {
        errors[field.name] = `Please enter a valid URL (e.g. https://example.com).`;
      }
    }

    // Number check
    if (field.type === "number" && isNaN(Number(strVal))) {
      errors[field.name] = `Please enter a valid numeric value.`;
    }

    // MinLength check
    if (field.validation?.minLength && strVal.length < field.validation.minLength) {
      errors[field.name] = `${field.label} must be at least ${field.validation.minLength} characters.`;
    }

    // MaxLength check
    if (field.validation?.maxLength && strVal.length > field.validation.maxLength) {
      errors[field.name] = `${field.label} must be no more than ${field.validation.maxLength} characters.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Checks for duplicate field names within a form container
 */
export function detectDuplicateFieldNames(fields: FormFieldConfig[]): string[] {
  const names = new Set<string>();
  const duplicates = new Set<string>();

  for (const field of fields) {
    const lower = field.name.trim().toLowerCase();
    if (names.has(lower)) {
      duplicates.add(field.name);
    } else {
      names.add(lower);
    }
  }

  return Array.from(duplicates);
}
