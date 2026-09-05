import type { LoopContainerConfig } from "../types/atomicLoop.types";

/**
 * Validates static dataset JSON syntax
 */
export function validateStaticDataJson(rawJson: string): { isValid: boolean; error?: string } {
  if (!rawJson.trim()) {
    return { isValid: false, error: "JSON data content cannot be empty." };
  }
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) {
      return { isValid: false, error: "Static data must be a JSON array of objects (e.g. [{...}])." };
    }
    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: `Invalid JSON syntax: ${err.message}` };
  }
}

/**
 * Validates Loop configuration settings
 */
export function validateLoopConfig(loop: LoopContainerConfig): { isValid: boolean; error?: string } {
  if (!loop.name.trim()) {
    return { isValid: false, error: "Loop name is required." };
  }
  if (loop.dataSourceType === "static" && loop.staticDataJson) {
    return validateStaticDataJson(loop.staticDataJson);
  }
  return { isValid: true };
}
