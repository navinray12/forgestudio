import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

// ==========================================
// Types & Interfaces
// ==========================================

export type ElementType = "container" | "heading" | "text" | "image" | "button";

export interface ContainerLayout {
  layoutType?: "flex" | "grid" | "masonry";
  direction?: "column" | "row";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end" | "baseline";
  alignContent?: "stretch" | "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
  gap?: number;
  rowGap?: number | string;
  columnGap?: number | string;

  // CSS Grid Controls (F-041, F-043)
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: "row" | "column" | "dense" | "row dense" | "column dense";
  justifyItems?: "stretch" | "start" | "center" | "end";

  // Masonry Controls (F-051)
  masonryColumns?: number;
  masonryGap?: number | string;
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
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  lineHeight?: string;

  // Alignment & Self Alignment (F-045)
  alignSelf?: "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  justifySelf?: "auto" | "start" | "center" | "end" | "stretch";

  // Position & Stacking Controls (F-047, F-048, F-049)
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: string | number;

  // Grid Child Placement (F-043)
  gridColumn?: string;
  gridRow?: string;
  gridColumnSpan?: number;
  gridRowSpan?: number;

  // Scroll & Scroll Snap (F-050)
  scrollSnapType?: "none" | "x mandatory" | "y mandatory" | "x proximity" | "y proximity" | "both mandatory";
  scrollSnapAlign?: "none" | "start" | "center" | "end";
  scrollSnapStop?: "normal" | "always";
  scrollPadding?: string;
  scrollMargin?: string;
  scrollBehavior?: "smooth" | "auto";
  overflowX?: "visible" | "hidden" | "scroll" | "auto";
  overflowY?: "visible" | "hidden" | "scroll" | "auto";

  // Typography Controls (F-070, F-089)
  fontFamily?: string;
  letterSpacing?: string;
  wordSpacing?: string;

  // Background Options (F-073, F-074, F-075, F-076, F-077, F-078)
  backgroundType?: "solid" | "gradient" | "image" | "video" | "slideshow";
  backgroundGradient?: string;
  backgroundImageUrl?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundSize?: string;
  backgroundVideoUrl?: string;
  backgroundVideoOpacity?: string;
  backgroundSlideshowUrls?: string;
  backgroundSlideshowSpeed?: string;

  // Borders & Corners (F-079, F-080)
  borderStyle?: "none" | "solid" | "dashed" | "dotted" | "double";
  borderWidth?: string;
  borderColor?: string;

  // Shadows (F-081, F-093)
  boxShadow?: string;
  textShadow?: string;

  // Opacity & Blend Mode (F-082, F-083)
  opacity?: string;
  mixBlendMode?: string;

  // CSS Filters & Masks (F-084, F-085)
  filterBlur?: string;
  filterBrightness?: string;
  filterContrast?: string;
  filterGrayscale?: string;
  filterSaturate?: string;
  filterHueRotate?: string;
  clipPath?: string;

  // CSS Transform (F-086)
  transformRotate?: string;
  transformScale?: string;
  transformSkewX?: string;
  transformSkewY?: string;
  transformTranslateX?: string;
  transformTranslateY?: string;

  // Text Stroke & Mask (F-087, F-088)
  textStrokeWidth?: string;
  textStrokeColor?: string;
  textMaskType?: "none" | "gradient" | "image";
  textMaskGradient?: string;
  textMaskImage?: string;

  // Ken Burns Effect (F-092)
  kenBurnsEffect?: "none" | "zoom-in" | "zoom-out";

  // Text Path (F-090)
  textPathEnabled?: "true" | "false";

  // Shape Dividers (F-091)
  dividerTopEnabled?: "true" | "false";
  dividerTopStyle?: "waves" | "curves" | "slant" | "triangle";
  dividerTopColor?: string;
  dividerTopHeight?: string;
  dividerBottomEnabled?: "true" | "false";
  dividerBottomStyle?: "waves" | "curves" | "slant" | "triangle";
  dividerBottomColor?: string;
  dividerBottomHeight?: string;
}

export interface Breakpoint {
  id: string;
  name: string;
  width: number;
  active: boolean;
}

