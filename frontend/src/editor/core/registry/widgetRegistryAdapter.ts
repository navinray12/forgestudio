import { ALL_WIDGET_REGISTRY, type WidgetRegistryItem } from "../../../pages/editor/types";
import { WidgetRegistry, type ForgeWidgetDefinition } from "./widgetRegistry";

/**
 * adaptExistingWidget
 * Adapts an existing WidgetRegistryItem to ForgeWidgetDefinition format.
 */
export function adaptExistingWidget(item: WidgetRegistryItem): ForgeWidgetDefinition {
  return {
    type: item.type,
    label: item.name,
    category: item.category,
    icon: item.icon,
    description: item.description,
  };
}

/**
 * initializeWidgetRegistry
 * Populates WidgetRegistry from ALL_WIDGET_REGISTRY source of truth.
 */
export function initializeWidgetRegistry(registry: WidgetRegistry): void {
  for (const item of ALL_WIDGET_REGISTRY) {
    registry.register(adaptExistingWidget(item));
  }
}
