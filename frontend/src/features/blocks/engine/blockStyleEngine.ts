import type {
  BlockNode,
  TypographyControlConfig,
  ColorControlConfig,
  SpacingControlConfig,
  LayoutControlConfig,
  DimensionsControlConfig,
} from "../types/block.types";
import { resolvePresetToCssVariable, convertCssVariableToGutenbergPreset } from "./designTokenBridge";

/**
 * Sanitizes CSS property values to prevent XSS and CSS injection.
 */
export function sanitizeCssString(val: any): string {
  if (!val || typeof val !== "string") return "";
  let clean = val.trim();
  if (/javascript\s*:/i.test(clean)) return "";
  if (/expression\s*\(/i.test(clean)) return "";
  if (/@import/i.test(clean)) return "";
  clean = clean.replace(/[;{}]/g, "");
  return clean;
}

/**
 * Compiles style controls into React CSSProperties object for live Editor Preview.
 */
export function compileStyleControlsToReactStyles(styleObj?: {
  typography?: TypographyControlConfig;
  color?: ColorControlConfig;
  spacing?: SpacingControlConfig;
  layout?: LayoutControlConfig;
  dimensions?: DimensionsControlConfig;
}): React.CSSProperties {
  if (!styleObj) return {};

  const css: Record<string, any> = {};

  // Typography (F-520)
  if (styleObj.typography) {
    const t = styleObj.typography;
    if (t.fontFamily) css.fontFamily = sanitizeCssString(t.fontFamily);
    if (t.fontSize) css.fontSize = sanitizeCssString(t.fontSize);
    if (t.fontWeight) css.fontWeight = sanitizeCssString(String(t.fontWeight));
    if (t.lineHeight) css.lineHeight = sanitizeCssString(t.lineHeight);
    if (t.letterSpacing) css.letterSpacing = sanitizeCssString(t.letterSpacing);
    if (t.textTransform) css.textTransform = sanitizeCssString(t.textTransform);
    if (t.textDecoration) css.textDecoration = sanitizeCssString(t.textDecoration);
  }

  // Colors (F-521)
  if (styleObj.color) {
    const c = styleObj.color;
    if (c.text) css.color = resolvePresetToCssVariable(sanitizeCssString(c.text));
    if (c.background) css.backgroundColor = resolvePresetToCssVariable(sanitizeCssString(c.background));
    if (c.border) css.borderColor = resolvePresetToCssVariable(sanitizeCssString(c.border));
    if (c.gradient) css.backgroundImage = sanitizeCssString(c.gradient);
  }

  // Spacing (F-522)
  if (styleObj.spacing) {
    const s = styleObj.spacing;
    if (s.margin) {
      if (s.margin.top) css.marginTop = sanitizeCssString(s.margin.top);
      if (s.margin.right) css.marginRight = sanitizeCssString(s.margin.right);
      if (s.margin.bottom) css.marginBottom = sanitizeCssString(s.margin.bottom);
      if (s.margin.left) css.marginLeft = sanitizeCssString(s.margin.left);
    }
    if (s.padding) {
      if (s.padding.top) css.paddingTop = sanitizeCssString(s.padding.top);
      if (s.padding.right) css.paddingRight = sanitizeCssString(s.padding.right);
      if (s.padding.bottom) css.paddingBottom = sanitizeCssString(s.padding.bottom);
      if (s.padding.left) css.paddingLeft = sanitizeCssString(s.padding.left);
    }
    if (s.gap) css.gap = sanitizeCssString(s.gap);
  }

  // Layout (F-523)
  if (styleObj.layout) {
    const l = styleObj.layout;
    if (l.type === "flex") {
      css.display = "flex";
      if (l.orientation === "vertical") css.flexDirection = "column";
      if (l.orientation === "horizontal") css.flexDirection = "row";
      if (l.justifyContent) css.justifyContent = sanitizeCssString(l.justifyContent);
      if (l.alignItems) css.alignItems = sanitizeCssString(l.alignItems);
      if (l.flexWrap) css.flexWrap = sanitizeCssString(l.flexWrap);
      if (l.gap) css.gap = sanitizeCssString(l.gap);
    } else if (l.type === "grid") {
      css.display = "grid";
      if (l.gridTemplateColumns) css.gridTemplateColumns = sanitizeCssString(l.gridTemplateColumns);
      if (l.gap) css.gap = sanitizeCssString(l.gap);
    } else if (l.type === "constrained") {
      css.maxWidth = sanitizeCssString(l.contentSize || "1200px");
      css.marginLeft = "auto";
      css.marginRight = "auto";
    } else if (l.type === "wide") {
      css.maxWidth = sanitizeCssString(l.wideSize || "1400px");
      css.marginLeft = "auto";
      css.marginRight = "auto";
    } else if (l.type === "full") {
      css.width = "100%";
      css.maxWidth = "100%";
    }
  }

  // Dimensions (F-524)
  if (styleObj.dimensions) {
    const d = styleObj.dimensions;
    if (d.width) css.width = sanitizeCssString(d.width);
    if (d.minWidth) css.minWidth = sanitizeCssString(d.minWidth);
    if (d.maxWidth) css.maxWidth = sanitizeCssString(d.maxWidth);
    if (d.height) css.height = sanitizeCssString(d.height);
    if (d.minHeight) css.minHeight = sanitizeCssString(d.minHeight);
    if (d.maxHeight) css.maxHeight = sanitizeCssString(d.maxHeight);
    if (d.aspectRatio) css.aspectRatio = sanitizeCssString(d.aspectRatio);
  }

  // Border Controls (F-525)
  if ((styleObj as any).border) {
    const b = (styleObj as any).border;
    if (b.width) css.borderWidth = sanitizeCssString(b.width);
    if (b.style) css.borderStyle = sanitizeCssString(b.style);
    if (b.color) css.borderColor = resolvePresetToCssVariable(sanitizeCssString(b.color));
    if (b.radius) css.borderRadius = sanitizeCssString(b.radius);

    // Per-side borders
    if (b.top) {
      if (b.top.width) css.borderTopWidth = sanitizeCssString(b.top.width);
      if (b.top.style) css.borderTopStyle = sanitizeCssString(b.top.style);
      if (b.top.color) css.borderTopColor = resolvePresetToCssVariable(sanitizeCssString(b.top.color));
    }
    if (b.right) {
      if (b.right.width) css.borderRightWidth = sanitizeCssString(b.right.width);
      if (b.right.style) css.borderRightStyle = sanitizeCssString(b.right.style);
      if (b.right.color) css.borderRightColor = resolvePresetToCssVariable(sanitizeCssString(b.right.color));
    }
    if (b.bottom) {
      if (b.bottom.width) css.borderBottomWidth = sanitizeCssString(b.bottom.width);
      if (b.bottom.style) css.borderBottomStyle = sanitizeCssString(b.bottom.style);
      if (b.bottom.color) css.borderBottomColor = resolvePresetToCssVariable(sanitizeCssString(b.bottom.color));
    }
    if (b.left) {
      if (b.left.width) css.borderLeftWidth = sanitizeCssString(b.left.width);
      if (b.left.style) css.borderLeftStyle = sanitizeCssString(b.left.style);
      if (b.left.color) css.borderLeftColor = resolvePresetToCssVariable(sanitizeCssString(b.left.color));
    }

    // Per-corner radius
    if (b.radiusCorners) {
      const rc = b.radiusCorners;
      if (rc.topLeft) css.borderTopLeftRadius = sanitizeCssString(rc.topLeft);
      if (rc.topRight) css.borderTopRightRadius = sanitizeCssString(rc.topRight);
      if (rc.bottomRight) css.borderBottomRightRadius = sanitizeCssString(rc.bottomRight);
      if (rc.bottomLeft) css.borderBottomLeftRadius = sanitizeCssString(rc.bottomLeft);
    }
  }

  // Shadow Controls (F-526)
  if ((styleObj as any).shadow) {
    const sh = (styleObj as any).shadow;
    if (Array.isArray(sh.multiple) && sh.multiple.length > 0) {
      const shadowParts = sh.multiple.map((item: any) => {
        const insetStr = item.inset ? "inset " : "";
        return `${insetStr}${sanitizeCssString(item.x || "0px")} ${sanitizeCssString(item.y || "4px")} ${sanitizeCssString(item.blur || "10px")} ${sanitizeCssString(item.spread || "0px")} ${resolvePresetToCssVariable(sanitizeCssString(item.color || "rgba(0,0,0,0.1)"))}`;
      });
      css.boxShadow = shadowParts.join(", ");
    } else if (sh.x || sh.y || sh.blur || sh.color) {
      const insetStr = sh.inset ? "inset " : "";
      css.boxShadow = `${insetStr}${sanitizeCssString(sh.x || "0px")} ${sanitizeCssString(sh.y || "4px")} ${sanitizeCssString(sh.blur || "10px")} ${sanitizeCssString(sh.spread || "0px")} ${resolvePresetToCssVariable(sanitizeCssString(sh.color || "rgba(0,0,0,0.15)"))}`;
    }
  }

  // Background Controls (F-527)
  if ((styleObj as any).background) {
    const bg = (styleObj as any).background;
    if (bg.color) css.backgroundColor = resolvePresetToCssVariable(sanitizeCssString(bg.color));
    if (bg.gradient) css.backgroundImage = sanitizeCssString(bg.gradient);
    if (bg.image) css.backgroundImage = `url("${sanitizeCssString(bg.image)}")`;
    if (bg.position) css.backgroundPosition = sanitizeCssString(bg.position);
    if (bg.size) css.backgroundSize = sanitizeCssString(bg.size);
    if (bg.repeat) css.backgroundRepeat = sanitizeCssString(bg.repeat);
    if (bg.attachment) css.backgroundAttachment = sanitizeCssString(bg.attachment);
  }

  return css;
}

/**
 * Builds Gutenberg `style` attribute payload for block serialization.
 */
export function buildGutenbergStyleObject(block: BlockNode): Record<string, any> {
  const styleObj = block.style || {};
  const gutenbergStyle: Record<string, any> = {};

  if (styleObj.color) {
    gutenbergStyle.color = {
      text: styleObj.color.text ? convertCssVariableToGutenbergPreset(styleObj.color.text) : undefined,
      background: styleObj.color.background ? convertCssVariableToGutenbergPreset(styleObj.color.background) : undefined,
      gradient: styleObj.color.gradient,
    };
  }

  if (styleObj.typography) {
    gutenbergStyle.typography = {
      fontFamily: styleObj.typography.fontFamily,
      fontSize: styleObj.typography.fontSize,
      lineHeight: styleObj.typography.lineHeight,
      letterSpacing: styleObj.typography.letterSpacing,
      textTransform: styleObj.typography.textTransform,
      textDecoration: styleObj.typography.textDecoration,
    };
  }

  if (styleObj.spacing) {
    gutenbergStyle.spacing = {
      margin: styleObj.spacing.margin,
      padding: styleObj.spacing.padding,
      blockGap: styleObj.spacing.gap || styleObj.spacing.blockGap,
    };
  }

  if (styleObj.dimensions) {
    gutenbergStyle.dimensions = {
      aspectRatio: styleObj.dimensions.aspectRatio,
      minHeight: styleObj.dimensions.minHeight,
    };
  }

  if ((styleObj as any).border) {
    const b = (styleObj as any).border;
    gutenbergStyle.border = {
      color: b.color ? convertCssVariableToGutenbergPreset(b.color) : undefined,
      radius: b.radius,
      style: b.style,
      width: b.width,
    };
  }

  if ((styleObj as any).shadow) {
    const sh = (styleObj as any).shadow;
    gutenbergStyle.shadow = sh.preset || undefined;
  }

  return gutenbergStyle;
}

