import { prisma } from "../../config/prisma.js";
import { BlockNode, sanitizeHtmlContent } from "./blockEngine.service.js";

export interface TypographyConfig {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | string;
  textDecoration?: "none" | "underline" | "line-through" | string;
  responsive?: {
    tablet?: Partial<TypographyConfig>;
    mobile?: Partial<TypographyConfig>;
  };
}

export interface ColorConfig {
  text?: string;
  background?: string;
  link?: string;
  border?: string;
  gradient?: string;
  presetRef?: string; // e.g. "var:preset|color|primary" or "--fs-color-primary"
}

export interface SpacingConfig {
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  padding?: { top?: string; right?: string; bottom?: string; left?: string };
  gap?: string;
  blockGap?: string;
  responsive?: {
    tablet?: Partial<SpacingConfig>;
    mobile?: Partial<SpacingConfig>;
  };
}

export interface LayoutConfig {
  type?: "constrained" | "wide" | "full" | "flex" | "grid";
  contentSize?: string;
  wideSize?: string;
  justifyContent?: string;
  alignItems?: string;
  orientation?: "horizontal" | "vertical";
  flexWrap?: string;
  gridTemplateColumns?: string;
  gap?: string;
}

export interface DimensionsConfig {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  aspectRatio?: string;
  responsive?: {
    tablet?: Partial<DimensionsConfig>;
    mobile?: Partial<DimensionsConfig>;
  };
}

export interface GlobalStyleData {
  colors?: Record<string, string>; // e.g., { primary: "#3699ff", secondary: "#2b2b40" }
  typography?: TypographyConfig;
  spacing?: SpacingConfig;
  layout?: LayoutConfig;
  dimensions?: DimensionsConfig;
  blockDefaults?: Record<string, {
    typography?: TypographyConfig;
    color?: ColorConfig;
    spacing?: SpacingConfig;
    layout?: LayoutConfig;
    dimensions?: DimensionsConfig;
  }>;
}

/**
 * Security: Strict CSS value & selector sanitizer
 */
