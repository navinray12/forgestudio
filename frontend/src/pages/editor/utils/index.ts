import type {
  EditorElement,
  ElementStyles,
  ContainerLayout,
  DeviceMode,
  ElementState,
  Breakpoint
} from "../types";

// ==========================================
// EDITOR HELPER & UTILITY FUNCTIONS
// ==========================================

// ==========================================

export function generateId(): string {
  return "el_" + Math.random().toString(36).substring(2, 9);
}

export function resolveImageUrl(src: string | undefined, apiUrl: string): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }
  const cleanApiUrl = apiUrl.replace(/\/$/, "");
  const cleanSrc = src.startsWith("/") ? src : `/${src}`;
  return `${cleanApiUrl}${cleanSrc}`;
}



export function parseSpacingUnit(valStr?: string, defaultUnit: string = "px") {
  if (!valStr) return { num: "", unit: defaultUnit };
  const match = valStr.trim().match(/^([0-9.-]+)(px|%|rem|em)?$/);
  if (match) {
    return { num: match[1], unit: match[2] || defaultUnit };
  }
  return { num: valStr, unit: defaultUnit };
}

// Responsive Cascading & Helper Functions
export function getEffectiveStyle<K extends keyof ElementStyles>(
  el: EditorElement,
  device: DeviceMode,
  key: K
): ElementStyles[K] {
  if (!el || !el.styles) return undefined as any;
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

export function getEffectiveHoverStyle<K extends keyof ElementStyles>(
  el: EditorElement,
  device: DeviceMode,
  key: K
): ElementStyles[K] | undefined {
  if (!el) return undefined;
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

export function getControlStyleValue<K extends keyof ElementStyles>(
  el: EditorElement,
  device: DeviceMode,
  state: ElementState,
  key: K
): ElementStyles[K] | undefined {
  if (!el) return undefined;
  if (state === "hover") {
    return getEffectiveHoverStyle(el, device, key);
  }
  return getEffectiveStyle(el, device, key);
}

export function isControlStyleConfigured(
  el: EditorElement,
  device: DeviceMode,
  state: ElementState,
  key: keyof ElementStyles
): boolean {
  if (!el) return false;
  if (state === "hover") {
    return getEffectiveHoverStyle(el, device, key) !== undefined;
  }
  if (device === "desktop") {
    return el.styles?.[key] !== undefined;
  }
  return el.responsiveStyles?.[device]?.[key] !== undefined || el.styles?.[key] !== undefined;
}

export function hasHoverStyleOverride(el: EditorElement, device: DeviceMode, key: keyof ElementStyles): boolean {
  if (!el || device === "desktop") return false;
  return el.responsiveHoverStyles?.[device]?.[key] !== undefined;
}

export function getEffectiveLayout<K extends keyof ContainerLayout>(
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

export function getMergedStyles(el: EditorElement, device: DeviceMode, state: ElementState = "normal"): ElementStyles {
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

export function getMergedLayout(el: EditorElement, device: DeviceMode): ContainerLayout {
  const base = el.layout || {};
  return {
    direction: getEffectiveLayout(el, device, "direction") ?? base.direction ?? "column",
    justifyContent: getEffectiveLayout(el, device, "justifyContent") ?? base.justifyContent ?? "flex-start",
    alignItems: getEffectiveLayout(el, device, "alignItems") ?? base.alignItems ?? "stretch",
    gap: getEffectiveLayout(el, device, "gap") ?? base.gap ?? 10,
  };
}

export function hasStyleOverride(el: EditorElement, device: DeviceMode, key: keyof ElementStyles): boolean {
  if (device === "desktop") return false;
  return el.responsiveStyles?.[device]?.[key] !== undefined;
}

export function generateElementsHoverCSS(elementsList: EditorElement[], device: DeviceMode): string {
  let css = "";

  function traverse(list: EditorElement[]) {
    if (!list || !Array.isArray(list)) return;
    for (const el of list) {
      if (!el || !el.id) continue;

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
          const cssProp = String(k).replace(/([A-Z])/g, "-$1").toLowerCase();
          hoverRuleProps.push(`${cssProp}: ${hoverVal} !important;`);
        }
      }

      if (hoverRuleProps.length > 0) {
        css += `[data-el-id="${el.id}"]:hover { ${hoverRuleProps.join(" ")} transition: all 0.2s ease-in-out; }\n`;
      }

      if (el.children && Array.isArray(el.children) && el.children.length > 0) {
        traverse(el.children);
      }
    }
  }

  traverse(elementsList);
  return css;
}



// Tree Navigation & Manipulation Helpers
export function findTreeElement(list: EditorElement[], id: string): EditorElement | null {
  for (const item of list) {
    if (item.id === id) return item;
    if (item.children && item.children.length > 0) {
      const found = findTreeElement(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function getElementBreadcrumbPath(
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

export function updateTreeElement(
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

export function reorderTreeElement(
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

export function deleteTreeElement(list: EditorElement[], id: string): EditorElement[] {
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

export function duplicateTreeElement(
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

export function insertTreeElement(
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

  if (target.type === "container" || target.type === "off-canvas" || target.type === "mega-menu") {
    return updateTreeElement(list, targetId, (c) => ({
      ...c,
      children: [...(c.children || []), newEl],
    }));
  }

  if (target.type === "nested-carousel") {
    const slideContainer: EditorElement = newEl.type === "container" ? newEl : {
      id: generateId(),
      type: "container",
      content: "Slide Container",
      layout: { direction: "column", justifyContent: "center", alignItems: "center", gap: 10 },
      styles: { width: "100%", paddingTop: "24px", paddingRight: "24px", paddingBottom: "24px", paddingLeft: "24px", borderRadius: "12px", backgroundColor: "#ffffff" },
      children: [newEl],
    };
    return updateTreeElement(list, targetId, (c) => ({
      ...c,
      children: [...(c.children || []), slideContainer],
    }));
  }

  // If target is inside a container or tree, append as a sibling after target
  let inserted = false;
  const insertInArray = (arr: EditorElement[]): EditorElement[] => {
    const res: EditorElement[] = [];
    for (const item of arr) {
      res.push(item);
      if (item.id === targetId) {
        res.push(newEl);
        inserted = true;
      } else if (item.children && item.children.length > 0) {
        const updatedChildren = insertInArray(item.children);
        if (updatedChildren !== item.children) {
          res[res.length - 1] = {
            ...item,
            children: updatedChildren,
          };
        }
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

export function isDescendant(list: EditorElement[], parentId: string, targetId: string): boolean {
  const parent = findTreeElement(list, parentId);
  if (!parent || !parent.children) return false;
  return findTreeElement(parent.children, targetId) !== null;
}

export function insertTreeElementAtPosition(
  list: EditorElement[],
  targetId: string | null,
  position: "before" | "after" | "inside" | null,
  newEl: EditorElement
): EditorElement[] {
  if (!targetId) {
    return [...list, newEl];
  }

  const target = findTreeElement(list, targetId);
  const effectivePosition = (position === null && target && (target.type === "container" || target.type === "off-canvas"))
    ? "inside"
    : (position || "after");

  if (effectivePosition === "inside" || (target && target.type === "container" && position !== "before" && position !== "after")) {
    if (target && (target.type === "container" || target.type === "off-canvas" || target.type === "mega-menu")) {
      return updateTreeElement(list, targetId, (c) => ({
        ...c,
        children: [...(c.children || []), newEl],
      }));
    }
    if (target && target.type === "nested-carousel") {
      const slideContainer: EditorElement = newEl.type === "container" ? newEl : {
        id: generateId(),
        type: "container",
        content: "Slide Container",
        layout: { direction: "column", justifyContent: "center", alignItems: "center", gap: 10 },
        styles: { width: "100%", paddingTop: "24px", paddingRight: "24px", paddingBottom: "24px", paddingLeft: "24px", borderRadius: "12px", backgroundColor: "#ffffff" },
        children: [newEl],
      };
      return updateTreeElement(list, targetId, (c) => ({
        ...c,
        children: [...(c.children || []), slideContainer],
      }));
    }
  }

  let inserted = false;
  const processArray = (arr: EditorElement[]): EditorElement[] => {
    const res: EditorElement[] = [];
    for (const item of arr) {
      if (item.id === targetId) {
        if (effectivePosition === "before") {
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

export function moveTreeElement(
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
// CSS Helper (F-102, F-103, F-104, F-107)
// ==========================================
export function getDeveloperCss(elements: EditorElement[]): string {
  let css = "";
  for (const el of elements) {
    if (el.customCss) {
      css += `\n/* Element ${el.customId || el.id} */\n.${el.id} { ${el.customCss} }\n`;
    }
    if (el.customSelectors) {
      // Replace '&' with the element's specific class scope
      css += `\n/* Selectors ${el.customId || el.id} */\n${el.customSelectors.replace(/&/g, `.${el.id}`)}\n`;
    }
    if (el.children) css += getDeveloperCss(el.children);
  }
  return css;
}

// ==========================================
// Cascading Value Resolution
// ==========================================

export function getBreakpointFallbackChain(bpId: string, activeBps: Breakpoint[]): string[] {
  const activeBpsSorted = [...activeBps].filter(b => b.active).sort((a, b) => b.width - a.width);
  const bp = activeBps.find(b => b.id === bpId);
  const desktop = activeBps.find(b => b.id === "desktop") || { id: "desktop", width: 1024 };

  if (!bp || bp.id === "desktop") return ["desktop"];

  if (bp.width > desktop.width) {
    return activeBpsSorted
      .filter(b => b.width <= bp.width && b.width >= desktop.width)
      .map(b => b.id);
  } else {
    return activeBpsSorted
      .filter(b => b.width >= bp.width && b.width <= desktop.width)
      .reverse()
      .map(b => b.id);
  }
}

export function getStyleVal(
  el: EditorElement,
  prop: keyof ElementStyles,
  bpId: string,
  activeBps: Breakpoint[]
): any {
  const chain = getBreakpointFallbackChain(bpId, activeBps);
  for (const id of chain) {
    if (id === "desktop") {
      if (el.styles && el.styles[prop] !== undefined && el.styles[prop] !== "") {
        return el.styles[prop];
      }
    } else {
      const bpStyles = el.responsiveStyles?.[id];
      if (bpStyles && (bpStyles as any)[prop] !== undefined && (bpStyles as any)[prop] !== "") {
        return (bpStyles as any)[prop];
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
  _globalSettings?: any
): React.CSSProperties {
  const styles: React.CSSProperties = {};
  const getVal = (prop: keyof ElementStyles): string | undefined => getStyleVal(el, prop, bpId, activeBps);

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
  if (fontFamily && fontFamily !== "inherit") styles.fontFamily = fontFamily;

  const letterSpacing = getVal("letterSpacing");
  if (letterSpacing) styles.letterSpacing = letterSpacing.endsWith("px") || letterSpacing.endsWith("em") ? letterSpacing : `${letterSpacing}px`;

  const wordSpacing = getVal("wordSpacing");
  if (wordSpacing) styles.wordSpacing = wordSpacing.endsWith("px") || wordSpacing.endsWith("em") ? wordSpacing : `${wordSpacing}px`;

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

  const minWidth = getVal("minWidth");
  if (minWidth) styles.minWidth = minWidth;

  const maxWidth = getVal("maxWidth");
  if (maxWidth) styles.maxWidth = maxWidth;

  const minHeight = getVal("minHeight");
  if (minHeight) styles.minHeight = minHeight;

  const maxHeight = getVal("maxHeight");
  if (maxHeight) styles.maxHeight = maxHeight;

  const alignSelf = getVal("alignSelf");
  if (alignSelf && alignSelf !== "auto") styles.alignSelf = alignSelf;

  const justifySelf = getVal("justifySelf");
  if (justifySelf && justifySelf !== "auto") (styles as any).justifySelf = justifySelf;

  const position = getVal("position");
  if (position && position !== "static") styles.position = position as any;

  const top = getVal("top");
  if (top !== undefined && top !== "") styles.top = top;
  const right = getVal("right");
  if (right !== undefined && right !== "") styles.right = right;
  const bottom = getVal("bottom");
  if (bottom !== undefined && bottom !== "") styles.bottom = bottom;
  const left = getVal("left");
  if (left !== undefined && left !== "") styles.left = left;

  const zIndex = getVal("zIndex");
  if (zIndex !== undefined && zIndex !== "") {
    styles.zIndex = typeof zIndex === "number" ? zIndex : parseInt(zIndex) || (zIndex as any);
  }

  const gridColumn = getVal("gridColumn");
  if (gridColumn) styles.gridColumn = gridColumn;
  const gridRow = getVal("gridRow");
  if (gridRow) styles.gridRow = gridRow;

  const scrollSnapType = getVal("scrollSnapType");
  if (scrollSnapType && scrollSnapType !== "none") (styles as any).scrollSnapType = scrollSnapType;
  const scrollSnapAlign = getVal("scrollSnapAlign");
  if (scrollSnapAlign && scrollSnapAlign !== "none") (styles as any).scrollSnapAlign = scrollSnapAlign;
  const scrollSnapStop = getVal("scrollSnapStop");
  if (scrollSnapStop) (styles as any).scrollSnapStop = scrollSnapStop;
  const scrollPadding = getVal("scrollPadding");
  if (scrollPadding) (styles as any).scrollPadding = scrollPadding;
  const scrollMargin = getVal("scrollMargin");
  if (scrollMargin) (styles as any).scrollMargin = scrollMargin;
  const scrollBehavior = getVal("scrollBehavior");
  if (scrollBehavior) styles.scrollBehavior = scrollBehavior as any;
  const overflowX = getVal("overflowX");
  if (overflowX) styles.overflowX = overflowX as any;
  const overflowY = getVal("overflowY");
  if (overflowY) styles.overflowY = overflowY as any;

  const bgType = getVal("backgroundType") || "solid";
  if (bgType === "solid") {
    const bgColor = getVal("backgroundColor");
    if (bgColor) styles.backgroundColor = bgColor;
  } else if (bgType === "gradient") {
    const gradient = getVal("backgroundGradient");
    if (gradient) styles.background = gradient;
  } else if (bgType === "image") {
    const bgImgUrl = getVal("backgroundImageUrl") || getVal("backgroundImage");
    if (bgImgUrl) {
      styles.backgroundImage = `url(${bgImgUrl})`;
      styles.backgroundPosition = getVal("backgroundPosition") || "center center";
      styles.backgroundRepeat = getVal("backgroundRepeat") || "no-repeat";
      styles.backgroundSize = getVal("backgroundSize") || "cover";
    }
  }

  const borderStyle = getVal("borderStyle");
  if (borderStyle && borderStyle !== "none") {
    styles.borderStyle = borderStyle as any;
    styles.borderWidth = getVal("borderWidth") || "1px";
    styles.borderColor = getVal("borderColor") || "#cbd5e1";
  }

  const boxShadow = getVal("boxShadow");
  if (boxShadow) styles.boxShadow = boxShadow;

  const opacity = getVal("opacity");
  if (opacity) styles.opacity = parseFloat(opacity) / 100;

  const mixBlendMode = getVal("mixBlendMode");
  if (mixBlendMode && mixBlendMode !== "normal") styles.mixBlendMode = mixBlendMode as any;

  const blur = getVal("filterBlur") || "0";
  const brightness = getVal("filterBrightness") || "100";
  const contrast = getVal("filterContrast") || "100";
  const grayscale = getVal("filterGrayscale") || "0";
  const saturate = getVal("filterSaturate") || "100";
  const hueRotate = getVal("filterHueRotate") || "0";
  if (blur !== "0" || brightness !== "100" || contrast !== "100" || grayscale !== "0" || saturate !== "100" || hueRotate !== "0") {
    styles.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) saturate(${saturate}%) hue-rotate(${hueRotate}deg)`;
  }

  const clipPath = getVal("clipPath");
  if (clipPath && clipPath !== "none") styles.clipPath = clipPath;

  const rotate = getVal("transformRotate") || "0";
  const scale = getVal("transformScale") || "1";
  const skewX = getVal("transformSkewX") || "0";
  const skewY = getVal("transformSkewY") || "0";
  const tx = getVal("transformTranslateX") || "0";
  const ty = getVal("transformTranslateY") || "0";
  if (rotate !== "0" || scale !== "1" || skewX !== "0" || skewY !== "0" || tx !== "0" || ty !== "0") {
    styles.transform = `translate(${tx}px, ${ty}px) rotate(${rotate}deg) scale(${scale}) skew(${skewX}deg, ${skewY}deg)`;
  }

  const strokeWidth = getVal("textStrokeWidth");
  const strokeColor = getVal("textStrokeColor");
  if (strokeWidth && strokeWidth !== "0") {
    (styles as any).WebkitTextStroke = `${strokeWidth}px ${strokeColor || "currentColor"}`;
  }

  const textShadow = getVal("textShadow");
  if (textShadow) styles.textShadow = textShadow;

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
  delete inner.position;
  delete inner.top;
  delete inner.right;
  delete inner.bottom;
  delete inner.left;
  delete inner.zIndex;
  delete inner.alignSelf;
  delete (inner as any).justifySelf;
  delete inner.gridColumn;
  delete inner.gridRow;
  delete (inner as any).scrollSnapAlign;
  delete (inner as any).scrollSnapStop;
  delete (inner as any).scrollMargin;
  return inner;
}


