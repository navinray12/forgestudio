import { ControlRegistry, type ForgeControlDefinition } from "./controlRegistry";

export const BUILTIN_CONTROLS: ForgeControlDefinition[] = [
  { type: "TEXT", label: "Text Input", category: "content" },
  { type: "NUMBER", label: "Number Input", category: "content" },
  { type: "COLOR", label: "Color Picker", category: "style" },
  { type: "SELECT", label: "Dropdown Select", category: "content" },
  { type: "TOGGLE", label: "Switch Toggle", category: "content" },
  { type: "SLIDER", label: "Range Slider", category: "style" },
  { type: "SPACING", label: "Margin & Padding", category: "style" },
  { type: "TYPOGRAPHY", label: "Typography", category: "style" },
  { type: "BORDER", label: "Border Settings", category: "style" },
  { type: "BOX_SHADOW", label: "Box Shadow", category: "style" },
  { type: "ALIGNMENT", label: "Alignment", category: "layout" },
  { type: "MEDIA", label: "Media Picker", category: "content" },
  { type: "URL", label: "Link URL", category: "content" },
];

export function initializeControlRegistry(registry: ControlRegistry): void {
  for (const control of BUILTIN_CONTROLS) {
    registry.register(control);
  }
}
