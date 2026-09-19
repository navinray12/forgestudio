import type { VariableType } from "../types/variables.types";

/**
 * Formats a raw variable name into a clean CSS custom property key e.g. "--primary-color"
 */
export function formatVariableKey(name: string): string {
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");
  return clean.startsWith("--") ? clean : `--${clean}`;
}

/**
 * Validates a variable value based on its type
 */
export function validateVariableValue(
  type: VariableType,
  value: string
): { isValid: boolean; message?: string } {
  if (!value || !value.trim()) {
    return { isValid: false, message: "Variable value is required." };
  }

  const trimmed = value.trim();

  if (type === "color") {
    // Check hex, rgb, hsl, or CSS color names
    const isHex = /^#([0-9a-f]{3}){1,2}$/i.test(trimmed);
    const isRgbOrHsl = /^(rgb|hsl)a?\(.+\)$/i.test(trimmed);
    const isNamed = /^[a-z]+$/i.test(trimmed);

    if (!isHex && !isRgbOrHsl && !isNamed) {
      return {
        isValid: false,
        message: "Please enter a valid color (e.g. #2563eb, rgba(0,0,0,0.5), or blue).",
      };
    }
  }

  return { isValid: true };
}

/**
 * Copies a CSS variable reference `var(--key)` to user clipboard
 */
export async function copyVariableReference(key: string): Promise<boolean> {
  const ref = `var(${key})`;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(ref);
      return true;
    }
  } catch (e) {
    // Fallback if clipboard API is restricted
  }
  return false;
}
