import { controlRegistry, type ForgeControlDefinition } from "./controlRegistry";
import { initializeControlRegistry } from "./controlRegistryAdapter";

let isInitialized = false;

function ensureControlRegistryInitialized() {
  if (!isInitialized) {
    initializeControlRegistry(controlRegistry);
    isInitialized = true;
  }
}

/**
 * resolveControl
 * Safely resolves a control definition from ControlRegistry for a given control type string.
 */
export function resolveControl(type: string): ForgeControlDefinition | undefined {
  if (!type) return undefined;
  ensureControlRegistryInitialized();
  return controlRegistry.get(type);
}

/**
 * hasControl
 * Checks if a control definition exists in ControlRegistry.
 */
export function hasControl(type: string): boolean {
  if (!type) return false;
  ensureControlRegistryInitialized();
  return controlRegistry.has(type);
}

/**
 * resolveControls
 * Resolves multiple control definitions for a list of control type names.
 */
export function resolveControls(types: string[]): ForgeControlDefinition[] {
  if (!Array.isArray(types)) return [];
  ensureControlRegistryInitialized();
  return types
    .map((type) => resolveControl(type))
    .filter((ctrl): ctrl is ForgeControlDefinition => ctrl !== undefined);
}
