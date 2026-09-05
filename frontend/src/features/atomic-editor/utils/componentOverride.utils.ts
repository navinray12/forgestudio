import type { ResolvedComponentProperty, EditablePropertyConfig } from "../types/controlledComponent.types";
import type { ReusableComponentDefinition } from "../types/reusableComponents.types";

export const DEFAULT_PROPERTY_CONFIGS: EditablePropertyConfig[] = [
  { key: "title", label: "Heading Title", category: "content", isEditable: true },
  { key: "description", label: "Description Text", category: "content", isEditable: true },
  { key: "price", label: "Price / Value Tag", category: "content", isEditable: true },
  { key: "buttonText", label: "Button Label", category: "content", isEditable: true },
  { key: "buttonLink", label: "Button Destination Link", category: "content", isEditable: true },
  { key: "backgroundColor", label: "Background Color", category: "style", isEditable: false },
  { key: "padding", label: "Padding & Spacing", category: "layout", isEditable: false },
  { key: "borderRadius", label: "Border Radius", category: "style", isEditable: false },
];

/**
  * Resolves effective property values for an instance given a component definition and instance overrides.
  */
export function resolveInstanceProperties(
  component: ReusableComponentDefinition,
  allowedKeys: string[],
  overrides: Record<string, string> = {}
): ResolvedComponentProperty[] {
  const root = component.rootElement;
  const heading = root.children?.[0];
  const paragraph = root.children?.[1];
  const button = root.children?.[2];

  const defaultValues: Record<string, string> = {
    title: heading?.content || "Heading Title",
    description: paragraph?.content || "Description Text",
    price: "$49 / month",
    buttonText: button?.content || "Action Button",
    buttonLink: "/signup",
    backgroundColor: (root.styles?.backgroundColor as string) || "#ffffff",
    padding: (root.styles?.padding as string) || "24px",
    borderRadius: (root.styles?.borderRadius as string) || "16px",
  };

  return DEFAULT_PROPERTY_CONFIGS.map((config) => {
    const isEditable = allowedKeys.includes(config.key);
    const defVal = defaultValues[config.key] || "";
    const hasOverride = isEditable && overrides[config.key] !== undefined && overrides[config.key] !== defVal;
    const effectiveValue = hasOverride ? overrides[config.key] : defVal;

    return {
      ...config,
      isEditable,
      defaultValue: defVal,
      effectiveValue,
      isOverridden: hasOverride,
    };
  });
}
