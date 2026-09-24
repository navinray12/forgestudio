import type { GlobalStyleConfig } from "../types/block.types";

/**
 * Converts a Gutenberg style preset string (e.g. "var:preset|color|primary")
 * to standard CSS custom variable ("var(--fs-color-primary)").
 */
export function resolvePresetToCssVariable(presetStr: string): string {
  if (!presetStr || typeof presetStr !== "string") return "";

  if (presetStr.startsWith("var:preset|")) {
    const parts = presetStr.split("|");
    if (parts.length >= 3) {
      const category = parts[1];
      const slug = parts[2];
      return `var(--fs-${category}-${slug})`;
    }
  }

  if (presetStr.startsWith("--")) {
    return `var(${presetStr})`;
  }

  return presetStr;
}

/**
 * Converts standard CSS variable ("var(--fs-color-primary)") to Gutenberg preset format ("var:preset|color|primary").
 */
export function convertCssVariableToGutenbergPreset(cssVar: string): string {
  if (!cssVar || typeof cssVar !== "string") return "";

  const match = cssVar.match(/var\(--fs-([a-z0-9]+)-([a-z0-9\-]+)\)/i);
  if (match) {
    const category = match[1];
    const slug = match[2];
    return `var:preset|${category}|${slug}`;
  }

  return cssVar;
}

/**
 * Compiles a GlobalStyleConfig object into a set of root CSS variable definitions.
 */
export function buildRootCssVariablesFromGlobalStyles(globalStyle: GlobalStyleConfig): Record<string, string> {
  const vars: Record<string, string> = {};

  if (globalStyle.colors) {
    for (const [name, value] of Object.entries(globalStyle.colors)) {
      vars[`--fs-color-${name}`] = value;
    }
  }

  if (globalStyle.typography) {
    const t = globalStyle.typography;
    if (t.fontFamily) vars["--fs-typography-font-family"] = t.fontFamily;
    if (t.fontSize) vars["--fs-typography-font-size"] = t.fontSize;
    if (t.lineHeight) vars["--fs-typography-line-height"] = t.lineHeight;
  }

  if (globalStyle.spacing) {
    const s = globalStyle.spacing;
    if (s.gap) vars["--fs-spacing-gap"] = s.gap;
  }

  return vars;
}
