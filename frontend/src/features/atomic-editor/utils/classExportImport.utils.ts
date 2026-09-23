import type { AtomicClass } from "../types/classes.types";
import type {
  ExportedClassesPayload,
  ExportedClassItem,
  ClassConflictItem,
} from "../types/classExportImport.types";
import { formatClassName } from "./class.utils";

/**
 * Download classes as JSON file
 */
export function exportClassesToJson(classes: AtomicClass[], filename = "forge-studio-classes.json"): void {
  const exportPayload: ExportedClassesPayload = {
    version: "1.0",
    type: "classes",
    exportedAt: new Date().toISOString(),
    classes: classes.map((c) => ({
      name: c.name,
      key: c.key,
      styles: c.styles || {},
      description: c.description,
      isGlobal: Boolean(c.isGlobal || c.scope === "global"),
      scope: c.isGlobal || c.scope === "global" ? "global" : "local",
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
 * Parses and validates raw imported JSON string for classes
 */
export function parseAndValidateClassesJson(rawJson: string): {
  isValid: boolean;
  payload?: ExportedClassesPayload;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson);

    if (!parsed || typeof parsed !== "object") {
      return { isValid: false, error: "Invalid file format. File must contain a valid JSON object." };
    }

    if (parsed.type !== "classes") {
      return { isValid: false, error: 'Unsupported file type. Expected export type "classes".' };
    }

    if (!Array.isArray(parsed.classes)) {
      return { isValid: false, error: 'Invalid Classes file structure. Missing "classes" array.' };
    }

    const validatedItems: ExportedClassItem[] = [];

    for (let i = 0; i < parsed.classes.length; i++) {
      const item = parsed.classes[i];
      if (!item || typeof item !== "object") {
        return { isValid: false, error: `Invalid item at index ${i}.` };
      }

      if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
        return { isValid: false, error: `Class at index ${i} is missing a valid name.` };
      }

      const cleanKey = item.key ? formatClassName(item.key) : formatClassName(item.name);
      const isGlob = Boolean(item.isGlobal || item.scope === "global");

      validatedItems.push({
        name: item.name.trim(),
        key: cleanKey,
        styles: item.styles && typeof item.styles === "object" ? item.styles : {},
        description: item.description ? String(item.description).trim() : "",
        isGlobal: isGlob,
        scope: isGlob ? "global" : "local",
      });
    }

    return {
      isValid: true,
      payload: {
        version: parsed.version || "1.0",
        type: "classes",
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        classes: validatedItems,
      },
    };
  } catch (err: any) {
    return { isValid: false, error: "Failed to parse file as JSON. Please select a valid JSON file." };
  }
}

/**
 * Detects collisions between imported classes and current library
 */
export function detectClassConflicts(
  importedItems: ExportedClassItem[],
  existingClasses: AtomicClass[]
): {
  newItems: ExportedClassItem[];
  conflicts: ClassConflictItem[];
} {
  const newItems: ExportedClassItem[] = [];
  const conflicts: ClassConflictItem[] = [];

  for (const imp of importedItems) {
    const existing = existingClasses.find(
      (c) => c.key.toLowerCase() === imp.key.toLowerCase() || c.name.toLowerCase() === imp.name.toLowerCase()
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
