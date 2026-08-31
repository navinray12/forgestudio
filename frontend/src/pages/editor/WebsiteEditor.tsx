import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// ==========================================
// Types & Interfaces
// ==========================================

export type ElementType = "container" | "heading" | "text" | "image" | "button";
export type DeviceMode = "desktop" | "tablet" | "mobile";

export interface ContainerLayout {
  direction?: "column" | "row";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
  gap?: number;
}

export interface ElementStyles {
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  backgroundColor?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  borderRadius?: string;
  width?: string;
  height?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  lineHeight?: string;
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "overline" | "line-through";
  letterSpacing?: string;
  textShadow?: string;
  backgroundImage?: string;
  backgroundPosition?: "center" | "top" | "bottom" | "left" | "right";
  backgroundSize?: "cover" | "contain" | "auto";
  backgroundRepeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y";
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderWidth?: string;
  borderColor?: string;
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomRightRadius?: string;
  borderBottomLeftRadius?: string;
  boxShadow?: string;
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number | string;
}

export type ElementState = "normal" | "hover";

export interface EditorElement {
  id: string;
  type: ElementType;
  content: string;
  src?: string;
  alt?: string;
  href?: string;
  customClass?: string; // F-068
  styles: ElementStyles;
  hoverStyles?: Partial<ElementStyles>;
  layout?: ContainerLayout;
  children?: EditorElement[];

componentId?: string;
isComponent?: boolean;
componentName?: string;

responsiveStyles?: {
  desktop?: Partial<ElementStyles>;
  tablet?: Partial<ElementStyles>;
  mobile?: Partial<ElementStyles>;
};

responsiveHoverStyles?: {
  desktop?: Partial<ElementStyles>;
  tablet?: Partial<ElementStyles>;
  mobile?: Partial<ElementStyles>;
};

responsiveLayout?: {
  desktop?: Partial<ContainerLayout>;
  tablet?: Partial<ContainerLayout>;
  mobile?: Partial<ContainerLayout>;
};

}

interface WebsiteData {
  id: string;
  name: string;
  slug: string;
  status: string;
  editorData?: {
    version: number;
    elements: EditorElement[];
  };
}

// ==========================================
// Helpers
// ==========================================

function generateId(): string {
  return "el_" + Math.random().toString(36).substring(2, 9);
}

function resolveImageUrl(src: string | undefined, apiUrl: string): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  const cleanApiUrl = apiUrl.replace(/\/$/, "");
  const cleanSrc = src.startsWith("/") ? src : `/${src}`;
  return `${cleanApiUrl}${cleanSrc}`;
}



function parseSpacingUnit(valStr?: string, defaultUnit: string = "px") {
  if (!valStr) return { num: "", unit: defaultUnit };
  const match = valStr.trim().match(/^([0-9.-]+)(px|%|rem|em)?$/);
  if (match) {
    return { num: match[1], unit: match[2] || defaultUnit };
  }
  return { num: valStr, unit: defaultUnit };
}

// Responsive Cascading & Helper Functions
function getEffectiveStyle<K extends keyof ElementStyles>(
  el: EditorElement,
  device: DeviceMode,
  key: K
): ElementStyles[K] {
  if (device === "mobile") {
    if (el.responsiveStyles?.mobile?.[key] !== undefined) return el.responsiveStyles.mobile[key]!;
    if (el.responsiveStyles?.tablet?.[key] !== undefined) return el.responsiveStyles.tablet[key]!;
    if (el.responsiveStyles?.desktop?.[key] !== undefined) return el.responsiveStyles.desktop[key]!;
    return el.styles[key];
  }
  if (device === "tablet") {
    if (el.responsiveStyles?.tablet?.[key] !== undefined) return el.responsiveStyles.tablet[key]!;
    if (el.responsiveStyles?.desktop?.[key] !== undefined) return el.responsiveStyles.desktop[key]!;
    return el.styles[key];
  }
  if (el.responsiveStyles?.desktop?.[key] !== undefined) return el.responsiveStyles.desktop[key]!;
  return el.styles[key];
}

function getEffectiveHoverStyle<K extends keyof ElementStyles>(
  el: EditorElement,
  device: DeviceMode,
  key: K
): ElementStyles[K] | undefined {
  if (device === "mobile") {
    if (el.responsiveHoverStyles?.mobile?.[key] !== undefined) return el.responsiveHoverStyles.mobile[key]!;
    if (el.responsiveHoverStyles?.tablet?.[key] !== undefined) return el.responsiveHoverStyles.tablet[key]!;
    if (el.responsiveHoverStyles?.desktop?.[key] !== undefined) return el.responsiveHoverStyles.desktop[key]!;
    return el.hoverStyles?.[key];
  }
  if (device === "tablet") {
    if (el.responsiveHoverStyles?.tablet?.[key] !== undefined) return el.responsiveHoverStyles.tablet[key]!;
    if (el.responsiveHoverStyles?.desktop?.[key] !== undefined) return el.responsiveHoverStyles.desktop[key]!;
    return el.hoverStyles?.[key];
  }
  if (el.responsiveHoverStyles?.desktop?.[key] !== undefined) return el.responsiveHoverStyles.desktop[key]!;
  return el.hoverStyles?.[key];
}

function getControlStyleValue<K extends keyof ElementStyles>(
  el: EditorElement,
  device: DeviceMode,
  state: ElementState,
  key: K
): ElementStyles[K] | undefined {
  if (state === "hover") {
    return getEffectiveHoverStyle(el, device, key);
  }
  return getEffectiveStyle(el, device, key);
}

function isControlStyleConfigured(
  el: EditorElement,
  device: DeviceMode,
  state: ElementState,
  key: keyof ElementStyles
): boolean {
  if (state === "hover") {
    return getEffectiveHoverStyle(el, device, key) !== undefined;
  }
  if (device === "desktop") {
    return el.styles[key] !== undefined;
  }
  return el.responsiveStyles?.[device]?.[key] !== undefined || el.styles[key] !== undefined;
}

function hasHoverStyleOverride(el: EditorElement, device: DeviceMode, key: keyof ElementStyles): boolean {
  if (device === "desktop") return false;
  return el.responsiveHoverStyles?.[device]?.[key] !== undefined;
}

function getEffectiveLayout<K extends keyof ContainerLayout>(
  el: EditorElement,
  device: DeviceMode,
  key: K
): ContainerLayout[K] {
  const l = el.layout || {};
  if (device === "mobile") {
    if (el.responsiveLayout?.mobile?.[key] !== undefined) return el.responsiveLayout.mobile[key]!;
    if (el.responsiveLayout?.tablet?.[key] !== undefined) return el.responsiveLayout.tablet[key]!;
    if (el.responsiveLayout?.desktop?.[key] !== undefined) return el.responsiveLayout.desktop[key]!;
    return l[key];
  }
  if (device === "tablet") {
    if (el.responsiveLayout?.tablet?.[key] !== undefined) return el.responsiveLayout.tablet[key]!;
    if (el.responsiveLayout?.desktop?.[key] !== undefined) return el.responsiveLayout.desktop[key]!;
    return l[key];
  }
  if (el.responsiveLayout?.desktop?.[key] !== undefined) return el.responsiveLayout.desktop[key]!;
  return l[key];
}

function getMergedStyles(el: EditorElement, device: DeviceMode, state: ElementState = "normal"): ElementStyles {
  const styleKeys: (keyof ElementStyles)[] = [
    "color", "fontSize", "fontWeight", "textAlign", "backgroundColor",
    "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderRadius", "width", "height", "marginTop", "marginRight", "marginBottom", "marginLeft", "lineHeight",
    "fontFamily", "fontStyle", "textTransform", "textDecoration", "letterSpacing", "textShadow",
    "backgroundImage", "backgroundPosition", "backgroundSize", "backgroundRepeat",
    "borderStyle", "borderWidth", "borderColor",
    "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
    "boxShadow", "position", "top", "right", "bottom", "left", "zIndex"
  ];
  const res: ElementStyles = { ...el.styles };
  for (const k of styleKeys) {
    const val = getEffectiveStyle(el, device, k);
    if (val !== undefined) {
      (res as any)[k] = val;
    }
  }
  if (state === "hover") {
    for (const k of styleKeys) {
      const hoverVal = getEffectiveHoverStyle(el, device, k);
      if (hoverVal !== undefined) {
        (res as any)[k] = hoverVal;
      }
    }
  }
  return res;
}

function getMergedLayout(el: EditorElement, device: DeviceMode): ContainerLayout {
  const base = el.layout || {};
  return {
    direction: getEffectiveLayout(el, device, "direction") ?? base.direction ?? "column",
    justifyContent: getEffectiveLayout(el, device, "justifyContent") ?? base.justifyContent ?? "flex-start",
    alignItems: getEffectiveLayout(el, device, "alignItems") ?? base.alignItems ?? "stretch",
    gap: getEffectiveLayout(el, device, "gap") ?? base.gap ?? 10,
  };
}

function hasStyleOverride(el: EditorElement, device: DeviceMode, key: keyof ElementStyles): boolean {
  if (device === "desktop") return false;
  return el.responsiveStyles?.[device]?.[key] !== undefined;
}

function generateElementsHoverCSS(elementsList: EditorElement[], device: DeviceMode): string {
  let css = "";

  function traverse(list: EditorElement[]) {
    for (const el of list) {
      const styleKeys: (keyof ElementStyles)[] = [
        "color", "fontSize", "fontWeight", "textAlign", "backgroundColor",
        "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
        "borderRadius", "width", "height", "marginTop", "marginRight", "marginBottom", "marginLeft", "lineHeight",
        "fontFamily", "fontStyle", "textTransform", "textDecoration", "letterSpacing", "textShadow",
        "backgroundImage", "backgroundPosition", "backgroundSize", "backgroundRepeat",
        "borderStyle", "borderWidth", "borderColor",
        "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
        "boxShadow", "position", "top", "right", "bottom", "left", "zIndex"
      ];

      const hoverRuleProps: string[] = [];
      for (const k of styleKeys) {
        const hoverVal = getEffectiveHoverStyle(el, device, k);
        if (hoverVal !== undefined && hoverVal !== "") {
          const cssProp = k.replace(/([A-Z])/g, "-$1").toLowerCase();
          hoverRuleProps.push(`${cssProp}: ${hoverVal} !important;`);
        }
      }

      if (hoverRuleProps.length > 0) {
        css += `[data-el-id="${el.id}"]:hover { ${hoverRuleProps.join(" ")} transition: all 0.2s ease-in-out; }\n`;
      }

      if (el.children && el.children.length > 0) {
        traverse(el.children);
      }
    }
  }

  traverse(elementsList);
  return css;
}



// Tree Navigation & Manipulation Helpers
function findTreeElement(list: EditorElement[], id: string): EditorElement | null {
  for (const item of list) {
    if (item.id === id) return item;
    if (item.children && item.children.length > 0) {
      const found = findTreeElement(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

function getElementBreadcrumbPath(
  list: EditorElement[],
  targetId: string,
  currentPath: EditorElement[] = []
): EditorElement[] | null {
  for (const item of list) {
    const newPath = [...currentPath, item];
    if (item.id === targetId) return newPath;
    if (item.children && item.children.length > 0) {
      const found = getElementBreadcrumbPath(item.children, targetId, newPath);
      if (found) return found;
    }
  }
  return null;
}

function updateTreeElement(
  list: EditorElement[],
  id: string,
  updater: (el: EditorElement) => EditorElement
): EditorElement[] {
  return list.map((item) => {
    if (item.id === id) {
      return updater(item);
    }
    if (item.children && item.children.length > 0) {
      return {
        ...item,
        children: updateTreeElement(item.children, id, updater),
      };
    }
    return item;
  });
}

function reorderTreeElement(
  list: EditorElement[],
  id: string,
  direction: "up" | "down"
): EditorElement[] {
  const index = list.findIndex((item) => item.id === id);
  if (index !== -1) {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return list;
    const newList = [...list];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);
    return newList;
  }

  return list.map((item) => {
    if (item.children && item.children.length > 0) {
      return {
        ...item,
        children: reorderTreeElement(item.children, id, direction),
      };
    }
    return item;
  });
}

function deleteTreeElement(list: EditorElement[], id: string): EditorElement[] {
  return list
    .filter((item) => item.id !== id)
    .map((item) => {
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: deleteTreeElement(item.children, id),
        };
      }
      return item;
    });
}

function duplicateTreeElement(
  list: EditorElement[],
  id: string
): { updatedList: EditorElement[]; newId: string | null } {
  let newId: string | null = null;

  function process(items: EditorElement[]): EditorElement[] {
    let result: EditorElement[] = [];

    for (const item of items) {
      if (item.id === id) {
        const clonedItem: EditorElement = JSON.parse(JSON.stringify(item));
        const reassignIds = (node: EditorElement) => {
          node.id = generateId();
          if (node.children) {
            node.children.forEach(reassignIds);
          }
        };
        reassignIds(clonedItem);
        newId = clonedItem.id;

        result.push(item);
        result.push(clonedItem);
      } else if (item.children && item.children.length > 0) {
        result.push({
          ...item,
          children: process(item.children),
        });
      } else {
        result.push(item);
      }
    }

    return result;
  }

  const updatedList = process(list);
  return { updatedList, newId };
}

function insertTreeElement(
  list: EditorElement[],
  targetId: string | null,
  newEl: EditorElement
): EditorElement[] {
  if (!targetId) {
    return [...list, newEl];
  }

  const target = findTreeElement(list, targetId);
  if (!target) {
    return [...list, newEl];
  }

  if (target.type === "container") {
    return updateTreeElement(list, targetId, (c) => ({
      ...c,
      children: [...(c.children || []), newEl],
    }));
  }

  // If target is inside a container, append after target
  let inserted = false;
  const insertInArray = (arr: EditorElement[]): EditorElement[] => {
    const res: EditorElement[] = [];
    for (const item of arr) {
      res.push(item);
      if (item.id === targetId) {
        res.push(newEl);
        inserted = true;
      } else if (item.children && item.children.length > 0) {
        item.children = insertInArray(item.children);
      }
    }
    return res;
  };

  const updatedList = insertInArray(list);
  if (!inserted) {
    return [...list, newEl];
  }
  return updatedList;
}

function isDescendant(list: EditorElement[], parentId: string, targetId: string): boolean {
  const parent = findTreeElement(list, parentId);
  if (!parent || !parent.children) return false;
  return findTreeElement(parent.children, targetId) !== null;
}

function insertTreeElementAtPosition(
  list: EditorElement[],
  targetId: string | null,
  position: "before" | "after" | "inside" | null,
  newEl: EditorElement
): EditorElement[] {
  if (!targetId || !position) {
    return [...list, newEl];
  }

  if (position === "inside") {
    const target = findTreeElement(list, targetId);
    if (target && target.type === "container") {
      return updateTreeElement(list, targetId, (c) => ({
        ...c,
        children: [...(c.children || []), newEl],
      }));
    }
  }

  let inserted = false;
  const processArray = (arr: EditorElement[]): EditorElement[] => {
    const res: EditorElement[] = [];
    for (const item of arr) {
      if (item.id === targetId) {
        if (position === "before") {
          res.push(newEl);
          res.push(item);
        } else {
          res.push(item);
          res.push(newEl);
        }
        inserted = true;
      } else {
        if (item.children && item.children.length > 0) {
          res.push({
            ...item,
            children: processArray(item.children),
          });
        } else {
          res.push(item);
        }
      }
    }
    return res;
  };

  const updated = processArray(list);
  if (!inserted) {
    return [...list, newEl];
  }
  return updated;
}

function moveTreeElement(
  list: EditorElement[],
  sourceId: string,
  targetId: string | null,
  position: "before" | "after" | "inside" | null
): EditorElement[] {
  if (sourceId === targetId) return list;
  if (targetId && isDescendant(list, sourceId, targetId)) return list;

  const sourceEl = findTreeElement(list, sourceId);
  if (!sourceEl) return list;

  const listWithoutSource = deleteTreeElement(list, sourceId);
  return insertTreeElementAtPosition(listWithoutSource, targetId, position, sourceEl);
}

// ==========================================
// Cascading Value Resolution (Inheritance)
// ==========================================

export function getBreakpointFallbackChain(bpId: string, activeBps: Breakpoint[]): string[] {
  const activeBpsSorted = [...activeBps].filter(b => b.active).sort((a, b) => b.width - a.width);
  const bp = activeBps.find(b => b.id === bpId);
  const desktop = activeBps.find(b => b.id === "desktop") || { id: "desktop", width: 1024 };

  if (!bp) return ["desktop"];
  if (bp.id === "desktop") return ["desktop"];

  if (bp.width > desktop.width) {
    // Larger than desktop: fallback goes down to desktop
    const chain = activeBpsSorted
      .filter(b => b.width <= bp.width && b.width >= desktop.width)
      .map(b => b.id);
    return chain;
  } else {
    // Smaller than desktop: fallback goes up to desktop
    const chain = activeBpsSorted
      .filter(b => b.width >= bp.width && b.width <= desktop.width)
      .reverse()
      .map(b => b.id);
    return chain;
  }
}

export function getStyleVal(
  el: EditorElement,
  prop: keyof ElementStyles,
  bpId: string,
  activeBps: Breakpoint[]
): string | undefined {
  const chain = getBreakpointFallbackChain(bpId, activeBps);
  for (const id of chain) {
    if (id === "desktop") {
      if (el.styles && el.styles[prop] !== undefined && el.styles[prop] !== "") {
        return el.styles[prop];
      }
    } else {
      const bpStyles = el.responsiveStyles?.[id];
      if (bpStyles && bpStyles[prop] !== undefined && bpStyles[prop] !== "") {
        return bpStyles[prop];
      }
    }
  }
  return undefined;
}

export function getLayoutVal<K extends keyof ContainerLayout>(
  el: EditorElement,
  prop: K,
  bpId: string,
  activeBps: Breakpoint[]
): ContainerLayout[K] | undefined {
  const chain = getBreakpointFallbackChain(bpId, activeBps);
  for (const id of chain) {
    if (id === "desktop") {
      if (el.layout && el.layout[prop] !== undefined && (el.layout[prop] as any) !== "") {
        return el.layout[prop];
      }
    } else {
      const bpLayout = el.responsiveLayouts?.[id];
      if (bpLayout && bpLayout[prop] !== undefined && (bpLayout[prop] as any) !== "") {
        return bpLayout[prop];
      }
    }
  }
  return undefined;
}

export function resolveElementStyles(
  el: EditorElement,
  bpId: string,
  activeBps: Breakpoint[],
  globalSettings?: any
): React.CSSProperties {
  const styles: React.CSSProperties = {};

  const getVal = (prop: keyof ElementStyles): string | undefined => {
    return getStyleVal(el, prop, bpId, activeBps);
  };

  // Basic styling
  const color = getVal("color");
  if (color) styles.color = color;

  const fontSize = getVal("fontSize");
  if (fontSize) styles.fontSize = fontSize;

  const fontWeight = getVal("fontWeight");
  if (fontWeight) styles.fontWeight = fontWeight;

  const textAlign = getVal("textAlign");
  if (textAlign) styles.textAlign = textAlign as any;

  const lineHeight = getVal("lineHeight");
  if (lineHeight) styles.lineHeight = lineHeight;

  const fontFamily = getVal("fontFamily");
  if (fontFamily && fontFamily !== "inherit") {
    styles.fontFamily = fontFamily;
  }

  const letterSpacing = getVal("letterSpacing");
  if (letterSpacing) styles.letterSpacing = letterSpacing.endsWith("px") || letterSpacing.endsWith("em") ? letterSpacing : `${letterSpacing}px`;

  const wordSpacing = getVal("wordSpacing");
  if (wordSpacing) styles.wordSpacing = wordSpacing.endsWith("px") || wordSpacing.endsWith("em") ? wordSpacing : `${wordSpacing}px`;

  // Margin/Padding
  const paddingTop = getVal("paddingTop");
  if (paddingTop) styles.paddingTop = paddingTop;
  const paddingRight = getVal("paddingRight");
  if (paddingRight) styles.paddingRight = paddingRight;
  const paddingBottom = getVal("paddingBottom");
  if (paddingBottom) styles.paddingBottom = paddingBottom;
  const paddingLeft = getVal("paddingLeft");
  if (paddingLeft) styles.paddingLeft = paddingLeft;

  const marginTop = getVal("marginTop");
  if (marginTop) styles.marginTop = marginTop;
  const marginRight = getVal("marginRight");
  if (marginRight) styles.marginRight = marginRight;
  const marginBottom = getVal("marginBottom");
  if (marginBottom) styles.marginBottom = marginBottom;
  const marginLeft = getVal("marginLeft");
  if (marginLeft) styles.marginLeft = marginLeft;

  const borderRadius = getVal("borderRadius");
  if (borderRadius) styles.borderRadius = borderRadius;

  const width = getVal("width");
  if (width) styles.width = width;

  const height = getVal("height");
  if (height) styles.height = height;

  // Background Options (F-073, F-074, F-075, F-076)
  const bgType = getVal("backgroundType") || "solid";
  if (bgType === "solid") {
    const bgColor = getVal("backgroundColor");
    if (bgColor) styles.backgroundColor = bgColor;
  } else if (bgType === "gradient") {
    const gradient = getVal("backgroundGradient");
    if (gradient) styles.background = gradient;
  } else if (bgType === "image") {
    const bgImgUrl = getVal("backgroundImageUrl");
    if (bgImgUrl) {
      styles.backgroundImage = `url(${bgImgUrl})`;
      styles.backgroundPosition = getVal("backgroundPosition") || "center center";
      styles.backgroundRepeat = getVal("backgroundRepeat") || "no-repeat";
      styles.backgroundSize = getVal("backgroundSize") || "cover";
    }
  }

  // Borders (F-079)
  const borderStyle = getVal("borderStyle");
  if (borderStyle && borderStyle !== "none") {
    styles.borderStyle = borderStyle as any;
    styles.borderWidth = getVal("borderWidth") || "1px";
    styles.borderColor = getVal("borderColor") || "#cbd5e1";
  }

  // Box Shadow (F-081)
  const boxShadow = getVal("boxShadow");
  if (boxShadow) {
    if (boxShadow === "none") styles.boxShadow = "none";
    else if (boxShadow === "sm") styles.boxShadow = "0 1px 2px 0 rgb(0 0 0 / 0.05)";
    else if (boxShadow === "md") styles.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
    else if (boxShadow === "lg") styles.boxShadow = "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
    else if (boxShadow === "xl") styles.boxShadow = "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
    else if (boxShadow === "inner") styles.boxShadow = "inset 0 2px 4px 0 rgb(0 0 0 / 0.06)";
    else styles.boxShadow = boxShadow;
  }

  // Opacity & Blend Mode (F-082, F-083)
  const opacity = getVal("opacity");
  if (opacity) {
    styles.opacity = parseFloat(opacity) / 100;
  }
  const mixBlendMode = getVal("mixBlendMode");
  if (mixBlendMode && mixBlendMode !== "normal") {
    styles.mixBlendMode = mixBlendMode as any;
  }

  // Filters (F-084)
  const blur = getVal("filterBlur") || "0";
  const brightness = getVal("filterBrightness") || "100";
  const contrast = getVal("filterContrast") || "100";
  const grayscale = getVal("filterGrayscale") || "0";
  const saturate = getVal("filterSaturate") || "100";
  const hueRotate = getVal("filterHueRotate") || "0";
  if (blur !== "0" || brightness !== "100" || contrast !== "100" || grayscale !== "0" || saturate !== "100" || hueRotate !== "0") {
    styles.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) saturate(${saturate}%) hue-rotate(${hueRotate}deg)`;
  }

  // Clip Path Masks (F-085)
  const clipPath = getVal("clipPath");
  if (clipPath && clipPath !== "none") {
    styles.clipPath = clipPath;
  }

  // Transforms (F-086)
  const rotate = getVal("transformRotate") || "0";
  const scale = getVal("transformScale") || "1";
  const skewX = getVal("transformSkewX") || "0";
  const skewY = getVal("transformSkewY") || "0";
  const tx = getVal("transformTranslateX") || "0";
  const ty = getVal("transformTranslateY") || "0";
  if (rotate !== "0" || scale !== "1" || skewX !== "0" || skewY !== "0" || tx !== "0" || ty !== "0") {
    styles.transform = `translate(${tx}px, ${ty}px) rotate(${rotate}deg) scale(${scale}) skew(${skewX}deg, ${skewY}deg)`;
  }

  // Text Outline / Stroke (F-087)
  const strokeWidth = getVal("textStrokeWidth");
  const strokeColor = getVal("textStrokeColor");
  if (strokeWidth && strokeWidth !== "0") {
    (styles as any).WebkitTextStroke = `${strokeWidth}px ${strokeColor || "currentColor"}`;
  }

  // Text Shadow (F-093)
  const textShadow = getVal("textShadow");
  if (textShadow) {
    if (textShadow === "none") styles.textShadow = "none";
    else if (textShadow === "subtle") styles.textShadow = "1px 1px 2px rgba(0,0,0,0.3)";
    else if (textShadow === "medium") styles.textShadow = "2px 2px 4px rgba(0,0,0,0.4)";
    else if (textShadow === "hard") styles.textShadow = "3px 3px 0px rgba(0,0,0,0.8)";
    else styles.textShadow = textShadow;
  }

  // Text Masking (F-088)
  const textMaskType = getVal("textMaskType");
  if (textMaskType === "gradient") {
    const textMaskGradient = getVal("textMaskGradient") || "linear-gradient(45deg, #2563eb, #10b981)";
    styles.background = textMaskGradient;
    (styles as any).WebkitBackgroundClip = "text";
    (styles as any).WebkitTextFillColor = "transparent";
  } else if (textMaskType === "image") {
    const textMaskImage = getVal("textMaskImage");
    if (textMaskImage) {
      styles.backgroundImage = `url(${textMaskImage})`;
      styles.backgroundSize = "cover";
      styles.backgroundPosition = "center";
      (styles as any).WebkitBackgroundClip = "text";
      (styles as any).WebkitTextFillColor = "transparent";
    }
  }

  return styles;
}

export function getInnerStyles(resolved: React.CSSProperties): React.CSSProperties {
  const inner = { ...resolved };
  delete inner.marginTop;
  delete inner.marginRight;
  delete inner.marginBottom;
  delete inner.marginLeft;
  delete inner.boxShadow;
  delete inner.opacity;
  delete inner.filter;
  delete inner.transform;
  delete inner.mixBlendMode;
  return inner;
}

export function BackgroundSlideshow({ urls, interval }: { urls: string[]; interval: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (urls.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % urls.length);
    }, interval);
    return () => clearInterval(timer);
  }, [urls, interval]);

  if (urls.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-[inherit]">
      {urls.map((url, i) => (
        <div
          key={url + i}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${url})` }}
        />
      ))}
    </div>
  );
}

