import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  type NavigationElementType,
  type NavigationStyles,
  getNavigationDefaultElement,
  NavigationElementRenderer,
  NavigationSettingsPanel,
  isNavigationElement,
} from "./navigation";
import type { PopupConfig } from "../../types/popup.types";
import PopupManagerModal from "./components/PopupManagerModal";
import PopupSettingsPanel from "./components/PopupSettingsPanel";
import PopupRuntimePreview from "./components/PopupRuntimePreview";

// ==========================================
// Types & Interfaces
// ==========================================

export type ElementType =
  | "container" | "heading" | "text" | "image" | "button"
  | "video" | "divider" | "spacer" | "icon" | "rating"
  | "progress-bar" | "counter" | "html" | "alert"
  | "social-icons" | "google-maps" | "soundcloud"
  | "div-block" | "paragraph"
  | NavigationElementType;

export type DeviceMode = "desktop" | "tablet" | "mobile";

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

export interface ElementStyles extends NavigationStyles {
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
  fontStyle?: "normal" | "italic";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "overline" | "line-through";
  letterSpacing?: string;
  wordSpacing?: string;
  textShadow?: string;

  // Background Options (F-073 to F-078)
  backgroundType?: "solid" | "gradient" | "image" | "video" | "slideshow";
  backgroundGradient?: string;
  backgroundImageUrl?: string;
  backgroundImage?: string;
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
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomRightRadius?: string;
  borderBottomLeftRadius?: string;

  // Shadows (F-081, F-093)
  boxShadow?: string;

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

  // Motion & Interaction (F-123 - F-141)
  entranceAnimation?: "none" | "fade-in" | "fade-in-up" | "fade-in-down" | "zoom-in" | "slide-up" | "slide-down" | "bounce-in";
  entranceDuration?: string;
  entranceDelay?: string;
  hoverScale?: string;
  hoverRotate?: string;
  hoverTranslateY?: string;
  hoverOpacity?: string;
  hoverTransitionDuration?: string;
  mouseTrackEnabled?: "true" | "false";
  mouseTrackSpeed?: string;
  tilt3DEnabled?: "true" | "false";
  tilt3DMax?: string;
  scrollEffectsEnabled?: "true" | "false";
  scrollSpeedX?: string;
  scrollSpeedY?: string;
  scrollTransparency?: "none" | "fade-in" | "fade-out" | "fade-in-out";
  scrollRotate?: string;
  scrollBlur?: string;
  scrollScale?: string;
  stickyPosition?: "none" | "top" | "bottom";
  stickyOffset?: string;
  interactionTrigger?: "none" | "click" | "hover" | "dblclick";
  interactionAction?: "none" | "toggle-class" | "show-hide" | "alert" | "scroll-to";
  interactionTargetId?: string;
  interactionActionValue?: string;

  // Widget Options (F-142 - F-173)
  videoProvider?: "youtube" | "vimeo" | "hosted";
  videoAutoplay?: "true" | "false";
  videoControls?: "true" | "false";
  dividerStyle?: "solid" | "dashed" | "dotted";
  dividerColor?: string;
  dividerHeight?: string;
  dividerWidth?: string;
  iconName?: string;
  iconSize?: string;
  iconColor?: string;
  ratingStarsCount?: string;
  ratingValue?: string;
  ratingColor?: string;
  ratingSize?: string;
  progressPercent?: string;
  progressColor?: string;
  progressLabel?: string;
  counterStart?: string;
  counterEnd?: string;
  counterPrefix?: string;
  counterSuffix?: string;
  counterDuration?: string;
  alertType?: "info" | "success" | "warning" | "danger";
  alertDismissible?: "true" | "false";
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
  socialLinkedin?: string;
  socialYoutube?: string;
  socialIconSize?: string;
  socialIconColor?: string;
}

export type ElementState = "normal" | "hover";

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
  customClass?: string;
  styles: ElementStyles;
  hoverStyles?: Partial<ElementStyles>;
  layout?: ContainerLayout;
  children?: EditorElement[];
  componentId?: string;
  isComponent?: boolean;
  componentName?: string;
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
    breakpoints?: Breakpoint[];
    globalSettings?: any;
    popups?: PopupConfig[];
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
  if (target.type === "container" || target.type === "div-block") {
    return updateTreeElement(list, targetId, (c) => ({
      ...c,
      children: [...(c.children || []), newEl],
    }));
  }
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
  return inserted ? updatedList : [...list, newEl];
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

// Icons & Widgets Helpers
const ContainerBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="3 3" />
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  </div>
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

const HeadingBoxIcon = () => <div className="flex h-7 w-7 items-center justify-center font-serif text-lg font-bold text-slate-700">H</div>;
const TextBoxIcon = () => <div className="flex h-7 w-7 items-center justify-center font-sans text-lg font-bold text-slate-700">T</div>;
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
const EmptyPictureIcon = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" />
    </svg>
  </div>
);

function renderSvgIcon(name: string, size: string, color: string) {
  const sizePx = `${size || 24}px`;
  const fill = color || "currentColor";
  switch (name) {
    case "heart":
      return <svg style={{width: sizePx, height: sizePx}} viewBox="0 0 24 24" fill={fill}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
    case "check":
      return <svg style={{width: sizePx, height: sizePx}} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
    case "info":
      return <svg style={{width: sizePx, height: sizePx}} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
    case "alert":
      return <svg style={{width: sizePx, height: sizePx}} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case "globe":
      return <svg style={{width: sizePx, height: sizePx}} viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case "star":
    default:
      return <svg style={{width: sizePx, height: sizePx}} viewBox="0 0 24 24" fill={fill}><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>;
  }
}

function AnimatedCounter({ start, end, prefix, suffix, duration }: { start: number; end: number; prefix: string; suffix: string; duration: number }) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    let startTime: number | null = null;
    let frameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [start, end, duration]);

  return <span>{prefix}{count}{suffix}</span>;
}

// ==========================================
// Default Elements Creator
// ==========================================

