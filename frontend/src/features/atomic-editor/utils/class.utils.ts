/**
 * @file Atomic editor feature: class utils. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
/**
 * Formats a raw class name into a valid CSS className format e.g. "button-primary"

 * @param name Name supplied to this operation (type: string).
 */
export function formatClassName(name: string): string {
  const clean = name
    .trim()
    .replace(/^\.+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");
  return clean;
}

/**
 * Validates class name format

 * @param name Name supplied to this operation (type: string).
 */
export function validateClassName(name: string): { isValid: boolean; message?: string } {
  if (!name || !name.trim()) {
    return { isValid: false, message: "Class name is required." };
  }

  const cleanKey = formatClassName(name);
  if (!cleanKey) {
    return { isValid: false, message: "Please enter a valid CSS class name (e.g. button-primary)." };
  }

  return { isValid: true };
}
