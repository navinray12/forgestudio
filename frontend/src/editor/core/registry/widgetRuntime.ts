import { widgetRegistry, type ForgeWidgetDefinition } from "./widgetRegistry";
import { initializeWidgetRegistry } from "./widgetRegistryAdapter";
import type { ElementType } from "../../../pages/editor/types";

let isInitialized = false;

function ensureWidgetRegistryInitialized() {
  if (!isInitialized) {
    initializeWidgetRegistry(widgetRegistry);
    isInitialized = true;
  }
}

/**
 * resolveWidget
 * Safely resolves a widget definition from WidgetRegistry for a given element type.
 * Returns undefined if type is invalid or not registered.
 */
export function resolveWidget(type: ElementType | string): ForgeWidgetDefinition | undefined {
  if (!type) return undefined;
  ensureWidgetRegistryInitialized();
  return widgetRegistry.get(type);
}

/**
 * hasWidget
 * Checks if a widget definition exists in WidgetRegistry for a given element type.
 */
export function hasWidget(type: ElementType | string): boolean {
  if (!type) return false;
  ensureWidgetRegistryInitialized();
  return widgetRegistry.has(type);
}

/**
 * resolveWidgetMetadata
 * Returns metadata (label, category, icon, description) for a given widget type.
 */
export function resolveWidgetMetadata(type: ElementType | string) {
  const widget = resolveWidget(type);
  if (!widget) return undefined;
  return {
    label: widget.label,
    category: widget.category,
    icon: widget.icon,
    description: widget.description,
  };
}

/**
 * resolveWidgetDefaults
 * Returns default properties and styles for a given widget type if defined.
 */
export function resolveWidgetDefaults(type: ElementType | string) {
  const widget = resolveWidget(type);
  return widget?.defaults;
}