export interface EditorElement {
  id: string;
  type: ElementType;
  content: string;
  src?: string;
  alt?: string;
  href?: string;
  customClass?: string; // F-068
  styles: ElementStyles;
  layout?: ContainerLayout;
  children?: EditorElement[];
  responsiveStyles?: Record<string, ElementStyles>;
  responsiveLayouts?: Record<string, ContainerLayout>;
  hiddenDevices?: Record<string, boolean>;
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

function duplicateTreeElement(list: EditorElement[], id: string): EditorElement[] {
  let result: EditorElement[] = [];

  for (const item of list) {
    if (item.id === id) {
      const clonedItem: EditorElement = JSON.parse(JSON.stringify(item));
      const reassignIds = (node: EditorElement) => {
        node.id = generateId();
        if (node.children) {
          node.children.forEach(reassignIds);
        }
      };
      reassignIds(clonedItem);

      result.push(item);
      result.push(clonedItem);
    } else if (item.children && item.children.length > 0) {
      result.push({
        ...item,
        children: duplicateTreeElement(item.children, id),
      });
    } else {
      result.push(item);
    }
  }

  return result;
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
): any {
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
  _globalSettings?: any
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

  // Width & Height + Viewport Constraints (F-052)
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

  // Alignment & Self-Alignment (F-045)
  const alignSelf = getVal("alignSelf");
  if (alignSelf && alignSelf !== "auto") styles.alignSelf = alignSelf;

  const justifySelf = getVal("justifySelf");
  if (justifySelf && justifySelf !== "auto") (styles as any).justifySelf = justifySelf;

  // Position & Stacking Order (F-047, F-048, F-049)
  const position = getVal("position");
  if (position && position !== "static") {
    styles.position = position as any;
  }

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

  // CSS Grid Child Placement (F-043)
  const gridColumn = getVal("gridColumn");
  if (gridColumn) styles.gridColumn = gridColumn;

  const gridRow = getVal("gridRow");
  if (gridRow) styles.gridRow = gridRow;

  // Scroll & Scroll Snap (F-050)
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
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"
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

const GridBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  </div>
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
          layoutType: "flex",
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
// Structural Layout Presets (Elementor Structure Models)
// ==========================================

export type StructurePresetType =
  | "single"
  | "cols-2-equal"
  | "cols-3-equal"
  | "cols-2-30-70"
  | "cols-2-70-30"
  | "cols-4-equal";

function createStructurePreset(type: StructurePresetType): EditorElement {
  const rootId = generateId();

  if (type === "single") {
    return {
      id: rootId,
      type: "container",
      content: "Container",
      layout: {
        layoutType: "flex",
        direction: "column",
        justifyContent: "flex-start",
        alignItems: "stretch",
        gap: 16,
      },
      styles: {
        width: "100%",
        backgroundColor: "#ffffff",
        paddingTop: "24px",
        paddingRight: "24px",
        paddingBottom: "24px",
        paddingLeft: "24px",
        marginTop: "12px",
        marginBottom: "12px",
        borderRadius: "12px",
      },
      children: [],
    };
  }

  const columnConfigs: Record<string, { count: number; widths: string[]; names: string[] }> = {
    "cols-2-equal": { count: 2, widths: ["50%", "50%"], names: ["Column 1", "Column 2"] },
    "cols-3-equal": { count: 3, widths: ["33.333%", "33.333%", "33.333%"], names: ["Column 1", "Column 2", "Column 3"] },
    "cols-2-30-70": { count: 2, widths: ["30%", "70%"], names: ["Column 1 (30%)", "Column 2 (70%)"] },
    "cols-2-70-30": { count: 2, widths: ["70%", "30%"], names: ["Column 1 (70%)", "Column 2 (30%)"] },
    "cols-4-equal": { count: 4, widths: ["25%", "25%", "25%", "25%"], names: ["Column 1", "Column 2", "Column 3", "Column 4"] },
  };

  const config = columnConfigs[type];
  if (!config) return createDefaultElement("container");

  return {
    id: rootId,
    type: "container",
    content: "Container",
    layout: {
      layoutType: "flex",
      direction: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      alignItems: "stretch",
      gap: 16,
    },
    styles: {
      width: "100%",
      backgroundColor: "#ffffff",
      paddingTop: "24px",
      paddingRight: "24px",
      paddingBottom: "24px",
      paddingLeft: "24px",
      marginTop: "12px",
      marginBottom: "12px",
      borderRadius: "12px",
    },
    children: config.widths.map((width, idx) => ({
      id: generateId(),
      type: "container" as ElementType,
      content: config.names[idx],
      layout: {
        layoutType: "flex" as const,
        direction: "column" as const,
        justifyContent: "flex-start" as const,
        alignItems: "stretch" as const,
        gap: 10,
      },
      styles: {
        width: `calc(${width} - ${(16 * (config.count - 1)) / config.count}px)`,
        minHeight: "80px",
        backgroundColor: "#f8fafc",
        paddingTop: "20px",
        paddingRight: "20px",
        paddingBottom: "20px",
        paddingLeft: "20px",
        borderRadius: "10px",
      },
      children: [],
    })),
  };
}

function createGridPrimitive(): EditorElement {
  const rootId = generateId();
  return {
    id: rootId,
    type: "container",
    content: "Grid Container",
    layout: {
      layoutType: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 16,
    },
    styles: {
      width: "100%",
      backgroundColor: "#ffffff",
      paddingTop: "24px",
      paddingRight: "24px",
      paddingBottom: "24px",
      paddingLeft: "24px",
      marginTop: "12px",
      marginBottom: "12px",
      borderRadius: "12px",
    },
    children: [
      {
        id: generateId(),
        type: "container",
        content: "Grid Cell 1",
        layout: { layoutType: "flex", direction: "column", gap: 10 },
        styles: { width: "100%", minHeight: "80px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "8px" },
        children: [],
      },
      {
        id: generateId(),
        type: "container",
        content: "Grid Cell 2",
        layout: { layoutType: "flex", direction: "column", gap: 10 },
        styles: { width: "100%", minHeight: "80px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "8px" },
        children: [],
      },
    ],
  };
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isPreview, setIsPreview] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(DEFAULT_BREAKPOINTS);
  const [activeBreakpointId, setActiveBreakpointId] = useState<string>("desktop");
  const [isBpModalOpen, setIsBpModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);

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
    alignment: false,
    positioning: false,
    dimensions: false,
    scrollSnap: false,
    typography: false,
    imageMedia: true,
    colors: false,
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
          // Default starting elements matching screenshot
          setElements([
            createDefaultElement("heading"),
            createDefaultElement("text"),
            createDefaultElement("button"),
            createDefaultElement("heading"),
            createDefaultElement("text"),
            createDefaultElement("button"),
            createDefaultElement("image"),
            createDefaultElement("heading"),
          ]);
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
    } catch (err) {
      console.error("Error saving website:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to save website.");
    } finally {
      setSaving(false);
    }
  };

  // Element Manipulation (Tree Aware)
  const handleAddElement = (type: ElementType) => {
    const newEl = createDefaultElement(type);
    setElements((prev) => insertTreeElement(prev, selectedId, newEl));
    setSelectedId(newEl.id);
  };

  const handleInsertStructure = (presetType: StructurePresetType) => {
    const newEl = createStructurePreset(presetType);
    setElements((prev) => insertTreeElement(prev, selectedId, newEl));
    setSelectedId(newEl.id);
  };

  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setElements((prev) => deleteTreeElement(prev, id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleDuplicateElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setElements((prev) => duplicateTreeElement(prev, id));
  };

  const selectedElement = selectedId ? findTreeElement(elements, selectedId) : null;

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
        if (activeBreakpointId === "desktop") {
          return {
            ...el,
            styles: { ...el.styles, [key]: value },
          };
        } else {
          const responsiveStyles = { ...el.responsiveStyles };
          const bpStyles: Record<string, any> = { ...responsiveStyles[activeBreakpointId] };
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
          const bpLayouts: Record<string, any> = { ...responsiveLayouts[activeBreakpointId] };
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
        const bpStyles: Record<string, any> = { ...responsiveStyles[activeBreakpointId] };
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
        const bpLayouts: Record<string, any> = { ...responsiveLayouts[activeBreakpointId] };
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
              className={`flex h-3.5 w-3.5 items-center justify-center rounded text-[9px] font-bold select-none ${isOverridden
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileSelect(e.dataTransfer.files[0]);
    }
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

    const urls = (typeof urlsStr === "string" ? urlsStr : "").split(",").map((u: string) => u.trim()).filter(Boolean);
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
      const layoutType = getLayoutVal(el, "layoutType", activeBreakpointId, breakpoints) || "flex";
      const gapVal = getLayoutVal(el, "gap", activeBreakpointId, breakpoints);
      const rowGapVal = getLayoutVal(el, "rowGap", activeBreakpointId, breakpoints);
      const colGapVal = getLayoutVal(el, "columnGap", activeBreakpointId, breakpoints);

      const rowGapStr = rowGapVal !== undefined && rowGapVal !== ""
        ? (typeof rowGapVal === "number" ? `${rowGapVal}px` : rowGapVal)
        : (gapVal !== undefined ? `${gapVal}px` : "10px");

      const colGapStr = colGapVal !== undefined && colGapVal !== ""
        ? (typeof colGapVal === "number" ? `${colGapVal}px` : colGapVal)
        : (gapVal !== undefined ? `${gapVal}px` : "10px");

      let containerLayoutStyles: React.CSSProperties = {};

      if (layoutType === "grid") {
        containerLayoutStyles = {
          display: "grid",
          gridTemplateColumns: getLayoutVal(el, "gridTemplateColumns", activeBreakpointId, breakpoints) || "repeat(2, 1fr)",
          gridTemplateRows: getLayoutVal(el, "gridTemplateRows", activeBreakpointId, breakpoints) || undefined,
          gridAutoFlow: getLayoutVal(el, "gridAutoFlow", activeBreakpointId, breakpoints) || undefined,
          justifyItems: getLayoutVal(el, "justifyItems", activeBreakpointId, breakpoints) || undefined,
          alignItems: getLayoutVal(el, "alignItems", activeBreakpointId, breakpoints) || undefined,
          justifyContent: getLayoutVal(el, "justifyContent", activeBreakpointId, breakpoints) || undefined,
          alignContent: getLayoutVal(el, "alignContent", activeBreakpointId, breakpoints) || undefined,
          rowGap: rowGapStr,
          columnGap: colGapStr,
        };
      } else if (layoutType === "masonry") {
        containerLayoutStyles = {
          display: "block",
          columnCount: getLayoutVal(el, "masonryColumns", activeBreakpointId, breakpoints) || 3,
          columnGap: colGapStr,
        };
      } else {
        containerLayoutStyles = {
          display: "flex",
          flexDirection: getLayoutVal(el, "direction", activeBreakpointId, breakpoints) || "column",
          flexWrap: getLayoutVal(el, "flexWrap", activeBreakpointId, breakpoints) || "nowrap",
          justifyContent: getLayoutVal(el, "justifyContent", activeBreakpointId, breakpoints) || "flex-start",
          alignItems: getLayoutVal(el, "alignItems", activeBreakpointId, breakpoints) || "stretch",
          alignContent: getLayoutVal(el, "alignContent", activeBreakpointId, breakpoints) || undefined,
          rowGap: rowGapStr,
          columnGap: colGapStr,
        };
      }

      return (
        <div
          key={el.id}
          onClick={(e) => {
            e.stopPropagation();
            if (!isPreview) setSelectedId(el.id);
          }}
          className={`relative transition-all duration-150 ${el.customClass || ""} ${isPreview
            ? ""
            : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
            } ${isSelected
              ? "border-2 border-blue-500 shadow-sm"
              : isPreview
                ? ""
                : "border border-dashed border-slate-300"
            } ${isHiddenOnCurrentDevice ? "opacity-40 border-amber-400 border-2 border-dashed bg-amber-50/10 cursor-not-allowed" : ""}`}
          style={{
            ...containerLayoutStyles,
            ...resolvedStyles,
            width: resolvedStyles.width || "100%",
            height: resolvedStyles.height || "auto",
            minWidth: resolvedStyles.minWidth,
            maxWidth: resolvedStyles.maxWidth,
            minHeight: resolvedStyles.minHeight,
            maxHeight: resolvedStyles.maxHeight,
            paddingTop: resolvedStyles.paddingTop || "16px",
            paddingRight: resolvedStyles.paddingRight || "16px",
            paddingBottom: resolvedStyles.paddingBottom || "16px",
            paddingLeft: resolvedStyles.paddingLeft || "16px",
            marginTop: resolvedStyles.marginTop || "8px",
            marginRight: resolvedStyles.marginRight || "0px",
            marginBottom: resolvedStyles.marginBottom || "8px",
            marginLeft: resolvedStyles.marginLeft || "0px",
            borderRadius: resolvedStyles.borderRadius || "8px",
            position: resolvedStyles.position,
            top: resolvedStyles.top,
            right: resolvedStyles.right,
            bottom: resolvedStyles.bottom,
            left: resolvedStyles.left,
            zIndex: resolvedStyles.zIndex,
            alignSelf: resolvedStyles.alignSelf,
            justifySelf: (resolvedStyles as any).justifySelf,
            gridColumn: resolvedStyles.gridColumn,
            gridRow: resolvedStyles.gridRow,
            overflowX: resolvedStyles.overflowX,
            overflowY: resolvedStyles.overflowY,
            scrollSnapType: (resolvedStyles as any).scrollSnapType,
            scrollBehavior: resolvedStyles.scrollBehavior,
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
            <div className="absolute -top-4 right-3 z-40 flex items-center gap-1.5 rounded-lg bg-[#0b1329] border border-blue-500/30 p-1 text-[11px] font-semibold text-white shadow-xl pointer-events-auto">
              <div className="relative group flex items-center justify-center p-1 rounded hover:bg-slate-800/80 cursor-default">
                <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-40 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Container ({layoutType})
                </div>
              </div>
              {resolvedStyles.position && resolvedStyles.position !== "static" && (
                <span className="bg-blue-900/80 text-blue-300 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                  {resolvedStyles.position}
                </span>
              )}
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

          {(!el.children || el.children.length === 0) && !isPreview ? (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center z-10 relative">
              <span className="text-xs font-bold text-slate-500">Empty {layoutType === "grid" ? "Grid" : layoutType === "masonry" ? "Masonry" : "Container"}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Click an element on the left panel to add inside
              </span>
            </div>
          ) : (
            el.children?.map((child) => (
              layoutType === "masonry" ? (
                <div key={child.id} style={{ breakInside: "avoid", display: "inline-block", width: "100%", marginBottom: rowGapStr }}>
                  {renderElementTree(child)}
                </div>
              ) : (
                renderElementTree(child)
              )
            ))
          )}
        </div>
      );
    }

    return (
      <div
        key={el.id}
        onClick={(e) => {
          e.stopPropagation();
          if (!isPreview) setSelectedId(el.id);
        }}
        className={`relative rounded-xl transition duration-150 ${el.customClass || ""} ${isPreview
          ? ""
          : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
          } ${isSelected
            ? "border-2 border-blue-500 p-2.5"
            : "p-2.5 border border-transparent"
          } ${isHiddenOnCurrentDevice ? "opacity-40 border-amber-400 border border-dashed bg-amber-50/10" : ""}`}
        style={{
          marginTop: getStyleVal(el, "marginTop", activeBreakpointId, breakpoints),
          marginRight: getStyleVal(el, "marginRight", activeBreakpointId, breakpoints),
          marginBottom: getStyleVal(el, "marginBottom", activeBreakpointId, breakpoints),
          marginLeft: getStyleVal(el, "marginLeft", activeBreakpointId, breakpoints),
          boxShadow: resolvedStyles.boxShadow,
          opacity: resolvedStyles.opacity,
          filter: resolvedStyles.filter,
          transform: resolvedStyles.transform,
          mixBlendMode: resolvedStyles.mixBlendMode,
          position: resolvedStyles.position,
          top: resolvedStyles.top,
          right: resolvedStyles.right,
          bottom: resolvedStyles.bottom,
          left: resolvedStyles.left,
          zIndex: resolvedStyles.zIndex,
          alignSelf: resolvedStyles.alignSelf,
          justifySelf: (resolvedStyles as any).justifySelf,
          gridColumn: resolvedStyles.gridColumn,
          gridRow: resolvedStyles.gridRow,
          minWidth: resolvedStyles.minWidth,
          maxWidth: resolvedStyles.maxWidth,
          minHeight: resolvedStyles.minHeight,
          maxHeight: resolvedStyles.maxHeight,
          scrollSnapAlign: (resolvedStyles as any).scrollSnapAlign,
          scrollSnapStop: (resolvedStyles as any).scrollSnapStop,
          scrollMargin: (resolvedStyles as any).scrollMargin,
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
          <div className="absolute -top-4 right-3 z-40 flex items-center gap-1.5 rounded-lg bg-[#0b1329] border border-blue-500/30 p-1 text-[11px] font-semibold text-white shadow-xl pointer-events-auto">
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
          <div style={{ textAlign: (getStyleVal(el, "textAlign", activeBreakpointId, breakpoints) as React.CSSProperties["textAlign"]) || "left" }}>
            {el.src ? (
              <img
                src={resolveImageUrl(el.src, apiUrl)}
                alt={el.alt || "Uploaded Image"}
                onClick={() => {
                  if (isPreview && globalSettings?.lightboxSettings?.enableLightbox) {
                    setLightboxImage(resolveImageUrl(el.src!, apiUrl));
                  }
                }}
                className={`inline-block object-cover max-w-full ${isPreview && globalSettings?.lightboxSettings?.enableLightbox ? "cursor-zoom-in" : ""
                  } ${getStyleVal(el, "kenBurnsEffect", activeBreakpointId, breakpoints) === "zoom-in" ? "kb-zoom-in" :
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
          <div style={{ textAlign: (getStyleVal(el, "textAlign", activeBreakpointId, breakpoints) as React.CSSProperties["textAlign"]) || "left" }}>
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
              {el.content}
            </a>
          </div>
        )}
      </div>
    );
  };

  // Render Loader
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-xs font-semibold">Loading Website Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans">
      {/* ========================================== */}
      {/* Top Header Bar (Dark Navy, matching screenshot) */}
      {/* ========================================== */}
      <header className="flex h-12 shrink-0 items-center justify-between bg-[#0b1329] px-5 shadow-md">
        {/* Left: Dashboard link & Site Name */}
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1"
          >
            ‹ Dashboard
          </Link>

          <span className="text-xs font-bold text-white tracking-wide">
            {website?.name || "new 1"}
          </span>
        </div>

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
                    className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${isActive
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

          {errorMessage && (
            <span className="text-xs font-medium text-red-400">
              {errorMessage}
            </span>
          )}

          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`rounded-full border border-slate-600 bg-transparent px-4 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white ${isPreview ? "bg-amber-500/20 text-amber-300 border-amber-500/50" : ""
              }`}
          >
            {isPreview ? "Exit Preview" : "Preview"}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-1 text-xs font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {/* ========================================== */}
      {/* Main Workspace Body                         */}
      {/* ========================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ========================================== */}
        {/* Left Sidebar: ELEMENTS & LAYOUTS           */}
        {/* ========================================== */}
        {!isPreview && (
          <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4 overflow-y-auto shadow-sm flex flex-col gap-5">
            {/* 1. Structure (Elementor Style) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  Structure
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Container Primitive */}
                <button
                  onClick={() => setIsStructureModalOpen(true)}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
                  title="Flexbox Container & Column Structures"
                >
                  <ContainerBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                    Container
                  </span>
                </button>

                {/* Grid Primitive */}
                <button
                  onClick={() => {
                    const newEl = createGridPrimitive();
                    setElements((prev) => insertTreeElement(prev, selectedId, newEl));
                    setSelectedId(newEl.id);
                  }}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
                  title="2D CSS Grid Container"
                >
                  <GridBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                    Grid
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Basic Elements */}
            <div>
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Basic Elements
              </h2>

              <div className="grid grid-cols-2 gap-2">
                {/* Heading */}
                <button
                  onClick={() => handleAddElement("heading")}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
                >
                  <HeadingBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                    Heading
                  </span>
                </button>

                {/* Text */}
                <button
                  onClick={() => handleAddElement("text")}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
                >
                  <TextBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                    Text
                  </span>
                </button>

                {/* Image */}
                <button
                  onClick={() => handleAddElement("image")}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
                >
                  <ImageBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                    Image
                  </span>
                </button>

                {/* Button */}
                <button
                  onClick={() => handleAddElement("button")}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
                >
                  <ButtonBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                    Button
                  </span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* ========================================== */}
        {/* Center: White Canvas Container              */}
        {/* ========================================== */}
        <main
          onClick={() => setSelectedId(null)}
          className="flex flex-1 justify-center items-start overflow-y-auto bg-[#f1f5f9] p-6 sm:p-10"
        >
          <div
            style={{
              width: "100%",
              maxWidth: activeBreakpointId === "widescreen" ? "100%" : `${breakpoints.find(b => b.id === activeBreakpointId)?.width || 1024}px`,
            }}
            className={`min-h-[750px] h-auto shrink-0 my-2 bg-white shadow-md transition-all duration-300 relative ${activeBreakpointId === "desktop" || activeBreakpointId === "widescreen" || activeBreakpointId === "laptop"
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
              <div
                onClick={() => setIsStructureModalOpen(true)}
                className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/40 hover:bg-slate-50 hover:border-blue-400 p-8 cursor-pointer transition group"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition group-hover:scale-110 group-hover:bg-blue-700">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-bold text-slate-700">
                  Drag widget here, or click to add a Container
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Choose from 1, 2, 3, 4 column or asymmetric structure layouts
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {elements.map((el) => renderElementTree(el))}

                {/* Elementor-style In-Canvas Quick Add Inserter */}
                {!isPreview && (
                  <div className="pt-2 pb-6">
                    <div
                      onClick={() => setIsStructureModalOpen(true)}
                      className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/40 hover:bg-blue-50/30 hover:border-blue-400 py-6 cursor-pointer transition"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow transition group-hover:scale-110 group-hover:bg-blue-700">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="mt-2 text-xs font-bold text-slate-600 group-hover:text-blue-700">
                        Add New Container
                      </span>
                    </div>
                  </div>
                )}
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
                  className={`flex-1 rounded-md py-1.5 text-center transition ${!selectedElement
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
                  className={`flex-1 rounded-md py-1.5 text-center transition ${activeSidebarTab === "global"
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

                  {/* 1. Layout & Structure (F-038, F-039, F-040, F-041, F-042, F-043, F-051, F-046) */}
                  {renderAccordion("Layout & Structure", "layout", (
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
                                  className={`flex items-center gap-1.5 rounded-lg border p-1.5 cursor-pointer transition ${isHidden
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
                          {/* Layout Mode Selector (Flexbox vs CSS Grid vs Masonry) */}
                          <div>
                            {renderResponsiveLabel("Layout Engine", undefined, "layoutType")}
                            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-[11px] font-bold">
                              {(["flex", "grid", "masonry"] as const).map((mode) => {
                                const activeMode = getLayoutVal(selectedElement, "layoutType", activeBreakpointId, breakpoints) || "flex";
                                return (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => updateSelectedLayout("layoutType", mode)}
                                    className={`py-1 rounded-md transition capitalize ${activeMode === mode
                                      ? "bg-white text-blue-600 shadow-sm"
                                      : "text-slate-500 hover:text-slate-800"
                                      }`}
                                  >
                                    {mode === "flex" ? "Flexbox" : mode === "grid" ? "CSS Grid" : "Masonry"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Flexbox Controls */}
                          {(getLayoutVal(selectedElement, "layoutType", activeBreakpointId, breakpoints) === "flex" || !getLayoutVal(selectedElement, "layoutType", activeBreakpointId, breakpoints)) && (
                            <div className="space-y-3 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200/60">
                              <div>
                                {renderResponsiveLabel("Flex Direction", undefined, "direction")}
                                <select
                                  value={getLayoutVal(selectedElement, "direction", activeBreakpointId, breakpoints) || "column"}
                                  onChange={(e) => updateSelectedLayout("direction", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="column">Column (Vertical Stack)</option>
                                  <option value="row">Row (Horizontal Row)</option>
                                </select>
                              </div>

                              <div>
                                {renderResponsiveLabel("Flex Wrap", undefined, "flexWrap")}
                                <select
                                  value={getLayoutVal(selectedElement, "flexWrap", activeBreakpointId, breakpoints) || "nowrap"}
                                  onChange={(e) => updateSelectedLayout("flexWrap", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="nowrap">No Wrap (Single Line)</option>
                                  <option value="wrap">Wrap (Multi-Line)</option>
                                  <option value="wrap-reverse">Wrap Reverse</option>
                                </select>
                              </div>

                              <div>
                                {renderResponsiveLabel("Justify Content (Main Axis)", undefined, "justifyContent")}
                                <select
                                  value={getLayoutVal(selectedElement, "justifyContent", activeBreakpointId, breakpoints) || "flex-start"}
                                  onChange={(e) => updateSelectedLayout("justifyContent", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="flex-start">Start (Left / Top)</option>
                                  <option value="center">Center</option>
                                  <option value="flex-end">End (Right / Bottom)</option>
                                  <option value="space-between">Space Between</option>
                                  <option value="space-around">Space Around</option>
                                  <option value="space-evenly">Space Evenly</option>
                                </select>
                              </div>

                              <div>
                                {renderResponsiveLabel("Align Items (Cross Axis)", undefined, "alignItems")}
                                <select
                                  value={getLayoutVal(selectedElement, "alignItems", activeBreakpointId, breakpoints) || "stretch"}
                                  onChange={(e) => updateSelectedLayout("alignItems", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="stretch">Stretch (Fill Height/Width)</option>
                                  <option value="flex-start">Start</option>
                                  <option value="center">Center</option>
                                  <option value="flex-end">End</option>
                                  <option value="baseline">Baseline</option>
                                </select>
                              </div>

                              <div>
                                {renderResponsiveLabel("Align Content", undefined, "alignContent")}
                                <select
                                  value={getLayoutVal(selectedElement, "alignContent", activeBreakpointId, breakpoints) || "stretch"}
                                  onChange={(e) => updateSelectedLayout("alignContent", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="stretch">Stretch</option>
                                  <option value="flex-start">Start</option>
                                  <option value="center">Center</option>
                                  <option value="flex-end">End</option>
                                  <option value="space-between">Space Between</option>
                                  <option value="space-around">Space Around</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* CSS Grid Controls (F-041, F-043) */}
                          {getLayoutVal(selectedElement, "layoutType", activeBreakpointId, breakpoints) === "grid" && (
                            <div className="space-y-3 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200/60">
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                  Grid Template Columns
                                </label>
                                <div className="grid grid-cols-3 gap-1 mb-2">
                                  {[
                                    { label: "2 Columns", val: "repeat(2, 1fr)" },
                                    { label: "3 Columns", val: "repeat(3, 1fr)" },
                                    { label: "4 Columns", val: "repeat(4, 1fr)" },
                                    { label: "Auto-Fit", val: "repeat(auto-fit, minmax(200px, 1fr))" },
                                    { label: "1/3 + 2/3", val: "1fr 2fr" },
                                    { label: "2/3 + 1/3", val: "2fr 1fr" },
                                  ].map((preset) => (
                                    <button
                                      key={preset.label}
                                      type="button"
                                      onClick={() => updateSelectedLayout("gridTemplateColumns", preset.val)}
                                      className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 transition"
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                                {renderResponsiveLabel("Custom Columns Definition", undefined, "gridTemplateColumns")}
                                <input
                                  type="text"
                                  placeholder="e.g. repeat(3, 1fr) or 1fr 2fr 1fr"
                                  value={getLayoutVal(selectedElement, "gridTemplateColumns", activeBreakpointId, breakpoints) || "repeat(2, 1fr)"}
                                  onChange={(e) => updateSelectedLayout("gridTemplateColumns", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                {renderResponsiveLabel("Grid Template Rows (Optional)", undefined, "gridTemplateRows")}
                                <input
                                  type="text"
                                  placeholder="e.g. auto 1fr or repeat(2, 100px)"
                                  value={getLayoutVal(selectedElement, "gridTemplateRows", activeBreakpointId, breakpoints) || ""}
                                  onChange={(e) => updateSelectedLayout("gridTemplateRows", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                {renderResponsiveLabel("Grid Auto Flow", undefined, "gridAutoFlow")}
                                <select
                                  value={getLayoutVal(selectedElement, "gridAutoFlow", activeBreakpointId, breakpoints) || "row"}
                                  onChange={(e) => updateSelectedLayout("gridAutoFlow", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                >
                                  <option value="row">Row (Left to Right)</option>
                                  <option value="column">Column (Top to Bottom)</option>
                                  <option value="dense">Dense (Pack Holes)</option>
                                  <option value="row dense">Row Dense</option>
                                  <option value="column dense">Column Dense</option>
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  {renderResponsiveLabel("Justify Items", undefined, "justifyItems")}
                                  <select
                                    value={getLayoutVal(selectedElement, "justifyItems", activeBreakpointId, breakpoints) || "stretch"}
                                    onChange={(e) => updateSelectedLayout("justifyItems", e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                  >
                                    <option value="stretch">Stretch</option>
                                    <option value="start">Start</option>
                                    <option value="center">Center</option>
                                    <option value="end">End</option>
                                  </select>
                                </div>
                                <div>
                                  {renderResponsiveLabel("Align Items", undefined, "alignItems")}
                                  <select
                                    value={getLayoutVal(selectedElement, "alignItems", activeBreakpointId, breakpoints) || "stretch"}
                                    onChange={(e) => updateSelectedLayout("alignItems", e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                                  >
                                    <option value="stretch">Stretch</option>
                                    <option value="start">Start</option>
                                    <option value="center">Center</option>
                                    <option value="end">End</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Masonry Controls (F-051) */}
                          {getLayoutVal(selectedElement, "layoutType", activeBreakpointId, breakpoints) === "masonry" && (
                            <div className="space-y-3 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200/60">
                              <div>
                                {renderResponsiveLabel("Masonry Columns", undefined, "masonryColumns")}
                                <div className="grid grid-cols-5 gap-1">
                                  {[2, 3, 4, 5, 6].map((cols) => {
                                    const activeCols = getLayoutVal(selectedElement, "masonryColumns", activeBreakpointId, breakpoints) || 3;
                                    return (
                                      <button
                                        key={cols}
                                        type="button"
                                        onClick={() => updateSelectedLayout("masonryColumns", cols)}
                                        className={`py-1.5 rounded-lg text-xs font-bold transition border ${activeCols === cols
                                          ? "bg-blue-600 text-white border-blue-600 shadow"
                                          : "bg-white text-slate-700 border-slate-200 hover:border-blue-400"
                                          }`}
                                      >
                                        {cols}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Gap Controls (F-046) */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            {renderResponsiveLabel("Unified Spacing Gap (px)", undefined, "gap")}
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="80"
                                value={getLayoutVal(selectedElement, "gap", activeBreakpointId, breakpoints) ?? 10}
                                onChange={(e) => updateSelectedLayout("gap", Number(e.target.value))}
                                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded"
                              />
                              <input
                                type="number"
                                min="0"
                                value={getLayoutVal(selectedElement, "gap", activeBreakpointId, breakpoints) ?? 10}
                                onChange={(e) => updateSelectedLayout("gap", Number(e.target.value))}
                                className="w-16 rounded border px-2 py-1 text-center text-xs font-semibold"
                              />
                            </div>

                            {/* Advanced Separate Row & Column Gaps */}
                            <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-semibold text-slate-500">
                              <div>
                                {renderResponsiveLabel("Row Gap (Vertical)", undefined, "rowGap")}
                                <input
                                  type="text"
                                  placeholder="e.g. 16px, 1.5rem"
                                  value={getLayoutVal(selectedElement, "rowGap", activeBreakpointId, breakpoints) || ""}
                                  onChange={(e) => updateSelectedLayout("rowGap", e.target.value)}
                                  className="w-full rounded border px-2 py-1 text-xs"
                                />
                              </div>
                              <div>
                                {renderResponsiveLabel("Column Gap (Horiz)", undefined, "columnGap")}
                                <input
                                  type="text"
                                  placeholder="e.g. 20px, 1.5rem"
                                  value={getLayoutVal(selectedElement, "columnGap", activeBreakpointId, breakpoints) || ""}
                                  onChange={(e) => updateSelectedLayout("columnGap", e.target.value)}
                                  className="w-full rounded border px-2 py-1 text-xs"
                                />
                              </div>
                            </div>
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

                  {/* 2. Alignment & Placement (F-045, F-043) */}
                  {renderAccordion("Alignment & Placement", "alignment", (
                    <div className="space-y-3.5">
                      {/* Self Align Controls */}
                      <div>
                        {renderResponsiveLabel("Align Self (Cross Axis)", "alignSelf")}
                        <select
                          value={getStyleVal(selectedElement, "alignSelf", activeBreakpointId, breakpoints) || "auto"}
                          onChange={(e) => updateSelectedStyle("alignSelf", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="auto">Auto (Inherit)</option>
                          <option value="flex-start">Start</option>
                          <option value="center">Center</option>
                          <option value="flex-end">End</option>
                          <option value="stretch">Stretch</option>
                          <option value="baseline">Baseline</option>
                        </select>
                      </div>

                      <div>
                        {renderResponsiveLabel("Justify Self (Grid / Main Axis)", "justifySelf")}
                        <select
                          value={getStyleVal(selectedElement, "justifySelf", activeBreakpointId, breakpoints) || "auto"}
                          onChange={(e) => updateSelectedStyle("justifySelf", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="auto">Auto (Inherit)</option>
                          <option value="start">Start</option>
                          <option value="center">Center</option>
                          <option value="end">End</option>
                          <option value="stretch">Stretch</option>
                        </select>
                      </div>

                      {/* Text Alignment */}
                      {selectedElement.type !== "image" && (
                        <div>
                          {renderResponsiveLabel("Text Alignment", "textAlign")}
                          <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
                            {(["left", "center", "right", "justify"] as const).map((align) => {
                              const activeAlign = getStyleVal(selectedElement, "textAlign", activeBreakpointId, breakpoints) || "left";
                              return (
                                <button
                                  key={align}
                                  type="button"
                                  onClick={() => updateSelectedStyle("textAlign", align)}
                                  className={`py-1 rounded text-xs font-bold capitalize transition ${activeAlign === align
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                  {align}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* CSS Grid Item Placement (F-043) */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          CSS Grid Placement (If in Grid)
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
                          <div>
                            <span>Grid Column Span</span>
                            <input
                              type="text"
                              placeholder="e.g. span 2 or 1 / 3"
                              value={getStyleVal(selectedElement, "gridColumn", activeBreakpointId, breakpoints) || ""}
                              onChange={(e) => updateSelectedStyle("gridColumn", e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs"
                            />
                          </div>
                          <div>
                            <span>Grid Row Span</span>
                            <input
                              type="text"
                              placeholder="e.g. span 2 or 1 / 2"
                              value={getStyleVal(selectedElement, "gridRow", activeBreakpointId, breakpoints) || ""}
                              onChange={(e) => updateSelectedStyle("gridRow", e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 3. Position & Stacking (F-047, F-048, F-049) */}
                  {renderAccordion("Position & Layers", "positioning", (
                    <div className="space-y-3.5">
                      <div>
                        {renderResponsiveLabel("Position Mode", "position")}
                        <select
                          value={getStyleVal(selectedElement, "position", activeBreakpointId, breakpoints) || "static"}
                          onChange={(e) => updateSelectedStyle("position", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="static">Static (Default In-Flow)</option>
                          <option value="relative">Relative (Offset Parent)</option>
                          <option value="absolute">Absolute (Exact Coords)</option>
                          <option value="fixed">Fixed (Viewport Screen)</option>
                          <option value="sticky">Sticky (Scroll Bound)</option>
                        </select>
                      </div>

                      {/* Position Offsets Matrix & Inputs */}
                      {getStyleVal(selectedElement, "position", activeBreakpointId, breakpoints) && getStyleVal(selectedElement, "position", activeBreakpointId, breakpoints) !== "static" && (
                        <div className="space-y-3 p-2.5 rounded-xl bg-slate-50/50 border border-slate-200/60">
                          {/* 9-Point Visual Anchor Grid */}
                          <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                              Quick Anchor Position
                            </span>
                            <div className="grid grid-cols-3 gap-1 max-w-[150px] mx-auto">
                              {[
                                { name: "Top-Left", top: "0px", left: "0px", right: "auto", bottom: "auto" },
                                { name: "Top-Center", top: "0px", left: "50%", right: "auto", bottom: "auto" },
                                { name: "Top-Right", top: "0px", right: "0px", left: "auto", bottom: "auto" },
                                { name: "Center-Left", top: "50%", left: "0px", right: "auto", bottom: "auto" },
                                { name: "Center", top: "50%", left: "50%", right: "auto", bottom: "auto" },
                                { name: "Center-Right", top: "50%", right: "0px", left: "auto", bottom: "auto" },
                                { name: "Bottom-Left", bottom: "0px", left: "0px", top: "auto", right: "auto" },
                                { name: "Bottom-Center", bottom: "0px", left: "50%", top: "auto", right: "auto" },
                                { name: "Bottom-Right", bottom: "0px", right: "0px", top: "auto", left: "auto" },
                              ].map((anchor) => (
                                <button
                                  key={anchor.name}
                                  type="button"
                                  title={anchor.name}
                                  onClick={() => {
                                    updateSelectedStyle("top", anchor.top);
                                    updateSelectedStyle("right", anchor.right);
                                    updateSelectedStyle("bottom", anchor.bottom);
                                    updateSelectedStyle("left", anchor.left);
                                  }}
                                  className="h-6 w-full rounded border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-400 transition flex items-center justify-center text-[9px] font-bold text-slate-500"
                                >
                                  •
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Coordinates Inputs */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
                            <div>
                              <span>Top Offset</span>
                              <input
                                type="text"
                                placeholder="e.g. 0px, 10%"
                                value={getStyleVal(selectedElement, "top", activeBreakpointId, breakpoints) || ""}
                                onChange={(e) => updateSelectedStyle("top", e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <span>Right Offset</span>
                              <input
                                type="text"
                                placeholder="e.g. 0px, 20px"
                                value={getStyleVal(selectedElement, "right", activeBreakpointId, breakpoints) || ""}
                                onChange={(e) => updateSelectedStyle("right", e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <span>Bottom Offset</span>
                              <input
                                type="text"
                                placeholder="e.g. 0px, 20px"
                                value={getStyleVal(selectedElement, "bottom", activeBreakpointId, breakpoints) || ""}
                                onChange={(e) => updateSelectedStyle("bottom", e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <span>Left Offset</span>
                              <input
                                type="text"
                                placeholder="e.g. 0px, 50%"
                                value={getStyleVal(selectedElement, "left", activeBreakpointId, breakpoints) || ""}
                                onChange={(e) => updateSelectedStyle("left", e.target.value)}
                                className="w-full border rounded px-2 py-1 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Z-Index Stacking Order (F-048) */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        {renderResponsiveLabel("Z-Index Layer Stacking", "zIndex")}
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="auto or 10"
                            value={getStyleVal(selectedElement, "zIndex", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("zIndex", e.target.value)}
                            className="w-24 rounded border px-2 py-1 text-xs font-semibold text-slate-800 outline-none"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => updateSelectedStyle("zIndex", "0")}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600"
                            >
                              Back (0)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const current = parseInt(getStyleVal(selectedElement, "zIndex", activeBreakpointId, breakpoints) as string || "0") || 0;
                                updateSelectedStyle("zIndex", String(current + 1));
                              }}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelectedStyle("zIndex", "50")}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600"
                            >
                              Front (50)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 4. Dimensions & Viewport Constraints (F-052) */}
                  {renderAccordion("Dimensions & Viewport", "dimensions", (
                    <div className="space-y-3.5">
                      {/* Viewport Presets */}
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Quick Viewport Presets
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedStyle("width", "100%");
                              updateSelectedStyle("minHeight", "100vh");
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 text-[10px] font-bold text-left transition"
                          >
                            🌟 100vh Full Screen
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedStyle("width", "100%");
                              updateSelectedStyle("minHeight", "50vh");
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 text-[10px] font-bold text-left transition"
                          >
                            ⚡ 50vh Half Screen
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedStyle("width", "100%");
                              updateSelectedStyle("height", "auto");
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 text-[10px] font-bold text-left transition"
                          >
                            📏 100% Fluid Width
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateSelectedStyle("width", "auto");
                              updateSelectedStyle("height", "auto");
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 text-[10px] font-bold text-left transition"
                          >
                            🔄 Auto Size
                          </button>
                        </div>
                      </div>

                      {/* Width & Height */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          {renderResponsiveLabel("Width", "width")}
                          <input
                            type="text"
                            placeholder="e.g. 100%, 100vw, 300px"
                            value={getStyleVal(selectedElement, "width", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("width", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          />
                        </div>

                        <div>
                          {renderResponsiveLabel("Height", "height")}
                          <input
                            type="text"
                            placeholder="e.g. auto, 100vh, 400px"
                            value={getStyleVal(selectedElement, "height", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("height", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      {/* Min / Max Width */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
                        <div>
                          {renderResponsiveLabel("Min Width", "minWidth")}
                          <input
                            type="text"
                            placeholder="e.g. 280px, 50%"
                            value={getStyleVal(selectedElement, "minWidth", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("minWidth", e.target.value)}
                            className="w-full rounded border px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          {renderResponsiveLabel("Max Width", "maxWidth")}
                          <input
                            type="text"
                            placeholder="e.g. 1200px, 100%"
                            value={getStyleVal(selectedElement, "maxWidth", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("maxWidth", e.target.value)}
                            className="w-full rounded border px-2 py-1 text-xs"
                          />
                        </div>
                      </div>

                      {/* Min / Max Height */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500">
                        <div>
                          {renderResponsiveLabel("Min Height", "minHeight")}
                          <input
                            type="text"
                            placeholder="e.g. 100vh, 400px"
                            value={getStyleVal(selectedElement, "minHeight", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("minHeight", e.target.value)}
                            className="w-full rounded border px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          {renderResponsiveLabel("Max Height", "maxHeight")}
                          <input
                            type="text"
                            placeholder="e.g. 600px, 100vh"
                            value={getStyleVal(selectedElement, "maxHeight", activeBreakpointId, breakpoints) || ""}
                            onChange={(e) => updateSelectedStyle("maxHeight", e.target.value)}
                            className="w-full rounded border px-2 py-1 text-xs"
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
                    </div>
                  ))}

                  {/* 5. Scroll & Scroll Snap (F-050) */}
                  {renderAccordion("Scroll & Scroll Snap", "scrollSnap", (
                    <div className="space-y-3.5">
                      {/* Overflow Controls */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          {renderResponsiveLabel("Overflow X", "overflowX")}
                          <select
                            value={getStyleVal(selectedElement, "overflowX", activeBreakpointId, breakpoints) || "visible"}
                            onChange={(e) => updateSelectedStyle("overflowX", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          >
                            <option value="visible">Visible</option>
                            <option value="hidden">Hidden</option>
                            <option value="scroll">Scroll</option>
                            <option value="auto">Auto</option>
                          </select>
                        </div>
                        <div>
                          {renderResponsiveLabel("Overflow Y", "overflowY")}
                          <select
                            value={getStyleVal(selectedElement, "overflowY", activeBreakpointId, breakpoints) || "visible"}
                            onChange={(e) => updateSelectedStyle("overflowY", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          >
                            <option value="visible">Visible</option>
                            <option value="hidden">Hidden</option>
                            <option value="scroll">Scroll</option>
                            <option value="auto">Auto</option>
                          </select>
                        </div>
                      </div>

                      {/* Scroll Snap Type for Container */}
                      {selectedElement.type === "container" && (
                        <div>
                          {renderResponsiveLabel("Scroll Snap Type", "scrollSnapType")}
                          <select
                            value={getStyleVal(selectedElement, "scrollSnapType", activeBreakpointId, breakpoints) || "none"}
                            onChange={(e) => updateSelectedStyle("scrollSnapType", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                          >
                            <option value="none">None (Regular Scroll)</option>
                            <option value="x mandatory">X Mandatory (Horizontal Carousel)</option>
                            <option value="y mandatory">Y Mandatory (Vertical Full-page Snap)</option>
                            <option value="x proximity">X Proximity (Gentle Snap)</option>
                            <option value="y proximity">Y Proximity (Gentle Snap)</option>
                            <option value="both mandatory">Both X & Y Mandatory</option>
                          </select>
                        </div>
                      )}

                      {/* Child Scroll Snap Align */}
                      <div>
                        {renderResponsiveLabel("Child Snap Align", "scrollSnapAlign")}
                        <select
                          value={getStyleVal(selectedElement, "scrollSnapAlign", activeBreakpointId, breakpoints) || "none"}
                          onChange={(e) => updateSelectedStyle("scrollSnapAlign", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="none">None</option>
                          <option value="start">Snap to Start (Top/Left)</option>
                          <option value="center">Snap to Center (Middle)</option>
                          <option value="end">Snap to End (Bottom/Right)</option>
                        </select>
                      </div>

                      {/* Scroll Behavior */}
                      <div>
                        {renderResponsiveLabel("Scroll Behavior", "scrollBehavior")}
                        <select
                          value={getStyleVal(selectedElement, "scrollBehavior", activeBreakpointId, breakpoints) || "smooth"}
                          onChange={(e) => updateSelectedStyle("scrollBehavior", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="smooth">Smooth (Animated)</option>
                          <option value="auto">Auto (Instant)</option>
                        </select>
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

                  {/* Image Properties & Upload (for Image element) */}
                  {selectedElement.type === "image" && renderAccordion("Image & Media", "imageMedia", (
                    <div className="space-y-3.5">
                      {/* Image Source & Upload */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          IMAGE SOURCE (URL OR UPLOAD)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://... or upload below"
                            value={selectedElement.src || ""}
                            onChange={(e) => updateSelectedProp("src", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Drag and drop upload box */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                          }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`mt-2 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${dragOver
                            ? "border-blue-500 bg-blue-50/50"
                            : "border-slate-300 hover:border-blue-400 bg-slate-50/50"
                            }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleImageFileSelect(e.target.files[0])}
                            className="hidden"
                          />
                          <UploadCloudIcon />
                          <span className="mt-1 text-xs font-semibold text-slate-700">
                            {isUploading ? "Uploading..." : "Click or drag & drop image"}
                          </span>
                          <span className="text-[10px] text-slate-400">PNG, JPG, WEBP up to 5MB</span>
                        </div>

                        {uploadError && (
                          <p className="mt-1 text-[11px] font-semibold text-red-500">{uploadError}</p>
                        )}
                      </div>

                      {/* Alt Text */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          ALT TEXT (ACCESSIBILITY)
                        </label>
                        <input
                          type="text"
                          placeholder="Describe the image..."
                          value={selectedElement.alt || ""}
                          onChange={(e) => updateSelectedProp("alt", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Ken Burns Effect (F-092) */}
                      <div>
                        {renderResponsiveLabel("Ken Burns Pan & Zoom", "kenBurnsEffect")}
                        <select
                          value={getStyleVal(selectedElement, "kenBurnsEffect", activeBreakpointId, breakpoints) || "none"}
                          onChange={(e) => updateSelectedStyle("kenBurnsEffect", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none"
                        >
                          <option value="none">None</option>
                          <option value="zoom-in">Slow Zoom In</option>
                          <option value="zoom-out">Slow Zoom Out</option>
                        </select>
                      </div>
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
          className={`fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md transition-opacity duration-300 cursor-zoom-out ${globalSettings?.lightboxSettings?.lightboxTheme === "light"
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
      {/* Elementor Structure Preset Picker Modal    */}
      {/* ========================================== */}
      {isStructureModalOpen && (
        <div
          onClick={() => setIsStructureModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-scale-up"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  Select your Structure
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Choose a column layout preset for your container
                </p>
              </div>
              <button
                onClick={() => setIsStructureModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Structure Presets Grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* 1. Full Width (100%) */}
              <button
                type="button"
                onClick={() => {
                  handleInsertStructure("single");
                  setIsStructureModalOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-md hover:-translate-y-0.5 group"
              >
                <div className="w-full h-12 rounded-lg border-2 border-slate-300 bg-white p-1 flex items-center justify-center group-hover:border-blue-400 transition">
                  <div className="w-full h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600">
                  1 Column (100%)
                </span>
              </button>

              {/* 2. 2 Equal Columns (50% / 50%) */}
              <button
                type="button"
                onClick={() => {
                  handleInsertStructure("cols-2-equal");
                  setIsStructureModalOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-md hover:-translate-y-0.5 group"
              >
                <div className="w-full h-12 rounded-lg border-2 border-slate-300 bg-white p-1 flex items-center gap-1 group-hover:border-blue-400 transition">
                  <div className="w-1/2 h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                  <div className="w-1/2 h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600">
                  2 Columns (50/50)
                </span>
              </button>

              {/* 3. 3 Equal Columns (33% / 33% / 33%) */}
              <button
                type="button"
                onClick={() => {
                  handleInsertStructure("cols-3-equal");
                  setIsStructureModalOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-md hover:-translate-y-0.5 group"
              >
                <div className="w-full h-12 rounded-lg border-2 border-slate-300 bg-white p-1 flex items-center gap-1 group-hover:border-blue-400 transition">
                  <div className="w-1/3 h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                  <div className="w-1/3 h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                  <div className="w-1/3 h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600">
                  3 Columns (33/33/33)
                </span>
              </button>

              {/* 4. 2 Asymmetric Columns (30% / 70%) */}
              <button
                type="button"
                onClick={() => {
                  handleInsertStructure("cols-2-30-70");
                  setIsStructureModalOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-md hover:-translate-y-0.5 group"
              >
                <div className="w-full h-12 rounded-lg border-2 border-slate-300 bg-white p-1 flex items-center gap-1 group-hover:border-blue-400 transition">
                  <div className="w-[30%] h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                  <div className="w-[70%] h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600">
                  2 Columns (30/70)
                </span>
              </button>

              {/* 5. 2 Asymmetric Columns (70% / 30%) */}
              <button
                type="button"
                onClick={() => {
                  handleInsertStructure("cols-2-70-30");
                  setIsStructureModalOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-md hover:-translate-y-0.5 group"
              >
                <div className="w-full h-12 rounded-lg border-2 border-slate-300 bg-white p-1 flex items-center gap-1 group-hover:border-blue-400 transition">
                  <div className="w-[70%] h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                  <div className="w-[30%] h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600">
                  2 Columns (70/30)
                </span>
              </button>

              {/* 6. 4 Equal Columns (25% each) */}
              <button
                type="button"
                onClick={() => {
                  handleInsertStructure("cols-4-equal");
                  setIsStructureModalOpen(false);
                }}
                className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-md hover:-translate-y-0.5 group"
              >
                <div className="w-full h-12 rounded-lg border-2 border-slate-300 bg-white p-1 flex items-center gap-1 group-hover:border-blue-400 transition">
                  <div className="w-1/4 h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                  <div className="w-1/4 h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                  <div className="w-1/4 h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                  <div className="w-1/4 h-full bg-slate-200 group-hover:bg-blue-100 rounded transition" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600">
                  4 Columns (25% each)
                </span>
              </button>
            </div>
          </div>
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
                      className={`grid grid-cols-12 items-center gap-2 rounded-xl p-2.5 transition border ${bp.active ? "bg-white border-slate-200" : "bg-slate-50/50 border-slate-100"
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
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 ${bp.active ? "bg-blue-600" : "bg-slate-200"
                            }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${bp.active ? "translate-x-4" : "translate-x-0"
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
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleResetBreakpoints}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
              >
                Reset to Defaults
              </button>

              <button
                type="button"
                onClick={() => setIsBpModalOpen(false)}
                className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