// ==========================================
// Sidebar Vector Icons (Matching Screenshot)
// ==========================================

const ContainerBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="3 3" />
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  </div>
);

const HeadingBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center font-serif text-lg font-bold text-slate-700">
    H
  </div>
);

const TextBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center font-sans text-lg font-bold text-slate-700">
    T
  </div>
);

const ImageBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  </div>
);

const ButtonBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center">
    <div className="h-4 w-5 rounded-md border-2 border-slate-700 bg-slate-100" />
  </div>
);

// Colorful placeholder icon inside empty image box
const EmptyPictureIcon = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" />
    </svg>
  </div>
);

// Upload Icon
const UploadCloudIcon = () => (
  <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// ==========================================
// Default Elements Creator
// ==========================================

function createDefaultElement(type: ElementType): EditorElement {
  const id = generateId();
  switch (type) {
    case "container":
      return {
        id,
        type: "container",
        content: "Container",
        children: [],
        layout: {
          direction: "column",
          justifyContent: "flex-start",
          alignItems: "stretch",
          gap: 10,
        },
        styles: {
          width: "100%",
          height: "auto",
          backgroundColor: "#ffffff",
          paddingTop: "16px",
          paddingRight: "16px",
          paddingBottom: "16px",
          paddingLeft: "16px",
          marginTop: "8px",
          marginBottom: "8px",
          borderRadius: "12px",
        },
      };
    case "heading":
      return {
        id,
        type: "heading",
        content: "Heading Text",
        styles: {
          color: "#0f172a",
          fontSize: "32px",
          fontWeight: "700",
          textAlign: "left",
          marginTop: "16px",
          marginBottom: "16px",
          lineHeight: "1.2",
        },
      };
    case "text":
      return {
        id,
        type: "text",
        content: "Click here to edit this paragraph text. Add your own description and details.",
        styles: {
          color: "#475569",
          fontSize: "16px",
          fontWeight: "400",
          textAlign: "left",
          marginTop: "12px",
          marginBottom: "12px",
          lineHeight: "1.6",
        },
      };
    case "image":
      return {
        id,
        type: "image",
        content: "Image",
        src: "",
        alt: "Uploaded Image",
        styles: {
          width: "100%",
          borderRadius: "8px",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
    case "button":
      return {
        id,
        type: "button",
        content: "Click Me",
        href: "#",
        styles: {
          color: "#ffffff",
          backgroundColor: "#2563eb",
          fontSize: "14px",
          fontWeight: "600",
          textAlign: "center",
          padding: "10px 22px",
          borderRadius: "8px",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
  }
}

// ==========================================
// Main WebsiteEditor Component
// ==========================================

const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { id: "widescreen", name: "Widescreen", width: 1440, active: false },
  { id: "laptop", name: "Laptop", width: 1200, active: false },
  { id: "desktop", name: "Desktop (Base)", width: 1024, active: true },
  { id: "tabletExtra", name: "Tablet Extra", width: 880, active: false },
  { id: "tablet", name: "Tablet", width: 768, active: true },
  { id: "mobileExtra", name: "Mobile Extra", width: 480, active: false },
  { id: "mobile", name: "Mobile", width: 360, active: true },
];

export default function WebsiteEditor() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // State Management
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeElementState, setActiveElementState] = useState<ElementState>("normal");

  // Reusable Components State (F-005)
  const [components, setComponents] = useState<Record<string, { name: string; element: EditorElement }>>({});

  const syncComponentInstances = (compId: string, updatedSource: EditorElement) => {
    const updateMatching = (list: EditorElement[]): EditorElement[] => {
      return list.map((item) => {
        let currentItem = item;
        if (item.componentId === compId) {
          currentItem = {
            ...currentItem,
            content: updatedSource.content,
            src: updatedSource.src,
            alt: updatedSource.alt,
            href: updatedSource.href,
            styles: { ...updatedSource.styles },
            hoverStyles: updatedSource.hoverStyles ? JSON.parse(JSON.stringify(updatedSource.hoverStyles)) : undefined,
            layout: updatedSource.layout ? { ...updatedSource.layout } : undefined,
            responsiveStyles: updatedSource.responsiveStyles ? JSON.parse(JSON.stringify(updatedSource.responsiveStyles)) : undefined,
            responsiveHoverStyles: updatedSource.responsiveHoverStyles ? JSON.parse(JSON.stringify(updatedSource.responsiveHoverStyles)) : undefined,
            responsiveLayout: updatedSource.responsiveLayout ? JSON.parse(JSON.stringify(updatedSource.responsiveLayout)) : undefined,
          };
        }
        if (currentItem.children && currentItem.children.length > 0) {
          currentItem = {
            ...currentItem,
            children: updateMatching(currentItem.children),
          };
        }
        return currentItem;
      });
    };

    setElements((prev) => updateMatching(prev));
  };

  const handleSaveAsComponent = (elementId: string) => {
    const el = findTreeElement(elements, elementId);
    if (!el) return;
    const compId = "comp_" + Math.random().toString(36).substring(2, 9);
    const compName = el.componentName || `${el.type.charAt(0).toUpperCase() + el.type.slice(1)} Component`;

    const masterCopy: EditorElement = JSON.parse(JSON.stringify(el));
    masterCopy.componentId = compId;
    masterCopy.isComponent = true;

    setComponents((prev) => ({
      ...prev,
      [compId]: {
        name: compName,
        element: masterCopy,
      },
    }));

    setElements((prev) =>
      updateTreeElement(prev, elementId, (item) => ({
        ...item,
        componentId: compId,
        isComponent: true,
        componentName: compName,
      }))
    );
  };

  const handleAddInstanceFromComponent = (compId: string) => {
    const comp = components[compId];
    if (!comp) return;

    const createInstance = (base: EditorElement): EditorElement => ({
      ...JSON.parse(JSON.stringify(base)),
      id: generateId(),
      componentId: compId,
      isComponent: true,
      componentName: comp.name,
      children: base.children ? base.children.map(createInstance) : undefined,
    });

    const newInstance = createInstance(comp.element);
    setElements((prev) => [...prev, newInstance]);
    setSelectedId(newInstance.id);
    setSelectedIds([newInstance.id]);
  };

  // Drag & Drop State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "inside" | null>(null);

  // Context Menu State (F-010)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // Favorite Widgets State (F-012)
  const [favoriteWidgets, setFavoriteWidgets] = useState<ElementType[]>(() => {
    try {
      const saved = localStorage.getItem("forgestudio_favorite_widgets");
      return saved ? JSON.parse(saved) : ["heading", "button"];
    } catch {
      return ["heading", "button"];
    }
  });

  // User Preferences State (F-026)
  const [userPreferences, setUserPreferences] = useState<{
    autoSaveEnabled: boolean;
    gridOverlay: boolean;
    themeMode: "dark" | "light";
  }>(() => {
    try {
      const saved = localStorage.getItem("forgestudio_user_preferences");
      return saved ? JSON.parse(saved) : { autoSaveEnabled: true, gridOverlay: false, themeMode: "dark" };
    } catch {
      return { autoSaveEnabled: true, gridOverlay: false, themeMode: "dark" };
    }
  });

  const updatePreference = <K extends keyof typeof userPreferences>(
    key: K,
    value: (typeof userPreferences)[K]
  ) => {
    setUserPreferences((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem("forgestudio_user_preferences", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save user preferences:", err);
      }
      return updated;
    });
  };

  const toggleFavoriteWidget = (type: ElementType, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavoriteWidgets((prev) => {
      const isFav = prev.includes(type);
      const updated = isFav ? prev.filter((item) => item !== type) : [...prev, type];
      try {
        localStorage.setItem("forgestudio_favorite_widgets", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save favorite widgets:", err);
      }
      return updated;
    });
  };

  // Revision & History State (F-013)
  const [history, setHistory] = useState<EditorElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoAction = useRef(false);

  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    setHistory((prev) => {
      const sliced = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : prev;
      const updated = [...sliced, JSON.parse(JSON.stringify(elements))];
      if (updated.length > 50) updated.shift();
      return updated;
    });

    setHistoryIndex(historyIndex >= 0 ? Math.min(historyIndex + 1, 49) : 0);
  }, [elements]);

  const handleUndo = () => {
    if (historyIndex > 0 && history[historyIndex - 1]) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && history[historyIndex + 1]) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const handleSelectElement = (id: string | null, e?: React.MouseEvent) => {
    setActiveElementState("normal");
    if (!id) {
      setSelectedId(null);
      setSelectedIds([]);
      return;
    }

    if (e && (e.ctrlKey || e.metaKey)) {
      setSelectedIds((prev) => {
        const isAlreadySelected = prev.includes(id);
        const updated = isAlreadySelected
          ? prev.filter((item) => item !== id)
          : [...prev, id];
        setSelectedId(updated.length > 0 ? updated[updated.length - 1] : null);
        return updated;
      });
    } else {
      setSelectedId(id);
      setSelectedIds([id]);
    }
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [activeDevice, setActiveDevice] = useState<DeviceMode>("desktop");
  const [isMarginLinked, setIsMarginLinked] = useState<boolean>(true);
  const [isPaddingLinked, setIsPaddingLinked] = useState<boolean>(true);
  const [isBorderRadiusLinked, setIsBorderRadiusLinked] = useState<boolean>(true);

  const [isPreview, setIsPreview] = useState(false);
  const [isFullScreenCanvas, setIsFullScreenCanvas] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Navigator State
  const [leftSidebarTab, setLeftSidebarTab] = useState<"elements" | "navigator">("elements");
  const [collapsedContainers, setCollapsedContainers] = useState<Record<string, boolean>>({});
  const [structureSearchQuery, setStructureSearchQuery] = useState("");

  // Element Manager State (F-032)
  const [disabledWidgets, setDisabledWidgets] = useState<ElementType[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("forgestudio_disabled_widgets") || "[]");
    } catch {
      return [];
    }
  });
  const [isElementManagerOpen, setIsElementManagerOpen] = useState(false);

  const toggleWidgetAvailability = (type: ElementType) => {
    setDisabledWidgets((prev) => {
      const updated = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
      localStorage.setItem("forgestudio_disabled_widgets", JSON.stringify(updated));
      return updated;
    });
  };

  // Copy / Paste State
  const [copiedElement, setCopiedElement] = useState<EditorElement | null>(null);
  const [copiedElements, setCopiedElements] = useState<EditorElement[]>([]);
  const [copiedStyles, setCopiedStyles] = useState<{
    styles?: ElementStyles;
    responsiveStyles?: Partial<Record<DeviceMode, Partial<ElementStyles>>>;
    hoverStyles?: Partial<ElementStyles>;
    responsiveHoverStyles?: Partial<Record<DeviceMode, Partial<ElementStyles>>>;
  } | null>(null);

  // Page Settings State (F-018 & F-019 & F-022)
  const [pageSettings, setPageSettings] = useState<{
    title?: string;
    description?: string;
    path?: string;
    backgroundColor?: string;
    customHead?: string;
    isMaintenanceMode?: boolean;
    siteLanguage?: string;
  }>({
    title: "Home",
    description: "",
    path: "/",
    backgroundColor: "#ffffff",
    customHead: "",
    isMaintenanceMode: false,
    siteLanguage: "en",
  });

  const navigate = useNavigate();

  // Quit Visual Editor Handler (F-024)
  const handleQuitEditor = () => {
    navigate("/dashboard");
  };

  // Editor UI Language State & Dictionary (F-022 & F-024)
  const [editorLanguage, setEditorLanguage] = useState<"en" | "es" | "fr" | "de">("en");

  const editorTranslations: Record<string, Record<string, string>> = {
    en: {
      save: "Save",
      saving: "Saving...",
      preview: "Preview",
      exitPreview: "Exit Preview",
      undo: "Undo",
      redo: "Redo",
      elements: "Elements",
      navigator: "Navigator",
      pageSettings: "Page Settings",
      container: "Container",
      heading: "Heading",
      text: "Text",
      image: "Image",
      button: "Button",
      properties: "Properties",
      editorLang: "Editor UI Language",
      siteLang: "Site Language (Published)",
      quitEditor: "Quit Editor",
    },
    es: {
      save: "Guardar",
      saving: "Guardando...",
      preview: "Vista Previa",
      exitPreview: "Salir de Vista Previa",
      undo: "Deshacer",
      redo: "Rehacer",
      elements: "Elementos",
      navigator: "Navegador",
      pageSettings: "Configuración de Página",
      container: "Contenedor",
      heading: "Encabezado",
      text: "Texto",
      image: "Imagen",
      button: "Botón",
      properties: "Propiedades",
      editorLang: "Idioma de Interfaz",
      siteLang: "Idioma del Sitio (Publicado)",
      quitEditor: "Salir del Editor",
    },
    fr: {
      save: "Enregistrer",
      saving: "Enregistrement...",
      preview: "Aperçu",
      exitPreview: "Quitter l'aperçu",
      undo: "Annuler",
      redo: "Rétablir",
      elements: "Éléments",
      navigator: "Navigateur",
      pageSettings: "Paramètres de Page",
      container: "Conteneur",
      heading: "Titre",
      text: "Texte",
      image: "Image",
      button: "Bouton",
      properties: "Propriétés",
      editorLang: "Langue de l'Éditeur",
      siteLang: "Langue du Site (Publié)",
      quitEditor: "Quitter l'éditeur",
    },
    de: {
      save: "Speichern",
      saving: "Speichern...",
      preview: "Vorschau",
      exitPreview: "Vorschau Beenden",
      undo: "Rückgängig",
      redo: "Wiederholen",
      elements: "Elemente",
      navigator: "Navigator",
      pageSettings: "Seiteneinstellungen",
      container: "Behälter",
      heading: "Überschrift",
      text: "Text",
      image: "Bild",
      button: "Schaltfläche",
      properties: "Eigenschaften",
      editorLang: "Editor-Sprache",
      siteLang: "Website-Sprache (Veröffentlicht)",
      quitEditor: "Editor Beenden",
    },
  };

  const t = (key: string, fallback: string) => {
    return editorTranslations[editorLanguage]?.[key] || fallback;
  };

  // Temporary Support Credentials State (F-020)
  const [supportToken, setSupportToken] = useState<string | null>(null);
  const [supportExpiresAt, setSupportExpiresAt] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportCopied, setSupportCopied] = useState(false);

  // Generate Support Token (F-020)
  const handleGenerateSupportToken = async () => {
    try {
      setIsGeneratingToken(true);
      setSupportMessage("");
      const res = await fetch(`${apiUrl}/api/v1/auth/support-token`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to generate support token.");

      setSupportToken(data.data.supportToken);
      setSupportExpiresAt(new Date(data.data.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setSupportMessage("Temporary 2-hr support credential generated!");
    } catch (err: any) {
      setSupportMessage(err.message || "Failed to generate support token.");
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Revoke Support Tokens (F-020)
  const handleRevokeSupportTokens = async () => {
    try {
      setSupportMessage("");
      const res = await fetch(`${apiUrl}/api/v1/auth/revoke-support-tokens`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to revoke support tokens.");

      setSupportToken(null);
      setSupportExpiresAt(null);
      setSupportMessage("All support credentials revoked.");
    } catch (err: any) {
      setSupportMessage(err.message || "Failed to revoke support tokens.");
    }
  };

  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(DEFAULT_BREAKPOINTS);
  const [activeBreakpointId, setActiveBreakpointId] = useState<string>("desktop");
  const [isBpModalOpen, setIsBpModalOpen] = useState(false);

  // Global settings state (F-066 to F-101)
  const [globalSettings, setGlobalSettings] = useState<any>({
    colors: {
      primary: "#2563eb",
      secondary: "#475569",
      accent: "#10b981",
      background: "#ffffff",
      text: "#0f172a",
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
    },
    siteIdentity: {
      name: "My Website",
      description: "A beautiful site built with ForgeStudio",
      logoUrl: "",
      faviconUrl: "",
    },
    globalStyles: {
      siteMaxWidth: "1200px",
      defaultBorderRadius: "8px",
      defaultButtonPadding: "10px 22px",
      enableDefaultColors: true,
      enableDefaultFonts: true,
    },
    customCss: "",
    lightboxSettings: {
      enableLightbox: true,
      lightboxTheme: "dark",
    }
  });

  const [activeSidebarTab, setActiveSidebarTab] = useState<"element" | "global">("global");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    layout: true,
    typography: false,
    background: false,
    borders: false,
    shadows: false,
    effects: false,
    divider: false,
    textStroke: false,
    path: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // When an element is selected, switch to element tab (F-066)
  useEffect(() => {
    if (selectedId) {
      setActiveSidebarTab("element");
    } else {
      setActiveSidebarTab("global");
    }
  }, [selectedId]);

  // Inject global CSS styles (F-066, F-067, F-068, F-069, F-092)
  useEffect(() => {
    const styleId = "editor-injected-global-styles";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    let css = "";
    
    // Inject Ken Burns animations (F-092)
    css += `
      @keyframes kb-zoom-in {
        0% { transform: scale(1); }
        100% { transform: scale(1.12) translate(-1%, -1%); }
      }
      @keyframes kb-zoom-out {
        0% { transform: scale(1.12); }
        100% { transform: scale(1); }
      }
      .kb-zoom-in {
        animation: kb-zoom-in 20s infinite alternate ease-in-out !important;
      }
      .kb-zoom-out {
        animation: kb-zoom-out 20s infinite alternate ease-in-out !important;
      }
    `;

    if (globalSettings) {
      css += `
        :root {
          --primaryColor: ${globalSettings.colors?.primary || "#2563eb"};
          --secondaryColor: ${globalSettings.colors?.secondary || "#475569"};
          --accentColor: ${globalSettings.colors?.accent || "#10b981"};
          --backgroundColor: ${globalSettings.colors?.background || "#ffffff"};
          --textColor: ${globalSettings.colors?.text || "#0f172a"};
          --siteMaxWidth: ${globalSettings.globalStyles?.siteMaxWidth || "1200px"};
          --defaultBorderRadius: ${globalSettings.globalStyles?.defaultBorderRadius || "8px"};
        }
      `;

      if (globalSettings.globalStyles?.enableDefaultFonts) {
        css += `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap');
        `;
      }

      if (globalSettings.customCss) {
        css += `\\n/* Custom Global CSS */\\n` + globalSettings.customCss;
      }
    }

    styleEl.textContent = css;
  }, [globalSettings]);

  const handleToggleBreakpoint = (id: string) => {
    if (id === "desktop") return;
    setBreakpoints((prev) => {
      const updated = prev.map((bp) => (bp.id === id ? { ...bp, active: !bp.active } : bp));
      const isCurrentlyActiveDeactivated =
        updated.find((bp) => bp.id === id && !bp.active) && activeBreakpointId === id;
      if (isCurrentlyActiveDeactivated) {
        setActiveBreakpointId("desktop");
      }
      return updated;
    });
  };

  const handleWidthChange = (id: string, width: number) => {
    setBreakpoints((prev) =>
      prev.map((bp) => (bp.id === id ? { ...bp, width: Math.max(200, Math.min(3000, width)) } : bp))
    );
  };

  const handleResetBreakpoints = () => {
    setBreakpoints(DEFAULT_BREAKPOINTS);
    setActiveBreakpointId("desktop");
  };

  // Fetch Website Data
  useEffect(() => {
    if (!websiteId) return;

    const fetchWebsite = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || data?.error?.message || "Failed to load website.");
        }

        const loadedSite = data.website || data;
        setWebsite(loadedSite);

        if (loadedSite?.editorData?.elements && Array.isArray(loadedSite.editorData.elements)) {
          setElements(loadedSite.editorData.elements);
        } else {
          setElements([]);
        }

        if (loadedSite?.editorData?.breakpoints && Array.isArray(loadedSite.editorData.breakpoints)) {
          setBreakpoints(loadedSite.editorData.breakpoints);
        }

        if (loadedSite?.editorData?.globalSettings) {
          setGlobalSettings(loadedSite.editorData.globalSettings);
        } else if (loadedSite?.name) {
          setGlobalSettings((prev: any) => ({
            ...prev,
            siteIdentity: {
              ...prev.siteIdentity,
              name: loadedSite.name,
            }
          }));
        }
      } catch (err) {
        console.error("Error loading website:", err);
        setErrorMessage(err instanceof Error ? err.message : "Error loading website");
      } finally {
        setLoading(false);
      }
    };

    fetchWebsite();
  }, [websiteId, apiUrl]);

  // Save Website Data
  const handleSave = async () => {
    if (!websiteId) return;

    try {
      setSaving(true);
      setSaveMessage("");
      setErrorMessage("");

      const payload = {
        editorData: {
          version: 1,
          elements,
          breakpoints,
          globalSettings,
        },
      };

      const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Failed to save website.");
      }

      setSaveMessage("Saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save website data.");
    } finally {
      setSaving(false);
    }
  };

  // Element Actions
  const handleAddElement = (type: ElementType, targetId: string | null = null) => {
    if (disabledWidgets.includes(type)) return;
    const newEl = createDefaultElement(type);
    setElements((prev) => insertTreeElement(prev, targetId, newEl));
    setSelectedId(newEl.id);
  };

  const handleDropElement = (
    e: React.DragEvent,
    targetId: string | null = null,
    position: "before" | "after" | "inside" | null = null
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const dataString = e.dataTransfer.getData("application/json");
    setDropTargetId(null);
    setDropPosition(null);
    setDraggingId(null);

    if (!dataString) return;

    try {
      const data = JSON.parse(dataString);
      if (data.type === "new" && data.widgetType) {
        if (disabledWidgets.includes(data.widgetType as ElementType)) return;
        const newEl = createDefaultElement(data.widgetType as ElementType);
        setElements((prev) => insertTreeElementAtPosition(prev, targetId, position || "after", newEl));
        setSelectedId(newEl.id);
        setSelectedIds([newEl.id]);
      } else if (data.type === "move" && data.id) {
        if (targetId && data.id === targetId) return;
        setElements((prev) => moveTreeElement(prev, data.id, targetId, position || "after"));
        setSelectedId(data.id);
        setSelectedIds([data.id]);
      }
    } catch (err) {
      console.error("Drag and drop parse error:", err);
    }
  };

  const handleDragOverElement = (
    e: React.DragEvent,
    elId: string,
    isContainer: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    let pos: "before" | "after" | "inside" = "after";
    if (isContainer && offsetY > height * 0.25 && offsetY < height * 0.75) {
      pos = "inside";
    } else if (offsetY < height * 0.5) {
      pos = "before";
    } else {
      pos = "after";
    }

    setDropTargetId(elId);
    setDropPosition(pos);
  };

  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setElements((prev) => deleteTreeElement(prev, id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleDuplicateElement = (idToDuplicate?: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const targetId = idToDuplicate || selectedId;
    if (!targetId) return;

    const { updatedList, newId } = duplicateTreeElement(elements, targetId);
    setElements(updatedList);
    if (newId) {
      setSelectedId(newId);
    }
  };

  const handleCopyElement = (idToCopy?: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedIds.length > 1 && (!idToCopy || selectedIds.includes(idToCopy))) {
      const targets = selectedIds
        .map((id) => findTreeElement(elements, id))
        .filter((item): item is EditorElement => item !== null);
      if (targets.length > 0) {
        const clonedList: EditorElement[] = JSON.parse(JSON.stringify(targets));
        setCopiedElements(clonedList);
        setCopiedElement(clonedList[clonedList.length - 1]);
      }
      return;
    }

    const targetId = idToCopy || selectedId;
    if (!targetId) return;
    const targetEl = findTreeElement(elements, targetId);
    if (targetEl) {
      const cloned: EditorElement = JSON.parse(JSON.stringify(targetEl));
      setCopiedElement(cloned);
      setCopiedElements([cloned]);
    }
    void copiedElements;
  };

  const handleCopyStyle = (idToCopy?: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const targetId = idToCopy || selectedId;
    if (!targetId) return;
    const targetEl = findTreeElement(elements, targetId);
    if (targetEl) {
      setCopiedStyles({
        styles: JSON.parse(JSON.stringify(targetEl.styles || {})),
        responsiveStyles: JSON.parse(JSON.stringify(targetEl.responsiveStyles || {})),
        hoverStyles: targetEl.hoverStyles ? JSON.parse(JSON.stringify(targetEl.hoverStyles)) : undefined,
        responsiveHoverStyles: targetEl.responsiveHoverStyles ? JSON.parse(JSON.stringify(targetEl.responsiveHoverStyles)) : undefined,
      });
    }
  };

  const handlePasteStyle = (idToPaste?: string | null, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const targetId = idToPaste || selectedId;
    if (!targetId || !copiedStyles) return;
    setElements((prev) =>
      updateTreeElement(prev, targetId, (el) => ({
        ...el,
        styles: {
          ...el.styles,
          ...JSON.parse(JSON.stringify(copiedStyles.styles || {})),
        },
        responsiveStyles: {
          ...el.responsiveStyles,
          ...JSON.parse(JSON.stringify(copiedStyles.responsiveStyles || {})),
        },
        hoverStyles: copiedStyles.hoverStyles
          ? { ...el.hoverStyles, ...JSON.parse(JSON.stringify(copiedStyles.hoverStyles)) }
          : el.hoverStyles,
        responsiveHoverStyles: copiedStyles.responsiveHoverStyles
          ? { ...el.responsiveHoverStyles, ...JSON.parse(JSON.stringify(copiedStyles.responsiveHoverStyles)) }
          : el.responsiveHoverStyles,
      }))
    );
  };

  const handlePasteElement = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!copiedElement) return;

    const clonedItem: EditorElement = JSON.parse(JSON.stringify(copiedElement));
    const reassignIds = (node: EditorElement) => {
      node.id = generateId();
      if (node.children) {
        node.children.forEach(reassignIds);
      }
    };
    reassignIds(clonedItem);

    setElements((prev) => insertTreeElement(prev, selectedId, clonedItem));
    setSelectedId(clonedItem.id);
  };

  const updateElementContent = (id: string, newContent: string) => {
    setElements((prev) =>
      updateTreeElement(prev, id, (el) => ({ ...el, content: newContent }))
    );
  };

  // Keyboard Shortcuts Listener (F-025: Save, Delete, Preview, Undo, Redo, Copy, Paste, Duplicate, Section Move, F-027: Finder, F-031: Shortcuts Help)
  const [isFinderOpen, setIsFinderOpen] = useState(false);
  const [finderQuery, setFinderQuery] = useState("");
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsFinderOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      if (e.key === "Escape") {
        if (isShortcutsHelpOpen) {
          e.preventDefault();
          setIsShortcutsHelpOpen(false);
        } else if (isFinderOpen) {
          e.preventDefault();
          setIsFinderOpen(false);
        } else if (isFullScreenCanvas) {
          e.preventDefault();
          setIsFullScreenCanvas(false);
        }
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsPreview((prev) => !prev);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          handleDeleteElement(selectedId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedId || selectedIds.length > 0) {
          e.preventDefault();
          handleCopyElement();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (copiedElement) {
          e.preventDefault();
          handlePasteElement();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedId) {
          e.preventDefault();
          handleDuplicateElement(selectedId);
        }
      } else if (e.altKey && e.key === "ArrowUp") {
        if (selectedId) {
          e.preventDefault();
          handleReorderElement(selectedId, "up");
        }
      } else if (e.altKey && e.key === "ArrowDown") {
        if (selectedId) {
          e.preventDefault();
          handleReorderElement(selectedId, "down");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedIds, copiedElement, elements, historyIndex, history, isFullScreenCanvas, isPreview, saving]);

  const selectedElement = selectedId ? findTreeElement(elements, selectedId) : null;

  useEffect(() => {
    if (selectedElement && selectedElement.componentId) {
      syncComponentInstances(selectedElement.componentId, selectedElement);
    }
  }, [selectedElement?.content, selectedElement?.src, selectedElement?.styles, selectedElement?.layout, selectedElement?.responsiveStyles, selectedElement?.responsiveLayout]);

  const updateSelectedProp = (key: keyof EditorElement, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => ({ ...el, [key]: value }))
    );
  };

  const updateSelectedStyle = (key: keyof ElementStyles, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        if (activeElementState === "hover") {
          if (activeDevice === "desktop") {
            const newHoverStyles = { ...(el.hoverStyles || {}), [key]: value };
            let newResponsiveHover = el.responsiveHoverStyles;
            if (newResponsiveHover?.desktop) {
              newResponsiveHover = {
                ...newResponsiveHover,
                desktop: { ...newResponsiveHover.desktop, [key]: value },
              };
            }
            return { ...el, hoverStyles: newHoverStyles, responsiveHoverStyles: newResponsiveHover };
          } else {
            const currentDeviceObj = el.responsiveHoverStyles?.[activeDevice] || {};
            const updatedDeviceObj = { ...currentDeviceObj, [key]: value };
            return {
              ...el,
              responsiveHoverStyles: {
                ...el.responsiveHoverStyles,
                [activeDevice]: updatedDeviceObj,
              },
            };
          }
        } else {
          if (activeDevice === "desktop") {
            const newStyles = { ...el.styles, [key]: value };
            let newResponsive = el.responsiveStyles;
            if (newResponsive?.desktop) {
              newResponsive = {
                ...newResponsive,
                desktop: { ...newResponsive.desktop, [key]: value },
              };
            }
            return { ...el, styles: newStyles, responsiveStyles: newResponsive };
          } else {
            const currentDeviceObj = el.responsiveStyles?.[activeDevice] || {};
            const updatedDeviceObj = { ...currentDeviceObj, [key]: value };
            return {
              ...el,
              responsiveStyles: {
                ...el.responsiveStyles,
                [activeDevice]: updatedDeviceObj,
              },
            };
          }
        }
      })
    );
  };

  const resetSelectedStyle = (key: keyof ElementStyles) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        if (activeElementState === "hover") {
          if (activeDevice === "desktop") {
            const newHoverStyles = { ...(el.hoverStyles || {}) };
            delete newHoverStyles[key];
            let newResponsiveHover = el.responsiveHoverStyles;
            if (newResponsiveHover?.desktop) {
              const newDesktopResp = { ...newResponsiveHover.desktop };
              delete newDesktopResp[key];
              newResponsiveHover = { ...newResponsiveHover, desktop: newDesktopResp };
            }
            return {
              ...el,
              hoverStyles: Object.keys(newHoverStyles).length > 0 ? newHoverStyles : undefined,
              responsiveHoverStyles: newResponsiveHover,
            };
          } else {
            if (!el.responsiveHoverStyles?.[activeDevice]) return el;
            const currentDeviceObj = { ...el.responsiveHoverStyles[activeDevice] };
            delete currentDeviceObj[key];
            const newResponsiveHover = {
              ...el.responsiveHoverStyles,
              [activeDevice]: currentDeviceObj,
            };
            if (Object.keys(currentDeviceObj).length === 0) {
              delete newResponsiveHover[activeDevice];
            }
            return { ...el, responsiveHoverStyles: newResponsiveHover };
          }
        } else {
          if (activeDevice === "desktop") {
            const newStyles = { ...el.styles };
            delete newStyles[key];
            let newResponsive = el.responsiveStyles;
            if (newResponsive?.desktop) {
              const newDesktopResp = { ...newResponsive.desktop };
              delete newDesktopResp[key];
              newResponsive = { ...newResponsive, desktop: newDesktopResp };
            }
            return { ...el, styles: newStyles, responsiveStyles: newResponsive };
          } else {
            if (!el.responsiveStyles?.[activeDevice]) return el;
            const currentDeviceObj = { ...el.responsiveStyles[activeDevice] };
            delete currentDeviceObj[key];
            const newResponsive = {
              ...el.responsiveStyles,
              [activeDevice]: currentDeviceObj,
            };
            if (Object.keys(currentDeviceObj).length === 0) {
              delete newResponsive[activeDevice];
            }
            return { ...el, responsiveStyles: newResponsive };
          }
        }
      })
    );
  };

  const toggleContainerCollapse = (id: string) => {
    setCollapsedContainers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleReorderElement = (id: string, direction: "up" | "down") => {
    setElements((prev) => reorderTreeElement(prev, id, direction));
  };

  const flattenAndSearchElements = (
    nodes: EditorElement[],
    query: string,
    parentPath: string[] = []
  ): { element: EditorElement; path: string }[] => {
    let results: { element: EditorElement; path: string }[] = [];
    const q = query.toLowerCase().trim();

    for (const node of nodes) {
      const currentPath = [...parentPath, node.type];
      const pathStr = currentPath.join(" › ");
      const matchesType = node.type.toLowerCase().includes(q);
      const matchesContent = node.content?.toLowerCase().includes(q) ?? false;
      const matchesAlt = node.alt?.toLowerCase().includes(q) ?? false;
      const matchesId = node.id.toLowerCase().includes(q);

      if (matchesType || matchesContent || matchesAlt || matchesId) {
        results.push({ element: node, path: pathStr });
      }

      if (node.children && node.children.length > 0) {
        results = results.concat(flattenAndSearchElements(node.children, q, currentPath));
      }
    }

    return results;
  };

  const renderNavigatorTreeItem = (el: EditorElement, depth: number = 0, isLast: boolean = true): React.ReactNode => {
    const isSelected = selectedIds.includes(el.id) || selectedId === el.id;
    const isContainer = el.type === "container";
    const isCollapsed = isContainer && !!collapsedContainers[el.id];

    const getElementIcon = (type: ElementType) => {
      switch (type) {
        case "container":
          return "📦";
        case "heading":
          return "🔤";
        case "text":
          return "📝";
        case "image":
          return "🖼️";
        case "button":
          return "🔘";
        default:
          return "📄";
      }
    };

    const getElementLabel = (item: EditorElement) => {
      if (item.type === "heading") return item.content ? `"${item.content.slice(0, 15)}"` : "Heading";
      if (item.type === "text") return item.content ? `"${item.content.slice(0, 15)}"` : "Text";
      if (item.type === "button") return item.content ? `"${item.content.slice(0, 15)}"` : "Button";
      if (item.type === "image") return item.alt ? `Image (${item.alt})` : "Image";
      if (item.type === "container") return "Container";
      return item.type;
    };

    return (
      <div key={el.id} className="select-none">
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleSelectElement(el.id, e);
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            setHoveredId(el.id);
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            if (hoveredId === el.id) setHoveredId(null);
          }}
          style={{ paddingLeft: `${depth * 14 + 4}px` }}
          className={`group flex items-center justify-between rounded-lg py-1.5 pr-2 text-xs transition cursor-pointer mb-0.5 ${
            isSelected
              ? "bg-blue-600 font-bold text-white shadow-sm"
              : hoveredId === el.id
              ? "bg-blue-50 text-blue-700 font-semibold"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {/* Visual Tree Branch Connectors (F-021) */}
            {depth > 0 && (
              <span className="font-mono text-slate-400 text-[10px] shrink-0 select-none">
                {isLast ? "└──" : "├──"}
              </span>
            )}

            {isContainer ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleContainerCollapse(el.id);
                }}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] transition ${
                  isSelected ? "text-white hover:bg-blue-700" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                }`}
              >
                {isCollapsed ? "▶" : "▼"}
              </button>
            ) : (
              <span className="w-2 shrink-0" />
            )}

            <span className="shrink-0 text-[11px]">{getElementIcon(el.type)}</span>
            <span className="truncate text-[11px] font-medium capitalize">{getElementLabel(el)}</span>
          </div>

          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
            <button
              type="button"
              title="Copy"
              onClick={(e) => handleCopyElement(el.id, e)}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-black/10 ${
                isSelected ? "text-white" : "text-slate-500"
              }`}
            >
              📋
            </button>
            <button
              type="button"
              title="Duplicate"
              onClick={(e) => handleDuplicateElement(el.id, e)}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-black/10 ${
                isSelected ? "text-white" : "text-slate-500"
              }`}
            >
              ⧉
            </button>
            <button
              type="button"
              title="Move Up"
              onClick={(e) => {
                e.stopPropagation();
                handleReorderElement(el.id, "up");
              }}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-black/10 ${
                isSelected ? "text-white" : "text-slate-500"
              }`}
            >
              ▲
            </button>
            <button
              type="button"
              title="Move Down"
              onClick={(e) => {
                e.stopPropagation();
                handleReorderElement(el.id, "down");
              }}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-black/10 ${
                isSelected ? "text-white" : "text-slate-500"
              }`}
            >
              ▼
            </button>
            <button
              type="button"
              title="Delete"
              onClick={(e) => handleDeleteElement(el.id, e)}
              className={`px-1 py-0.5 text-[9px] rounded hover:bg-red-500 hover:text-white ${
                isSelected ? "text-red-200" : "text-red-500"
              }`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Render Nested Children if container is expanded */}
        {isContainer && !isCollapsed && el.children && el.children.length > 0 && (
          <div className="space-y-0.5">
            {el.children.map((child, idx) =>
              renderNavigatorTreeItem(
                child,
                depth + 1,
                idx === (el.children?.length ?? 0) - 1
              )
            )}
          </div>
        )}
      </div>
    );
  };

  const updateSelectedLayout = (key: keyof ContainerLayout, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        if (activeDevice === "desktop") {
          const newLayout = { ...(el.layout || {}), [key]: value };
          let newResponsiveLayout = el.responsiveLayout;
          if (newResponsiveLayout?.desktop) {
            newResponsiveLayout = {
              ...newResponsiveLayout,
              desktop: { ...newResponsiveLayout.desktop, [key]: value },
            };
          }
          return { ...el, layout: newLayout, responsiveLayout: newResponsiveLayout };
        } else {
          const currentDeviceObj = el.responsiveLayout?.[activeDevice] || {};
          const updatedDeviceObj = { ...currentDeviceObj, [key]: value };
          return {
            ...el,
            responsiveLayout: {
              ...el.responsiveLayout,
              [activeDevice]: updatedDeviceObj,
            },
          };
        }
      })
    );
  };





  const ScrubbableNumberInput = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    placeholder = "0",
    className = "w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500",
  }: {
    value: string | number;
    onChange: (val: string) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    className?: string;
  }) => {
    const [isScrubbing, setIsScrubbing] = useState(false);
    const startXRef = useRef(0);
    const startValRef = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const initialVal = typeof value === "number" ? value : parseFloat(String(value)) || 0;
      startXRef.current = e.clientX;
      startValRef.current = initialVal;
      setIsScrubbing(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startXRef.current;
        let multiplier = step;
        if (moveEvent.shiftKey) multiplier = step * 10;
        if (moveEvent.altKey || moveEvent.ctrlKey) multiplier = step * 0.1;

        let newVal = startValRef.current + deltaX * multiplier;
        if (min !== undefined) newVal = Math.max(min, newVal);
        if (max !== undefined) newVal = Math.min(max, newVal);

        const roundedVal = step < 1 ? Math.round(newVal * 10) / 10 : Math.round(newVal);
        onChange(String(roundedVal));
      };

      const handleMouseUp = () => {
        setIsScrubbing(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };

    return (
      <div className="relative flex items-center w-full group">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${className} ${isScrubbing ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/50" : ""}`}
        />
        <div
          onMouseDown={handleMouseDown}
          title="Drag horizontally to scrub value (Shift for 10x, Alt for 0.1x)"
          className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-ew-resize px-0.5 text-[9px] font-bold text-slate-400 hover:text-blue-600 transition select-none"
        >
          ↔
        </div>
      </div>
    );
  };

  const render4SideSpacingControl = (
    title: string,
    type: "margin" | "padding",
    isLinked: boolean,
    setIsLinked: (val: boolean) => void
  ) => {
    if (!selectedElement) return null;

    const topKey = (type === "margin" ? "marginTop" : "paddingTop") as keyof ElementStyles;
    const rightKey = (type === "margin" ? "marginRight" : "paddingRight") as keyof ElementStyles;
    const bottomKey = (type === "margin" ? "marginBottom" : "paddingBottom") as keyof ElementStyles;
    const leftKey = (type === "margin" ? "marginLeft" : "paddingLeft") as keyof ElementStyles;

    const currentTop = getControlStyleValue(selectedElement, activeDevice, activeElementState, topKey) || "";
    const currentRight = getControlStyleValue(selectedElement, activeDevice, activeElementState, rightKey) || "";
    const currentBottom = getControlStyleValue(selectedElement, activeDevice, activeElementState, bottomKey) || "";
    const currentLeft = getControlStyleValue(selectedElement, activeDevice, activeElementState, leftKey) || "";

    const parsedTop = parseSpacingUnit(String(currentTop));
    const parsedRight = parseSpacingUnit(String(currentRight));
    const parsedBottom = parseSpacingUnit(String(currentBottom));
    const parsedLeft = parseSpacingUnit(String(currentLeft));

    const activeUnit = parsedTop.unit || parsedRight.unit || parsedBottom.unit || parsedLeft.unit || "px";

    const isOverridden = activeElementState === "hover"
      ? hasHoverStyleOverride(selectedElement, activeDevice, topKey) ||
        hasHoverStyleOverride(selectedElement, activeDevice, rightKey) ||
        hasHoverStyleOverride(selectedElement, activeDevice, bottomKey) ||
        hasHoverStyleOverride(selectedElement, activeDevice, leftKey)
      : hasStyleOverride(selectedElement, activeDevice, topKey) ||
        hasStyleOverride(selectedElement, activeDevice, rightKey) ||
        hasStyleOverride(selectedElement, activeDevice, bottomKey) ||
        hasStyleOverride(selectedElement, activeDevice, leftKey);

    const isConfigured =
      isControlStyleConfigured(selectedElement, activeDevice, activeElementState, topKey) ||
      isControlStyleConfigured(selectedElement, activeDevice, activeElementState, rightKey) ||
      isControlStyleConfigured(selectedElement, activeDevice, activeElementState, bottomKey) ||
      isControlStyleConfigured(selectedElement, activeDevice, activeElementState, leftKey);

    const handleSideChange = (sideKey: keyof ElementStyles, numVal: string, unitVal: string) => {
      const formattedVal = numVal.trim() === "" ? "" : `${numVal}${unitVal}`;
      if (isLinked) {
        updateSelectedStyle(topKey, formattedVal);
        updateSelectedStyle(rightKey, formattedVal);
        updateSelectedStyle(bottomKey, formattedVal);
        updateSelectedStyle(leftKey, formattedVal);
      } else {
        updateSelectedStyle(sideKey, formattedVal);
      }
    };

    const handleUnitChange = (newUnit: string) => {
      const applyUnit = (parsed: { num: string; unit: string }, sideKey: keyof ElementStyles) => {
        if (parsed.num) {
          updateSelectedStyle(sideKey, `${parsed.num}${newUnit}`);
        }
      };
      applyUnit(parsedTop, topKey);
      applyUnit(parsedRight, rightKey);
      applyUnit(parsedBottom, bottomKey);
      applyUnit(parsedLeft, leftKey);
    };

    const handleResetAll = () => {
      resetSelectedStyle(topKey);
      resetSelectedStyle(rightKey);
      resetSelectedStyle(bottomKey);
      resetSelectedStyle(leftKey);
    };

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800">{title}</span>
            {isOverridden && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                {activeDevice}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(isConfigured || isOverridden) && (
              <button
                type="button"
                onClick={handleResetAll}
                title={`Reset ${title} to Default`}
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline transition"
              >
                ↺ Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsLinked(!isLinked)}
              title={isLinked ? "Unlink Spacing Values" : "Link Spacing Values"}
              className={`flex h-6 w-6 items-center justify-center rounded border transition text-xs ${
                isLinked
                  ? "bg-blue-50 border-blue-300 text-blue-600 font-bold shadow-xs"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
              }`}
            >
              {isLinked ? "🔗" : "🔓"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Top", key: topKey, parsed: parsedTop },
            { label: "Right", key: rightKey, parsed: parsedRight },
            { label: "Bottom", key: bottomKey, parsed: parsedBottom },
            { label: "Left", key: leftKey, parsed: parsedLeft },
          ].map(({ label, key, parsed }) => (
            <div key={label} className="flex flex-col items-center">
              <ScrubbableNumberInput
                value={parsed.num}
                onChange={(val) => handleSideChange(key, val, parsed.unit || activeUnit)}
                placeholder="0"
                min={0}
              />
              <span className="mt-1 text-[10px] font-semibold text-slate-400 uppercase">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-500">Unit</span>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {["px", "%", "rem", "em"].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => handleUnitChange(u)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                  activeUnit === u
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTypographySection = () => {
    if (!selectedElement || selectedElement.type === "image" || selectedElement.type === "container") return null;

    const currentFontFamily = getControlStyleValue(selectedElement, activeDevice, activeElementState, "fontFamily") || "";
    const currentFontSize = getControlStyleValue(selectedElement, activeDevice, activeElementState, "fontSize") || "";
    const currentFontWeight = getControlStyleValue(selectedElement, activeDevice, activeElementState, "fontWeight") || "400";
    const currentFontStyle = getControlStyleValue(selectedElement, activeDevice, activeElementState, "fontStyle") || "normal";
    const currentTransform = getControlStyleValue(selectedElement, activeDevice, activeElementState, "textTransform") || "none";
    const currentDecoration = getControlStyleValue(selectedElement, activeDevice, activeElementState, "textDecoration") || "none";
    const currentLineHeight = getControlStyleValue(selectedElement, activeDevice, activeElementState, "lineHeight") || "";
    const currentLetterSpacing = getControlStyleValue(selectedElement, activeDevice, activeElementState, "letterSpacing") || "";
    const currentTextShadow = getControlStyleValue(selectedElement, activeDevice, activeElementState, "textShadow") || "";

    const parsedSize = parseSpacingUnit(currentFontSize, "px");
    const parsedLetterSpacing = parseSpacingUnit(currentLetterSpacing, "px");

    const shadowMatch = currentTextShadow.match(/(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)\s+(.*)/);
    const shadowX = shadowMatch ? shadowMatch[1].replace("px", "") : "0";
    const shadowY = shadowMatch ? shadowMatch[2].replace("px", "") : "0";
    const shadowBlur = shadowMatch ? shadowMatch[3].replace("px", "") : "0";
    const shadowColor = shadowMatch ? shadowMatch[4] : "#000000";

    const isSizeOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "fontSize") : hasStyleOverride(selectedElement, activeDevice, "fontSize");
    const isWeightOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "fontWeight") : hasStyleOverride(selectedElement, activeDevice, "fontWeight");

    return (
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Typography Controls
        </h3>

        {/* Font Family */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Font Family
          </label>
          <select
            value={currentFontFamily}
            onChange={(e) => updateSelectedStyle("fontFamily", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="">Default (System)</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Inter, sans-serif">Inter</option>
            <option value="Roboto, sans-serif">Roboto</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="system-ui, -apple-system, sans-serif">System UI</option>
          </select>
        </div>

        {/* Font Size with Units (px, rem, em) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Font Size
              {isSizeOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(isControlStyleConfigured(selectedElement, activeDevice, activeElementState, "fontSize") || isSizeOverridden) && (
              <button
                type="button"
                onClick={() => resetSelectedStyle("fontSize")}
                title="Reset Font Size to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <ScrubbableNumberInput
              value={parsedSize.num}
              onChange={(val) =>
                updateSelectedStyle(
                  "fontSize",
                  val ? `${val}${parsedSize.unit || "px"}` : ""
                )
              }
              placeholder="16"
              min={1}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
            <select
              value={parsedSize.unit || "px"}
              onChange={(e) =>
                parsedSize.num &&
                updateSelectedStyle("fontSize", `${parsedSize.num}${e.target.value}`)
              }
              className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="px">px</option>
              <option value="rem">rem</option>
              <option value="em">em</option>
            </select>
          </div>
        </div>

        {/* Font Weight */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Font Weight
              {isWeightOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(isControlStyleConfigured(selectedElement, activeDevice, activeElementState, "fontWeight") || isWeightOverridden) && (
              <button
                type="button"
                onClick={() => resetSelectedStyle("fontWeight")}
                title="Reset Font Weight to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <select
            value={currentFontWeight}
            onChange={(e) => updateSelectedStyle("fontWeight", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="100">Thin (100)</option>
            <option value="200">Extra Light (200)</option>
            <option value="300">Light (300)</option>
            <option value="400">Normal (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">SemiBold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="800">ExtraBold (800)</option>
            <option value="900">Black (900)</option>
          </select>
        </div>

        {/* Font Style & Text Transform */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Style
            </label>
            <select
              value={currentFontStyle}
              onChange={(e) => updateSelectedStyle("fontStyle", e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="normal">Normal</option>
              <option value="italic">Italic</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transform
            </label>
            <select
              value={currentTransform}
              onChange={(e) => updateSelectedStyle("textTransform", e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="none">None</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>
        </div>

        {/* Text Decoration */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Decoration
          </label>
          <select
            value={currentDecoration}
            onChange={(e) => updateSelectedStyle("textDecoration", e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="none">None</option>
            <option value="underline">Underline</option>
            <option value="overline">Overline</option>
            <option value="line-through">Line Through</option>
          </select>
        </div>

        {/* Line Height & Letter Spacing */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Line Height
            </label>
            <input
              type="number"
              step="0.1"
              value={currentLineHeight}
              onChange={(e) => updateSelectedStyle("lineHeight", e.target.value)}
              placeholder="1.5"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Letter Spacing
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                step="0.5"
                value={parsedLetterSpacing.num}
                onChange={(e) =>
                  updateSelectedStyle(
                    "letterSpacing",
                    e.target.value ? `${e.target.value}${parsedLetterSpacing.unit || "px"}` : ""
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
              <select
                value={parsedLetterSpacing.unit || "px"}
                onChange={(e) =>
                  parsedLetterSpacing.num &&
                  updateSelectedStyle("letterSpacing", `${parsedLetterSpacing.num}${e.target.value}`)
                }
                className="rounded-lg border border-slate-300 bg-slate-50 px-1 py-1.5 text-[10px] font-semibold text-slate-700 outline-none"
              >
                <option value="px">px</option>
                <option value="rem">rem</option>
              </select>
            </div>
          </div>
        </div>

        {/* Text Shadow */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Text Shadow</span>
            {currentTextShadow && (
              <button
                type="button"
                onClick={() => updateSelectedStyle("textShadow", "")}
                className="text-[10px] font-semibold text-red-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div>
              <span className="text-slate-400">X (px)</span>
              <input
                type="number"
                value={shadowX}
                onChange={(e) =>
                  updateSelectedStyle(
                    "textShadow",
                    `${e.target.value}px ${shadowY}px ${shadowBlur}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
            <div>
              <span className="text-slate-400">Y (px)</span>
              <input
                type="number"
                value={shadowY}
                onChange={(e) =>
                  updateSelectedStyle(
                    "textShadow",
                    `${shadowX}px ${e.target.value}px ${shadowBlur}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
            <div>
              <span className="text-slate-400">Blur (px)</span>
              <input
                type="number"
                value={shadowBlur}
                onChange={(e) =>
                  updateSelectedStyle(
                    "textShadow",
                    `${shadowX}px ${shadowY}px ${e.target.value}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-medium text-slate-500">Color</span>
            <input
              type="color"
              value={shadowColor.startsWith("#") ? shadowColor : "#000000"}
              onChange={(e) =>
                updateSelectedStyle(
                  "textShadow",
                  `${shadowX}px ${shadowY}px ${shadowBlur}px ${e.target.value}`
                )
              }
              className="h-6 w-8 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
            />
          </div>
        </div>
      </div>
    );
  };

  // Color Sampler API (F-034)
  const handleSampleColor = async (onColorSelected: (hex: string) => void) => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          onColorSelected(result.sRGBHex);
        }
      } catch {
        // User canceled selection or EyeDropper aborted
      }
    } else {
      alert("EyeDropper color sampler is supported in Chrome, Edge, and Opera browsers.");
    }
  };

  const [extractedColors, setExtractedColors] = useState<string[]>([]);

  useEffect(() => {
    if (selectedElement && (selectedElement.type === "image" || selectedElement.src)) {
      const srcToUse = selectedElement.src;
      if (srcToUse) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            canvas.width = 40;
            canvas.height = 40;
            ctx.drawImage(img, 0, 0, 40, 40);
            const imgData = ctx.getImageData(0, 0, 40, 40).data;
            const hexColors = new Set<string>();
            for (let i = 0; i < imgData.length; i += 16) {
              const r = imgData[i];
              const g = imgData[i + 1];
              const b = imgData[i + 2];
              const a = imgData[i + 3];
              if (a > 128) {
                const hex = "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
                hexColors.add(hex);
              }
              if (hexColors.size >= 5) break;
            }
            setExtractedColors(Array.from(hexColors));
          } catch {
            setExtractedColors([]);
          }
        };
        img.onerror = () => setExtractedColors([]);
        img.src = resolveImageUrl(srcToUse, apiUrl);
      } else {
        setExtractedColors([]);
      }
    } else {
      setExtractedColors([]);
    }
  }, [selectedElement?.id, selectedElement?.src]);

  // Image File Upload Logic
  const handleImageFileSelect = async (file: File) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a valid image file (JPG, PNG, WEBP, GIF, SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5 MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      let uploadRes = await fetch(`${apiUrl}/api/v1/uploads/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadRes.ok && uploadRes.status === 404) {
        uploadRes = await fetch(`${apiUrl}/api/uploads/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
      }

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData?.message || uploadData?.error?.message || "Failed to upload image.");
      }

      const returnedUrl = uploadData.url || uploadData?.data?.url;
      if (returnedUrl) {
        updateSelectedProp("src", returnedUrl);
      } else {
        throw new Error("No image URL returned from server.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err instanceof Error ? err.message : "Error uploading image.");
    } finally {
      setIsUploading(false);
    }
  };

  // File & Asset Import Logic (F-014)
  const handleImportAsset = async (file: File) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid file type. Supported: JPG, PNG, WEBP, GIF, SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Imported asset size must be less than 5 MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      let finalUrl = "";
      try {
        const formData = new FormData();
        formData.append("image", file);

        let uploadRes = await fetch(`${apiUrl}/api/v1/uploads/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!uploadRes.ok && uploadRes.status === 404) {
          uploadRes = await fetch(`${apiUrl}/api/uploads/image`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
        }

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalUrl = uploadData.url || uploadData?.data?.url || "";
        }
      } catch {
        // Fallback to local Data URL
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read imported file."));
          reader.readAsDataURL(file);
        });
      }

      if (selectedId) {
        const selected = findTreeElement(elements, selectedId);
        if (selected && selected.type === "image") {
          updateSelectedProp("src", finalUrl);
          return;
        }
      }

      const newImgEl: EditorElement = {
        id: generateId(),
        type: "image",
        content: file.name || "Imported Asset",
        src: finalUrl,
        alt: file.name || "Imported Asset",
        styles: {
          width: "100%",
          borderRadius: "8px",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
      setElements((prev) => [...prev, newImgEl]);
      setSelectedId(newImgEl.id);
      setSelectedIds([newImgEl.id]);
    } catch (err: any) {
      console.error("Asset import error:", err);
      setUploadError(err.message || "Failed to import asset.");
    } finally {
      setIsUploading(false);
    }
  };

  const updateSelectedStyle = (key: keyof ElementStyles, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        if (activeBreakpointId === "desktop") {
          return {
            ...el,
            styles: { ...el.styles, [key]: value },
          };
        } else {
          const responsiveStyles = { ...el.responsiveStyles };
          const bpStyles = { ...responsiveStyles[activeBreakpointId] };
          if (value === undefined || value === "") {
            delete bpStyles[key];
          } else {
            bpStyles[key] = value;
          }
          responsiveStyles[activeBreakpointId] = bpStyles;
          return {
            ...el,
            responsiveStyles,
          };
        }
      })
    );
  };

  const updateSelectedLayout = (key: keyof ContainerLayout, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        if (activeBreakpointId === "desktop") {
          return {
            ...el,
            layout: { ...el.layout, [key]: value },
          };
        } else {
          const responsiveLayouts = { ...el.responsiveLayouts };
          const bpLayouts = { ...responsiveLayouts[activeBreakpointId] };
          if (value === undefined || value === "") {
            delete bpLayouts[key];
          } else {
            bpLayouts[key] = value;
          }
          responsiveLayouts[activeBreakpointId] = bpLayouts;
          return {
            ...el,
            responsiveLayouts,
          };
        }
      })
    );
  };

  const resetSelectedStyle = (key: keyof ElementStyles) => {
    if (!selectedId || activeBreakpointId === "desktop") return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        const responsiveStyles = { ...el.responsiveStyles };
        const bpStyles = { ...responsiveStyles[activeBreakpointId] };
        delete bpStyles[key];
        responsiveStyles[activeBreakpointId] = bpStyles;
        return { ...el, responsiveStyles };
      })
    );
  };

  const resetSelectedLayout = (key: keyof ContainerLayout) => {
    if (!selectedId || activeBreakpointId === "desktop") return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        const responsiveLayouts = { ...el.responsiveLayouts };
        const bpLayouts = { ...responsiveLayouts[activeBreakpointId] };
        delete bpLayouts[key];
        responsiveLayouts[activeBreakpointId] = bpLayouts;
        return { ...el, responsiveLayouts };
      })
    );
  };

  // Helper to render responsive property labels
  const renderResponsiveLabel = (
    label: string,
    styleKey?: keyof ElementStyles,
    layoutKey?: keyof ContainerLayout
  ) => {
    if (!selectedElement) return null;

    const chain = getBreakpointFallbackChain(activeBreakpointId, breakpoints);

    let valSource = "desktop";
    let isOverridden = false;
    let hasValue = false;

    if (styleKey) {
      for (const id of chain) {
        if (id === "desktop") {
          if (selectedElement.styles && selectedElement.styles[styleKey] !== undefined && selectedElement.styles[styleKey] !== "") {
            valSource = "desktop";
            hasValue = true;
            break;
          }
        } else {
          const bpStyles = selectedElement.responsiveStyles?.[id];
          if (bpStyles && bpStyles[styleKey] !== undefined && bpStyles[styleKey] !== "") {
            valSource = id;
            hasValue = true;
            break;
          }
        }
      }
      isOverridden = activeBreakpointId !== "desktop" && selectedElement.responsiveStyles?.[activeBreakpointId]?.[styleKey] !== undefined;
    } else if (layoutKey) {
      for (const id of chain) {
        if (id === "desktop") {
          if (selectedElement.layout && selectedElement.layout[layoutKey] !== undefined && (selectedElement.layout[layoutKey] as any) !== "") {
            valSource = "desktop";
            hasValue = true;
            break;
          }
        } else {
          const bpLayout = selectedElement.responsiveLayouts?.[id];
          if (bpLayout && bpLayout[layoutKey] !== undefined && (bpLayout[layoutKey] as any) !== "") {
            valSource = id;
            hasValue = true;
            break;
          }
        }
      }
      isOverridden = activeBreakpointId !== "desktop" && selectedElement.responsiveLayouts?.[activeBreakpointId]?.[layoutKey] !== undefined;
    }

    const sourceBp = breakpoints.find(b => b.id === valSource);
    const currentBpName = breakpoints.find(b => b.id === activeBreakpointId)?.name || activeBreakpointId;

    return (
      <div className="flex items-center justify-between mb-1 mt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-600">{label}</span>
          
          {/* Responsive Badge */}
          {activeBreakpointId !== "desktop" && (
            <span
              title={isOverridden ? `Overridden on ${currentBpName}` : hasValue ? `Inherited from ${sourceBp?.name || "Desktop"}` : "Unset"}
              className={`flex h-3.5 w-3.5 items-center justify-center rounded text-[9px] font-bold select-none ${
                isOverridden
                  ? "bg-blue-600 text-white"
                  : hasValue
                  ? "bg-slate-200 text-slate-500"
                  : "bg-slate-100 text-slate-400 border border-dashed border-slate-300"
              }`}
            >
              {activeBreakpointId === "mobile" || activeBreakpointId === "mobileExtra" ? "M" : activeBreakpointId === "tablet" || activeBreakpointId === "tabletExtra" ? "T" : activeBreakpointId === "laptop" ? "L" : "W"}
            </span>
          )}
        </div>

        {isOverridden && (
          <button
            onClick={() => styleKey ? resetSelectedStyle(styleKey) : layoutKey && resetSelectedLayout(layoutKey)}
            title="Reset to inherited value"
            className="text-[9px] font-semibold text-blue-500 hover:text-blue-700 hover:underline"
          >
            Clear Override
          </button>
        )}
      </div>
    );
  };

  const handleBgImageFileSelect = async (file: File) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5 MB.");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      let uploadRes = await fetch(`${apiUrl}/api/v1/uploads/image`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!uploadRes.ok && uploadRes.status === 404) {
        uploadRes = await fetch(`${apiUrl}/api/uploads/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
      }

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData?.message || uploadData?.error?.message || "Failed to upload background image.");
      }

      const returnedUrl = uploadData.url || uploadData?.data?.url;
      if (returnedUrl) {
        updateSelectedStyle("backgroundImage", returnedUrl);
      } else {
        throw new Error("No image URL returned from server.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err instanceof Error ? err.message : "Error uploading image.");
    } finally {
      setIsUploading(false);
    }
  };

  const renderBackgroundAndBorderControls = () => {
    if (!selectedElement) return null;

    const currentBgColor = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundColor") || "";
    const currentBgImage = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundImage") || "";
    const currentBgPos = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundPosition") || "center";
    const currentBgSize = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundSize") || "cover";
    const currentBgRepeat = getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundRepeat") || "no-repeat";

    const currentBorderStyle = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderStyle") || "none";
    const currentBorderWidth = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderWidth") || "1px";
    const currentBorderColor = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderColor") || "#cbd5e1";

    const currentTLRadius = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderTopLeftRadius") || getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderRadius") || "";
    const currentTRRadius = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderTopRightRadius") || getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderRadius") || "";
    const currentBRRadius = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderBottomRightRadius") || getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderRadius") || "";
    const currentBLRadius = getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderBottomLeftRadius") || getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderRadius") || "";

    const currentBoxShadow = getControlStyleValue(selectedElement, activeDevice, activeElementState, "boxShadow") || "";

    const shadowMatch = currentBoxShadow.match(/(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)\s+(.*)/);
    const shadowX = shadowMatch ? shadowMatch[1].replace("px", "") : "0";
    const shadowY = shadowMatch ? shadowMatch[2].replace("px", "") : "0";
    const shadowBlur = shadowMatch ? shadowMatch[3].replace("px", "") : "0";
    const shadowSpread = shadowMatch ? shadowMatch[4].replace("px", "") : "0";
    const shadowColor = shadowMatch ? shadowMatch[5] : "rgba(0,0,0,0.25)";

    const parsedTL = parseSpacingUnit(currentTLRadius, "px");
    const parsedTR = parseSpacingUnit(currentTRRadius, "px");
    const parsedBR = parseSpacingUnit(currentBRRadius, "px");
    const parsedBL = parseSpacingUnit(currentBLRadius, "px");
    const activeRadiusUnit = parsedTL.unit || "px";

    const isBgColorOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "backgroundColor") : hasStyleOverride(selectedElement, activeDevice, "backgroundColor");
    const isBgImageOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "backgroundImage") : hasStyleOverride(selectedElement, activeDevice, "backgroundImage");
    const isBorderOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "borderStyle") : hasStyleOverride(selectedElement, activeDevice, "borderStyle");
    const isRadiusOverridden = activeElementState === "hover" ? (hasHoverStyleOverride(selectedElement, activeDevice, "borderTopLeftRadius") || hasHoverStyleOverride(selectedElement, activeDevice, "borderRadius")) : (hasStyleOverride(selectedElement, activeDevice, "borderTopLeftRadius") || hasStyleOverride(selectedElement, activeDevice, "borderRadius"));
    const isShadowOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "boxShadow") : hasStyleOverride(selectedElement, activeDevice, "boxShadow");

    const updateCornerRadius = (cornerKey: keyof ElementStyles, valStr: string) => {
      if (isBorderRadiusLinked) {
        updateSelectedStyle("borderTopLeftRadius", valStr);
        updateSelectedStyle("borderTopRightRadius", valStr);
        updateSelectedStyle("borderBottomRightRadius", valStr);
        updateSelectedStyle("borderBottomLeftRadius", valStr);
        updateSelectedStyle("borderRadius", valStr);
      } else {
        updateSelectedStyle(cornerKey, valStr);
      }
    };

    return (
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Background & Border
        </h3>

        {/* 1. Background Color */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Background Color
              {isBgColorOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(isControlStyleConfigured(selectedElement, activeDevice, activeElementState, "backgroundColor") || isBgColorOverridden) && (
              <button
                type="button"
                onClick={() => resetSelectedStyle("backgroundColor")}
                title="Reset Background Color to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentBgColor.startsWith("#") ? currentBgColor : "#ffffff"}
              onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
            />
            <input
              type="text"
              value={currentBgColor}
              onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
              placeholder="transparent / #ffffff / rgba(...)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => handleSampleColor((hex) => updateSelectedStyle("backgroundColor", hex))}
              title="Sample Color from Screen / Image"
              className="h-8 px-2 rounded border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-1 shrink-0"
            >
              <span>🧪</span>
              <span className="text-[10px]">Sample</span>
            </button>
          </div>
        </div>

        {/* 2. Background Image & Settings */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Background Image
              {isBgImageOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {currentBgImage && (
              <button
                type="button"
                onClick={() => {
                  updateSelectedStyle("backgroundImage", "");
                  if (activeDevice !== "desktop") resetSelectedStyle("backgroundImage");
                }}
                className="text-[10px] font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleBgImageFileSelect(e.target.files[0]);
              }
            }}
          />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => bgFileInputRef.current?.click()}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload Image"}
            </button>
            <input
              type="text"
              value={currentBgImage}
              onChange={(e) => updateSelectedStyle("backgroundImage", e.target.value)}
              placeholder="Or enter Image URL"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          {currentBgImage && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              {/* Background Position */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Position
                </label>
                <select
                  value={currentBgPos}
                  onChange={(e) => updateSelectedStyle("backgroundPosition", e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>

              {/* Background Size */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Size
                </label>
                <select
                  value={currentBgSize}
                  onChange={(e) => updateSelectedStyle("backgroundSize", e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              {/* Background Repeat */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Repeat
                </label>
                <select
                  value={currentBgRepeat}
                  onChange={(e) => updateSelectedStyle("backgroundRepeat", e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="no-repeat">No Repeat</option>
                  <option value="repeat">Repeat</option>
                  <option value="repeat-x">Repeat X</option>
                  <option value="repeat-y">Repeat Y</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 3. Border Controls */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Border Style
              {isBorderOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(selectedElement?.styles?.borderStyle || selectedElement?.styles?.borderColor || selectedElement?.styles?.borderWidth || isBorderOverridden) && (
              <button
                type="button"
                onClick={() => {
                  resetSelectedStyle("borderStyle");
                  resetSelectedStyle("borderWidth");
                  resetSelectedStyle("borderColor");
                }}
                title="Reset Border to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <select
            value={currentBorderStyle}
            onChange={(e) => updateSelectedStyle("borderStyle", e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 mb-2"
          >
            <option value="none">None</option>
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>

          {currentBorderStyle !== "none" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={currentBorderWidth.replace("px", "")}
                  onChange={(e) =>
                    updateSelectedStyle(
                      "borderWidth",
                      e.target.value ? `${e.target.value}px` : "1px"
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={currentBorderColor.startsWith("#") ? currentBorderColor : "#cbd5e1"}
                    onChange={(e) => updateSelectedStyle("borderColor", e.target.value)}
                    className="h-7 w-8 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={currentBorderColor}
                    onChange={(e) => updateSelectedStyle("borderColor", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSampleColor((hex) => updateSelectedStyle("borderColor", hex))}
                    title="Sample Color from Screen / Image"
                    className="h-7 px-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-0.5 shrink-0"
                  >
                    <span>🧪</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Border Radius (4 Corners) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Border Radius
              </label>
              {isRadiusOverridden && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBorderRadiusLinked(!isBorderRadiusLinked)}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold transition ${
                  isBorderRadiusLinked
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
                title={isBorderRadiusLinked ? "Unlink Corners" : "Link Corners"}
              >
                <span>{isBorderRadiusLinked ? "🔗" : "🔓"}</span>
                <span className="text-[10px]">
                  {isBorderRadiusLinked ? "Linked" : "Unlinked"}
                </span>
              </button>

              {activeDevice !== "desktop" && isRadiusOverridden && (
                <button
                  type="button"
                  onClick={() => {
                    resetSelectedStyle("borderTopLeftRadius");
                    resetSelectedStyle("borderTopRightRadius");
                    resetSelectedStyle("borderBottomRightRadius");
                    resetSelectedStyle("borderBottomLeftRadius");
                    resetSelectedStyle("borderRadius");
                  }}
                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                TL
              </span>
              <input
                type="number"
                value={parsedTL.num}
                onChange={(e) =>
                  updateCornerRadius(
                    "borderTopLeftRadius",
                    e.target.value ? `${e.target.value}${activeRadiusUnit}` : ""
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                TR
              </span>
              <input
                type="number"
                value={parsedTR.num}
                onChange={(e) =>
                  updateCornerRadius(
                    "borderTopRightRadius",
                    e.target.value ? `${e.target.value}${activeRadiusUnit}` : ""
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                BR
              </span>
              <input
                type="number"
                value={parsedBR.num}
                onChange={(e) =>
                  updateCornerRadius(
                    "borderBottomRightRadius",
                    e.target.value ? `${e.target.value}${activeRadiusUnit}` : ""
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                BL
              </span>
              <input
                type="number"
                value={parsedBL.num}
                onChange={(e) =>
                  updateCornerRadius(
                    "borderBottomLeftRadius",
                    e.target.value ? `${e.target.value}${activeRadiusUnit}` : ""
                  )
                }
                placeholder="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 5. Box Shadow */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Box Shadow
              {isShadowOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </span>
            {currentBoxShadow && (
              <button
                type="button"
                onClick={() => {
                  updateSelectedStyle("boxShadow", "");
                  if (activeDevice !== "desktop") resetSelectedStyle("boxShadow");
                }}
                className="text-[10px] font-semibold text-red-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            <div>
              <span className="text-slate-400">X (px)</span>
              <input
                type="number"
                value={shadowX}
                onChange={(e) =>
                  updateSelectedStyle(
                    "boxShadow",
                    `${e.target.value}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
            <div>
              <span className="text-slate-400">Y (px)</span>
              <input
                type="number"
                value={shadowY}
                onChange={(e) =>
                  updateSelectedStyle(
                    "boxShadow",
                    `${shadowX}px ${e.target.value}px ${shadowBlur}px ${shadowSpread}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
            <div>
              <span className="text-slate-400">Blur</span>
              <input
                type="number"
                value={shadowBlur}
                onChange={(e) =>
                  updateSelectedStyle(
                    "boxShadow",
                    `${shadowX}px ${shadowY}px ${e.target.value}px ${shadowSpread}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
            <div>
              <span className="text-slate-400">Spread</span>
              <input
                type="number"
                value={shadowSpread}
                onChange={(e) =>
                  updateSelectedStyle(
                    "boxShadow",
                    `${shadowX}px ${shadowY}px ${shadowBlur}px ${e.target.value}px ${shadowColor}`
                  )
                }
                className="w-full rounded border border-slate-200 bg-white p-1 text-center text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-medium text-slate-500">Color</span>
            <input
              type="color"
              value={shadowColor.startsWith("#") ? shadowColor : "#000000"}
              onChange={(e) =>
                updateSelectedStyle(
                  "boxShadow",
                  `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${e.target.value}`
                )
              }
              className="h-6 w-8 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
            />
            <input
              type="text"
              value={shadowColor}
              onChange={(e) =>
                updateSelectedStyle(
                  "boxShadow",
                  `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${e.target.value}`
                )
              }
              placeholder="rgba(0,0,0,0.25)"
              className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-mono"
            />
          </div>
        </div>
      </div>
    );
  };


  const renderAccordion = (title: string, sectionId: string, content: React.ReactNode) => {
    const isOpen = openSections[sectionId];
    return (
      <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm bg-white">
        <button
          type="button"
          onClick={() => toggleSection(sectionId)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50/50 hover:bg-slate-50 border-b border-slate-100 transition outline-none focus:outline-none"
        >
          <span>{title}</span>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && <div className="p-3.5 space-y-4">{content}</div>}
      </div>
    );
  };

  // Helper for numeric font size parsing
  const getFontSizeNum = (fontSizeStr?: string) => {
    if (!fontSizeStr) return "16";
    return fontSizeStr.replace(/px$/, "");
  };

  // Helper for rendering text along a curve (F-090)
  const renderTextPath = (content: string, style: React.CSSProperties) => {
    const color = style.color || "#0f172a";
    const fontSize = style.fontSize || "24px";
    const fontWeight = style.fontWeight || "700";
    const fontFamily = style.fontFamily || "inherit";
    return (
      <svg viewBox="0 0 500 100" className="w-full h-auto overflow-visible" style={{ minHeight: "60px" }}>
        <path
          id="wavyPath"
          fill="none"
          stroke="none"
          d="M 10,60 Q 125,20 250,60 T 490,60"
        />
        <text style={{ fontSize, fontWeight, fontFamily, fill: color as string }}>
          <textPath href="#wavyPath" startOffset="50%" textAnchor="middle">
            {content}
          </textPath>
        </text>
      </svg>
    );
  };

  // Helper for container shape dividers (F-091)
  const renderShapeDivider = (el: EditorElement, position: "top" | "bottom") => {
    const suffix = position === "top" ? "Top" : "Bottom";
    const enabled = getStyleVal(el, `divider${suffix}Enabled` as any, activeBreakpointId, breakpoints) === "true";
    if (!enabled) return null;

    const style = getStyleVal(el, `divider${suffix}Style` as any, activeBreakpointId, breakpoints) || "waves";
    const color = getStyleVal(el, `divider${suffix}Color` as any, activeBreakpointId, breakpoints) || "#ffffff";
    const height = getStyleVal(el, `divider${suffix}Height` as any, activeBreakpointId, breakpoints) || "50px";

    let path = "";
    const viewBox = "0 0 1200 120";
    
    if (style === "slant") {
      path = position === "top" 
        ? "M1200 120L0 0 0 120z" 
        : "M1200 0L0 120 1200 120z";
    } else if (style === "triangle") {
      path = position === "top"
        ? "M600 120L0 0 1200 0z"
        : "M600 0L1200 120 0 120z";
    } else if (style === "curves") {
      path = position === "top"
        ? "M0 0 C 300 120, 900 120, 1200 0 L 1200 120 L 0 120 Z"
        : "M0 120 C 300 0, 900 0, 1200 120 L 1200 120 L 0 120 Z";
    } else { // waves
      path = position === "top"
        ? "M0,0 C150,90 350,30 500,90 C650,150 850,90 1000,30 C1100,0 1150,30 1200,60 L1200,120 L0,120 Z"
        : "M0,120 C150,30 350,90 500,30 C650,-30 850,30 1000,90 C1100,120 1150,90 1200,60 L1200,120 L0,120 Z";
    }

    const dividerStyles: React.CSSProperties = {
      position: "absolute",
      left: 0,
      width: "100%",
      height,
      pointerEvents: "none",
      zIndex: 10,
    };

    if (position === "top") {
      dividerStyles.top = 0;
      dividerStyles.transform = "scaleY(-1)";
    } else {
      dividerStyles.bottom = 0;
    }

    return (
      <div style={dividerStyles} className="shape-divider">
        <svg viewBox={viewBox} preserveAspectRatio="none" className="w-full h-full" style={{ display: "block" }}>
          <path d={path} fill={color} />
        </svg>
      </div>
    );
  };

  // Helper for background slideshow (F-078)
  const renderBackgroundSlideshow = (el: EditorElement) => {
    const urlsStr = getStyleVal(el, "backgroundSlideshowUrls", activeBreakpointId, breakpoints);
    const speedStr = getStyleVal(el, "backgroundSlideshowSpeed", activeBreakpointId, breakpoints) || "5";
    if (!urlsStr) return null;

    const urls = urlsStr.split(",").map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return null;

    const speed = parseInt(speedStr) * 1000;

    return <BackgroundSlideshow urls={urls} interval={speed} />;
  };

  // Helper for background video (F-077)
  const renderBackgroundVideo = (el: EditorElement) => {
    const videoUrl = getStyleVal(el, "backgroundVideoUrl", activeBreakpointId, breakpoints);
    const opacity = getStyleVal(el, "backgroundVideoOpacity", activeBreakpointId, breakpoints) || "50";
    if (!videoUrl) return null;

    const opacityFloat = parseFloat(opacity) / 100;

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 rounded-[inherit]" style={{ opacity: opacityFloat }}>
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  // Recursive Element Tree Renderer
  const renderElementTree = (el: EditorElement): React.ReactNode => {
    const isSelected = selectedId === el.id && !isPreview;
    const isHiddenOnCurrentDevice = el.hiddenDevices?.[activeBreakpointId];

    if (isHiddenOnCurrentDevice && isPreview) {
      return null;
    }

    const resolvedStyles = resolveElementStyles(el, activeBreakpointId, breakpoints, globalSettings);

    if (el.type === "container") {
      const mergedLayout = getMergedLayout(el, activeDevice);
      const isHovered = hoveredId === el.id && !isSelected && !isPreview;
      const path = isSelected ? getElementBreadcrumbPath(elements, el.id) : null;

      const isDropTarget = dropTargetId === el.id && !isPreview;

      return (
        <div
          key={el.id}
          data-el-id={el.id}
          draggable={!isPreview}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("application/json", JSON.stringify({ type: "move", id: el.id }));
            e.dataTransfer.effectAllowed = "move";
            setDraggingId(el.id);
          }}
          onDragEnd={(e) => {
            e.stopPropagation();
            setDraggingId(null);
            setDropTargetId(null);
            setDropPosition(null);
          }}
          onDragOver={(e) => handleDragOverElement(e, el.id, true)}
          onDrop={(e) => handleDropElement(e, el.id, dropPosition)}
          onClick={(e) => {
            e.stopPropagation();
            if (!isPreview) handleSelectElement(el.id, e);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isPreview) {
              handleSelectElement(el.id, e);
              setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
            }
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            if (!isPreview) setHoveredId(el.id);
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            if (!isPreview && hoveredId === el.id) setHoveredId(null);
          }}
          className={`relative transition-all duration-150 overflow-hidden ${el.customClass || ""} ${
            isPreview
              ? ""
              : "cursor-grab active:cursor-grabbing hover:outline hover:outline-1 hover:outline-blue-400/60"
          } ${
            isSelected
              ? "border-2 border-blue-500 shadow-sm"
              : isHovered
              ? "border border-blue-400 outline outline-2 outline-blue-400/80 shadow-sm"
              : isPreview
              ? ""
              : "border border-dashed border-slate-300"
          } ${isHiddenOnCurrentDevice ? "opacity-40 border-amber-400 border-2 border-dashed bg-amber-50/10 cursor-not-allowed" : ""}`}
          style={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: getLayoutVal(el, "direction", activeBreakpointId, breakpoints) || "column",
            justifyContent: getLayoutVal(el, "justifyContent", activeBreakpointId, breakpoints) || "flex-start",
            alignItems: getLayoutVal(el, "alignItems", activeBreakpointId, breakpoints) || "stretch",
            gap: `${getLayoutVal(el, "gap", activeBreakpointId, breakpoints) ?? 10}px`,
            ...resolvedStyles,
            width: resolvedStyles.width || "100%",
            height: resolvedStyles.height || "auto",
            paddingTop: resolvedStyles.paddingTop || "16px",
            paddingRight: resolvedStyles.paddingRight || "16px",
            paddingBottom: resolvedStyles.paddingBottom || "16px",
            paddingLeft: resolvedStyles.paddingLeft || "16px",
            marginTop: resolvedStyles.marginTop || "8px",
            marginRight: resolvedStyles.marginRight || "0px",
            marginBottom: resolvedStyles.marginBottom || "8px",
            marginLeft: resolvedStyles.marginLeft || "0px",
            borderRadius: resolvedStyles.borderRadius || "8px",
          }}
        >
          {/* Shape Dividers (F-091) */}
          {renderShapeDivider(el, "top")}
          {renderShapeDivider(el, "bottom")}

          {/* Background Slideshow (F-078) */}
          {getStyleVal(el, "backgroundType", activeBreakpointId, breakpoints) === "slideshow" && renderBackgroundSlideshow(el)}

          {/* Background Video (F-077) */}
          {getStyleVal(el, "backgroundType", activeBreakpointId, breakpoints) === "video" && renderBackgroundVideo(el)}

          {isHiddenOnCurrentDevice && !isPreview && (
            <div className="absolute top-2 left-3 z-30 flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
              <span>Hidden on {breakpoints.find(b => b.id === activeBreakpointId)?.name}</span>
            </div>
          )}

          {isSelected && (
            <div className="absolute -top-4.5 right-3 z-30 flex items-center gap-1.5 rounded-lg bg-[#0b1329] border border-blue-500/30 p-1 text-[11px] font-semibold text-white shadow-xl">
              <div className="relative group flex items-center justify-center p-1 rounded hover:bg-slate-800/80 cursor-default">
                <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-40 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Container
                </div>
              </div>
              <div className="w-[1px] h-3 bg-slate-700/60" />
              <button
                onClick={(e) => handleDuplicateElement(el.id, e)}
                className="relative group flex items-center justify-center p-1 rounded hover:bg-slate-800/80 text-slate-300 hover:text-white transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-40 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Duplicate
                </div>
              </button>
              <div className="w-[1px] h-3 bg-slate-700/60" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveAsComponent(el.id);
                }}
                className={`hover:underline ${
                  el.isComponent ? "text-purple-200 font-bold" : "text-blue-100"
                }`}
                title={el.isComponent ? `Component: ${el.componentName}` : "Save as Reusable Component"}
              >
                {el.isComponent ? "Component 🧩" : "Save Comp"}
              </button>
              <span>•</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveAsComponent(el.id);
                }}
                className={`hover:underline ${
                  el.isComponent ? "text-purple-200 font-bold" : "text-blue-100"
                }`}
                title={el.isComponent ? `Component: ${el.componentName}` : "Save as Reusable Component"}
              >
                {el.isComponent ? "Component 🧩" : "Save Comp"}
              </button>
              <span>•</span>
              <button
                onClick={(e) => handleDeleteElement(el.id, e)}
                className="relative group flex items-center justify-center p-1 rounded hover:bg-red-950/80 text-red-400 hover:text-red-300 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-40 bg-red-950 border border-red-500/20 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Delete
                </div>
              </button>
            </div>
          )}

          {(!el.children || el.children.length === 0) && !isPreview ? (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center z-10 relative">
              <span className="text-xs font-bold text-slate-500">Empty Container</span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Click an element on the left panel to add inside
              </span>
            </div>
          ) : (
            el.children?.map((child) => renderElementTree(child))
          )}
        </div>
      );
    }

    const path = isSelected ? getElementBreadcrumbPath(elements, el.id) : null;

    const isHovered = hoveredId === el.id && !isSelected && !isPreview;
    const isDropTarget = dropTargetId === el.id && !isPreview;

    return (
      <div
        key={el.id}
        data-el-id={el.id}
        draggable={!isPreview}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("application/json", JSON.stringify({ type: "move", id: el.id }));
          e.dataTransfer.effectAllowed = "move";
          setDraggingId(el.id);
        }}
        onDragEnd={(e) => {
          e.stopPropagation();
          setDraggingId(null);
          setDropTargetId(null);
          setDropPosition(null);
        }}
        onDragOver={(e) => handleDragOverElement(e, el.id, false)}
        onDrop={(e) => handleDropElement(e, el.id, dropPosition)}
        onClick={(e) => {
          e.stopPropagation();
          if (!isPreview) handleSelectElement(el.id, e);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isPreview) {
            handleSelectElement(el.id, e);
            setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
          }
        }}
        className={`relative rounded-xl transition duration-150 ${el.customClass || ""} ${
          isPreview
            ? ""
            : "cursor-grab active:cursor-grabbing hover:outline hover:outline-1 hover:outline-blue-400/60"
        } ${
          isSelected
            ? "border-2 border-blue-500 p-2.5"
            : isHovered
            ? "border border-blue-400 outline outline-2 outline-blue-400/80 p-2.5 shadow-sm"
            : "p-2.5 border border-transparent"
        } ${isHiddenOnCurrentDevice ? "opacity-40 border-amber-400 border border-dashed bg-amber-50/10" : ""}`}
        style={{
          marginTop: getStyleVal(el, "marginTop", activeBreakpointId, breakpoints),
          marginBottom: getStyleVal(el, "marginBottom", activeBreakpointId, breakpoints),
          boxShadow: resolvedStyles.boxShadow,
          opacity: resolvedStyles.opacity,
          filter: resolvedStyles.filter,
          transform: resolvedStyles.transform,
          mixBlendMode: resolvedStyles.mixBlendMode,
        }}
      >
        {isHiddenOnCurrentDevice && !isPreview && (
          <div className="absolute top-1.5 left-2 z-30 flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
            <span>Hidden on {breakpoints.find(b => b.id === activeBreakpointId)?.name}</span>
          </div>
        )}

        {isSelected && (
          <div className="absolute -top-4.5 right-3 z-30 flex items-center gap-1.5 rounded-lg bg-[#0b1329] border border-blue-500/30 p-1 text-[11px] font-semibold text-white shadow-xl">
            <div className="relative group flex items-center justify-center p-1 rounded hover:bg-slate-800/80 cursor-default">
              <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                {el.type === 'heading' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h16" />
                ) : el.type === 'button' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                ) : el.type === 'image' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                )}
              </svg>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-40 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                {el.type.charAt(0).toUpperCase() + el.type.slice(1)}
              </div>
            </div>
            <div className="w-[1px] h-3 bg-slate-700/60" />
            <button
              onClick={(e) => handleDuplicateElement(el.id, e)}
              className="relative group flex items-center justify-center p-1 rounded hover:bg-slate-800/80 text-slate-300 hover:text-white transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-40 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                Duplicate
              </div>
            </button>
            <div className="w-[1px] h-3 bg-slate-700/60" />
            <button
              onClick={(e) => handleDeleteElement(el.id, e)}
              className="relative group flex items-center justify-center p-1 rounded hover:bg-red-950/80 text-red-400 hover:text-red-300 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-40 bg-red-950 border border-red-500/20 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                Delete
              </div>
            </button>
          </div>
        )}

        {/* Element Renderers */}
        {el.type === "heading" && (
          <h2
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onFocus={() => handleSelectElement(el.id)}
            onBlur={(e) => updateElementContent(el.id, e.currentTarget.textContent || "")}
            onInput={(e) => updateElementContent(el.id, e.currentTarget.textContent || "")}
            className="focus:ring-2 focus:ring-blue-400/60 focus:bg-blue-50/20 rounded-sm cursor-text transition-all"
            style={{
              color: "#0f172a",
              fontSize: "32px",
              fontWeight: "700",
              textAlign: "left",
              lineHeight: "1.2",
              ...getInnerStyles(resolvedStyles)
            }}
          >
            {getStyleVal(el, "textPathEnabled", activeBreakpointId, breakpoints) === "true" ? (
              renderTextPath(el.content, resolvedStyles)
            ) : (
              el.content
            )}
          </h2>
        )}

        {el.type === "text" && (
          <p
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onFocus={() => handleSelectElement(el.id)}
            onBlur={(e) => updateElementContent(el.id, e.currentTarget.textContent || "")}
            onInput={(e) => updateElementContent(el.id, e.currentTarget.textContent || "")}
            className="focus:ring-2 focus:ring-blue-400/60 focus:bg-blue-50/20 rounded-sm cursor-text transition-all"
            style={{
              color: "#475569",
              fontSize: "16px",
              fontWeight: "400",
              textAlign: "left",
              lineHeight: "1.6",
              ...getInnerStyles(resolvedStyles)
            }}
          >
            {el.content}
          </p>
        )}

        {el.type === "image" && (
          <div style={{ textAlign: getStyleVal(el, "textAlign", activeBreakpointId, breakpoints) || "left" }}>
            {el.src ? (
              <img
                src={resolveImageUrl(el.src, apiUrl)}
                alt={el.alt || "Uploaded Image"}
                onClick={() => {
                  if (isPreview && globalSettings?.lightboxSettings?.enableLightbox) {
                    setLightboxImage(resolveImageUrl(el.src!, apiUrl));
                  }
                }}
                className={`inline-block object-cover max-w-full ${
                  isPreview && globalSettings?.lightboxSettings?.enableLightbox ? "cursor-zoom-in" : ""
                } ${
                  getStyleVal(el, "kenBurnsEffect", activeBreakpointId, breakpoints) === "zoom-in" ? "kb-zoom-in" : 
                  getStyleVal(el, "kenBurnsEffect", activeBreakpointId, breakpoints) === "zoom-out" ? "kb-zoom-out" : ""
                }`}
                style={{
                  width: getStyleVal(el, "width", activeBreakpointId, breakpoints) || "100%",
                  height: getStyleVal(el, "height", activeBreakpointId, breakpoints) || "auto",
                  borderRadius: getStyleVal(el, "borderRadius", activeBreakpointId, breakpoints) || "8px",
                  ...getInnerStyles(resolvedStyles)
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-10 px-6 text-center transition hover:border-blue-400">
                <EmptyPictureIcon />
                <h4 className="mt-3 text-xs font-bold text-slate-700">
                  No Image Selected
                </h4>
                <p className="mt-1 text-[11px] text-slate-400">
                  Click to choose or upload an image in the right panel
                </p>
              </div>
            )}
          </div>
        )}

        {el.type === "button" && (
          <div style={{ textAlign: getStyleVal(el, "textAlign", activeBreakpointId, breakpoints) || "left" }}>
            <a
              href={el.href || "#"}
              onClick={(e) => {
                if (!isPreview) e.preventDefault();
              }}
              className="inline-block transition hover:opacity-90 shadow-sm"
              style={{
                color: "#ffffff",
                backgroundColor: "#2563eb",
                fontSize: "14px",
                fontWeight: "600",
                padding: "10px 22px",
                borderRadius: "8px",
                ...getInnerStyles(resolvedStyles)
              }}
            >
              Copy
            </button>

            <button
              onClick={(e) => handlePasteElement(e)}
              disabled={!copiedElement}
              className="rounded-full border border-slate-600 bg-transparent px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
              title="Paste copied element (Ctrl+V)"
            >
              Paste
            </button>

            <button
              onClick={(e) => handleDuplicateElement(selectedId, e)}
              disabled={!selectedId}
              className="rounded-full border border-slate-600 bg-transparent px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
              title="Duplicate selected element (Ctrl+D)"
            >
              Duplicate
            </button>

            <button
              onClick={() => selectedId && handleSaveAsComponent(selectedId)}
              disabled={!selectedId}
              className="rounded-full border border-purple-500/60 bg-purple-900/30 px-3 py-1 text-xs font-semibold text-purple-300 transition hover:bg-purple-800 hover:text-white disabled:opacity-40"
              title="Save selected element as a reusable Component"
            >
              Save as Comp 🧩
            </button>

        {/* Center: Device Switcher Toolbar */}
        {!isPreview && (
          <div className="flex items-center gap-1 rounded-full bg-[#16223f] p-1 border border-slate-700/50">
            {breakpoints
              .filter((bp) => bp.active)
              .sort((a, b) => b.width - a.width)
              .map((bp) => {
                const isActive = bp.id === activeBreakpointId;
                return (
                  <button
                    key={bp.id}
                    onClick={() => setActiveBreakpointId(bp.id)}
                    title={`${bp.name} (${bp.width}px)`}
                    className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {bp.id === "widescreen" && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    )}
                    {bp.id === "laptop" && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="4" width="18" height="12" rx="1" />
                        <line x1="1" y1="20" x2="23" y2="20" />
                      </svg>
                    )}
                    {bp.id === "desktop" && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="18" height="13" rx="2" />
                        <line x1="12" y1="16" x2="12" y2="20" />
                        <line x1="8" y1="20" x2="16" y2="20" />
                      </svg>
                    )}
                    {bp.id === "tabletExtra" && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="4" y="3" width="16" height="18" rx="2" transform="rotate(90 12 12)" />
                        <circle cx="12" cy="18" r="0.75" />
                      </svg>
                    )}
                    {bp.id === "tablet" && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="5" y="3" width="14" height="18" rx="2" />
                        <circle cx="12" cy="19" r="0.75" />
                      </svg>
                    )}
                    {bp.id === "mobileExtra" && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="6" y="3" width="12" height="18" rx="2" />
                        <circle cx="12" cy="19" r="0.75" />
                      </svg>
                    )}
                    {bp.id === "mobile" && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <rect x="7" y="3" width="10" height="18" rx="2" />
                        <circle cx="12" cy="19" r="0.75" />
                      </svg>
                    )}
                    <span className="hidden md:inline">{bp.name}</span>
                  </button>
                );
              })}

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <button
              onClick={() => setIsBpModalOpen(true)}
              title="Manage Custom Breakpoints"
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-xs font-medium text-emerald-400">
              ✓ {saveMessage}
            </span>
          )}

            {/* Editor UI Language Selector (F-022) */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 rounded-full px-2.5 py-1 border border-slate-700">
              <span className="text-[11px] text-slate-400">🌐 UI:</span>
              <select
                value={editorLanguage}
                onChange={(e) => setEditorLanguage(e.target.value as "en" | "es" | "fr" | "de")}
                className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
                title="Change Editor Interface Language"
              >
                <option value="en" className="bg-slate-900 text-white">English (EN)</option>
                <option value="es" className="bg-slate-900 text-white">Español (ES)</option>
                <option value="fr" className="bg-slate-900 text-white">Français (FR)</option>
                <option value="de" className="bg-slate-900 text-white">Deutsch (DE)</option>
              </select>
            </div>

            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`rounded-full border border-slate-600 bg-transparent px-4 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white ${
                isPreview ? "bg-amber-500/20 text-amber-300 border-amber-500/50" : ""
              }`}
            >
              {isPreview ? t("exitPreview", "Exit Preview") : t("preview", "Preview")}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-blue-600 px-5 py-1 text-xs font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? t("saving", "Saving...") : t("save", "Save")}
            </button>
          </div>
        </header>
      )}

      {/* ========================================== */}
      {/* Main Workspace Body                         */}
      {/* ========================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ========================================== */}
        {/* Left Sidebar: ELEMENTS                     */}
        {/* ========================================== */}
        {!isPreview && !isFullScreenCanvas && (
          <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4 overflow-y-auto shadow-sm flex flex-col">
            <div className="flex items-center gap-1 border-b border-slate-200 pb-2.5 mb-4">
              <button
                type="button"
                onClick={() => setLeftSidebarTab("elements")}
                className={`flex-1 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition ${
                  leftSidebarTab === "elements"
                    ? "bg-slate-100 text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {t("elements", "Elements")}
              </button>
              <button
                type="button"
                onClick={() => setLeftSidebarTab("navigator")}
                className={`flex-1 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition ${
                  leftSidebarTab === "navigator"
                    ? "bg-slate-100 text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {t("navigator", "Navigator")}
              </button>
            </div>

            {leftSidebarTab === "elements" ? (
              <div className="space-y-4">
                {/* Element Manager Trigger Button (F-032) */}
                <button
                  type="button"
                  onClick={() => setIsElementManagerOpen(true)}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <span>⚙️</span>
                    <span>Element Manager</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded-full">
                    {5 - disabledWidgets.length}/5 Active
                  </span>
                </button>

                {/* Import Asset Button (F-014) */}
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImportAsset(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => importFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-2.5 text-xs font-bold text-blue-700 hover:border-blue-500 hover:bg-blue-100/60 transition disabled:opacity-50 shadow-sm"
                >
                  <span>📁</span>
                  <span>{isUploading ? "Importing Asset..." : "Import Asset / File"}</span>
                </button>

                {/* Pinned Favorite Widgets (F-012) */}
                {favoriteWidgets.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center justify-between">
                      <span>⭐ Favorite Widgets</span>
                      <span className="text-[9px] text-amber-600/70 font-normal">Quick Access</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {favoriteWidgets.map((type) => {
                        const isDisabled = disabledWidgets.includes(type);
                        return (
                          <div
                            key={`fav_${type}`}
                            draggable={!isDisabled}
                            onDragStart={(e) => {
                              if (isDisabled) return;
                              e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: type }));
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            onClick={() => !isDisabled && handleAddElement(type)}
                            className={`relative flex flex-col items-center justify-center rounded-lg border p-2.5 shadow-sm transition ${
                              isDisabled
                                ? "border-slate-200 bg-slate-100/70 opacity-50 cursor-not-allowed"
                                : "border-amber-200 bg-white hover:border-amber-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group cursor-grab"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => toggleFavoriteWidget(type, e)}
                              className="absolute top-1 right-1 text-amber-500 text-[10px] hover:scale-125 transition"
                              title="Remove from favorites"
                            >
                              ★
                            </button>
                            {type === "container" && <ContainerBoxIcon />}
                            {type === "heading" && <HeadingBoxIcon />}
                            {type === "text" && <TextBoxIcon />}
                            {type === "image" && <ImageBoxIcon />}
                            {type === "button" && <ButtonBoxIcon />}
                            <span className="mt-1 text-[11px] font-semibold text-slate-700 capitalize group-hover:text-amber-700">
                              {type}
                            </span>
                            {isDisabled && (
                              <span className="mt-1 text-[9px] font-bold text-red-500 bg-red-50 px-1 rounded">
                                Disabled
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Container */}
                  <div
                    draggable={!disabledWidgets.includes("container")}
                    onDragStart={(e) => {
                      if (disabledWidgets.includes("container")) return;
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "container" }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => handleAddElement("container")}
                    className={`relative col-span-2 flex items-center justify-center gap-3 rounded-xl border p-3 shadow-sm transition ${
                      disabledWidgets.includes("container")
                        ? "border-slate-200 bg-slate-100/70 opacity-50 cursor-not-allowed"
                        : "border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50 hover:shadow hover:-translate-y-0.5 active:scale-95 group cursor-grab"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleFavoriteWidget("container", e)}
                      className={`absolute top-2 right-2 text-xs transition hover:scale-125 ${
                        favoriteWidgets.includes("container") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                      }`}
                      title={favoriteWidgets.includes("container") ? "Remove favorite" : "Mark as favorite"}
                    >
                      {favoriteWidgets.includes("container") ? "★" : "☆"}
                    </button>
                    <ContainerBoxIcon />
                    <span className="text-xs font-bold text-blue-700 group-hover:text-blue-800">
                      {disabledWidgets.includes("container") ? "Container (Disabled)" : "+ Add Container"}
                    </span>
                  </div>

                  {/* Heading */}
                  <div
                    draggable={!disabledWidgets.includes("heading")}
                    onDragStart={(e) => {
                      if (disabledWidgets.includes("heading")) return;
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "heading" }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => handleAddElement("heading")}
                    className={`relative flex flex-col items-center justify-center rounded-xl border p-3.5 shadow-sm transition ${
                      disabledWidgets.includes("heading")
                        ? "border-slate-200 bg-slate-100/70 opacity-50 cursor-not-allowed"
                        : "border-slate-200 bg-white hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group cursor-grab"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleFavoriteWidget("heading", e)}
                      className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                        favoriteWidgets.includes("heading") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                      }`}
                      title={favoriteWidgets.includes("heading") ? "Remove favorite" : "Mark as favorite"}
                    >
                      {favoriteWidgets.includes("heading") ? "★" : "☆"}
                    </button>
                    <HeadingBoxIcon />
                    <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                      {disabledWidgets.includes("heading") ? "Heading (Off)" : "Heading"}
                    </span>
                  </div>

                  {/* Text */}
                  <div
                    draggable={!disabledWidgets.includes("text")}
                    onDragStart={(e) => {
                      if (disabledWidgets.includes("text")) return;
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "text" }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => handleAddElement("text")}
                    className={`relative flex flex-col items-center justify-center rounded-xl border p-3.5 shadow-sm transition ${
                      disabledWidgets.includes("text")
                        ? "border-slate-200 bg-slate-100/70 opacity-50 cursor-not-allowed"
                        : "border-slate-200 bg-white hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group cursor-grab"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleFavoriteWidget("text", e)}
                      className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                        favoriteWidgets.includes("text") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                      }`}
                      title={favoriteWidgets.includes("text") ? "Remove favorite" : "Mark as favorite"}
                    >
                      {favoriteWidgets.includes("text") ? "★" : "☆"}
                    </button>
                    <TextBoxIcon />
                    <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                      {disabledWidgets.includes("text") ? "Text (Off)" : "Text"}
                    </span>
                  </div>

                  {/* Image */}
                  <div
                    draggable={!disabledWidgets.includes("image")}
                    onDragStart={(e) => {
                      if (disabledWidgets.includes("image")) return;
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "image" }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => handleAddElement("image")}
                    className={`relative flex flex-col items-center justify-center rounded-xl border p-3.5 shadow-sm transition ${
                      disabledWidgets.includes("image")
                        ? "border-slate-200 bg-slate-100/70 opacity-50 cursor-not-allowed"
                        : "border-slate-200 bg-white hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group cursor-grab"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleFavoriteWidget("image", e)}
                      className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                        favoriteWidgets.includes("image") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                      }`}
                      title={favoriteWidgets.includes("image") ? "Remove favorite" : "Mark as favorite"}
                    >
                      {favoriteWidgets.includes("image") ? "★" : "☆"}
                    </button>
                    <ImageBoxIcon />
                    <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                      {disabledWidgets.includes("image") ? "Image (Off)" : "Image"}
                    </span>
                  </div>

                  {/* Button */}
                  <div
                    draggable={!disabledWidgets.includes("button")}
                    onDragStart={(e) => {
                      if (disabledWidgets.includes("button")) return;
                      e.dataTransfer.setData("application/json", JSON.stringify({ type: "new", widgetType: "button" }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => handleAddElement("button")}
                    className={`relative flex flex-col items-center justify-center rounded-xl border p-3.5 shadow-sm transition ${
                      disabledWidgets.includes("button")
                        ? "border-slate-200 bg-slate-100/70 opacity-50 cursor-not-allowed"
                        : "border-slate-200 bg-white hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group cursor-grab"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleFavoriteWidget("button", e)}
                      className={`absolute top-1.5 right-2 text-xs transition hover:scale-125 ${
                        favoriteWidgets.includes("button") ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                      }`}
                      title={favoriteWidgets.includes("button") ? "Remove favorite" : "Mark as favorite"}
                    >
                      {favoriteWidgets.includes("button") ? "★" : "☆"}
                    </button>
                    <ButtonBoxIcon />
                    <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                      {disabledWidgets.includes("button") ? "Button (Off)" : "Button"}
                    </span>
                  </div>
                </div>

                {/* Reusable Components Section (F-005) */}
                <div className="col-span-2 pt-3 border-t border-slate-200 mt-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-2 flex items-center gap-1">
                    <span>🧩</span> Reusable Components
                  </h4>
                  {Object.keys(components).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/30 p-2.5 text-center text-[10px] text-purple-600/70">
                      Select any element & click "Save as Comp" to create reusable components.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {Object.entries(components).map(([compId, comp]) => (
                        <button
                          key={compId}
                          type="button"
                          onClick={() => handleAddInstanceFromComponent(compId)}
                          className="w-full flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/50 px-2.5 py-1.5 text-xs font-semibold text-purple-800 transition hover:bg-purple-100 hover:border-purple-300"
                        >
                          <span className="truncate">{comp.name}</span>
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-200/60 px-1.5 py-0.5 rounded">
                            + Add Instance
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Structure Search Input (F-030) */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400 text-xs">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={structureSearchQuery}
                    onChange={(e) => setStructureSearchQuery(e.target.value)}
                    placeholder="Search structure layers..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-7 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 transition shadow-sm"
                  />
                  {structureSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStructureSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 text-xs"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {structureSearchQuery.trim() !== "" ? (
                  /* Filtered Search Results */
                  <div className="space-y-1">
                    {flattenAndSearchElements(elements, structureSearchQuery).length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 italic">
                        No structure elements matching "{structureSearchQuery}"
                      </div>
                    ) : (
                      flattenAndSearchElements(elements, structureSearchQuery).map(({ element, path }) => (
                        <div
                          key={element.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectElement(element.id, e);
                          }}
                          className={`flex items-center justify-between rounded-lg p-2 text-xs transition cursor-pointer border ${
                            selectedId === element.id || selectedIds.includes(element.id)
                              ? "bg-blue-600 font-bold text-white border-blue-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs">
                              {element.type === "container" && "📦"}
                              {element.type === "heading" && "🔤"}
                              {element.type === "text" && "📝"}
                              {element.type === "image" && "🖼️"}
                              {element.type === "button" && "🔘"}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-semibold capitalize">
                                {element.type === "heading" ? (element.content ? `"${element.content.slice(0, 15)}"` : "Heading") :
                                 element.type === "text" ? (element.content ? `"${element.content.slice(0, 15)}"` : "Text") :
                                 element.type === "button" ? (element.content ? `"${element.content.slice(0, 15)}"` : "Button") :
                                 element.type === "image" ? (element.alt ? `Image (${element.alt})` : "Image") :
                                 element.type === "container" ? "Container" : element.type}
                              </span>
                              <span className={`text-[9px] truncate ${selectedId === element.id || selectedIds.includes(element.id) ? "text-blue-200" : "text-slate-400"}`}>
                                {path}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Full Tree Hierarchy View */
                  <div className="space-y-1">
                    {elements.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No elements on canvas.
                      </div>
                    ) : (
                      elements.map((el, idx) =>
                        renderNavigatorTreeItem(el, 0, idx === elements.length - 1)
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </aside>
        )}

        {/* ========================================== */}
        {/* Center: White Canvas Container              */}
        {/* ========================================== */}
        <main
          onClick={() => handleSelectElement(null)}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => handleDropElement(e, null, "after")}
          className="relative flex flex-1 justify-center items-start overflow-y-auto bg-[#f1f5f9] p-6 sm:p-10"
        >
          <div
            style={{
              width: "100%",
              maxWidth: activeBreakpointId === "widescreen" ? "100%" : `${breakpoints.find(b => b.id === activeBreakpointId)?.width || 1024}px`,
            }}
            className={`min-h-[750px] h-auto shrink-0 my-2 bg-white shadow-md transition-all duration-300 relative ${
              activeBreakpointId === "desktop" || activeBreakpointId === "widescreen" || activeBreakpointId === "laptop"
                ? "rounded-2xl border border-slate-200 p-8 sm:p-10"
                : "rounded-[40px] border-[12px] border-slate-900 px-6 py-12"
            }`}
          >
            {/* Simulated Phone Notch / Speaker for Mobile/Tablet */}
            {!(activeBreakpointId === "desktop" || activeBreakpointId === "widescreen" || activeBreakpointId === "laptop") && (
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-full flex items-center justify-center gap-1.5 z-50">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                <div className="w-10 h-1 bg-slate-800 rounded-full" />
              </div>
            )}

            {elements.length === 0 ? (
              <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-center p-8">
                <p className="text-sm font-bold text-slate-700">
                  Your Canvas is Empty
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Click any element from the left panel to start building.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {elements.map((el) => renderElementTree(el))}
              </div>
            )}
          </div>
        </main>

        {/* ========================================== */}
        {/* Right Sidebar: SETTINGS & STYLING           */}
        {/* ========================================== */}
        {!isPreview && (
          <aside className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col h-full shadow-sm overflow-hidden">
            {/* Sidebar Header & Tab Switcher */}
            <div className="p-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5">
                Settings & Design System
              </h2>
              
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedElement) setActiveSidebarTab("element");
                  }}
                  disabled={!selectedElement}
                  className={`flex-1 rounded-md py-1.5 text-center transition ${
                    !selectedElement 
                      ? "text-slate-400 cursor-not-allowed" 
                      : activeSidebarTab === "element"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Element Styles
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab("global")}
                  className={`flex-1 rounded-md py-1.5 text-center transition ${
                    activeSidebarTab === "global"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Global & Site
                </button>
              </div>
            </div>

            {/* Sidebar Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeSidebarTab === "element" && selectedElement ? (
                <div className="space-y-4">
                  {/* Element Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600">
                      {selectedElement.type} Settings
                    </span>
                    <div className="flex items-center gap-2.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateElement(selectedElement.id, e)}
                        className="text-blue-600 hover:underline"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteElement(selectedElement.id, e)}
                        className="text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Accordion Sections */}

                  {/* 1. Layout & Dimensions */}
                  {renderAccordion("Layout & Spacing", "layout", (
                    <div className="space-y-3.5">
                      {/* Device Visibility Section (F-059, F-063) */}
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Device Visibility
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {breakpoints
                            .filter(b => b.active)
                            .map((bp) => {
                              const isHidden = selectedElement.hiddenDevices?.[bp.id] || false;
                              return (
                                <label
                                  key={bp.id}
                                  className={`flex items-center gap-1.5 rounded-lg border p-1.5 cursor-pointer transition ${
                                    isHidden
                                      ? "bg-amber-50/50 border-amber-200 text-amber-800"
                                      : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isHidden}
                                    onChange={(e) => {
                                      const hiddenDevices = { ...selectedElement.hiddenDevices };
                                      if (e.target.checked) {
                                        hiddenDevices[bp.id] = true;
                                      } else {
                                        delete hiddenDevices[bp.id];
                                      }
                                      updateSelectedProp("hiddenDevices", hiddenDevices);
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                                  />
                                  <span className="text-[10px] font-bold">
                                    Hide: {bp.name}
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      </div>

                      {/* Container Specific Controls */}
                      {selectedElement.type === "container" && (
                        <div className="space-y-3.5 pt-2.5 border-t border-slate-100">
                          <div>
                            {renderResponsiveLabel("Direction", undefined, "direction")}
                            <select
                              value={getLayoutVal(selectedElement, "direction", activeBreakpointId, breakpoints) || "column"}
                              onChange={(e) => updateSelectedLayout("direction", e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                            >
                              <option value="column">Column (Vertical)</option>
                              <option value="row">Row (Horizontal)</option>
                            </select>
                          </div>

                          <div>
                            {renderResponsiveLabel("Justify Content", undefined, "justifyContent")}
                            <select
                              value={getLayoutVal(selectedElement, "justifyContent", activeBreakpointId, breakpoints) || "flex-start"}
                              onChange={(e) => updateSelectedLayout("justifyContent", e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                            >
                              <option value="flex-start">Start</option>
                              <option value="center">Center</option>
                              <option value="flex-end">End</option>
                              <option value="space-between">Space Between</option>
                              <option value="space-around">Space Around</option>
                              <option value="space-evenly">Space Evenly</option>
                            </select>
                          </div>

                          <div>
                            {renderResponsiveLabel("Align Items", undefined, "alignItems")}
                            <select
                              value={getLayoutVal(selectedElement, "alignItems", activeBreakpointId, breakpoints) || "stretch"}
                              onChange={(e) => updateSelectedLayout("alignItems", e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                            >
                              <option value="stretch">Stretch</option>
                              <option value="flex-start">Start</option>
                              <option value="center">Center</option>
                              <option value="flex-end">End</option>
                            </select>
                          </div>

                          <div>
                            {renderResponsiveLabel("Gap (px)", undefined, "gap")}
                            <input
                              type="number"
                              value={getLayoutVal(selectedElement, "gap", activeBreakpointId, breakpoints) ?? 10}
                              onChange={(e) => updateSelectedLayout("gap", Number(e.target.value))}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Content Input for non-containers/images */}
                      {selectedElement.type !== "image" && selectedElement.type !== "container" && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            TEXT CONTENT
                          </label>
                          <textarea
                            rows={selectedElement.type === "text" ? 3 : 2}
                            value={selectedElement.content}
                            onChange={(e) => updateSelectedProp("content", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>
                      )}

                      {/* Width & Height */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          {renderResponsiveLabel("Width", "width")}
                          <input
                            type="text"
                            placeholder="e.g. 100%, 300px"
                            value={getStyleVal(selectedElement, "width", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("width", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          />
                        </div>

                        <div>
                          {renderResponsiveLabel("Height", "height")}
                          <input
                            type="text"
                            placeholder="e.g. auto, 400px"
                            value={getStyleVal(selectedElement, "height", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("height", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      {/* Padding Controls */}
                      <div>
                        {renderResponsiveLabel("Padding (px)")}
                        <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-bold text-slate-400">
                          <div>
                            <span>Top</span>
                            <input
                              type="number"
                              value={parseInt(getStyleVal(selectedElement, "paddingTop", activeBreakpointId, breakpoints) || "0")}
                              onChange={(e) => updateSelectedStyle("paddingTop", `${e.target.value}px`)}
                              className="w-full rounded border border-slate-300 p-1 text-center text-xs font-semibold text-slate-700"
                            />
                          </div>
                          <div>
                            <span>Right</span>
                            <input
                              type="number"
                              value={parseInt(getStyleVal(selectedElement, "paddingRight", activeBreakpointId, breakpoints) || "0")}
                              onChange={(e) => updateSelectedStyle("paddingRight", `${e.target.value}px`)}
                              className="w-full rounded border border-slate-300 p-1 text-center text-xs font-semibold text-slate-700"
                            />
                          </div>
                          <div>
                            <span>Bottom</span>
                            <input
                              type="number"
                              value={parseInt(getStyleVal(selectedElement, "paddingBottom", activeBreakpointId, breakpoints) || "0")}
                              onChange={(e) => updateSelectedStyle("paddingBottom", `${e.target.value}px`)}
                              className="w-full rounded border border-slate-300 p-1 text-center text-xs font-semibold text-slate-700"
                            />
                          </div>
                          <div>
                            <span>Left</span>
                            <input
                              type="number"
                              value={parseInt(getStyleVal(selectedElement, "paddingLeft", activeBreakpointId, breakpoints) || "0")}
                              onChange={(e) => updateSelectedStyle("paddingLeft", `${e.target.value}px`)}
                              className="w-full rounded border border-slate-300 p-1 text-center text-xs font-semibold text-slate-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Margin Controls */}
                      <div>
                        {renderResponsiveLabel("Margin (px)")}
                        <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-bold text-slate-400">
                          <div>
                            <span>Top</span>
                            <input
                              type="number"
                              value={parseInt(getStyleVal(selectedElement, "marginTop", activeBreakpointId, breakpoints) || "0")}
                              onChange={(e) => updateSelectedStyle("marginTop", `${e.target.value}px`)}
                              className="w-full rounded border border-slate-300 p-1 text-center text-xs font-semibold text-slate-700"
                            />
                          </div>
                          <div>
                            <span>Right</span>
                            <input
                              type="number"
                              value={parseInt(getStyleVal(selectedElement, "marginRight", activeBreakpointId, breakpoints) || "0")}
                              onChange={(e) => updateSelectedStyle("marginRight", `${e.target.value}px`)}
                              className="w-full rounded border border-slate-300 p-1 text-center text-xs font-semibold text-slate-700"
                            />
                          </div>
                          <div>
                            <span>Bottom</span>
                            <input
                              type="number"
                              value={parseInt(getStyleVal(selectedElement, "marginBottom", activeBreakpointId, breakpoints) || "0")}
                              onChange={(e) => updateSelectedStyle("marginBottom", `${e.target.value}px`)}
                              className="w-full rounded border border-slate-300 p-1 text-center text-xs font-semibold text-slate-700"
                            />
                          </div>
                          <div>
                            <span>Left</span>
                            <input
                              type="number"
                              value={parseInt(getStyleVal(selectedElement, "marginLeft", activeBreakpointId, breakpoints) || "0")}
                              onChange={(e) => updateSelectedStyle("marginLeft", `${e.target.value}px`)}
                              className="w-full rounded border border-slate-300 p-1 text-center text-xs font-semibold text-slate-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Custom Classes (F-068) */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          CUSTOM CSS CLASSES
                        </label>
                        <input
                          type="text"
                          value={selectedElement.customClass || ""}
                          onChange={(e) => updateSelectedProp("customClass", e.target.value)}
                          placeholder="e.g. highlight-card shadow-lg"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}

                  {/* 2. Typography Controls (F-070, F-089) */}
                  {selectedElement.type !== "image" && renderAccordion("Typography Settings", "typography", (
                    <div className="space-y-3.5">
                      <div>
                        {renderResponsiveLabel("Font Family", "fontFamily")}
                        <select
                          value={getStyleVal(selectedElement, "fontFamily", activeBreakpointId, breakpoints) || "inherit"}
                          onChange={(e) => updateSelectedStyle("fontFamily", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="inherit">Inherit (Default)</option>
                          <option value="'Inter', sans-serif">Inter</option>
                          <option value="'Outfit', sans-serif">Outfit</option>
                          <option value="'Playfair Display', serif">Playfair Display</option>
                          <option value="'Montserrat', sans-serif">Montserrat</option>
                          <option value="'Roboto', sans-serif">Roboto</option>
                          <option value="Georgia, serif">Georgia</option>
                          <option value="monospace">Monospace</option>
                        </select>
                      </div>

                      <div>
                        {renderResponsiveLabel("Font Size (px)", "fontSize")}
                        <input
                          type="number"
                          value={getFontSizeNum(getStyleVal(selectedElement, "fontSize", activeBreakpointId, breakpoints))}
                          onChange={(e) => updateSelectedStyle("fontSize", e.target.value ? `${e.target.value}px` : "16px")}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        {renderResponsiveLabel("Font Weight", "fontWeight")}
                        <select
                          value={getStyleVal(selectedElement, "fontWeight", activeBreakpointId, breakpoints) || "400"}
                          onChange={(e) => updateSelectedStyle("fontWeight", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="300">Light (300)</option>
                          <option value="400">Regular (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">SemiBold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="800">ExtraBold (800)</option>
                        </select>
                      </div>

                      <div>
                        {renderResponsiveLabel("Line Height", "lineHeight")}
                        <input
                          type="text"
                          placeholder="e.g. 1.2, 1.5, 24px"
                          value={getStyleVal(selectedElement, "lineHeight", activeBreakpointId, breakpoints) || ""}
                          onChange={(e) => updateSelectedStyle("lineHeight", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        {renderResponsiveLabel("Letter Spacing (px)", "letterSpacing")}
                        <input
                          type="number"
                          step="0.5"
                          value={parseFloat(getStyleVal(selectedElement, "letterSpacing", activeBreakpointId, breakpoints) || "0")}
                          onChange={(e) => updateSelectedStyle("letterSpacing", e.target.value ? `${e.target.value}px` : "")}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        {renderResponsiveLabel("Word Spacing (px)", "wordSpacing")}
                        <input
                          type="number"
                          value={parseFloat(getStyleVal(selectedElement, "wordSpacing", activeBreakpointId, breakpoints) || "0")}
                          onChange={(e) => updateSelectedStyle("wordSpacing", e.target.value ? `${e.target.value}px` : "")}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        {renderResponsiveLabel("Text Alignment", "textAlign")}
                        <select
                          value={getStyleVal(selectedElement, "textAlign", activeBreakpointId, breakpoints) || "left"}
                          onChange={(e) => updateSelectedStyle("textAlign", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                          <option value="justify">Justify</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  {/* 3. Color Palette & Dynamic Colors (F-071, F-072) */}
                  {selectedElement.type !== "image" && renderAccordion("Color Settings", "colors", (
                    <div className="space-y-3.5">
                      {/* Text Color */}
                      <div>
                        {renderResponsiveLabel("Text Color", "color")}
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={getStyleVal(selectedElement, "color", activeBreakpointId, breakpoints)?.startsWith("var") ? "#000000" : getStyleVal(selectedElement, "color", activeBreakpointId, breakpoints) || "#0f172a"}
                            onChange={(e) => updateSelectedStyle("color", e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 shrink-0"
                          />
                          <input
                            type="text"
                            value={getStyleVal(selectedElement, "color", activeBreakpointId, breakpoints) || "#0f172a"}
                            onChange={(e) => updateSelectedStyle("color", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>
                        {/* Dynamic Colors (F-072) */}
                        <div className="mt-1.5">
                          <select
                            onChange={(e) => {
                              if (e.target.value) updateSelectedStyle("color", e.target.value);
                            }}
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600 outline-none"
                          >
                            <option value="">-- Connect Dynamic Color Variable --</option>
                            <option value="var(--primaryColor)">Primary Theme Color</option>
                            <option value="var(--secondaryColor)">Secondary Theme Color</option>
                            <option value="var(--accentColor)">Accent Color</option>
                            <option value="var(--textColor)">Body Text Color</option>
                            <option value="var(--backgroundColor)">Site Background</option>
                          </select>
                        </div>
                      </div>

                      {/* Element Link (if Button) */}
                      {selectedElement.type === "button" && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            BUTTON LINK (URL)
                          </label>
                          <input
                            type="text"
                            value={selectedElement.href || "#"}
                            onChange={(e) => updateSelectedProp("href", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 4. Background Controls (F-073, F-074, F-075, F-076, F-077, F-078) */}
                  {renderAccordion("Background options", "background", (
                    <div className="space-y-3.5">
                      <div>
                        {renderResponsiveLabel("Background Type", "backgroundType")}
                        <select
                          value={getStyleVal(selectedElement, "backgroundType", activeBreakpointId, breakpoints) || "solid"}
                          onChange={(e) => updateSelectedStyle("backgroundType", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="solid">Solid Color</option>
                          <option value="gradient">Gradient Background</option>
                          <option value="image">Background Image</option>
                          <option value="video">Background Video</option>
                          <option value="slideshow">Image Slideshow</option>
                        </select>
                      </div>

                      {/* Solid Color */}
                      {(getStyleVal(selectedElement, "backgroundType", activeBreakpointId, breakpoints) === "solid" || !getStyleVal(selectedElement, "backgroundType", activeBreakpointId, breakpoints)) && (
                        <div>
                          {renderResponsiveLabel("Background Color", "backgroundColor")}
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={getStyleVal(selectedElement, "backgroundColor", activeBreakpointId, breakpoints)?.startsWith("var") ? "#ffffff" : getStyleVal(selectedElement, "backgroundColor", activeBreakpointId, breakpoints) || "#ffffff"}
                              onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                              className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5 shrink-0"
                            />
                            <input
                              type="text"
                              value={getStyleVal(selectedElement, "backgroundColor", activeBreakpointId, breakpoints) || "#ffffff"}
                              onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                            />
                          </div>
                          {/* Dynamic Color Variable Picker */}
                          <div className="mt-1.5">
                            <select
                              onChange={(e) => {
                                if (e.target.value) updateSelectedStyle("backgroundColor", e.target.value);
                              }}
                              className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600 outline-none"
                            >
                              <option value="">-- Connect Dynamic Background Variable --</option>
                              <option value="var(--backgroundColor)">Background (Base)</option>
                              <option value="var(--primaryColor)">Primary Theme Color</option>
                              <option value="var(--secondaryColor)">Secondary Theme Color</option>
                              <option value="var(--accentColor)">Accent Color</option>
                              <option value="transparent">Transparent</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Gradient Settings (F-073) */}
                      {getStyleVal(selectedElement, "backgroundType", activeBreakpointId, breakpoints) === "gradient" && (
                        <div className="space-y-2 border border-slate-200/60 p-2.5 rounded-lg bg-slate-50/50">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Gradient Parameters</span>
                          
                          <div className="grid grid-cols-2 gap-1 text-[10px] font-bold">
                            <div>
                              <span>Stop Color 1</span>
                              <input
                                type="color"
                                defaultValue="#2563eb"
                                onChange={(e) => {
                                  const stop2 = getStyleVal(selectedElement, "backgroundColor", activeBreakpointId, breakpoints) || "#10b981";
                                  updateSelectedStyle("backgroundGradient", `linear-gradient(45deg, ${e.target.value}, ${stop2})`);
                                  updateSelectedStyle("backgroundColor", e.target.value); // cache color 1
                                }}
                                className="w-full h-7 rounded cursor-pointer p-0.5 border"
                              />
                            </div>
                            <div>
                              <span>Stop Color 2</span>
                              <input
                                type="color"
                                defaultValue="#10b981"
                                onChange={(e) => {
                                  const stop1 = getStyleVal(selectedElement, "backgroundColor", activeBreakpointId, breakpoints) || "#2563eb";
                                  updateSelectedStyle("backgroundGradient", `linear-gradient(45deg, ${stop1}, ${e.target.value})`);
                                }}
                                className="w-full h-7 rounded cursor-pointer p-0.5 border"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Background Image Options (F-075, F-076) */}
                      {getStyleVal(selectedElement, "backgroundType", activeBreakpointId, breakpoints) === "image" && (
                        <div className="space-y-3.5">
                          <div>
                            {renderResponsiveLabel("Image URL", "backgroundImageUrl")}
                            <input
                              type="text"
                              value={getStyleVal(selectedElement, "backgroundImageUrl", activeBreakpointId, breakpoints) || ""}
                              onChange={(e) => updateSelectedStyle("backgroundImageUrl", e.target.value)}
                              placeholder="https://..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>

                          <div>
                            {renderResponsiveLabel("Position", "backgroundPosition")}
                            <select
                              value={getStyleVal(selectedElement, "backgroundPosition", activeBreakpointId, breakpoints) || "center center"}
                              onChange={(e) => updateSelectedStyle("backgroundPosition", e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                            >
                              <option value="center center">Center Center</option>
                              <option value="top left">Top Left</option>
                              <option value="top right">Top Right</option>
                              <option value="bottom left">Bottom Left</option>
                              <option value="bottom right">Bottom Right</option>
                            </select>
                          </div>

                          <div>
                            {renderResponsiveLabel("Repeat", "backgroundRepeat")}
                            <select
                              value={getStyleVal(selectedElement, "backgroundRepeat", activeBreakpointId, breakpoints) || "no-repeat"}
                              onChange={(e) => updateSelectedStyle("backgroundRepeat", e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                            >
                              <option value="no-repeat">No Repeat</option>
                              <option value="repeat">Repeat Both</option>
                              <option value="repeat-x">Repeat Horizontal</option>
                              <option value="repeat-y">Repeat Vertical</option>
                            </select>
                          </div>

                          <div>
                            {renderResponsiveLabel("Size", "backgroundSize")}
                            <select
                              value={getStyleVal(selectedElement, "backgroundSize", activeBreakpointId, breakpoints) || "cover"}
                              onChange={(e) => updateSelectedStyle("backgroundSize", e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                            >
                              <option value="cover">Cover (Fill)</option>
                              <option value="contain">Contain (Fit)</option>
                              <option value="auto">Auto</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Video Background (F-077) */}
                      {getStyleVal(selectedElement, "backgroundType", activeBreakpointId, breakpoints) === "video" && (
                        <div className="space-y-3">
                          <div>
                            {renderResponsiveLabel("Video MP4 URL", "backgroundVideoUrl")}
                            <input
                              type="text"
                              value={getStyleVal(selectedElement, "backgroundVideoUrl", activeBreakpointId, breakpoints) || ""}
                              onChange={(e) => updateSelectedStyle("backgroundVideoUrl", e.target.value)}
                              placeholder="https://.../video.mp4"
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>

                          <div>
                            {renderResponsiveLabel("Video Opacity (%)", "backgroundVideoOpacity")}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={getStyleVal(selectedElement, "backgroundVideoOpacity", activeBreakpointId, breakpoints) || "50"}
                              onChange={(e) => updateSelectedStyle("backgroundVideoOpacity", e.target.value)}
                              className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                            />
                            <div className="text-right text-[10px] font-bold text-slate-400 mt-1">
                              {getStyleVal(selectedElement, "backgroundVideoOpacity", activeBreakpointId, breakpoints) || "50"}%
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Slideshow (F-078) */}
                      {getStyleVal(selectedElement, "backgroundType", activeBreakpointId, breakpoints) === "slideshow" && (
                        <div className="space-y-3">
                          <div>
                            {renderResponsiveLabel("Image URLs (Comma separated)", "backgroundSlideshowUrls")}
                            <textarea
                              rows={3}
                              value={getStyleVal(selectedElement, "backgroundSlideshowUrls", activeBreakpointId, breakpoints) || ""}
                              onChange={(e) => updateSelectedStyle("backgroundSlideshowUrls", e.target.value)}
                              placeholder="https://img1.jpg, https://img2.jpg"
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>

                          <div>
                            {renderResponsiveLabel("Transition Delay (sec)", "backgroundSlideshowSpeed")}
                            <input
                              type="number"
                              min="2"
                              value={getStyleVal(selectedElement, "backgroundSlideshowSpeed", activeBreakpointId, breakpoints) || "5"}
                              onChange={(e) => updateSelectedStyle("backgroundSlideshowSpeed", e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 5. Borders & Corners (F-079, F-080) */}
                  {renderAccordion("Borders & Corner styling", "borders", (
                    <div className="space-y-3.5">
                      <div>
                        {renderResponsiveLabel("Border Style", "borderStyle")}
                        <select
                          value={getStyleVal(selectedElement, "borderStyle", activeBreakpointId, breakpoints) || "none"}
                          onChange={(e) => updateSelectedStyle("borderStyle", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="none">None</option>
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                          <option value="double">Double</option>
                        </select>
                      </div>

                      {getStyleVal(selectedElement, "borderStyle", activeBreakpointId, breakpoints) !== "none" && getStyleVal(selectedElement, "borderStyle", activeBreakpointId, breakpoints) !== undefined && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            {renderResponsiveLabel("Width", "borderWidth")}
                            <input
                              type="text"
                              value={getStyleVal(selectedElement, "borderWidth", activeBreakpointId, breakpoints) || "1px"}
                              onChange={(e) => updateSelectedStyle("borderWidth", e.target.value.endsWith("px") ? e.target.value : `${e.target.value}px`)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                            />
                          </div>
                          <div>
                            {renderResponsiveLabel("Color", "borderColor")}
                            <input
                              type="color"
                              value={getStyleVal(selectedElement, "borderColor", activeBreakpointId, breakpoints) || "#cbd5e1"}
                              onChange={(e) => updateSelectedStyle("borderColor", e.target.value)}
                              className="w-full h-8 cursor-pointer rounded border p-0.5"
                            />
                          </div>
                        </div>
                      )}

                      {/* Border Corner Radius (F-080) */}
                      <div>
                        {renderResponsiveLabel("Corner Roundness (px)", "borderRadius")}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={parseInt(getStyleVal(selectedElement, "borderRadius", activeBreakpointId, breakpoints) || "8")}
                          onChange={(e) => updateSelectedStyle("borderRadius", `${e.target.value}px`)}
                          className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                        <div className="text-right text-[10px] font-bold text-slate-400 mt-1">
                          {parseInt(getStyleVal(selectedElement, "borderRadius", activeBreakpointId, breakpoints) || "8")}px
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 6. Shadows (F-081, F-093) */}
                  {renderAccordion("Shadow Effects", "shadows", (
                    <div className="space-y-3.5">
                      <div>
                        {renderResponsiveLabel("Box Shadow Preset", "boxShadow")}
                        <select
                          value={getStyleVal(selectedElement, "boxShadow", activeBreakpointId, breakpoints) || "none"}
                          onChange={(e) => updateSelectedStyle("boxShadow", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="none">No Shadow</option>
                          <option value="sm">Small Shadow</option>
                          <option value="md">Medium Shadow</option>
                          <option value="lg">Large Shadow</option>
                          <option value="xl">Extra Large Shadow</option>
                          <option value="inner">Inner Shadow</option>
                        </select>
                      </div>

                      {/* Text Shadow Preset (F-093) */}
                      {selectedElement.type !== "image" && (
                        <div>
                          {renderResponsiveLabel("Text Shadow Preset", "textShadow")}
                          <select
                            value={getStyleVal(selectedElement, "textShadow", activeBreakpointId, breakpoints) || "none"}
                            onChange={(e) => updateSelectedStyle("textShadow", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          >
                            <option value="none">No Text Shadow</option>
                            <option value="subtle">Subtle Shadow</option>
                            <option value="medium">Medium Shadow</option>
                            <option value="hard">Hard Drop Shadow</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 7. Opacity, Blend & Filters (F-082, F-083, F-084, F-085, F-086, F-092) */}
                  {renderAccordion("Filters, Transform & Masks", "effects", (
                    <div className="space-y-4">
                      {/* Opacity (F-082) */}
                      <div>
                        {renderResponsiveLabel("Opacity (%)", "opacity")}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={getStyleVal(selectedElement, "opacity", activeBreakpointId, breakpoints) || "100"}
                          onChange={(e) => updateSelectedStyle("opacity", e.target.value)}
                          className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                        <div className="text-right text-[10px] font-bold text-slate-400 mt-1">
                          {getStyleVal(selectedElement, "opacity", activeBreakpointId, breakpoints) || "100"}%
                        </div>
                      </div>

                      {/* Mix Blend Mode (F-083) */}
                      <div>
                        {renderResponsiveLabel("Blend Mode", "mixBlendMode")}
                        <select
                          value={getStyleVal(selectedElement, "mixBlendMode", activeBreakpointId, breakpoints) || "normal"}
                          onChange={(e) => updateSelectedStyle("mixBlendMode", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="normal">Normal</option>
                          <option value="multiply">Multiply</option>
                          <option value="screen">Screen</option>
                          <option value="overlay">Overlay</option>
                          <option value="darken">Darken</option>
                          <option value="lighten">Lighten</option>
                          <option value="color-dodge">Color Dodge</option>
                          <option value="difference">Difference</option>
                        </select>
                      </div>

                      {/* Clip Path Shapes (F-085) */}
                      <div>
                        {renderResponsiveLabel("Clip Path Mask", "clipPath")}
                        <select
                          value={getStyleVal(selectedElement, "clipPath", activeBreakpointId, breakpoints) || "none"}
                          onChange={(e) => updateSelectedStyle("clipPath", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="none">No Mask Shape</option>
                          <option value="circle(50% at 50% 50%)">Circle</option>
                          <option value="polygon(50% 0%, 0% 100%, 100% 100%)">Triangle</option>
                          <option value="polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)">Star</option>
                          <option value="polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)">Hexagon</option>
                          <option value="polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)">Message Bubble</option>
                        </select>
                      </div>

                      {/* CSS Filters (F-084) */}
                      <div className="space-y-3 pt-2.5 border-t border-slate-100">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">CSS Filters</span>
                        
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Blur (px)</label>
                          <input
                            type="range"
                            min="0"
                            max="20"
                            value={getStyleVal(selectedElement, "filterBlur", activeBreakpointId, breakpoints) || "0"}
                            onChange={(e) => updateSelectedStyle("filterBlur", e.target.value)}
                            className="w-full accent-blue-600 h-1 bg-slate-200 rounded"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Grayscale (%)</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={getStyleVal(selectedElement, "filterGrayscale", activeBreakpointId, breakpoints) || "0"}
                            onChange={(e) => updateSelectedStyle("filterGrayscale", e.target.value)}
                            className="w-full accent-blue-600 h-1 bg-slate-200 rounded"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Brightness (%)</label>
                          <input
                            type="range"
                            min="50"
                            max="150"
                            value={getStyleVal(selectedElement, "filterBrightness", activeBreakpointId, breakpoints) || "100"}
                            onChange={(e) => updateSelectedStyle("filterBrightness", e.target.value)}
                            className="w-full accent-blue-600 h-1 bg-slate-200 rounded"
                          />
                        </div>
                      </div>

                      {/* CSS Transform (F-086) */}
                      <div className="space-y-3 pt-2.5 border-t border-slate-100">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">CSS Transform</span>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
                          <div>
                            <span>Rotate (deg)</span>
                            <input
                              type="number"
                              value={parseInt(getStyleVal(selectedElement, "transformRotate", activeBreakpointId, breakpoints) || "0")}
                              onChange={(e) => updateSelectedStyle("transformRotate", `${e.target.value}`)}
                              className="w-full border rounded px-1.5 py-0.5 text-xs text-slate-700"
                            />
                          </div>
                          <div>
                            <span>Scale</span>
                            <input
                              type="number"
                              step="0.1"
                              value={parseFloat(getStyleVal(selectedElement, "transformScale", activeBreakpointId, breakpoints) || "1")}
                              onChange={(e) => updateSelectedStyle("transformScale", `${e.target.value}`)}
                              className="w-full border rounded px-1.5 py-0.5 text-xs text-slate-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Ken Burns Effect (F-092) */}
                      {selectedElement.type === "image" && (
                        <div className="pt-2 border-t border-slate-100">
                          {renderResponsiveLabel("Ken Burns Effect", "kenBurnsEffect")}
                          <select
                            value={getStyleVal(selectedElement, "kenBurnsEffect", activeBreakpointId, breakpoints) || "none"}
                            onChange={(e) => updateSelectedStyle("kenBurnsEffect", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          >
                            <option value="none">Disabled</option>
                            <option value="zoom-in">Slow Zoom In</option>
                            <option value="zoom-out">Slow Zoom Out</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 8. Text Stroke & Mask (F-087, F-088) */}
                  {selectedElement.type !== "image" && renderAccordion("Text Outlines & Masks", "textStroke", (
                    <div className="space-y-3.5">
                      {/* Stroke Width & Color (F-087) */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          {renderResponsiveLabel("Stroke (px)", "textStrokeWidth")}
                          <input
                            type="number"
                            min="0"
                            value={parseInt(getStyleVal(selectedElement, "textStrokeWidth", activeBreakpointId, breakpoints) || "0")}
                            onChange={(e) => updateSelectedStyle("textStrokeWidth", `${e.target.value}`)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          {renderResponsiveLabel("Stroke Color", "textStrokeColor")}
                          <input
                            type="color"
                            value={getStyleVal(selectedElement, "textStrokeColor", activeBreakpointId, breakpoints) || "#000000"}
                            onChange={(e) => updateSelectedStyle("textStrokeColor", e.target.value)}
                            className="w-full h-8 cursor-pointer rounded border p-0.5"
                          />
                        </div>
                      </div>

                      {/* Text Mask Gradient / Image (F-088) */}
                      <div>
                        {renderResponsiveLabel("Text Clipping Effect", "textMaskType")}
                        <select
                          value={getStyleVal(selectedElement, "textMaskType", activeBreakpointId, breakpoints) || "none"}
                          onChange={(e) => updateSelectedStyle("textMaskType", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="none">None (Solid Color)</option>
                          <option value="gradient">Gradient Text</option>
                          <option value="image">Image Clipped Text</option>
                        </select>
                      </div>

                      {getStyleVal(selectedElement, "textMaskType", activeBreakpointId, breakpoints) === "gradient" && (
                        <div>
                          {renderResponsiveLabel("Gradient Mask Code", "textMaskGradient")}
                          <input
                            type="text"
                            defaultValue="linear-gradient(45deg, #3b82f6, #10b981)"
                            onChange={(e) => updateSelectedStyle("textMaskGradient", e.target.value)}
                            placeholder="linear-gradient(...)"
                            className="w-full rounded border p-1 text-xs font-mono"
                          />
                        </div>
                      )}

                      {getStyleVal(selectedElement, "textMaskType", activeBreakpointId, breakpoints) === "image" && (
                        <div>
                          {renderResponsiveLabel("Mask Image URL", "textMaskImage")}
                          <input
                            type="text"
                            value={getStyleVal(selectedElement, "textMaskImage", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("textMaskImage", e.target.value)}
                            placeholder="https://..."
                            className="w-full rounded border p-1 text-xs font-mono"
                          />
                        </div>
                      )}

                      {/* Text Path Curve (F-090) */}
                      {selectedElement.type === "heading" && (
                        <div className="pt-2 border-t border-slate-100">
                          {renderResponsiveLabel("Curved Text Path", "textPathEnabled")}
                          <select
                            value={getStyleVal(selectedElement, "textPathEnabled", activeBreakpointId, breakpoints) || "false"}
                            onChange={(e) => updateSelectedStyle("textPathEnabled", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          >
                            <option value="false">Standard Straight Text</option>
                            <option value="true">Render on SVG Wave Curve</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 9. Shape Dividers (F-091) */}
                  {selectedElement.type === "container" && renderAccordion("Shape Dividers (Borders)", "divider", (
                    <div className="space-y-4">
                      {/* Top Divider */}
                      <div className="space-y-2 border-b border-slate-100 pb-2">
                        <label className="flex items-center gap-2 font-bold text-[10px] text-slate-500">
                          <input
                            type="checkbox"
                            checked={getStyleVal(selectedElement, "dividerTopEnabled", activeBreakpointId, breakpoints) === "true"}
                            onChange={(e) => updateSelectedStyle("dividerTopEnabled", e.target.checked ? "true" : "false")}
                            className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                          />
                          ENABLE TOP SHAPE DIVIDER
                        </label>
                        
                        {getStyleVal(selectedElement, "dividerTopEnabled", activeBreakpointId, breakpoints) === "true" && (
                          <div className="space-y-2 pt-1.5">
                            <select
                              value={getStyleVal(selectedElement, "dividerTopStyle", activeBreakpointId, breakpoints) || "waves"}
                              onChange={(e) => updateSelectedStyle("dividerTopStyle", e.target.value)}
                              className="w-full rounded border p-1 text-xs"
                            >
                              <option value="waves">Waves</option>
                              <option value="curves">Curves</option>
                              <option value="slant">Slant</option>
                              <option value="triangle">Triangle</option>
                            </select>
                            
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={getStyleVal(selectedElement, "dividerTopColor", activeBreakpointId, breakpoints) || "#ffffff"}
                                onChange={(e) => updateSelectedStyle("dividerTopColor", e.target.value)}
                                className="w-10 h-7 rounded border cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                placeholder="Height e.g. 50px"
                                value={getStyleVal(selectedElement, "dividerTopHeight", activeBreakpointId, breakpoints) || "50px"}
                                onChange={(e) => updateSelectedStyle("dividerTopHeight", e.target.value.endsWith("px") ? e.target.value : `${e.target.value}px`)}
                                className="w-full border rounded px-2 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Divider */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 font-bold text-[10px] text-slate-500">
                          <input
                            type="checkbox"
                            checked={getStyleVal(selectedElement, "dividerBottomEnabled", activeBreakpointId, breakpoints) === "true"}
                            onChange={(e) => updateSelectedStyle("dividerBottomEnabled", e.target.checked ? "true" : "false")}
                            className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                          />
                          ENABLE BOTTOM DIVIDER
                        </label>
                        
                        {getStyleVal(selectedElement, "dividerBottomEnabled", activeBreakpointId, breakpoints) === "true" && (
                          <div className="space-y-2 pt-1.5">
                            <select
                              value={getStyleVal(selectedElement, "dividerBottomStyle", activeBreakpointId, breakpoints) || "waves"}
                              onChange={(e) => updateSelectedStyle("dividerBottomStyle", e.target.value)}
                              className="w-full rounded border p-1 text-xs"
                            >
                              <option value="waves">Waves</option>
                              <option value="curves">Curves</option>
                              <option value="slant">Slant</option>
                              <option value="triangle">Triangle</option>
                            </select>
                            
                            <div className="flex gap-2">
                              <input
                                type="color"
                                value={getStyleVal(selectedElement, "dividerBottomColor", activeBreakpointId, breakpoints) || "#ffffff"}
                                onChange={(e) => updateSelectedStyle("dividerBottomColor", e.target.value)}
                                className="w-10 h-7 rounded border cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                placeholder="Height e.g. 50px"
                                value={getStyleVal(selectedElement, "dividerBottomHeight", activeBreakpointId, breakpoints) || "50px"}
                                onChange={(e) => updateSelectedStyle("dividerBottomHeight", e.target.value.endsWith("px") ? e.target.value : `${e.target.value}px`)}
                                className="w-full border rounded px-2 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Global Settings & Site Identity Panel (F-066 to F-101) */
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-600">
                      Global Settings & Identity
                    </span>
                  </div>

                  {/* F-101 Site Identity */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                      Site Identity & Metadata
                    </h3>
                    
                    <div>
                      <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Site Name</label>
                      <input
                        type="text"
                        value={globalSettings.siteIdentity?.name || ""}
                        onChange={(e) => setGlobalSettings((prev: any) => ({
                          ...prev,
                          siteIdentity: { ...prev.siteIdentity, name: e.target.value }
                        }))}
                        className="w-full rounded border px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSampleColor((hex) => updateSelectedStyle("color", hex))}
                        title="Sample Color from Screen / Image"
                        className="h-8 px-2 rounded border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-1 shrink-0"
                      >
                        <span>🧪</span>
                        <span className="text-[10px]">Sample</span>
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-600 font-semibold block mb-0.5">Description (SEO)</label>
                      <textarea
                        rows={2}
                        value={globalSettings.siteIdentity?.description || ""}
                        onChange={(e) => setGlobalSettings((prev: any) => ({
                          ...prev,
                          siteIdentity: { ...prev.siteIdentity, description: e.target.value }
                        }))}
                        className="w-full rounded border px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSampleColor((hex) => updateSelectedStyle("backgroundColor", hex))}
                        title="Sample Color from Screen / Image"
                        className="h-8 px-2 rounded border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-slate-700 hover:text-blue-600 transition flex items-center gap-1 shrink-0"
                      >
                        <span>🧪</span>
                        <span className="text-[10px]">Sample</span>
                      </button>
                    </div>
                  </div>

                  {/* F-067 Global Variables Color Palette */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                        Global Color Palette
                      </h3>
                      <label className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                        <input
                          type="checkbox"
                          checked={globalSettings.globalStyles?.enableDefaultColors}
                          onChange={(e) => setGlobalSettings((prev: any) => ({
                            ...prev,
                            globalStyles: { ...prev.globalStyles, enableDefaultColors: e.target.checked }
                          }))}
                          className="rounded h-3 w-3"
                        />
                        Active
                      </label>
                    </div>

                    {globalSettings.globalStyles?.enableDefaultColors && (
                      <div className="space-y-2">
                        {/* Primary Color */}
                        <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-600">
                          <span>Primary (Brand)</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={globalSettings.colors?.primary || "#2563eb"}
                              onChange={(e) => setGlobalSettings((prev: any) => ({
                                ...prev,
                                colors: { ...prev.colors, primary: e.target.value }
                              }))}
                              className="w-7 h-5 rounded cursor-pointer"
                            />
                            <span className="font-mono text-[9px] font-bold text-slate-400">{globalSettings.colors?.primary}</span>
                          </div>
                        </div>

                        {/* Secondary Color */}
                        <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-600">
                          <span>Secondary (Text/UI)</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={globalSettings.colors?.secondary || "#475569"}
                              onChange={(e) => setGlobalSettings((prev: any) => ({
                                ...prev,
                                colors: { ...prev.colors, secondary: e.target.value }
                              }))}
                              className="w-7 h-5 rounded cursor-pointer"
                            />
                            <span className="font-mono text-[9px] font-bold text-slate-400">{globalSettings.colors?.secondary}</span>
                          </div>
                        </div>

                        {/* Accent Color */}
                        <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-600">
                          <span>Accent (CTA)</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={globalSettings.colors?.accent || "#10b981"}
                              onChange={(e) => setGlobalSettings((prev: any) => ({
                                ...prev,
                                colors: { ...prev.colors, accent: e.target.value }
                              }))}
                              className="w-7 h-5 rounded cursor-pointer"
                            />
                            <span className="font-mono text-[9px] font-bold text-slate-400">{globalSettings.colors?.accent}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* F-070 Global Fonts Defaults */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                        Global Fonts Defaults
                      </h3>
                      <label className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                        <input
                          type="checkbox"
                          checked={globalSettings.globalStyles?.enableDefaultFonts}
                          onChange={(e) => setGlobalSettings((prev: any) => ({
                            ...prev,
                            globalStyles: { ...prev.globalStyles, enableDefaultFonts: e.target.checked }
                          }))}
                          className="rounded h-3 w-3"
                        />
                        Active
                      </label>
                    </div>

                    {globalSettings.globalStyles?.enableDefaultFonts && (
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">HEADING FONT FAMILY</label>
                          <select
                            value={globalSettings.fonts?.heading || "Inter"}
                            onChange={(e) => setGlobalSettings((prev: any) => ({
                              ...prev,
                              fonts: { ...prev.fonts, heading: e.target.value }
                            }))}
                            className="w-full rounded border px-2 py-1 text-xs"
                          >
                            <option value="Inter">Inter (Sans-serif)</option>
                            <option value="Outfit">Outfit (Display)</option>
                            <option value="Playfair Display">Playfair Display (Serif)</option>
                            <option value="Montserrat">Montserrat</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">BODY FONT FAMILY</label>
                          <select
                            value={globalSettings.fonts?.body || "Inter"}
                            onChange={(e) => setGlobalSettings((prev: any) => ({
                              ...prev,
                              fonts: { ...prev.fonts, body: e.target.value }
                            }))}
                            className="w-full rounded border px-2 py-1 text-xs"
                          >
                            <option value="Inter">Inter (Sans-serif)</option>
                            <option value="Roboto">Roboto</option>
                            <option value="sans-serif">System Sans</option>
                          </select>
                        </div>

                        {/* Extracted Image Color Palette (F-034) */}
                        {extractedColors.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Extracted Colors
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSampleColor((hex) => updateSelectedStyle("backgroundColor", hex))}
                                className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <span>🧪</span> Sample Screen
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {extractedColors.map((hex, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => updateSelectedStyle("backgroundColor", hex)}
                                  title={`Apply extracted color ${hex}`}
                                  className="h-6 w-6 rounded-full border border-slate-300 shadow-xs hover:scale-110 transition shrink-0"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* F-094 Global Layout */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                      Global Layout Width
                    </h3>
                    
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">SITE MAX WIDTH</label>
                      <select
                        value={globalSettings.globalStyles?.siteMaxWidth || "1200px"}
                        onChange={(e) => setGlobalSettings((prev: any) => ({
                          ...prev,
                          globalStyles: { ...prev.globalStyles, siteMaxWidth: e.target.value }
                        }))}
                        className="w-full rounded border px-2 py-1 text-xs"
                      >
                        <option value="1200px">1200px (Default)</option>
                        <option value="1400px">1400px (Wide)</option>
                        <option value="1600px">1600px (UltraWide)</option>
                        <option value="100%">100% (Fluid Layout)</option>
                      </select>
                    </div>
                  </div>

                  {/* F-095 Lightbox Defaults */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                      Global Lightbox Controls
                    </h3>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={globalSettings.lightboxSettings?.enableLightbox}
                        onChange={(e) => setGlobalSettings((prev: any) => ({
                          ...prev,
                          lightboxSettings: { ...prev.lightboxSettings, enableLightbox: e.target.checked }
                        }))}
                        className="rounded h-4.5 w-4.5 text-blue-600"
                      />
                      Enable Click-to-Zoom Images
                    </label>

                    {globalSettings.lightboxSettings?.enableLightbox && (
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase">LIGHTBOX BACKGROUND STYLE</label>
                        <select
                          value={globalSettings.lightboxSettings?.lightboxTheme || "dark"}
                          onChange={(e) => setGlobalSettings((prev: any) => ({
                            ...prev,
                            lightboxSettings: { ...prev.lightboxSettings, lightboxTheme: e.target.value }
                          }))}
                          className="w-full rounded border px-2 py-0.5 text-xs"
                        >
                          <option value="dark">Translucent Dark Navy</option>
                          <option value="light">Translucent Light Glass</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* F-066 Global Stylesheet Custom CSS */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                      Global Stylesheet (CSS)
                    </h3>
                    
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase">CUSTOM CSS CODE RULES</label>
                      <textarea
                        rows={6}
                        value={globalSettings.customCss || ""}
                        onChange={(e) => setGlobalSettings((prev: any) => ({
                          ...prev,
                          customCss: e.target.value
                        }))}
                        placeholder=".card-hover:hover { transform: translateY(-4px); }"
                        className="w-full rounded border p-2 text-xs font-mono bg-white outline-none focus:border-blue-500 leading-normal"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Full Screen Image Lightbox Modal Overlay (F-095) */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md transition-opacity duration-300 cursor-zoom-out ${
            globalSettings?.lightboxSettings?.lightboxTheme === "light" 
              ? "bg-white/80 text-slate-800" 
              : "bg-slate-950/80 text-white"
          }`}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full hover:bg-slate-800/10 dark:hover:bg-white/10 transition"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxImage}
            alt="Expanded Zoom"
            className="max-h-[90vh] max-w-full object-contain rounded-xl shadow-2xl animate-scale-up"
          />
        </div>
      )}

      {/* ========================================== */}
      {/* Breakpoint Manager Modal                   */}
      {/* ========================================== */}
      {isBpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-slate-950/40 p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <h3 className="text-sm font-bold text-slate-800">Custom Breakpoint Settings</h3>
              </div>
              <button
                onClick={() => setIsBpModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Visual Flow Indicator */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">Inheritance Cascade Flow</h4>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-600 font-bold">
                <div className={`px-2 py-1 rounded border transition ${breakpoints.find(b => b.id === "widescreen")?.active ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 text-slate-400 border-dashed"}`}>
                  Widescreen
                </div>
                <span>←</span>
                <div className={`px-2 py-1 rounded border transition ${breakpoints.find(b => b.id === "laptop")?.active ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 text-slate-400 border-dashed"}`}>
                  Laptop
                </div>
                <span>←</span>
                <div className="px-2.5 py-1.5 rounded border-2 border-blue-500 bg-blue-50 text-blue-700">
                  Desktop (Base)
                </div>
                <span>→</span>
                <div className={`px-2 py-1 rounded border transition ${breakpoints.find(b => b.id === "tabletExtra")?.active ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 text-slate-400 border-dashed"}`}>
                  Tablet Extra
                </div>
                <span>→</span>
                <div className={`px-2 py-1 rounded border transition ${breakpoints.find(b => b.id === "tablet")?.active ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 text-slate-400 border-dashed"}`}>
                  Tablet
                </div>
                <span>→</span>
                <div className={`px-2 py-1 rounded border transition ${breakpoints.find(b => b.id === "mobileExtra")?.active ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 text-slate-400 border-dashed"}`}>
                  Mobile Extra
                </div>
                <span>→</span>
                <div className={`px-2 py-1 rounded border transition ${breakpoints.find(b => b.id === "mobile")?.active ? "bg-white border-slate-200" : "bg-slate-100 border-slate-200 text-slate-400 border-dashed"}`}>
                  Mobile
                </div>
              </div>
              <p className="mt-2.5 text-[10px] text-slate-400 text-center leading-relaxed">
                Breakpoints inherit styles from parent devices pointing towards Desktop (Base). Activating them adds them to your viewport switcher.
              </p>
            </div>

            {/* Form list */}
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 px-2">
                <span className="col-span-5">Breakpoint Device</span>
                <span className="col-span-2 text-center">Status</span>
                <span className="col-span-3 text-center">Width (px)</span>
                <span className="col-span-2 text-right">Action</span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {breakpoints.map((bp) => {
                  const isBase = bp.id === "desktop";
                  return (
                    <div
                      key={bp.id}
                      className={`grid grid-cols-12 items-center gap-2 rounded-xl p-2.5 transition border ${
                        bp.active ? "bg-white border-slate-200" : "bg-slate-50/50 border-slate-100"
                      }`}
                    >
                      <div className="col-span-5 flex items-center gap-2">
                        <span className={`text-xs font-bold ${bp.active ? "text-slate-800" : "text-slate-400"}`}>
                          {bp.name}
                        </span>
                        {isBase && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">
                            Base
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 flex justify-center">
                        <button
                          type="button"
                          disabled={isBase}
                          onClick={() => handleToggleBreakpoint(bp.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${
                            bp.active ? "bg-blue-600" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              bp.active ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="col-span-3 flex justify-center">
                        <input
                          type="number"
                          disabled={!bp.active}
                          value={bp.width}
                          onChange={(e) => handleWidthChange(bp.id, parseInt(e.target.value) || 0)}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 disabled:opacity-40 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="col-span-2 flex justify-end">
                        <span className="text-[11px] font-medium text-slate-400">
                          {bp.width > 1024 ? "Desktop Up" : isBase ? "Default" : "Desktop Down"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Spacing Controls for non-container elements */}
                {selectedElement.type !== "container" && (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Advanced Spacing
                    </h3>
                    {render4SideSpacingControl("Margin", "margin", isMarginLinked, setIsMarginLinked)}
                    {render4SideSpacingControl("Padding", "padding", isPaddingLinked, setIsPaddingLinked)}
                  </div>
                )}

                {/* Background & Border Controls */}
                {renderBackgroundAndBorderControls()}

                {/* Positioning & Layering Controls */}
                {renderPositioningControls()}
              </div>
            ) : (
              /* Page Settings Section (F-018 & F-019) */
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-blue-600 flex items-center gap-1.5">
                    <span>📄</span>
                    <span>PAGE SETTINGS</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configure page-level properties & SEO settings.
                  </p>
                </div>

                {/* Maintenance Mode Toggle (F-019) */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                      <span>🛠️</span>
                      <span>Maintenance Mode</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={!!pageSettings.isMaintenanceMode}
                      onChange={(e) => setPageSettings((prev) => ({ ...prev, isMaintenanceMode: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Show temporary maintenance state to public visitors & preview while editing.
                  </p>
                  {pageSettings.isMaintenanceMode && (
                    <span className="inline-block rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Active — Site displays Maintenance Notice
                    </span>
                  )}
                </div>

                {/* Page Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={pageSettings.title || ""}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Home"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meta Description (SEO)
                  </label>
                  <textarea
                    rows={3}
                    value={pageSettings.description || ""}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Page SEO description..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Page Path / URL Slug */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL Path Slug
                  </label>
                  <input
                    type="text"
                    value={pageSettings.path || "/"}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, path: e.target.value }))}
                    placeholder="/"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Site / Website Published Language (F-022) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>{t("siteLang", "Site Language (Published)")}</span>
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">HTML lang</span>
                  </label>
                  <select
                    value={pageSettings.siteLanguage || "en"}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, siteLanguage: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                    <option value="it">Italian (it)</option>
                    <option value="ja">Japanese (ja)</option>
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Controls published HTML website language. Completely independent from Editor UI language.
                  </p>
                </div>

                {/* Page Canvas Background Color */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Page Canvas Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pageSettings.backgroundColor || "#ffffff"}
                      onChange={(e) => setPageSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={pageSettings.backgroundColor || "#ffffff"}
                      onChange={(e) => setPageSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Custom Head Script/Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Head Tags / Scripts
                  </label>
                  <textarea
                    rows={3}
                    value={pageSettings.customHead || ""}
                    onChange={(e) => setPageSettings((prev) => ({ ...prev, customHead: e.target.value }))}
                    placeholder="<meta name='keywords' content='builder' />"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Temporary Support Credentials (F-020) */}
                <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3 pt-3">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🔐</span>
                      <span>Temporary Support Access</span>
                    </label>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      2-Hr Limit
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    Generate temporary, time-limited credentials for support troubleshooting without sharing your password.
                  </p>

                  {supportToken ? (
                    <div className="space-y-2 rounded-lg border border-purple-200 bg-white p-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Support Token:</span>
                        <span className="text-purple-600 font-bold">Expires ~{supportExpiresAt}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={supportToken}
                          className="w-full rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (supportToken) {
                              navigator.clipboard.writeText(supportToken);
                              setSupportCopied(true);
                              setTimeout(() => setSupportCopied(false), 2000);
                            }
                          }}
                          className="rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-purple-700 transition shrink-0"
                        >
                          {supportCopied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {supportMessage && (
                    <p className="text-[11px] font-semibold text-purple-700">{supportMessage}</p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isGeneratingToken}
                      onClick={handleGenerateSupportToken}
                      className="flex-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 transition"
                    >
                      {isGeneratingToken ? "Generating..." : "Generate Support Token"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRevokeSupportTokens}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                      title="Revoke active support credentials"
                    >
                      Revoke
                    </button>
                  </div>
                </div>

                {/* Editor User Preferences (F-026) */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>Editor User Preferences</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Persistent
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {/* Auto Save Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">⚡ Auto-Save Drafts</span>
                      <input
                        type="checkbox"
                        checked={userPreferences.autoSaveEnabled}
                        onChange={(e) => updatePreference("autoSaveEnabled", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Canvas Grid Alignment Overlay Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">📐 Canvas Alignment Grid</span>
                      <input
                        type="checkbox"
                        checked={userPreferences.gridOverlay}
                        onChange={(e) => updatePreference("gridOverlay", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Header Toolbar Theme Switch */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-slate-700">🎨 Header Toolbar Theme</span>
                      <button
                        type="button"
                        onClick={() => updatePreference("themeMode", userPreferences.themeMode === "dark" ? "light" : "dark")}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm transition"
                      >
                        {userPreferences.themeMode === "dark" ? "🌙 Dark Navy" : "☀️ Light Modern"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Contextual Action Menu Overlay (F-010) */}
      {contextMenu && !isPreview && (
        <div
          style={{
            top: `${Math.min(contextMenu.y, window.innerHeight - 260)}px`,
            left: `${Math.min(contextMenu.x, window.innerWidth - 190)}px`,
          }}
          className="fixed z-50 min-w-[170px] rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-1.5 shadow-xl text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Element Actions
          </div>
          <button
            onClick={() => {
              handleReorderElement(contextMenu.elementId, "up");
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Move Up</span>
            <span className="text-[10px] text-slate-400">▲</span>
          </button>
          <button
            onClick={() => {
              handleReorderElement(contextMenu.elementId, "down");
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Move Down</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={(e) => {
              handleCopyElement(contextMenu.elementId, e);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Copy</span>
            <span className="text-[10px] text-slate-400">Ctrl+C</span>
          </button>
          <button
            onClick={(e) => {
              handleCopyStyle(contextMenu.elementId, e);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Copy Style</span>
            <span className="text-[10px]">🎨</span>
          </button>
          {copiedStyles && (
            <button
              onClick={(e) => {
                handlePasteStyle(contextMenu.elementId, e);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-emerald-50 text-emerald-600 font-bold transition"
            >
              <span>Paste Style</span>
              <span className="text-[10px]">🖌️</span>
            </button>
          )}
          <button
            onClick={(e) => {
              handleDuplicateElement(contextMenu.elementId, e);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <span>Duplicate</span>
            <span className="text-[10px] text-slate-400">Ctrl+D</span>
          </button>
          <button
            onClick={() => {
              handleSaveAsComponent(contextMenu.elementId);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-purple-50 text-purple-700 transition"
          >
            <span>Save as Comp</span>
            <span className="text-[10px]">🧩</span>
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={(e) => {
              handleDeleteElement(contextMenu.elementId, e);
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-red-50 text-red-600 transition"
          >
            <span>Delete</span>
            <span className="text-[10px] text-red-400">✕</span>
          </button>
        </div>
      )}

      {/* Finder Command Palette Modal (F-027) */}
      {isFinderOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-20 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Search Header Input */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 bg-slate-50/50">
              <span className="text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                autoFocus
                value={finderQuery}
                onChange={(e) => setFinderQuery(e.target.value)}
                placeholder="Search pages, templates, settings and features... (Esc to close)"
                className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setIsFinderOpen(false)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 bg-white text-[11px] overflow-x-auto">
              <span className="text-slate-400 font-semibold mr-1">Filter:</span>
              <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 font-medium">Pages</span>
              <span className="rounded-full bg-purple-50 text-purple-600 px-2 py-0.5 font-medium">Templates</span>
              <span className="rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 font-medium">Settings</span>
              <span className="rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 font-medium">Features</span>
            </div>

            {/* Search Results List */}
            <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-50">
              {[
                {
                  id: "page-home",
                  title: "Home Page",
                  category: "page",
                  icon: "📄",
                  description: "Current main landing page route (/)",
                  keywords: "home page index main route",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "page-settings",
                  title: "Page Settings",
                  category: "page",
                  icon: "⚙️",
                  description: "Configure page title, SEO description, URL slug",
                  keywords: "page settings config seo title description slug",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "tpl-hero",
                  title: "Hero Section Template",
                  category: "template",
                  icon: "✨",
                  description: "Header section with title, subtitle & action button",
                  keywords: "hero header template banner section title subtitle button",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("elements");
                    handleAddElement("container");
                  },
                },
                {
                  id: "tpl-features",
                  title: "Features Grid Template",
                  category: "template",
                  icon: "📌",
                  description: "Container block layout for product feature cards",
                  keywords: "features grid template cards layout block container",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("elements");
                    handleAddElement("container");
                  },
                },
                {
                  id: "tpl-cta",
                  title: "Call to Action Template",
                  category: "template",
                  icon: "🚀",
                  description: "Conversion banner block with text and primary button",
                  keywords: "call to action cta template banner button conversion",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("elements");
                    handleAddElement("button");
                  },
                },
                {
                  id: "set-maintenance",
                  title: "Maintenance Mode",
                  category: "setting",
                  icon: "🛠️",
                  description: "Show temporary maintenance state to public visitors",
                  keywords: "maintenance mode public temporary offline state",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "set-sitelang",
                  title: "Site Published Language",
                  category: "setting",
                  icon: "🌐",
                  description: "Set published HTML lang attribute (en, es, fr, de...)",
                  keywords: "site language html lang published website",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "set-editorlang",
                  title: "Editor UI Language",
                  category: "setting",
                  icon: "🗣️",
                  description: "Switch Editor interface language (English, Spanish...)",
                  keywords: "editor language ui interface translate english spanish french german",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                  },
                },
                {
                  id: "set-grid",
                  title: "Canvas Alignment Grid",
                  category: "setting",
                  icon: "📐",
                  description: "Toggle 20px visual layout grid overlay on canvas",
                  keywords: "grid alignment layout overlay canvas guidelines",
                  action: () => {
                    updatePreference("gridOverlay", !userPreferences.gridOverlay);
                  },
                },
                {
                  id: "set-theme",
                  title: "Header Toolbar Theme",
                  category: "setting",
                  icon: "🎨",
                  description: "Switch Header theme between Dark Navy and Light Modern",
                  keywords: "theme dark light header toolbar appearance mode",
                  action: () => {
                    updatePreference("themeMode", userPreferences.themeMode === "dark" ? "light" : "dark");
                  },
                },
                {
                  id: "feat-elements",
                  title: "Elements Palette",
                  category: "feature",
                  icon: "🧱",
                  description: "Browse containers, headings, text, images & buttons",
                  keywords: "elements palette add container heading text image button widgets",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("elements");
                  },
                },
                {
                  id: "feat-navigator",
                  title: "Navigator Layers",
                  category: "feature",
                  icon: "🌳",
                  description: "Visual tree structure hierarchy navigation panel",
                  keywords: "navigator layers tree structure hierarchy elements outline",
                  action: () => {
                    setIsPreview(false);
                    setLeftSidebarTab("navigator");
                  },
                },
                {
                  id: "feat-save",
                  title: "Save Website",
                  category: "feature",
                  icon: "💾",
                  description: "Persist all editor elements & page settings (Ctrl+S)",
                  keywords: "save site website persist publish store ctrl+s",
                  action: () => {
                    handleSave();
                  },
                },
                {
                  id: "feat-preview",
                  title: "Toggle Preview Mode",
                  category: "feature",
                  icon: "👁️",
                  description: "Switch between editing canvas and published site view (Ctrl+P)",
                  keywords: "preview mode view exit preview test ctrl+p",
                  action: () => {
                    setIsPreview(!isPreview);
                  },
                },
                {
                  id: "feat-undo",
                  title: "Undo Action",
                  category: "feature",
                  icon: "↩️",
                  description: "Restore previous canvas state (Ctrl+Z)",
                  keywords: "undo revert history ctrl+z",
                  action: () => {
                    handleUndo();
                  },
                },
                {
                  id: "feat-redo",
                  title: "Redo Action",
                  category: "feature",
                  icon: "↪️",
                  description: "Reapply undone canvas change (Ctrl+Y)",
                  keywords: "redo reapply history ctrl+y",
                  action: () => {
                    handleRedo();
                  },
                },
                {
                  id: "feat-moveup",
                  title: "Move Section Up",
                  category: "feature",
                  icon: "▲",
                  description: "Move selected section upward in page hierarchy (Alt+Up)",
                  keywords: "move section up reorder upward alt+up",
                  action: () => {
                    if (selectedId) handleReorderElement(selectedId, "up");
                  },
                },
                {
                  id: "feat-movedown",
                  title: "Move Section Down",
                  category: "feature",
                  icon: "▼",
                  description: "Move selected section downward in page hierarchy (Alt+Down)",
                  keywords: "move section down reorder downward alt+down",
                  action: () => {
                    if (selectedId) handleReorderElement(selectedId, "down");
                  },
                },
                {
                  id: "feat-support",
                  title: "Temporary Support Token",
                  category: "feature",
                  icon: "🔐",
                  description: "Generate 2-hour temporary support access credential",
                  keywords: "support token access credentials temporary auth troubleshooting",
                  action: () => {
                    setIsPreview(false);
                    setSelectedId(null);
                    handleGenerateSupportToken();
                  },
                },
                {
                  id: "feat-quit",
                  title: "Quit Editor",
                  category: "feature",
                  icon: "🚪",
                  description: "Exit visual editor and return to Dashboard",
                  keywords: "quit exit return dashboard leave back",
                  action: () => {
                    handleQuitEditor();
                  },
                },
              ]
                .filter((item) => {
                  if (!finderQuery.trim()) return true;
                  const q = finderQuery.toLowerCase().trim();
                  return (
                    item.title.toLowerCase().includes(q) ||
                    item.description.toLowerCase().includes(q) ||
                    item.keywords.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q)
                  );
                })
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setIsFinderOpen(false);
                      setFinderQuery("");
                      item.action();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-base shadow-sm group-hover:bg-blue-600 group-hover:text-white transition">
                        {item.icon}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition flex items-center gap-2">
                          <span>{item.title}</span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              item.category === "page"
                                ? "bg-slate-100 text-slate-600"
                                : item.category === "template"
                                ? "bg-purple-100 text-purple-700"
                                : item.category === "setting"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {item.category}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-slate-300 group-hover:text-blue-500 transition font-bold">
                      →
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* Keyboard Shortcuts Help Modal (F-031)      */}
      {/* ========================================== */}
      {isShortcutsHelpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsShortcutsHelpOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">⌨️</span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Keyboard Shortcuts</h3>
                  <p className="text-[11px] text-slate-400">Supported editor actions & key bindings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Shortcuts Content List */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Category 1: Editor Navigation & Canvas */}
              <div>
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <span>🚀</span> Editor & Navigation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Finder Search Palette</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + K</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Save Website</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + S</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Toggle Preview Mode</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + P</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Shortcuts Help Modal</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">?</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-700">Exit Fullscreen / Close Modal</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Esc</kbd>
                  </div>
                </div>
              </div>

              {/* Category 2: Element Editing & Clipboard */}
              <div>
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <span>🎨</span> Element Editing & Clipboard
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Undo Action</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + Z</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Redo Action</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + Y</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Copy Element</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + C</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Paste Element</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + V</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Duplicate Element</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Ctrl + D</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Delete Element</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Delete / Backspace</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Move Section Up</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Alt + Up</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700">Move Section Down</span>
                    <kbd className="text-[10px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">Alt + Down</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Press <kbd className="font-mono bg-white border border-slate-200 px-1 rounded">Esc</kbd> anytime to close</span>
              <button
                type="button"
                onClick={() => setIsShortcutsHelpOpen(false)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* Element Manager Modal (F-032)              */}
      {/* ========================================== */}
      {isElementManagerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsElementManagerOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Element Manager</h3>
                  <p className="text-[11px] text-slate-400">Control widget availability in Elements library</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsElementManagerOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Widget Toggles List */}
            <div className="p-6 overflow-y-auto space-y-3">
              {(["container", "heading", "text", "image", "button"] as ElementType[]).map((type) => {
                const isDisabled = disabledWidgets.includes(type);
                return (
                  <div
                    key={type}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                      isDisabled
                        ? "border-slate-200 bg-slate-50/70"
                        : "border-blue-100 bg-blue-50/20 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {type === "container" && "📦"}
                        {type === "heading" && "🔤"}
                        {type === "text" && "📝"}
                        {type === "image" && "🖼️"}
                        {type === "button" && "🔘"}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold capitalize text-slate-800 flex items-center gap-2">
                          <span>{type} Widget</span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isDisabled
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isDisabled ? "Disabled" : "Active"}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {type === "container" && "Flexbox layout section container"}
                          {type === "heading" && "Headings and titles (H1-H6)"}
                          {type === "text" && "Body copy paragraphs and text blocks"}
                          {type === "image" && "Single images with src and alt attributes"}
                          {type === "button" && "Interactive call-to-action buttons"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleWidgetAvailability(type)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isDisabled ? "bg-slate-300" : "bg-blue-600"
                      }`}
                      title={isDisabled ? `Enable ${type} widget` : `Disable ${type} widget`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isDisabled ? "translate-x-0" : "translate-x-5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Disabled widgets are hidden from insertion; canvas elements are preserved.
              </span>
              <button
                type="button"
                onClick={() => setIsElementManagerOpen(false)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
