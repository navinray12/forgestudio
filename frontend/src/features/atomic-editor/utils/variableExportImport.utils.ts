import type { AtomicVariable } from "../types/variables.types";
import type {
  ExportedVariablesPayload,
  ExportedVariableItem,
  VariableConflictItem,
} from "../types/variableExportImport.types";
import { formatVariableKey } from "./variable.utils";

/**
 * Download variables as JSON file
 */
export function exportVariablesToJson(variables: AtomicVariable[], filename = "forge-studio-variables.json"): void {
  const exportPayload: ExportedVariablesPayload = {
    version: "1.0",
    type: "variables",
    exportedAt: new Date().toISOString(),
    variables: variables.map((v) => ({
      name: v.name,
      key: v.key,
      value: v.value,
      type: v.type,
      description: v.description,
      category: (v as any).category,
    })),
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates raw imported JSON string
 */
export function parseAndValidateVariablesJson(rawJson: string): {
  isValid: boolean;
  payload?: ExportedVariablesPayload;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson);

    if (!parsed || typeof parsed !== "object") {
      return { isValid: false, error: "Invalid file format. File must contain a valid JSON object." };
    }

    if (parsed.type !== "variables") {
      return { isValid: false, error: 'Unsupported file type. Expected export type "variables".' };
    }

    if (!Array.isArray(parsed.variables)) {
      return { isValid: false, error: 'Invalid Variables file structure. Missing "variables" array.' };
    }

    const validTypes = ["color", "font", "spacing", "number"];
    const validatedItems: ExportedVariableItem[] = [];

    for (let i = 0; i < parsed.variables.length; i++) {
      const item = parsed.variables[i];
      if (!item || typeof item !== "object") {
        return { isValid: false, error: `Invalid item at index ${i}.` };
      }

      if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
        return { isValid: false, error: `Variable at index ${i} is missing a valid name.` };
      }

      if (!item.value || typeof item.value !== "string" || !item.value.trim()) {
        return { isValid: false, error: `Variable "${item.name}" is missing a value.` };
      }

      if (!item.type || !validTypes.includes(item.type)) {
        return { isValid: false, error: `Variable "${item.name}" has unsupported type "${item.type}".` };
      }

      const cleanKey = item.key ? formatVariableKey(item.key) : formatVariableKey(item.name);

      validatedItems.push({
        name: item.name.trim(),
        key: cleanKey,
        value: item.value.trim(),
        type: item.type,
        description: item.description ? String(item.description).trim() : "",
        category: item.category ? String(item.category).trim() : undefined,
      });
    }

    return {
      isValid: true,
      payload: {
        version: parsed.version || "1.0",
        type: "variables",
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        variables: validatedItems,
      },
    };
  } catch (err: any) {
    return { isValid: false, error: "Failed to parse file as JSON. Please select a valid JSON file." };
  }
}

/**
 * Detects collisions between imported variables and current library
 */
export function detectVariableConflicts(
  importedItems: ExportedVariableItem[],
  existingVariables: AtomicVariable[]
): {
  newItems: ExportedVariableItem[];
  conflicts: VariableConflictItem[];
} {
  const newItems: ExportedVariableItem[] = [];
  const conflicts: VariableConflictItem[] = [];

  for (const imp of importedItems) {
    const existing = existingVariables.find(
      (v) => v.key.toLowerCase() === imp.key.toLowerCase() || v.name.toLowerCase() === imp.name.toLowerCase()
    );

    if (existing) {
      conflicts.push({
        importedItem: imp,
        existingItem: existing,
        resolution: "replace_existing",
      });
    } else {
      newItems.push(imp);
    }
  }

  return { newItems, conflicts };
}