function createDefaultElement(type: ElementType): EditorElement {
  const id = generateId();
  const navDefault = getNavigationDefaultElement(type, id);
  if (navDefault) return navDefault;

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
    case "video":
      return {
        id,
        type: "video",
        content: "Video Player",
        src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        styles: {
          width: "100%",
          height: "350px",
          marginTop: "16px",
          marginBottom: "16px",
          videoProvider: "youtube",
        },
      };
    case "divider":
      return {
        id,
        type: "divider",
        content: "Divider",
        styles: {
          width: "100%",
          dividerHeight: "2",
          dividerColor: "#cbd5e1",
          dividerStyle: "solid",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
    case "spacer":
      return {
        id,
        type: "spacer",
        content: "Spacer",
        styles: {
          height: "40px",
        },
      };
    case "icon":
      return {
        id,
        type: "icon",
        content: "Icon",
        styles: {
          iconName: "star",
          iconSize: "32",
          iconColor: "#2563eb",
          textAlign: "center",
          marginTop: "12px",
          marginBottom: "12px",
        },
      };
    case "rating":
      return {
        id,
        type: "rating",
        content: "Rating",
        styles: {
          ratingStarsCount: "5",
          ratingValue: "4.5",
          ratingColor: "#f59e0b",
          ratingSize: "20",
          textAlign: "left",
          marginTop: "12px",
          marginBottom: "12px",
        },
      };
    case "progress-bar":
      return {
        id,
        type: "progress-bar",
        content: "Progress Bar",
        styles: {
          progressPercent: "75",
          progressColor: "#3b82f6",
          progressLabel: "Task Completion",
          marginTop: "12px",
          marginBottom: "12px",
        },
      };
    case "counter":
      return {
        id,
        type: "counter",
        content: "Counter",
        styles: {
          counterStart: "0",
          counterEnd: "100",
          counterPrefix: "",
          counterSuffix: "%",
          counterDuration: "2000",
          color: "#2563eb",
          fontSize: "36px",
          fontWeight: "700",
          textAlign: "center",
          marginTop: "12px",
          marginBottom: "12px",
        },
      };
    case "html":
      return {
        id,
        type: "html",
        content: "<div style='padding:20px; background:#eff6ff; border-radius:8px; border:1px solid #bfdbfe;'><p style='margin:0; font-size:14px;'>Custom HTML Code</p></div>",
        styles: {
          marginTop: "12px",
          marginBottom: "12px",
        },
      };
    case "alert":
      return {
        id,
        type: "alert",
        content: "Attention! This is an important notification alert message block.",
        styles: {
          alertType: "info",
          alertDismissible: "true",
          marginTop: "12px",
          marginBottom: "12px",
        },
      };
    case "social-icons":
      return {
        id,
        type: "social-icons",
        content: "Social Icons",
        styles: {
          socialFacebook: "https://facebook.com",
          socialTwitter: "https://twitter.com",
          socialInstagram: "https://instagram.com",
          socialLinkedin: "https://linkedin.com",
          socialIconSize: "20",
          socialIconColor: "#475569",
          textAlign: "center",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
    case "google-maps":
      return {
        id,
        type: "google-maps",
        content: "Google Map",
        src: "https://maps.google.com/maps?q=London&t=&z=13&ie=UTF8&iwloc=&output=embed",
        styles: {
          width: "100%",
          height: "350px",
          borderRadius: "8px",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
    case "soundcloud":
      return {
        id,
        type: "soundcloud",
        content: "SoundCloud Audio",
        src: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/49931160&color=%23ff5500",
        styles: {
          width: "100%",
          height: "166px",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
    case "div-block":
      return {
        id,
        type: "div-block",
        content: "Div Block",
        children: [],
        layout: {
          direction: "column",
          justifyContent: "flex-start",
          alignItems: "stretch",
          gap: 10,
        },
        styles: {
          width: "100%",
          height: "100px",
          backgroundColor: "#f8fafc",
          borderRadius: "6px",
          paddingTop: "12px",
          paddingRight: "12px",
          paddingBottom: "12px",
          paddingLeft: "12px",
          marginTop: "4px",
          marginBottom: "4px",
        },
      };
    case "paragraph":
      return {
        id,
        type: "paragraph",
        content: "This is a dedicated paragraph block for formatting text on your site page layout.",
        styles: {
          color: "#334155",
          fontSize: "14px",
          fontWeight: "400",
          textAlign: "left",
          lineHeight: "1.6",
          marginTop: "8px",
          marginBottom: "8px",
        },
      };
    default:
      return {
        id,
        type,
        content: "",
        styles: {},
      };
  }
}

// ==========================================
// Structural Layout Presets
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
// Main Component
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
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // State Management
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const [isPopupManagerOpen, setIsPopupManagerOpen] = useState(false);
  const [activeCanvasMode, setActiveCanvasMode] = useState<"page" | "popup">("page");
  const [activePopupId, setActivePopupId] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isPreview, setIsPreview] = useState(false);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(DEFAULT_BREAKPOINTS);
  const [activeBreakpointId, setActiveBreakpointId] = useState<string>("desktop");
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);

  // Active Popup reference
  const activePopup = activePopupId ? popups.find((p) => p.id === activePopupId) || null : null;
  const currentElementList = activeCanvasMode === "popup" && activePopup ? activePopup.elements || [] : elements;

  const setUnifiedElements = (updater: (prev: EditorElement[]) => EditorElement[]) => {
    if (activeCanvasMode === "popup" && activePopupId) {
      setPopups((prev) =>
        prev.map((p) => (p.id === activePopupId ? { ...p, elements: updater(p.elements || []) } : p))
      );
    } else {
      setElements(updater);
    }
  };

  const handleCreatePopup = (newPopup: PopupConfig) => {
    setPopups((prev) => [...prev, newPopup]);
  };

  const handleUpdatePopup = (popupId: string, updater: (p: PopupConfig) => PopupConfig) => {
    setPopups((prev) => prev.map((p) => (p.id === popupId ? updater(p) : p)));
  };

  const handleDeletePopup = (popupId: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== popupId));
    if (activePopupId === popupId) {
      setActivePopupId(null);
      setActiveCanvasMode("page");
    }
  };

  const handleDuplicatePopup = (popupId: string) => {
    const target = popups.find((p) => p.id === popupId);
    if (!target) return;
    const cloned: PopupConfig = JSON.parse(JSON.stringify(target));
    cloned.id = "pop_" + Math.random().toString(36).substring(2, 9);
    cloned.name = `${target.name} (Copy)`;
    cloned.viewsCount = 0;
    cloned.clicksCount = 0;
    setPopups((prev) => [...prev, cloned]);
  };

  const handleSelectPopupForEdit = (popupId: string) => {
    setActivePopupId(popupId);
    setActiveCanvasMode("popup");
    setSelectedId(null);
  };

  const handleTrackPopupView = (popupId: string) => {
    setPopups((prev) =>
      prev.map((p) => (p.id === popupId ? { ...p, viewsCount: (p.viewsCount || 0) + 1 } : p))
    );
  };

  const handleTrackPopupClick = (popupId: string) => {
    setPopups((prev) =>
      prev.map((p) => (p.id === popupId ? { ...p, clicksCount: (p.clicksCount || 0) + 1 } : p))
    );
  };

  // Global Settings
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

  const [activeSidebarTab, setActiveSidebarTab] = useState<"element" | "global" | "popup">("global");

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    layout: true,
    alignment: false,
    positioning: false,
    dimensions: false,
    scrollSnap: false,
    typography: false,
    colors: false,
    background: false,
    borders: false,
    shadows: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Left Sidebar Search & Accordion State
  const [leftSearchQuery, setLeftSearchQuery] = useState("");
  const [leftCategoryFilter, setLeftCategoryFilter] = useState<"all" | "basic" | "media" | "navigation">("all");
  const [openLeftCategories, setOpenLeftCategories] = useState<Record<string, boolean>>({
    basic: true,
    media: true,
    navigation: true,
  });

  // Elementor-Style Left Panel State
  const [elementorLeftTab, setElementorLeftTab] = useState<"general" | "style" | "interactions">("general");
  const [widgetSubTab, setWidgetSubTab] = useState<"widgets" | "components" | "globals">("widgets");

  const toggleLeftCategory = (cat: string) => {
    setOpenLeftCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // When an element is selected, switch to element tab (F-066)
  useEffect(() => {
    if (selectedId) {
      setActiveSidebarTab("element");
    } else if (activeCanvasMode === "popup") {
      setActiveSidebarTab("popup");
    } else {
      setActiveSidebarTab("global");
    }
  }, [selectedId, activeCanvasMode]);

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
        if (!res.ok) throw new Error(data?.message || "Failed to load website.");

        const loadedSite = data.website || data;
        setWebsite(loadedSite);

        if (loadedSite?.editorData?.elements && Array.isArray(loadedSite.editorData.elements)) {
          setElements(loadedSite.editorData.elements);
        } else {
          setElements([
            createDefaultElement("heading"),
            createDefaultElement("text"),
            createDefaultElement("button"),
          ]);
        }

        if (loadedSite?.editorData?.popups && Array.isArray(loadedSite.editorData.popups)) {
          setPopups(loadedSite.editorData.popups);
        }

        if (loadedSite?.editorData?.breakpoints && Array.isArray(loadedSite.editorData.breakpoints)) {
          setBreakpoints(loadedSite.editorData.breakpoints);
        }

        if (loadedSite?.editorData?.globalSettings) {
          setGlobalSettings(loadedSite.editorData.globalSettings);
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

  // Save Data
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
          popups,
        },
      };

      const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to save website.");

      setSaveMessage("Saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save website data.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddElement = (type: ElementType) => {
    const newEl = createDefaultElement(type);
    setUnifiedElements((prev) => insertTreeElement(prev, selectedId, newEl));
    setSelectedId(newEl.id);
  };

  const handleInsertStructure = (presetType: StructurePresetType) => {
    const newEl = createStructurePreset(presetType);
    setUnifiedElements((prev) => insertTreeElement(prev, selectedId, newEl));
    setSelectedId(newEl.id);
  };

  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUnifiedElements((prev) => deleteTreeElement(prev, id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleDuplicateElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUnifiedElements((prev) => duplicateTreeElement(prev, id));
  };

  const selectedElement = selectedId ? findTreeElement(currentElementList, selectedId) : null;

  const updateSelectedProp = (key: keyof EditorElement, value: any) => {
    if (!selectedId) return;
    setUnifiedElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => ({ ...el, [key]: value }))
    );
  };

  const updateSelectedStyle = (key: keyof ElementStyles, value: any) => {
    if (!selectedId) return;
    setUnifiedElements((prev) =>
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
          responsiveStyles[activeBreakpointId] = bpStyles as ElementStyles;
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
    setUnifiedElements((prev) =>
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
          responsiveLayouts[activeBreakpointId] = bpLayouts as ContainerLayout;
          return {
            ...el,
            responsiveLayouts,
          };
        }
      })
    );
  };

  const renderResponsiveLabel = (
    label: string,
    _styleKey?: keyof ElementStyles,
    _layoutKey?: keyof ContainerLayout
  ) => {
    return (
      <div className="flex items-center justify-between mb-1 mt-2">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
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
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50/50 hover:bg-slate-50 border-b border-slate-100 transition outline-none"
        >
          <span>{title}</span>
          <span className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
        </button>
        {isOpen && <div className="p-3.5 space-y-4">{content}</div>}
      </div>
    );
  };

  // Tree Renderer
  const renderElementTree = (el: EditorElement): React.ReactNode => {
    const isSelected = selectedId === el.id && !isPreview;
    const resolvedStyles = resolveElementStyles(el, activeBreakpointId, breakpoints, globalSettings);

    if (el.type === "container") {
      const layoutType = getLayoutVal(el, "layoutType", activeBreakpointId, breakpoints) || "flex";
      const gapVal = getLayoutVal(el, "gap", activeBreakpointId, breakpoints) ?? 16;
      const rowGapVal = getLayoutVal(el, "rowGap", activeBreakpointId, breakpoints);
      const colGapVal = getLayoutVal(el, "columnGap", activeBreakpointId, breakpoints);

      const rowGapStr = rowGapVal !== undefined && rowGapVal !== "" ? (typeof rowGapVal === "number" ? `${rowGapVal}px` : rowGapVal) : `${gapVal}px`;
      const colGapStr = colGapVal !== undefined && colGapVal !== "" ? (typeof colGapVal === "number" ? `${colGapVal}px` : colGapVal) : `${gapVal}px`;

      let containerLayoutStyles: React.CSSProperties = {};
      if (layoutType === "grid") {
        containerLayoutStyles = {
          display: "grid",
          gridTemplateColumns: getLayoutVal(el, "gridTemplateColumns", activeBreakpointId, breakpoints) || "repeat(2, 1fr)",
          gridTemplateRows: getLayoutVal(el, "gridTemplateRows", activeBreakpointId, breakpoints) || undefined,
          gridAutoFlow: getLayoutVal(el, "gridAutoFlow", activeBreakpointId, breakpoints) || undefined,
          justifyItems: getLayoutVal(el, "justifyItems", activeBreakpointId, breakpoints) || undefined,
          alignItems: getLayoutVal(el, "alignItems", activeBreakpointId, breakpoints) || undefined,
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
          className={`relative transition-all duration-150 ${el.customClass || ""} ${
            isPreview ? "" : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
          } ${
            isSelected ? "border-2 border-blue-500 shadow-sm" : isPreview ? "" : "border border-dashed border-slate-300"
          }`}
          style={{
            ...containerLayoutStyles,
            ...resolvedStyles,
            width: resolvedStyles.width || "100%",
            height: resolvedStyles.height || "auto",
            paddingTop: resolvedStyles.paddingTop || "16px",
            paddingRight: resolvedStyles.paddingRight || "16px",
            paddingBottom: resolvedStyles.paddingBottom || "16px",
            paddingLeft: resolvedStyles.paddingLeft || "16px",
            marginTop: resolvedStyles.marginTop || "8px",
            marginBottom: resolvedStyles.marginBottom || "8px",
            borderRadius: resolvedStyles.borderRadius || "8px",
          }}
        >
          {isSelected && (
            <div className="absolute -top-4 right-3 z-40 flex items-center gap-1.5 rounded-lg bg-[#0b1329] border border-blue-500/30 p-1 text-[11px] font-semibold text-white shadow-xl pointer-events-auto">
              <span className="text-blue-400 font-bold px-1">Container ({layoutType})</span>
              <button
                onClick={(e) => handleDuplicateElement(el.id, e)}
                className="p-1 hover:text-blue-400"
              >
                Duplicate
              </button>
              <button
                onClick={(e) => handleDeleteElement(el.id, e)}
                className="p-1 hover:text-red-400 text-red-500"
              >
                Delete
              </button>
            </div>
          )}

          {(!el.children || el.children.length === 0) && !isPreview ? (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
              <span className="text-xs font-bold text-slate-500">Empty Container</span>
            </div>
          ) : (
            el.children?.map((child) => renderElementTree(child))
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
        className={`relative rounded-xl transition duration-150 ${el.customClass || ""} ${
          isPreview ? "" : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
        } ${isSelected ? "border-2 border-blue-500 p-2.5" : "p-2.5 border border-transparent"}`}
        style={{ ...resolvedStyles }}
      >
        {isSelected && (
          <div className="absolute -top-4 right-3 z-40 flex items-center gap-1.5 rounded-lg bg-[#0b1329] border border-blue-500/30 p-1 text-[11px] font-semibold text-white shadow-xl pointer-events-auto">
            <span className="text-blue-400 font-bold px-1 capitalize">{el.type}</span>
            <button onClick={(e) => handleDuplicateElement(el.id, e)} className="p-1 hover:text-blue-400">
              Duplicate
            </button>
            <button onClick={(e) => handleDeleteElement(el.id, e)} className="p-1 hover:text-red-400 text-red-500">
              Delete
            </button>
          </div>
        )}

        {el.type === "heading" && (
          <h2 style={{ fontSize: "32px", fontWeight: "700", color: "#0f172a", ...getInnerStyles(resolvedStyles) }}>
            {el.content}
          </h2>
        )}

        {el.type === "text" && (
          <p style={{ fontSize: "16px", color: "#475569", ...getInnerStyles(resolvedStyles) }}>
            {el.content}
          </p>
        )}

        {el.type === "image" && (
          <div style={{ textAlign: (resolvedStyles.textAlign as any) || "left" }}>
            {el.src ? (
              <img src={resolveImageUrl(el.src, apiUrl)} alt={el.alt || "Image"} className="max-w-full rounded-lg" />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-slate-50">
                <EmptyPictureIcon />
                <span className="text-xs font-bold text-slate-500 mt-2">No Image Selected</span>
              </div>
            )}
          </div>
        )}

        {el.type === "button" && (
          <div style={{ textAlign: (resolvedStyles.textAlign as any) || "left" }}>
            <a
              href={el.href || "#"}
              onClick={(e) => !isPreview && e.preventDefault()}
              className="inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow"
              style={{ ...getInnerStyles(resolvedStyles) }}
            >
              {el.content}
            </a>
          </div>
        )}

        {el.type === "video" && (
          <div className="aspect-video w-full">
            <iframe src={el.src || "https://www.youtube.com/embed/dQw4w9WgXcQ"} title="Video" className="w-full h-full rounded-lg" />
          </div>
        )}

        {el.type === "divider" && <hr style={{ borderColor: "#cbd5e1", ...getInnerStyles(resolvedStyles) }} />}
        {el.type === "spacer" && <div style={{ height: resolvedStyles.height || "40px" }} />}
        {el.type === "icon" && (
          <div style={{ display: "flex", justifyContent: resolvedStyles.textAlign || "center" }}>
            {renderSvgIcon(el.styles.iconName || "star", el.styles.iconSize || "32", el.styles.iconColor || "#2563eb")}
          </div>
        )}
        {el.type === "counter" && (
          <div style={{ textAlign: (resolvedStyles.textAlign as any) || "center" }}>
            <AnimatedCounter start={0} end={100} prefix="" suffix="%" duration={2000} />
          </div>
        )}

        {/* Paragraph Element (F-173) */}
        {el.type === "paragraph" && (
          <p
            style={{
              color: "#334155",
              fontSize: "14px",
              fontWeight: "400",
              textAlign: "left",
              lineHeight: "1.6",
              ...getInnerStyles(resolvedStyles),
            }}
          >
            {el.content}
          </p>
        )}

        {/* Navigation & Search Widgets (F-223 to F-233) */}
        {[
          "nav-menu",
          "wp-menu",
          "menu-widget",
          "mega-menu",
          "breadcrumbs",
          "menu-anchor",
          "post-nav",
          "off-canvas-nav",
          "site-search",
          "search-form",
          "taxonomy-filter"
        ].includes(el.type) && (
          <NavigationElementRenderer
            element={el}
            activeBreakpointId={activeBreakpointId}
            breakpoints={breakpoints}
            isPreview={isPreview}
            onUpdateElement={(updater) => setElements((prev) => updateTreeElement(prev, el.id, updater))}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans">
      {/* Top Header Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between bg-[#0b1329] px-5 shadow-md">
        {/* Left: Dashboard link, Elementor Grid Icon & Site Name */}
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1"
          >
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-xs font-semibold text-slate-300 hover:text-white">
            ‹ Dashboard
          </Link>
          <span className="text-xs font-bold text-white">{website?.name || "Website Editor"}</span>

          <button
            type="button"
            onClick={() => setSelectedId(null)}
            title="Widgets Library (+)"
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
              !selectedId
                ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>

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

          {/* Mode Switcher (F-289) */}
          <div className="flex items-center gap-1 rounded-lg bg-[#16223f] p-0.5 border border-slate-700/60 ml-2">
            <button
              onClick={() => {
                setActiveCanvasMode("page");
                setSelectedId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                activeCanvasMode === "page"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>📄</span> Page Canvas
            </button>
            <button
              onClick={() => setIsPopupManagerOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                activeCanvasMode === "popup"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>✨</span> Popups ({popups.length})
            </button>
          </div>

          {activeCanvasMode === "popup" && activePopup && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-xs">
              <span className="text-amber-300 font-bold">Popup Mode:</span>
              <span className="text-white font-medium truncate max-w-[140px]">{activePopup.name}</span>
              <button
                onClick={() => {
                  setActiveCanvasMode("page");
                  setSelectedId(null);
                }}
                className="text-amber-300 hover:text-white font-bold ml-1"
                title="Return to Page Canvas"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {!isPreview && (
          <div className="flex items-center gap-1 rounded-full bg-[#16223f] p-1 border border-slate-700/50">
            {breakpoints.filter((b) => b.active).map((bp) => (
              <button
                key={bp.id}
                onClick={() => setActiveBreakpointId(bp.id)}
                className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
                  bp.id === activeBreakpointId
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {bp.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {saveMessage && <span className="text-xs text-emerald-400">✓ {saveMessage}</span>}
          {errorMessage && <span className="text-xs text-red-400">{errorMessage}</span>}
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
              isPreview
                ? "bg-amber-500 border-amber-400 text-slate-950 font-bold"
                : "border-slate-600 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {isPreview ? "Exit Preview" : "Preview Site & Popups"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-1 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ========================================== */}
        {/* Left Dynamic Panel (Elementor Style)       */}
        {/* ========================================== */}
        {!isPreview && (
          <aside className="w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full shadow-xs select-none overflow-hidden">
            {selectedElement ? (
              /* ========================================== */
              /* MODE B: EDIT SELECTED ELEMENT              */
              /* ========================================== */
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header: Title, Back to Widgets, Actions */}
                <div className="p-3 border-b border-slate-200 bg-slate-50/80 shrink-0 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        title="Back to Widgets"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition text-xs font-bold"
                      >
                        ✕
                      </button>
                      <span className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5 truncate max-w-[140px]">
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        Edit {selectedElement.type.replace("-", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateElement(selectedElement.id, e)}
                        title="Duplicate Element"
                        className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 transition"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteElement(selectedElement.id, e)}
                        title="Delete Element"
                        className="px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 rounded border border-red-200 hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* 3 Main Tabs: General | Style | Interactions */}
                  <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setElementorLeftTab("general")}
                      className={`flex-1 rounded-md py-1.5 text-center transition ${
                        elementorLeftTab === "general"
                          ? "bg-white text-slate-900 shadow-xs font-black"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      General
                    </button>
                    <button
                      type="button"
                      onClick={() => setElementorLeftTab("style")}
                      className={`flex-1 rounded-md py-1.5 text-center transition ${
                        elementorLeftTab === "style"
                          ? "bg-white text-slate-900 shadow-xs font-black"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Style
                    </button>
                    <button
                      type="button"
                      onClick={() => setElementorLeftTab("interactions")}
                      className={`flex-1 rounded-md py-1.5 text-center transition ${
                        elementorLeftTab === "interactions"
                          ? "bg-white text-slate-900 shadow-xs font-black"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Interactions
                    </button>
                  </div>
                </div>

                {/* Scrollable Panel Body */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
                  {/* TAB 1: GENERAL */}
                  {elementorLeftTab === "general" && (
                    <div className="space-y-4">
                      {/* Text / Content Input */}
                      {typeof selectedElement.content === "string" && (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Title / Content
                          </label>
                          <textarea
                            rows={3}
                            value={selectedElement.content || ""}
                            onChange={(e) => updateSelectedProp("content", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      )}

                      {/* HTML Tag Selector for Headings / Text */}
                      {(selectedElement.type === "heading" || selectedElement.type === "text" || selectedElement.type === "paragraph") && (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            HTML Tag
                          </label>
                          <select
                            value={selectedElement.tag || (selectedElement.type === "heading" ? "h2" : "p")}
                            onChange={(e) => updateSelectedProp("tag", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="h1">H1 (Main Title)</option>
                            <option value="h2">H2 (Section Header)</option>
                            <option value="h3">H3 (Sub Heading)</option>
                            <option value="h4">H4 (Minor Title)</option>
                            <option value="h5">H5 (Small Header)</option>
                            <option value="h6">H6 (Caption Header)</option>
                            <option value="p">P (Paragraph)</option>
                            <option value="div">DIV (Generic Block)</option>
                            <option value="span">SPAN (Inline Text)</option>
                          </select>
                        </div>
                      )}

                      {/* Link / Action URL */}
                      {(selectedElement.type === "button" || selectedElement.type === "image" || selectedElement.type === "heading") && (
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Link URL / Action
                          </label>
                          <input
                            type="text"
                            value={selectedElement.href || ""}
                            onChange={(e) => updateSelectedProp("href", e.target.value)}
                            placeholder="https://example.com or #section"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>
                      )}

                      {/* Navigation Elements Detailed Settings Panel */}
                      {([
                        "nav-menu",
                        "wp-menu",
                        "menu-widget",
                        "mega-menu",
                        "breadcrumbs",
                        "menu-anchor",
                        "post-nav",
                        "off-canvas-nav",
                        "site-search",
                        "search-form",
                        "taxonomy-filter",
                      ] as ElementType[]).includes(selectedElement.type) && (
                        <NavigationSettingsPanel
                          selectedElement={selectedElement}
                          updateSelectedProp={updateSelectedProp}
                          updateSelectedStyle={updateSelectedStyle}
                          renderResponsiveLabel={renderResponsiveLabel}
                        />
                      )}
                    </div>
                  )}

                  {/* TAB 2: STYLE */}
                  {elementorLeftTab === "style" && (
                    <div className="space-y-4">
                      {/* Local CSS Class */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          CSS Class Name
                        </label>
                        <input
                          type="text"
                          value={selectedElement.customClass || ""}
                          onChange={(e) => updateSelectedProp("customClass", e.target.value)}
                          placeholder="e.g. hero-title shadow-lg"
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Accordions for Styling */}
                      {renderAccordion("Layout & Spacing", "layout", (
                        <div className="space-y-3.5">
                          {/* Device Visibility */}
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
                                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
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

                          {/* Padding */}
                          <div>
                            {renderResponsiveLabel("Padding", "padding")}
                            <input
                              type="text"
                              value={getStyleVal(selectedElement, "padding", activeBreakpointId, breakpoints) || ""}
                              onChange={(e) => updateSelectedStyle("padding", e.target.value)}
                              placeholder="e.g. 16px or 1rem 2rem"
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Margin */}
                          <div>
                            {renderResponsiveLabel("Margin", "margin")}
                            <input
                              type="text"
                              value={getStyleVal(selectedElement, "margin", activeBreakpointId, breakpoints) || ""}
                              onChange={(e) => updateSelectedStyle("margin", e.target.value)}
                              placeholder="e.g. 0 auto or 20px"
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Typography Accordion */}
                      {renderAccordion("Typography & Font", "typography", (
                        <div className="space-y-3.5">
                          {/* Font Family */}
                          <div>
                            {renderResponsiveLabel("Font Family", "fontFamily")}
                            <select
                              value={getStyleVal(selectedElement, "fontFamily", activeBreakpointId, breakpoints) || "sans-serif"}
                              onChange={(e) => updateSelectedStyle("fontFamily", e.target.value)}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                            >
                              <option value="sans-serif">System Sans-serif</option>
                              <option value="serif">System Serif</option>
                              <option value="monospace">Monospace</option>
                              <option value="Inter">Inter</option>
                              <option value="Roboto">Roboto</option>
                            </select>
                          </div>

                          {/* Font Size & Weight */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              {renderResponsiveLabel("Font Size", "fontSize")}
                              <input
                                type="text"
                                value={getStyleVal(selectedElement, "fontSize", activeBreakpointId, breakpoints) || ""}
                                onChange={(e) => updateSelectedStyle("fontSize", e.target.value)}
                                placeholder="16px"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              {renderResponsiveLabel("Font Weight", "fontWeight")}
                              <select
                                value={getStyleVal(selectedElement, "fontWeight", activeBreakpointId, breakpoints) || "normal"}
                                onChange={(e) => updateSelectedStyle("fontWeight", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-500"
                              >
                                <option value="normal">Normal (400)</option>
                                <option value="500">Medium (500)</option>
                                <option value="600">SemiBold (600)</option>
                                <option value="bold">Bold (700)</option>
                                <option value="900">Black (900)</option>
                              </select>
                            </div>
                          </div>

                          {/* Text Color */}
                          <div>
                            {renderResponsiveLabel("Text Color", "color")}
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={getStyleVal(selectedElement, "color", activeBreakpointId, breakpoints) || "#000000"}
                                onChange={(e) => updateSelectedStyle("color", e.target.value)}
                                className="h-7 w-7 cursor-pointer rounded border border-slate-300 p-0.5"
                              />
                              <input
                                type="text"
                                value={getStyleVal(selectedElement, "color", activeBreakpointId, breakpoints) || ""}
                                onChange={(e) => updateSelectedStyle("color", e.target.value)}
                                placeholder="#000000"
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Background Accordion */}
                      {renderAccordion("Background & Colors", "background", (
                        <div className="space-y-3.5">
                          <div>
                            {renderResponsiveLabel("Background Color", "backgroundColor")}
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={getStyleVal(selectedElement, "backgroundColor", activeBreakpointId, breakpoints) || "#ffffff"}
                                onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                                className="h-7 w-7 cursor-pointer rounded border border-slate-300 p-0.5"
                              />
                              <input
                                type="text"
                                value={getStyleVal(selectedElement, "backgroundColor", activeBreakpointId, breakpoints) || ""}
                                onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                                placeholder="transparent or #ffffff"
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TAB 3: INTERACTIONS */}
                  {elementorLeftTab === "interactions" && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 block">
                          ✨ Motion &amp; Entrance Effects
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Add animations and hover triggers when users scroll or interact with this {selectedElement.type}.
                        </p>
                      </div>

                      {/* Entrance Animation Selector */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Entrance Animation
                        </label>
                        <select
                          value={selectedElement.styles?.animation || "none"}
                          onChange={(e) => updateSelectedStyle("animation", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="none">None (Static)</option>
                          <option value="fade-in">Fade In</option>
                          <option value="zoom-in">Zoom In</option>
                          <option value="slide-up">Slide Up</option>
                          <option value="bounce">Bounce</option>
                          <option value="flip">3D Flip</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ========================================== */
              /* MODE A: WIDGETS LIBRARY PALETTE            */
              /* ========================================== */
              <div className="flex flex-col h-full overflow-hidden">
                {/* Left Sidebar Sticky Header & Search */}
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 shrink-0 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Elements &amp; Widgets
                    </span>
                  </div>

                  {/* Instant Element Search Bar */}
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={leftSearchQuery}
                      onChange={(e) => setLeftSearchQuery(e.target.value)}
                      placeholder="Search Widget..."
                      className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    />
                    {leftSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setLeftSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Sub Tabs: Widgets | Components | Globals */}
                  <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-[10px] font-extrabold text-slate-600">
                    {(["widgets", "components", "globals"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setWidgetSubTab(tab)}
                        className={`flex-1 rounded-md py-1 text-center capitalize transition ${
                          widgetSubTab === tab
                            ? "bg-white text-slate-800 shadow-xs font-black"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable Elements Catalog */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {/* Category Filter Pills */}
                  <div className="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold text-slate-500">
                    {(["all", "basic", "media", "navigation"] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setLeftCategoryFilter(cat)}
                        className={`flex-1 rounded-md py-1 text-center capitalize transition ${
                          leftCategoryFilter === cat
                            ? "bg-white text-slate-800 shadow-xs font-black"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* SECTION 1: LAYOUT & BASIC */}
                  {(leftCategoryFilter === "all" || leftCategoryFilter === "basic") && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => toggleLeftCategory("basic")}
                        className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-600 py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>🧩</span> Atomic Elements
                        </span>
                        <span>{openLeftCategories.basic ? "▼" : "▶"}</span>
                      </button>

                      {(openLeftCategories.basic || leftSearchQuery) && (
                        <div className="grid grid-cols-2 gap-2">
                          {/* Container */}
                          {("container layout section flex grid").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("container")}
                              className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition hover:-translate-y-0.5 active:scale-95 group"
                            >
                              <ContainerBoxIcon />
                              <span className="text-xs font-bold">+ Add Layout Container</span>
                            </button>
                          )}

                          {/* Heading */}
                          {("heading title header h1 h2").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("heading")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md transition-all group relative text-center"
                            >
                              <HeadingBoxIcon />
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-blue-600">Heading</span>
                              <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-blue-500">+</span>
                            </button>
                          )}

                          {/* Text */}
                          {("text paragraph body content").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("text")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md transition-all group relative text-center"
                            >
                              <TextBoxIcon />
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-blue-600">Text</span>
                              <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-blue-500">+</span>
                            </button>
                          )}

                          {/* Image */}
                          {("image photo picture gallery").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("image")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md transition-all group relative text-center"
                            >
                              <ImageBoxIcon />
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-blue-600">Image</span>
                              <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-blue-500">+</span>
                            </button>
                          )}

                          {/* Button */}
                          {("button cta link action").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("button")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md transition-all group relative text-center"
                            >
                              <ButtonBoxIcon />
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-blue-600">Button</span>
                              <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-blue-500">+</span>
                            </button>
                          )}

                          {/* Div Block */}
                          {("div block section wrapper").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("div-block")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-[9px] group-hover:scale-110 transition-transform">
                                DIV
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-blue-600">Div Block</span>
                              <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-blue-500">+</span>
                            </button>
                          )}

                          {/* Paragraph */}
                          {("paragraph article copy text").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("paragraph")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 font-serif font-bold text-xs group-hover:scale-110 transition-transform">
                                P
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-blue-600">Paragraph</span>
                              <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black text-blue-500">+</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 2: NAVIGATION & SEARCH */}
                  {(leftCategoryFilter === "all" || leftCategoryFilter === "navigation") && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleLeftCategory("navigation")}
                        className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-600 py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>🧭</span> Navigation &amp; Search
                        </span>
                        <span>{openLeftCategories.navigation ? "▼" : "▶"}</span>
                      </button>

                      {(openLeftCategories.navigation || leftSearchQuery) && (
                        <div className="grid grid-cols-2 gap-2">
                          {/* Nav Menu */}
                          {("nav menu navbar link Header navigation").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("nav-menu")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                ☰
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-blue-600">Nav Menu</span>
                            </button>
                          )}

                          {/* WP Menu */}
                          {("wp wordpress menu header sync").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("wp-menu")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-sky-500 hover:bg-sky-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black text-xs group-hover:scale-110 transition-transform">
                                W
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-sky-600">WP Menu</span>
                            </button>
                          )}

                          {/* Menu Widget */}
                          {("menu widget dropdown control badge").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("menu-widget")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-indigo-500 hover:bg-indigo-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                🗂️
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-indigo-600">Menu Widget</span>
                            </button>
                          )}

                          {/* Mega Menu */}
                          {("mega menu column promo feature dropdown").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("mega-menu")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-purple-500 hover:bg-purple-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                ▦
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-purple-600">Mega Menu</span>
                            </button>
                          )}

                          {/* Breadcrumbs */}
                          {("breadcrumbs trail path hierarchy home seo").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("breadcrumbs")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-amber-500 hover:bg-amber-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                ››
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-amber-600">Breadcrumbs</span>
                            </button>
                          )}

                          {/* Menu Anchor */}
                          {("menu anchor pin scroll jump target").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("menu-anchor")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                ⚓
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-emerald-600">Anchor Pin</span>
                            </button>
                          )}

                          {/* Post Nav */}
                          {("post nav previous next article blog").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("post-nav")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-teal-500 hover:bg-teal-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                ⇄
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-teal-600">Post Nav</span>
                            </button>
                          )}

                          {/* Off Canvas */}
                          {("off canvas drawer slide flyout mobile").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("off-canvas-nav")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-rose-500 hover:bg-rose-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                ⇥
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-rose-600">Off Canvas</span>
                            </button>
                          )}

                          {/* Site Search */}
                          {("site search find autocomplete live query").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("site-search")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                🔍
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-blue-600">Site Search</span>
                            </button>
                          )}

                          {/* Search Form */}
                          {("search form input method action get post").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("search-form")}
                              className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-cyan-500 hover:bg-cyan-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                [🔍]
                              </div>
                              <span className="mt-1.5 text-[11px] font-bold text-slate-700 group-hover:text-cyan-600">Search Form</span>
                            </button>
                          )}

                          {/* Taxonomy Filter */}
                          {("taxonomy filter tags category categories pills count").includes(leftSearchQuery.toLowerCase()) && (
                            <button
                              onClick={() => handleAddElement("taxonomy-filter")}
                              className="col-span-2 flex items-center justify-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-amber-500 hover:bg-amber-50/50 hover:shadow-md transition-all group relative text-center"
                            >
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-bold text-xs group-hover:scale-110 transition-transform">
                                🏷️
                              </div>
                              <span className="text-xs font-bold text-slate-700 group-hover:text-amber-600">Taxonomy Filter</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
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
        {/* Right Sidebar: Inspector & Settings Panel  */}
        {/* ========================================== */}
        {activeSidebarTab && (
          <aside className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto">
            {/* Header / Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-1 sticky top-0 z-10">
              <button
                onClick={() => setActiveSidebarTab("element")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeSidebarTab === "element"
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Element Style
              </button>
              <button
                onClick={() => setActiveSidebarTab("global")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeSidebarTab === "global"
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Global Site
              </button>
            </div>

            <div className="p-4 space-y-6">
              {activeSidebarTab === "element" ? (
                <div>
                  {!selectedElement ? (
                    <div className="flex h-64 flex-col items-center justify-center text-center p-6 text-slate-400">
                      <p className="text-xs font-semibold">No Element Selected</p>
                      <p className="text-[11px] mt-1 text-slate-400">Click any element on the canvas to inspect & edit styles.</p>
                    </div>
                  ) : (
                    /* Element Style Panel */
                    <div className="space-y-4">
                      {/* Navigation Settings Renderer if selected element is navigation */}
                      {isNavigationElement(selectedElement.type) ? (
                        <NavigationSettingsPanel
                          selectedElement={selectedElement}
                          activeBreakpointId={activeBreakpointId}
                          breakpoints={breakpoints}
                          updateSelectedStyle={updateSelectedStyle}
                          updateSelectedProp={updateSelectedProp}
                          renderResponsiveLabel={renderResponsiveLabel}
                        />
                      ) : (
                        <div className="space-y-4">
                          {/* 2. Hover / Transform Effects */}
                          <div className="border-b border-slate-100 pb-3">
                            <span className="block font-bold text-slate-500 mb-2 uppercase tracking-wide text-[10px]">Hover Transform & Effects</span>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                {renderResponsiveLabel("Scale (x)", "hoverScale")}
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.5"
                                  max="2"
                                  placeholder="1.0"
                                  value={getStyleVal(selectedElement, "hoverScale", activeBreakpointId, breakpoints) || ""}
                                  onChange={(e) => updateSelectedStyle("hoverScale", e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-800 outline-none"
                                />
                            </div>
        {/* Left Palette */}
        {!isPreview && (
          <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4 overflow-y-auto shadow-sm flex flex-col gap-5">
            <div>
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-3">
                Structure
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsStructureModalOpen(true)}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-400 transition"
                >
                  <ContainerBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold text-slate-700">Container</span>
                </button>
                <button
                  onClick={() => {
                    const newEl = createGridPrimitive();
                    setUnifiedElements((prev) => insertTreeElement(prev, selectedId, newEl));
                    setSelectedId(newEl.id);
                  }}
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 hover:border-blue-400 transition"
                >
                  <GridBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold text-slate-700">Grid</span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                Basic Elements
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleAddElement("heading")} className="flex flex-col items-center p-3 border rounded-xl hover:border-blue-400">
                  <HeadingBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold">Heading</span>
                </button>
                <button onClick={() => handleAddElement("text")} className="flex flex-col items-center p-3 border rounded-xl hover:border-blue-400">
                  <TextBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold">Text</span>
                </button>
                <button onClick={() => handleAddElement("image")} className="flex flex-col items-center p-3 border rounded-xl hover:border-blue-400">
                  <ImageBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold">Image</span>
                </button>
                <button onClick={() => handleAddElement("button")} className="flex flex-col items-center p-3 border rounded-xl hover:border-blue-400">
                  <ButtonBoxIcon />
                  <span className="mt-1.5 text-xs font-semibold">Button</span>
                </button>
                <button onClick={() => handleAddElement("video")} className="flex flex-col items-center p-3 border rounded-xl hover:border-blue-400">
                  <span className="text-xl">📹</span>
                  <span className="mt-1.5 text-xs font-semibold">Video</span>
                </button>
                <button onClick={() => handleAddElement("icon")} className="flex flex-col items-center p-3 border rounded-xl hover:border-blue-400">
                  <span className="text-xl">★</span>
                  <span className="mt-1.5 text-xs font-semibold">Icon</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Center Canvas */}
        <main
          onClick={() => setSelectedId(null)}
          className="flex flex-1 justify-center items-start overflow-y-auto bg-[#f1f5f9] p-6 sm:p-10"
        >
          {activeCanvasMode === "popup" && activePopup ? (
            /* Popup Visual Editing Canvas */
            <div className="flex flex-col items-center justify-center w-full my-auto">
              <div className="mb-3 flex items-center justify-between w-full max-w-2xl px-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 uppercase">
                    {activePopup.layoutMode} Mode
                  </span>
                  <span className="text-xs font-bold text-slate-700">{activePopup.name}</span>
                </div>
                <button
                  onClick={() => setIsPopupManagerOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Manage All Popups
                </button>
              </div>

              {/* Backdrop Frame Simulation */}
              <div
                className="w-full max-w-4xl min-h-[550px] rounded-3xl p-8 flex items-center justify-center relative transition-all duration-200 border border-slate-300 shadow-inner"
                style={{
                  backgroundColor: activePopup.backdropOverlay ? activePopup.backdropColor : "#e2e8f0",
                }}
              >
                {/* Popup Container Box */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: activePopup.width || "580px",
                    maxWidth: "100%",
                    minHeight: activePopup.height === "auto" ? "200px" : activePopup.height || "auto",
                  }}
                  className={`bg-white shadow-2xl relative transition-all duration-150 ${
                    activePopup.layoutMode === "hello-bar"
                      ? "rounded-none w-full shadow-md"
                      : "rounded-2xl"
                  }`}
                >
                  {/* Close button badge */}
                  {activePopup.closeButton && (
                    <div
                      className={`absolute z-30 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-white text-xs font-bold ${
                        activePopup.closeButtonPosition === "outside"
                          ? "-top-3 -right-3"
                          : "top-3 right-3"
                      }`}
                    >
                      ✕
                    </div>
                  )}

                  {/* Popup Inner Elements */}
                  <div className="p-4">
                    {activePopup.elements.length === 0 ? (
                      <div
                        onClick={() => setIsStructureModalOpen(true)}
                        className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 cursor-pointer hover:border-blue-400 bg-slate-50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow font-bold">
                          +
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-700">Add Container into Popup</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activePopup.elements.map((el) => renderElementTree(el))}

                        <div className="pt-2">
                          <div
                            onClick={() => setIsStructureModalOpen(true)}
                            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-blue-50/40 hover:border-blue-400 py-3 cursor-pointer text-xs font-bold text-slate-600"
                          >
                            <span>+</span> Add Container to Popup
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Main Page Canvas */
            <div
              style={{
                width: "100%",
                maxWidth: `${breakpoints.find((b) => b.id === activeBreakpointId)?.width || 1024}px`,
              }}
              className="min-h-[750px] h-auto shrink-0 my-2 bg-white shadow-md rounded-2xl border border-slate-200 p-8 sm:p-10 relative"
            >
              {elements.length === 0 ? (
                <div
                  onClick={() => setIsStructureModalOpen(true)}
                  className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 cursor-pointer hover:border-blue-400"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
                    +
                  </div>
                  <p className="mt-4 text-sm font-bold text-slate-700">Click to add a Container</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {elements.map((el) => renderElementTree(el))}

                  {!isPreview && (
                    <div className="pt-4 pb-6">
                      <div
                        onClick={() => setIsStructureModalOpen(true)}
                        className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/40 hover:bg-blue-50/30 hover:border-blue-400 py-6 cursor-pointer"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow font-bold">
                          +
                        </div>
                        <span className="mt-2 text-xs font-bold text-slate-600">Add New Container</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Settings Inspector */}
        {!isPreview && (
          <aside className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col h-full shadow-sm overflow-hidden">
            {activeCanvasMode === "popup" && activePopup && !selectedElement ? (
              <PopupSettingsPanel
                popup={activePopup}
                onUpdatePopup={(updater) => handleUpdatePopup(activePopup.id, updater)}
                onExitPopupEdit={() => {
                  setActiveCanvasMode("page");
                  setSelectedId(null);
                }}
              />
            ) : (
              <>
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Settings & Design
                    </h2>
                    {activeCanvasMode === "popup" && (
                      <button
                        onClick={() => setSelectedId(null)}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        Popup Options →
                      </button>
                    )}
                  </div>
                  <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => selectedElement && setActiveSidebarTab("element")}
                      disabled={!selectedElement}
                      className={`flex-1 rounded-md py-1.5 text-center ${
                        activeSidebarTab === "element"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      Element Styles
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSidebarTab("global")}
                      className={`flex-1 rounded-md py-1.5 text-center ${
                        activeSidebarTab === "global"
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      Global & Site
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeSidebarTab === "element" && selectedElement ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold uppercase text-blue-600">
                          {selectedElement.type} Settings
                        </span>
                        <button
                          onClick={(e) => handleDeleteElement(selectedElement.id, e)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>

                      {selectedElement.type === "container" &&
                        renderAccordion(
                          "Layout & Structure",
                          "layout",
                          <div className="space-y-3">
                            <div>
                              {renderResponsiveLabel("Layout Engine")}
                              <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-xs">
                                {(["flex", "grid", "masonry"] as const).map((mode) => (
                                  <button
                                    key={mode}
                                    onClick={() => updateSelectedLayout("layoutType", mode)}
                                    className={`py-1 rounded capitalize ${
                                      (getLayoutVal(
                                        selectedElement,
                                        "layoutType",
                                        activeBreakpointId,
                                        breakpoints
                                      ) || "flex") === mode
                                        ? "bg-white text-blue-600 shadow"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {mode}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              {renderResponsiveLabel("Direction")}
                              <select
                                value={
                                  getLayoutVal(
                                    selectedElement,
                                    "direction",
                                    activeBreakpointId,
                                    breakpoints
                                  ) || "column"
                                }
                                onChange={(e) => updateSelectedLayout("direction", e.target.value)}
                                className="w-full rounded border px-2 py-1.5 text-xs"
                              >
                                <option value="column">Column (Vertical)</option>
                                <option value="row">Row (Horizontal)</option>
                              </select>
                            </div>

                            <div>
                              {renderResponsiveLabel("Spacing Gap (px)")}
                              <input
                                type="number"
                                value={
                                  getLayoutVal(
                                    selectedElement,
                                    "gap",
                                    activeBreakpointId,
                                    breakpoints
                                  ) ?? 16
                                }
                                onChange={(e) => updateSelectedLayout("gap", Number(e.target.value))}
                                className="w-full rounded border px-2 py-1 text-xs"
                              />
                            </div>
                          </div>
                        )}

                          <div>
                            {renderResponsiveLabel("Hover Opacity (%)", "hoverOpacity")}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={getStyleVal(selectedElement, "hoverOpacity", activeBreakpointId, breakpoints) || "100"}
                              onChange={(e) => updateSelectedStyle("hoverOpacity", e.target.value)}
                              className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                            />
                            <div className="text-right text-[10px] font-bold text-slate-400 mt-1">
                              {getStyleVal(selectedElement, "hoverOpacity", activeBreakpointId, breakpoints) || "100"}%
                            </div>
                          </div>
                        </div>

                      {/* 3. Mouse Effects (F-126, F-127, F-128) */}
                      <div className="border-b border-slate-100 pb-3">
                        <span className="block font-bold text-slate-500 mb-2 uppercase tracking-wide text-[10px]">Mouse Tracking & 3D Tilt</span>
                        <div className="space-y-3">
                          {/* Mouse Track */}
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 font-bold text-[10px] text-slate-500">
                              <input
                                type="checkbox"
                                checked={getStyleVal(selectedElement, "mouseTrackEnabled", activeBreakpointId, breakpoints) === "true"}
                                onChange={(e) => updateSelectedStyle("mouseTrackEnabled", e.target.checked ? "true" : "false")}
                                className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                              />
                              ENABLE MOUSE TRACKING
                            </label>
                            {getStyleVal(selectedElement, "mouseTrackEnabled", activeBreakpointId, breakpoints) === "true" && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">TRACKING SENSITIVITY</label>
                                <input
                                  type="range"
                                  min="-0.8"
                                  max="0.8"
                                  step="0.05"
                                  value={parseFloat(getStyleVal(selectedElement, "mouseTrackSpeed", activeBreakpointId, breakpoints) || "0.1")}
                                  onChange={(e) => updateSelectedStyle("mouseTrackSpeed", e.target.value)}
                                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                                />
                                <div className="text-right text-[10px] font-bold text-slate-400 mt-1">
                                  {getStyleVal(selectedElement, "mouseTrackSpeed", activeBreakpointId, breakpoints) || "0.1"} (speed)
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 3D Tilt */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-55 bg-transparent">
                            <label className="flex items-center gap-2 font-bold text-[10px] text-slate-500">
                              <input
                                type="checkbox"
                                checked={getStyleVal(selectedElement, "tilt3DEnabled", activeBreakpointId, breakpoints) === "true"}
                                onChange={(e) => updateSelectedStyle("tilt3DEnabled", e.target.checked ? "true" : "false")}
                                className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                              />
                              ENABLE 3D TILT EFFECT
                            </label>
                            {getStyleVal(selectedElement, "tilt3DEnabled", activeBreakpointId, breakpoints) === "true" && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 block mb-0.5 uppercase">MAX TILT ANGLE</label>
                                <input
                                  type="range"
                                  min="5"
                                  max="45"
                                  value={parseInt(getStyleVal(selectedElement, "tilt3DMax", activeBreakpointId, breakpoints) || "15")}
                                  onChange={(e) => updateSelectedStyle("tilt3DMax", e.target.value)}
                                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                                />
                                <div className="text-right text-[10px] font-bold text-slate-400 mt-1">
                                  {getStyleVal(selectedElement, "tilt3DMax", activeBreakpointId, breakpoints) || "15"} deg
                                </div>
                              </div>
                            )}
                          </div>
                      {selectedElement.type !== "container" && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            CONTENT
                          </label>
                          <input
                            type="text"
                            value={selectedElement.content || ""}
                            onChange={(e) => updateSelectedProp("content", e.target.value)}
                            className="w-full rounded border px-3 py-1.5 text-xs"
                          />
                        </div>
                      )}

                      {/* Smart Link & URL Controls (F-291) */}
                      {(selectedElement.type === "button" || selectedElement.type === "image" || selectedElement.href !== undefined) && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase">
                            Link & Smart Actions (F-291)
                          </label>
                          <input
                            type="text"
                            value={selectedElement.href || ""}
                            onChange={(e) => updateSelectedProp("href", e.target.value)}
                            placeholder="https://..., popup:open(id), scroll:to(id)"
                            className="w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono"
                          />
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {popups.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    updateSelectedProp("href", `popup:open(${e.target.value})`);
                                    e.target.value = "";
                                  }
                                }}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
                              >
                                <option value="">+ Open Popup...</option>
                                {popups.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => updateSelectedProp("href", "popup:close")}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Close Popup
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelectedProp("href", "scroll:to(top)")}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Scroll to Top
                            </button>
                          </div>
                        </div>
                      )}

                      {renderAccordion(
                        "Typography & Colors",
                        "typography",
                        <div className="space-y-3">
                          <div>
                            {renderResponsiveLabel("Text Color")}
                            <input
                              type="color"
                              value={
                                getStyleVal(selectedElement, "color", activeBreakpointId, breakpoints) ||
                                "#0f172a"
                              }
                              onChange={(e) => updateSelectedStyle("color", e.target.value)}
                              className="w-full h-8 cursor-pointer rounded border p-0.5"
                            />
                          </div>
                          <div>
                            {renderResponsiveLabel("Font Size (px)")}
                            <input
                              type="text"
                              value={
                                getStyleVal(
                                  selectedElement,
                                  "fontSize",
                                  activeBreakpointId,
                                  breakpoints
                                ) || "16px"
                              }
                              onChange={(e) =>
                                updateSelectedStyle(
                                  "fontSize",
                                  e.target.value.endsWith("px")
                                    ? e.target.value
                                    : `${e.target.value}px`
                                )
                              }
                              className="w-full rounded border px-2 py-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Site Identity */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="text-xs font-bold text-slate-700 mb-2">Site Identity</h3>
                        <input
                          type="text"
                          value={globalSettings.siteIdentity?.name || ""}
                          onChange={(e) =>
                            setGlobalSettings((prev: any) => ({
                              ...prev,
                              siteIdentity: { ...prev.siteIdentity, name: e.target.value },
                            }))
                          }
                          placeholder="Site Name"
                          className="w-full rounded border px-2 py-1 text-xs"
                        />
                      </div>

                      {/* Back To Top Button Settings (F-289) */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-700">Back To Top Button</h3>
                          <input
                            type="checkbox"
                            checked={globalSettings.backToTop?.enabled !== false}
                            onChange={(e) =>
                              setGlobalSettings((prev: any) => ({
                                ...prev,
                                backToTop: { ...prev.backToTop, enabled: e.target.checked },
                              }))
                            }
                            className="h-4 w-4 rounded text-blue-600"
                          />
                        </div>
                        {globalSettings.backToTop?.enabled !== false && (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-[11px] font-semibold text-slate-600">Position:</label>
                              <select
                                value={globalSettings.backToTop?.position || "bottom-right"}
                                onChange={(e) =>
                                  setGlobalSettings((prev: any) => ({
                                    ...prev,
                                    backToTop: { ...prev.backToTop, position: e.target.value },
                                  }))
                                }
                                className="rounded border px-2 py-1 text-[11px]"
                              >
                                <option value="bottom-right">Bottom Right</option>
                                <option value="bottom-left">Bottom Left</option>
                              </select>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-[11px] font-semibold text-slate-600">Scroll Offset (px):</label>
                              <input
                                type="number"
                                value={globalSettings.backToTop?.offset ?? 300}
                                onChange={(e) =>
                                  setGlobalSettings((prev: any) => ({
                                    ...prev,
                                    backToTop: { ...prev.backToTop, offset: Number(e.target.value) },
                                  }))
                                }
                                className="w-20 rounded border px-2 py-1 text-[11px]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Floating Action Button Settings (F-287) */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-700">Floating Action Button (FAB)</h3>
                          <input
                            type="checkbox"
                            checked={globalSettings.floatingActionButton?.enabled === true}
                            onChange={(e) =>
                              setGlobalSettings((prev: any) => ({
                                ...prev,
                                floatingActionButton: {
                                  ...prev.floatingActionButton,
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                            className="h-4 w-4 rounded text-blue-600"
                          />
                        </div>

                        {globalSettings.floatingActionButton?.enabled && (
                          <div className="space-y-2 pt-1">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                Icon & Type
                              </label>
                              <select
                                value={globalSettings.floatingActionButton?.icon || "whatsapp"}
                                onChange={(e) =>
                                  setGlobalSettings((prev: any) => ({
                                    ...prev,
                                    floatingActionButton: {
                                      ...prev.floatingActionButton,
                                      icon: e.target.value,
                                      backgroundColor:
                                        e.target.value === "whatsapp" ? "#25D366" : prev.floatingActionButton?.backgroundColor || "#2563eb",
                                    },
                                  }))
                                }
                                className="w-full rounded border px-2 py-1 text-[11px]"
                              >
                                <option value="whatsapp">WhatsApp Button</option>
                                <option value="chat">Live Chat / Message</option>
                                <option value="phone">Call Now (Phone)</option>
                                <option value="email">Email Us</option>
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
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                Label
                              </label>
                              <input
                                type="text"
                                value={globalSettings.floatingActionButton?.label || ""}
                                onChange={(e) =>
                                  setGlobalSettings((prev: any) => ({
                                    ...prev,
                                    floatingActionButton: {
                                      ...prev.floatingActionButton,
                                      label: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Chat with us"
                                className="w-full rounded border px-2 py-1 text-[11px]"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                Link or Smart Action
                              </label>
                              <input
                                type="text"
                                value={globalSettings.floatingActionButton?.link || ""}
                                onChange={(e) =>
                                  setGlobalSettings((prev: any) => ({
                                    ...prev,
                                    floatingActionButton: {
                                      ...prev.floatingActionButton,
                                      link: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="https://wa.me/... or popup:open(id)"
                                className="w-full rounded border px-2 py-1 text-[11px] font-mono"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <label className="text-[11px] font-semibold text-slate-600">Position:</label>
                              <select
                                value={globalSettings.floatingActionButton?.position || "bottom-left"}
                                onChange={(e) =>
                                  setGlobalSettings((prev: any) => ({
                                    ...prev,
                                    floatingActionButton: {
                                      ...prev.floatingActionButton,
                                      position: e.target.value,
                                    },
                                  }))
                                }
                                className="rounded border px-2 py-1 text-[11px]"
                              >
                                <option value="bottom-left">Bottom Left</option>
                                <option value="bottom-right">Bottom Right</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* Structure Preset Modal */}
      {isStructureModalOpen && (
        <div
          onClick={() => setIsStructureModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800">Select your Structure</h3>
              <button onClick={() => setIsStructureModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "single", label: "1 Column", cols: [1] },
                { id: "cols-2-equal", label: "2 Columns (50/50)", cols: [1, 1] },
                { id: "cols-3-equal", label: "3 Columns (33/33/33)", cols: [1, 1, 1] },
                { id: "cols-2-30-70", label: "2 Columns (30/70)", cols: [0.3, 0.7] },
                { id: "cols-2-70-30", label: "2 Columns (70/30)", cols: [0.7, 0.3] },
                { id: "cols-4-equal", label: "4 Columns (25% each)", cols: [1, 1, 1, 1] },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    handleInsertStructure(preset.id as StructurePresetType);
                    setIsStructureModalOpen(false);
                  }}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border p-3 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/50"
                >
                  <div className="w-full h-10 border rounded bg-white p-1 flex gap-1">
                    {preset.cols.map((_, i) => (
                      <div key={i} className="h-full bg-slate-200 rounded flex-1" />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popup Manager Modal (F-289) */}
      <PopupManagerModal
        isOpen={isPopupManagerOpen}
        onClose={() => setIsPopupManagerOpen(false)}
        popups={popups}
        onSelectPopupForEdit={handleSelectPopupForEdit}
        onCreatePopup={handleCreatePopup}
        onUpdatePopup={handleUpdatePopup}
        onDeletePopup={handleDeletePopup}
        onDuplicatePopup={handleDuplicatePopup}
      />

      {/* Runtime Simulation in Preview Mode (F-282 - F-291) */}
      {isPreview && (
        <PopupRuntimePreview
          popups={popups}
          renderElementTree={renderElementTree}
          onTrackView={handleTrackPopupView}
          onTrackClick={handleTrackPopupClick}
          isPreviewMode={true}
          globalSettings={globalSettings}
        />
      )}
    </div>
  );
}