export function sanitizeCssValue(value: any): string {
  if (!value || typeof value !== "string") return "";
  let clean = value.trim();

  // Reject javascript:, expression(), -moz-binding, @import, raw html tags
  if (/javascript\s*:/i.test(clean)) return "";
  if (/expression\s*\(/i.test(clean)) return "";
  if (/-moz-binding/i.test(clean)) return "";
  if (/@import/i.test(clean)) return "";
  if (/<[^>]*>/i.test(clean)) return "";

  // Strip dangerous characters like semicolons or braces if escaping
  clean = clean.replace(/[;{}]/g, "");

  return clean;
}

export function sanitizeCssSelector(selector: string): string {
  if (!selector || typeof selector !== "string") return ".block-element";
  let clean = selector.trim();
  clean = clean.replace(/[^a-zA-Z0-9_\-\.\:\#\s,>+~\[\]=]/g, "");
  return clean || ".block-element";
}

/**
 * Compiles Typography, Color, Spacing, Layout, Dimensions into CSS properties string.
 */
export function compileStyleControlsToCssProperties(styles: {
  typography?: TypographyConfig;
  color?: ColorConfig;
  spacing?: SpacingConfig;
  layout?: LayoutConfig;
  dimensions?: DimensionsConfig;
}): Record<string, string> {
  const css: Record<string, string> = {};

  // Typography (F-520)
  if (styles.typography) {
    const t = styles.typography;
    if (t.fontFamily) css["font-family"] = sanitizeCssValue(t.fontFamily);
    if (t.fontSize) css["font-size"] = sanitizeCssValue(t.fontSize);
    if (t.fontWeight) css["font-weight"] = sanitizeCssValue(String(t.fontWeight));
    if (t.lineHeight) css["line-height"] = sanitizeCssValue(t.lineHeight);
    if (t.letterSpacing) css["letter-spacing"] = sanitizeCssValue(t.letterSpacing);
    if (t.textTransform) css["text-transform"] = sanitizeCssValue(t.textTransform);
    if (t.textDecoration) css["text-decoration"] = sanitizeCssValue(t.textDecoration);
  }

  // Colors (F-521)
  if (styles.color) {
    const c = styles.color;
    if (c.text) css["color"] = sanitizeCssValue(c.text);
    if (c.background) css["background-color"] = sanitizeCssValue(c.background);
    if (c.border) css["border-color"] = sanitizeCssValue(c.border);
    if (c.gradient) css["background-image"] = sanitizeCssValue(c.gradient);
  }

  // Spacing (F-522)
  if (styles.spacing) {
    const s = styles.spacing;
    if (s.margin) {
      if (s.margin.top) css["margin-top"] = sanitizeCssValue(s.margin.top);
      if (s.margin.right) css["margin-right"] = sanitizeCssValue(s.margin.right);
      if (s.margin.bottom) css["margin-bottom"] = sanitizeCssValue(s.margin.bottom);
      if (s.margin.left) css["margin-left"] = sanitizeCssValue(s.margin.left);
    }
    if (s.padding) {
      if (s.padding.top) css["padding-top"] = sanitizeCssValue(s.padding.top);
      if (s.padding.right) css["padding-right"] = sanitizeCssValue(s.padding.right);
      if (s.padding.bottom) css["padding-bottom"] = sanitizeCssValue(s.padding.bottom);
      if (s.padding.left) css["padding-left"] = sanitizeCssValue(s.padding.left);
    }
    if (s.gap) css["gap"] = sanitizeCssValue(s.gap);
  }

  // Layout (F-523)
  if (styles.layout) {
    const l = styles.layout;
    if (l.type === "flex") {
      css["display"] = "flex";
      if (l.orientation === "vertical") css["flex-direction"] = "column";
      if (l.orientation === "horizontal") css["flex-direction"] = "row";
      if (l.justifyContent) css["justify-content"] = sanitizeCssValue(l.justifyContent);
      if (l.alignItems) css["align-items"] = sanitizeCssValue(l.alignItems);
      if (l.flexWrap) css["flex-wrap"] = sanitizeCssValue(l.flexWrap);
      if (l.gap) css["gap"] = sanitizeCssValue(l.gap);
    } else if (l.type === "grid") {
      css["display"] = "grid";
      if (l.gridTemplateColumns) css["grid-template-columns"] = sanitizeCssValue(l.gridTemplateColumns);
      if (l.gap) css["gap"] = sanitizeCssValue(l.gap);
    } else if (l.type === "constrained") {
      css["max-width"] = sanitizeCssValue(l.contentSize || "1200px");
      css["margin-left"] = "auto";
      css["margin-right"] = "auto";
    } else if (l.type === "wide") {
      css["max-width"] = sanitizeCssValue(l.wideSize || "1400px");
      css["margin-left"] = "auto";
      css["margin-right"] = "auto";
    } else if (l.type === "full") {
      css["width"] = "100%";
      css["max-width"] = "100%";
    }
  }

  // Dimensions (F-524)
  if (styles.dimensions) {
    const d = styles.dimensions;
    if (d.width) css["width"] = sanitizeCssValue(d.width);
    if (d.minWidth) css["min-width"] = sanitizeCssValue(d.minWidth);
    if (d.maxWidth) css["max-width"] = sanitizeCssValue(d.maxWidth);
    if (d.height) css["height"] = sanitizeCssValue(d.height);
    if (d.minHeight) css["min-height"] = sanitizeCssValue(d.minHeight);
    if (d.maxHeight) css["max-height"] = sanitizeCssValue(d.maxHeight);
    if (d.aspectRatio) css["aspect-ratio"] = sanitizeCssValue(d.aspectRatio);
  }

  // Border Controls (F-525)
  if ((styles as any).border) {
    const b = (styles as any).border;
    if (b.width) css["border-width"] = sanitizeCssValue(b.width);
    if (b.style) css["border-style"] = sanitizeCssValue(b.style);
    if (b.color) css["border-color"] = sanitizeCssValue(b.color);
    if (b.radius) css["border-radius"] = sanitizeCssValue(b.radius);
  }

  // Shadow Controls (F-526)
  if ((styles as any).shadow) {
    const sh = (styles as any).shadow;
    if (Array.isArray(sh.multiple) && sh.multiple.length > 0) {
      const parts = sh.multiple.map((m: any) => `${m.inset ? "inset " : ""}${sanitizeCssValue(m.x || "0px")} ${sanitizeCssValue(m.y || "4px")} ${sanitizeCssValue(m.blur || "10px")} ${sanitizeCssValue(m.spread || "0px")} ${sanitizeCssValue(m.color || "rgba(0,0,0,0.1)")}`);
      css["box-shadow"] = parts.join(", ");
    } else if (sh.x || sh.y || sh.blur || sh.color) {
      css["box-shadow"] = `${sh.inset ? "inset " : ""}${sanitizeCssValue(sh.x || "0px")} ${sanitizeCssValue(sh.y || "4px")} ${sanitizeCssValue(sh.blur || "10px")} ${sanitizeCssValue(sh.spread || "0px")} ${sanitizeCssValue(sh.color || "rgba(0,0,0,0.15)")}`;
    }
  }

  // Background Controls (F-527)
  if ((styles as any).background) {
    const bg = (styles as any).background;
    if (bg.color) css["background-color"] = sanitizeCssValue(bg.color);
    if (bg.gradient) css["background-image"] = sanitizeCssValue(bg.gradient);
    if (bg.image) css["background-image"] = `url("${sanitizeCssValue(bg.image)}")`;
    if (bg.position) css["background-position"] = sanitizeCssValue(bg.position);
    if (bg.size) css["background-size"] = sanitizeCssValue(bg.size);
    if (bg.repeat) css["background-repeat"] = sanitizeCssValue(bg.repeat);
    if (bg.attachment) css["background-attachment"] = sanitizeCssValue(bg.attachment);
  }

  return css;
}

export class GlobalStyleService {
  /**
   * Get or create global style config for workspace.
   */
  static async getGlobalStyles(workspaceId?: string): Promise<GlobalStyleData> {
    const db = prisma as any;
    const existing = await db.globalStyleConfig.findFirst({
      where: workspaceId ? { workspaceId } : {},
      orderBy: { createdAt: "desc" },
    });

    if (existing && existing.styles) {
      return existing.styles as GlobalStyleData;
    }

    // Return default global style tokens integrated with ForgeStudio --fs-* design system
    return {
      colors: {
        primary: "#3699ff",
        secondary: "#2b2b40",
        accent: "#7367f0",
        background: "#151521",
        text: "#ffffff",
      },
      typography: {
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
        lineHeight: "1.5",
      },
      spacing: {
        gap: "16px",
      },
      layout: {
        type: "constrained",
        contentSize: "1200px",
        wideSize: "1400px",
      },
    };
  }

  /**
   * Save/Update global style config.
   */
  static async saveGlobalStyles(
    input: {
      name?: string;
      styles: GlobalStyleData;
      workspaceId?: string;
      organizationId?: string;
      userId: string;
    }
  ) {
    const db = prisma as any;
    return db.globalStyleConfig.create({
      data: {
        name: input.name || "Default Global Styles",
        styles: input.styles as any,
        workspaceId: input.workspaceId || null,
        organizationId: input.organizationId || null,
        userId: input.userId,
      },
    });
  }

  /**
   * Compiles GlobalStyleData to complete CSS stylesheet with root CSS variables & responsive media queries.
   */
  static compileGlobalStylesToCss(globalStyles: GlobalStyleData): string {
    let css = ":root {\n";

    // Global Color Tokens (--fs-color-*)
    if (globalStyles.colors) {
      for (const [key, val] of Object.entries(globalStyles.colors)) {
        const cleanKey = sanitizeCssSelector(key);
        const cleanVal = sanitizeCssValue(val);
        css += `  --fs-color-${cleanKey}: ${cleanVal};\n`;
      }
    }

    // Global Typography Defaults
    if (globalStyles.typography) {
      const tProps = compileStyleControlsToCssProperties({ typography: globalStyles.typography });
      for (const [k, v] of Object.entries(tProps)) {
        css += `  --fs-typography-${k}: ${v};\n`;
      }
    }

    css += "}\n\n";

    // Block Defaults
    if (globalStyles.blockDefaults) {
      for (const [blockName, styles] of Object.entries(globalStyles.blockDefaults)) {
        const selector = `.wp-block-${blockName.replace(/^core\//, "").replace(/\//g, "-")}`;
        const props = compileStyleControlsToCssProperties(styles);
        const propLines = Object.entries(props)
          .map(([k, v]) => `  ${k}: ${v};`)
          .join("\n");
        if (propLines) {
          css += `${selector} {\n${propLines}\n}\n\n`;
        }
      }
    }

    return css;
  }
}
