<<<<<<< HEAD
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { PopupConfig } from "../../types/popup.types";
import PopupManagerModal from "./components/PopupManagerModal";
import PopupSettingsPanel from "./components/PopupSettingsPanel";
import PopupRuntimePreview from "./components/PopupRuntimePreview";
=======
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { pluginRegistry } from "../../plugins/plugin.registry";
>>>>>>> 8d95dec (Initial project code)

// ==========================================
// Types & Interfaces
// ==========================================

<<<<<<< HEAD
export type ElementType =
  | "container" | "heading" | "text" | "image" | "button"
  | "video" | "divider" | "spacer" | "icon" | "rating"
  | "progress-bar" | "counter" | "html" | "alert"
  | "social-icons" | "google-maps" | "soundcloud"
  | "div-block" | "paragraph";

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
=======
export type ElementType = "container" | "heading" | "text" | "image" | "button" | "html" | "shortcode" | "plugin";

export interface ContainerLayout {
  direction?: "column" | "row";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
  gap?: number;
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
=======
>>>>>>> 8d95dec (Initial project code)
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  lineHeight?: string;

<<<<<<< HEAD
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
=======
  // Typography Controls (F-070, F-089)
  fontFamily?: string;
  letterSpacing?: string;
  wordSpacing?: string;

  // Background Options (F-073, F-074, F-075, F-076, F-077, F-078)
  backgroundType?: "solid" | "gradient" | "image" | "video" | "slideshow";
  backgroundGradient?: string;
  backgroundImageUrl?: string;
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
  borderTopLeftRadius?: string;
  borderTopRightRadius?: string;
  borderBottomRightRadius?: string;
  borderBottomLeftRadius?: string;

  // Shadows (F-081, F-093)
  boxShadow?: string;
=======

  // Shadows (F-081, F-093)
  boxShadow?: string;
  textShadow?: string;
>>>>>>> 8d95dec (Initial project code)

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
<<<<<<< HEAD
=======

  // Text Path (F-090)
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD

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

=======
}

>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
  customClass?: string;
  styles: ElementStyles;
  hoverStyles?: Partial<ElementStyles>;
  layout?: ContainerLayout;
  children?: EditorElement[];
  componentId?: string;
  isComponent?: boolean;
  componentName?: string;
=======
  customClass?: string; // Legacy
  customClasses?: string[]; // F-106
  customId?: string; // CSS ID selector support
  customCss?: string; // F-102: Element Custom CSS
  customAttributes?: Record<string, string>; // F-108: Custom HTML/Data attributes
  customLinkAttributes?: {
    target?: string;
    rel?: string;
    download?: string;
    hreflang?: string;
    type?: string;
    referrerPolicy?: string;
  }; // F-109: Custom Link/Anchor attributes
  htmlContent?: string; // F-110: Custom HTML Widget content
  htmlAllowScripts?: boolean; // F-110
  shortcode?: string; // F-111: Shortcode Widget content
  pluginId?: string; // F-119: Missing Plugin ID Tracking
  pluginComponentKey?: string; // F-119: Component Registry Key
  pluginProps?: any; // F-119: Plugin configuration payload
  styles: ElementStyles;
  layout?: ContainerLayout;
  children?: EditorElement[];
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
    popups?: PopupConfig[];
=======
    pageCustomCss?: string; // F-103: Page Custom CSS
>>>>>>> 8d95dec (Initial project code)
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

<<<<<<< HEAD
=======
// Tree Navigation & Manipulation Helpers
function getSafeAttributes(el: EditorElement): Record<string, string> {
  const safeAttrs: Record<string, string> = {};
  if (el.customAttributes) {
    const forbidden = ["class", "classname", "id", "style", "src", "href", "key", "ref", "data-forgestudio-custom-code", "target", "rel", "download", "hreflang", "type", "referrerpolicy"];
    for (const [key, val] of Object.entries(el.customAttributes)) {
      const cleanKey = key.trim().toLowerCase();
      if (!cleanKey) continue;
      if (forbidden.includes(cleanKey)) continue;
      // Block event-handlers starting with "on"
      if (cleanKey.startsWith("on")) continue;
      // Block JS URL scripts
      if (val.trim().toLowerCase().startsWith("javascript:")) continue;

      safeAttrs[key.trim()] = val;
    }
  }
  return safeAttrs;
}

function getSafeLinkAttributes(el: EditorElement): Record<string, string> {
  const linkAttrs: Record<string, string> = {};
  if (el.customLinkAttributes) {
    const { target, rel, download, hreflang, type, referrerPolicy } = el.customLinkAttributes;

    // 1. target validation: _self, _blank, _parent, _top
    if (target && ["_self", "_blank", "_parent", "_top"].includes(target)) {
      linkAttrs["target"] = target;
    }

    // 2. rel validation: tokens only
    if (rel) {
      const cleanRel = rel.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
      if (cleanRel) linkAttrs["rel"] = cleanRel;
    }

    // 3. download validation: treat as filename
    if (download) {
      const lowerVal = download.trim().toLowerCase();
      if (!lowerVal.startsWith("javascript")) {
        const cleanDownload = download.replace(/[<>:"/\\|?*]/g, "").trim();
        if (cleanDownload) linkAttrs["download"] = cleanDownload;
      }
    }

    // 4. hreflang validation: standard locale format
    if (hreflang) {
      const cleanLang = hreflang.replace(/[^a-zA-Z-]/g, "").trim();
      if (cleanLang) linkAttrs["hreflang"] = cleanLang;
    }

    // 5. type validation: MIME-type values
    if (type) {
      const cleanType = type.replace(/[^a-zA-Z0-9/+-]/g, "").trim();
      if (cleanType) linkAttrs["type"] = cleanType;
    }

    // 6. referrerPolicy validation
    const validPolicies = [
      "no-referrer",
      "no-referrer-when-downgrade",
      "origin",
      "origin-when-cross-origin",
      "same-origin",
      "strict-origin",
      "strict-origin-when-cross-origin",
      "unsafe-url"
    ];
    if (referrerPolicy && validPolicies.includes(referrerPolicy)) {
      linkAttrs["referrerpolicy"] = referrerPolicy;
    }
  }
  return linkAttrs;
}

function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    const cleanNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        // Remove prohibited executable resources
        if (["script", "object", "embed", "link", "iframe", "form"].includes(tagName)) {
          el.remove();
          return;
        }

        // Strip inline events & javascript: targets
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toLowerCase();
          const attrVal = attr.value.toLowerCase().trim();

          if (attrName.startsWith("on")) {
            el.removeAttribute(attr.name);
          } else if (attrVal.startsWith("javascript:")) {
            el.removeAttribute(attr.name);
          }
        }
      }

      const children = Array.from(node.childNodes);
      for (const child of children) {
        cleanNode(child);
      }
    };

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch (err) {
    console.error("HTML Sanitization Error: ", err);
    return rawHtml;
  }
}

function getHtmlValidity(htmlStr: string): { isValid: boolean; errorMsg?: string } {
  if (!htmlStr) return { isValid: true };
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, "text/xml");
    const parserErrors = doc.querySelectorAll("parsererror");
    if (parserErrors.length > 0) {
      return { isValid: false, errorMsg: parserErrors[0].textContent || "Syntax error" };
    }
    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, errorMsg: err.message };
  }
}

function getJSSyntaxValidity(code: string): { isValid: boolean; errorMsg?: string } {
  if (!code) return { isValid: true };
  let line = 1;
  let column = 1;
  const stack: { type: string; line: number; column: number }[] = [];
  let inString: string | null = null;
  let inComment = false;
  let inLineComment = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1] || "";

    const curLine = line;
    const curCol = column;

    if (char === "\n") {
      line++;
      column = 1;
      inLineComment = false;
    } else {
      column++;
    }

    if (inLineComment) {
      continue;
    }

    if (inComment) {
      if (char === "*" && nextChar === "/") {
        inComment = false;
        i++; // skip '/'
        column++;
      }
      continue;
    }

    if (inString) {
      if (char === inString && code[i - 1] !== "\\") {
        inString = null;
      }
      continue;
    }

    if (char === "/" && nextChar === "/") {
      inLineComment = true;
      i++;
      column++;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      inComment = true;
      i++;
      column++;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === "{") {
      stack.push({ type: "{", line: curLine, column: curCol });
    } else if (char === "}") {
      const top = stack.pop();
      if (!top || top.type !== "{") {
        return {
          isValid: false,
          errorMsg: `Unexpected token "}" at Line ${curLine}, Column ${curCol}`,
        };
      }
    } else if (char === "(") {
      stack.push({ type: "(", line: curLine, column: curCol });
    } else if (char === ")") {
      const top = stack.pop();
      if (!top || top.type !== "(") {
        return {
          isValid: false,
          errorMsg: `Unexpected token ")" at Line ${curLine}, Column ${curCol}`,
        };
      }
    } else if (char === "[") {
      stack.push({ type: "[", line: curLine, column: curCol });
    } else if (char === "]") {
      const top = stack.pop();
      if (!top || top.type !== "[") {
        return {
          isValid: false,
          errorMsg: `Unexpected token "]" at Line ${curLine}, Column ${curCol}`,
        };
      }
    }
  }

  if (inComment) {
    return {
      isValid: false,
      errorMsg: `Unclosed comment '/*' at Line ${line}, Column ${column}`,
    };
  }

  if (inString) {
    return {
      isValid: false,
      errorMsg: `Unclosed string literal at Line ${line}, Column ${column}`,
    };
  }

  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    return {
      isValid: false,
      errorMsg: `Unexpected token "${top.type === "{" ? "}" : top.type === "(" ? ")" : "]"}" (Unclosed brace opening) at Line ${top.line}, Column ${top.column}`,
    };
  }

  return { isValid: true };
}

function getCssSyntaxValidity(code: string): { isValid: boolean; errorMsg?: string } {
  if (!code) return { isValid: true };
  let line = 1;
  let column = 1;
  const stack: { type: string; line: number; column: number }[] = [];
  let inString: string | null = null;
  let inComment = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1] || "";

    const curLine = line;
    const curCol = column;

    if (char === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }

    if (inComment) {
      if (char === "*" && nextChar === "/") {
        inComment = false;
        i++; // skip '/'
        column++;
      }
      continue;
    }

    if (inString) {
      if (char === inString && code[i - 1] !== "\\") {
        inString = null;
      }
      continue;
    }

    if (char === "/" && nextChar === "*") {
      inComment = true;
      i++; // skip '*'
      column++;
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === "{") {
      stack.push({ type: "{", line: curLine, column: curCol });
    } else if (char === "}") {
      const top = stack.pop();
      if (!top || top.type !== "{") {
        return {
          isValid: false,
          errorMsg: `Unexpected closing brace '}' at Line ${curLine}, Column ${curCol}`,
        };
      }
    } else if (char === "(") {
      stack.push({ type: "(", line: curLine, column: curCol });
    } else if (char === ")") {
      const top = stack.pop();
      if (!top || top.type !== "(") {
        return {
          isValid: false,
          errorMsg: `Unexpected closing parenthesis ')' at Line ${curLine}, Column ${curCol}`,
        };
      }
    }
  }

  if (inComment) {
    return {
      isValid: false,
      errorMsg: `Unclosed comment '/*' at Line ${line}, Column ${column}`,
    };
  }

  if (inString) {
    return {
      isValid: false,
      errorMsg: `Unclosed string literal at Line ${line}, Column ${column}`,
    };
  }

  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    return {
      isValid: false,
      errorMsg: `CSS syntax error: Unclosed brace '${top.type}' opened at Line ${top.line}, Column ${top.column}`,
    };
  }

  return { isValid: true };
}

function getShortcodeValidity(codeStr: string): { isValid: boolean; errorMsg?: string } {
  if (!codeStr) return { isValid: true };
  const trimmed = codeStr.trim();

  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return { isValid: false, errorMsg: "Shortcode must start with '[' and end with ']'" };
  }

  const openCount = (trimmed.match(/\[/g) || []).length;
  const closeCount = (trimmed.match(/\]/g) || []).length;
  if (openCount !== closeCount) {
    return { isValid: false, errorMsg: "Unmatched brackets" };
  }

  const shortcodeRegex = /^\[[a-zA-Z0-9_-]+(\s+[a-zA-Z0-9_-]+="[^"]*")*\s*\]$/;
  if (!shortcodeRegex.test(trimmed)) {
    return { isValid: false, errorMsg: "Invalid format. Use key=\"value\" attributes." };
  }

  return { isValid: true };
}

function checkDuplicateId(list: EditorElement[], targetId: string, currentElementId: string): boolean {
  if (!targetId || !targetId.trim()) return false;
  const cleanTarget = targetId.trim();
  for (const el of list) {
    if (el.id !== currentElementId && el.customId === cleanTarget) {
      return true;
    }
    if (el.children && el.children.length > 0) {
      if (checkDuplicateId(el.children, cleanTarget, currentElementId)) {
        return true;
      }
    }
  }
  return false;
}

>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
=======

>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
=======

>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
=======

>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
=======

>>>>>>> 8d95dec (Initial project code)
  const target = findTreeElement(list, targetId);
  if (!target) {
    return [...list, newEl];
  }
<<<<<<< HEAD
  if (target.type === "container" || target.type === "div-block") {
=======

  if (target.type === "container") {
>>>>>>> 8d95dec (Initial project code)
    return updateTreeElement(list, targetId, (c) => ({
      ...c,
      children: [...(c.children || []), newEl],
    }));
  }
<<<<<<< HEAD
=======

  // If target is inside a container, append after target
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
  const updatedList = insertInArray(list);
  return inserted ? updatedList : [...list, newEl];
}

// ==========================================
// Cascading Value Resolution
=======

  const updatedList = insertInArray(list);
  if (!inserted) {
    return [...list, newEl];
  }
  return updatedList;
}

// ==========================================
// Cascading Value Resolution (Inheritance)
>>>>>>> 8d95dec (Initial project code)
// ==========================================

export function getBreakpointFallbackChain(bpId: string, activeBps: Breakpoint[]): string[] {
  const activeBpsSorted = [...activeBps].filter(b => b.active).sort((a, b) => b.width - a.width);
  const bp = activeBps.find(b => b.id === bpId);
  const desktop = activeBps.find(b => b.id === "desktop") || { id: "desktop", width: 1024 };

<<<<<<< HEAD
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
=======
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
>>>>>>> 8d95dec (Initial project code)
  }
}

export function getStyleVal(
  el: EditorElement,
  prop: keyof ElementStyles,
  bpId: string,
  activeBps: Breakpoint[]
<<<<<<< HEAD
): any {
=======
): string | undefined {
>>>>>>> 8d95dec (Initial project code)
  const chain = getBreakpointFallbackChain(bpId, activeBps);
  for (const id of chain) {
    if (id === "desktop") {
      if (el.styles && el.styles[prop] !== undefined && el.styles[prop] !== "") {
        return el.styles[prop];
      }
    } else {
      const bpStyles = el.responsiveStyles?.[id];
<<<<<<< HEAD
      if (bpStyles && (bpStyles as any)[prop] !== undefined && (bpStyles as any)[prop] !== "") {
        return (bpStyles as any)[prop];
=======
      if (bpStyles && bpStyles[prop] !== undefined && bpStyles[prop] !== "") {
        return bpStyles[prop];
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
  const getVal = (prop: keyof ElementStyles): string | undefined => getStyleVal(el, prop, bpId, activeBps);

=======

  const getVal = (prop: keyof ElementStyles): string | undefined => {
    return getStyleVal(el, prop, bpId, activeBps);
  };

  // Basic styling
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
  if (fontFamily && fontFamily !== "inherit") styles.fontFamily = fontFamily;
=======
  if (fontFamily && fontFamily !== "inherit") {
    styles.fontFamily = fontFamily;
  }
>>>>>>> 8d95dec (Initial project code)

  const letterSpacing = getVal("letterSpacing");
  if (letterSpacing) styles.letterSpacing = letterSpacing.endsWith("px") || letterSpacing.endsWith("em") ? letterSpacing : `${letterSpacing}px`;

  const wordSpacing = getVal("wordSpacing");
  if (wordSpacing) styles.wordSpacing = wordSpacing.endsWith("px") || wordSpacing.endsWith("em") ? wordSpacing : `${wordSpacing}px`;

<<<<<<< HEAD
=======
  // Margin/Padding
>>>>>>> 8d95dec (Initial project code)
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

<<<<<<< HEAD
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

=======
  // Background Options (F-073, F-074, F-075, F-076)
>>>>>>> 8d95dec (Initial project code)
  const bgType = getVal("backgroundType") || "solid";
  if (bgType === "solid") {
    const bgColor = getVal("backgroundColor");
    if (bgColor) styles.backgroundColor = bgColor;
  } else if (bgType === "gradient") {
    const gradient = getVal("backgroundGradient");
    if (gradient) styles.background = gradient;
  } else if (bgType === "image") {
<<<<<<< HEAD
    const bgImgUrl = getVal("backgroundImageUrl") || getVal("backgroundImage");
=======
    const bgImgUrl = getVal("backgroundImageUrl");
>>>>>>> 8d95dec (Initial project code)
    if (bgImgUrl) {
      styles.backgroundImage = `url(${bgImgUrl})`;
      styles.backgroundPosition = getVal("backgroundPosition") || "center center";
      styles.backgroundRepeat = getVal("backgroundRepeat") || "no-repeat";
      styles.backgroundSize = getVal("backgroundSize") || "cover";
    }
  }

<<<<<<< HEAD
=======
  // Borders (F-079)
>>>>>>> 8d95dec (Initial project code)
  const borderStyle = getVal("borderStyle");
  if (borderStyle && borderStyle !== "none") {
    styles.borderStyle = borderStyle as any;
    styles.borderWidth = getVal("borderWidth") || "1px";
    styles.borderColor = getVal("borderColor") || "#cbd5e1";
  }

<<<<<<< HEAD
  const boxShadow = getVal("boxShadow");
  if (boxShadow) styles.boxShadow = boxShadow;

  const opacity = getVal("opacity");
  if (opacity) styles.opacity = parseFloat(opacity) / 100;

  const mixBlendMode = getVal("mixBlendMode");
  if (mixBlendMode && mixBlendMode !== "normal") styles.mixBlendMode = mixBlendMode as any;

=======
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
>>>>>>> 8d95dec (Initial project code)
  const blur = getVal("filterBlur") || "0";
  const brightness = getVal("filterBrightness") || "100";
  const contrast = getVal("filterContrast") || "100";
  const grayscale = getVal("filterGrayscale") || "0";
  const saturate = getVal("filterSaturate") || "100";
  const hueRotate = getVal("filterHueRotate") || "0";
  if (blur !== "0" || brightness !== "100" || contrast !== "100" || grayscale !== "0" || saturate !== "100" || hueRotate !== "0") {
    styles.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) saturate(${saturate}%) hue-rotate(${hueRotate}deg)`;
  }

<<<<<<< HEAD
  const clipPath = getVal("clipPath");
  if (clipPath && clipPath !== "none") styles.clipPath = clipPath;

=======
  // Clip Path Masks (F-085)
  const clipPath = getVal("clipPath");
  if (clipPath && clipPath !== "none") {
    styles.clipPath = clipPath;
  }

  // Transforms (F-086)
>>>>>>> 8d95dec (Initial project code)
  const rotate = getVal("transformRotate") || "0";
  const scale = getVal("transformScale") || "1";
  const skewX = getVal("transformSkewX") || "0";
  const skewY = getVal("transformSkewY") || "0";
  const tx = getVal("transformTranslateX") || "0";
  const ty = getVal("transformTranslateY") || "0";
  if (rotate !== "0" || scale !== "1" || skewX !== "0" || skewY !== "0" || tx !== "0" || ty !== "0") {
    styles.transform = `translate(${tx}px, ${ty}px) rotate(${rotate}deg) scale(${scale}) skew(${skewX}deg, ${skewY}deg)`;
  }

<<<<<<< HEAD
=======
  // Text Outline / Stroke (F-087)
>>>>>>> 8d95dec (Initial project code)
  const strokeWidth = getVal("textStrokeWidth");
  const strokeColor = getVal("textStrokeColor");
  if (strokeWidth && strokeWidth !== "0") {
    (styles as any).WebkitTextStroke = `${strokeWidth}px ${strokeColor || "currentColor"}`;
  }

<<<<<<< HEAD
  const textShadow = getVal("textShadow");
  if (textShadow) styles.textShadow = textShadow;
=======
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
>>>>>>> 8d95dec (Initial project code)

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
<<<<<<< HEAD
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
=======
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
=======
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"
            }`}
>>>>>>> 8d95dec (Initial project code)
          style={{ backgroundImage: `url(${url})` }}
        />
      ))}
    </div>
  );
}

<<<<<<< HEAD
// Icons & Widgets Helpers
=======
// ==========================================
// Sidebar Vector Icons (Matching Screenshot)
// ==========================================

>>>>>>> 8d95dec (Initial project code)
const ContainerBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="3 3" />
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  </div>
);

<<<<<<< HEAD
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
=======
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

>>>>>>> 8d95dec (Initial project code)
const ImageBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-emerald-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  </div>
);
<<<<<<< HEAD
=======

>>>>>>> 8d95dec (Initial project code)
const ButtonBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center">
    <div className="h-4 w-5 rounded-md border-2 border-slate-700 bg-slate-100" />
  </div>
);
<<<<<<< HEAD
=======

const CodeBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  </div>
);

const ShortcodeBoxIcon = () => (
  <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-50 text-indigo-650">
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 17v-4c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v4" />
      <path d="M12 9v2" />
      <path d="M8 9h8" />
    </svg>
  </div>
);

// Colorful placeholder icon inside empty image box
>>>>>>> 8d95dec (Initial project code)
const EmptyPictureIcon = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" />
    </svg>
  </div>
);

<<<<<<< HEAD
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
=======
// Upload Icon
const UploadCloudIcon = () => (
  <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
>>>>>>> 8d95dec (Initial project code)

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
<<<<<<< HEAD
          layoutType: "flex",
=======
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
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
=======
>>>>>>> 8d95dec (Initial project code)
    case "html":
      return {
        id,
        type: "html",
<<<<<<< HEAD
        content: "<div style='padding:20px; background:#eff6ff; border-radius:8px; border:1px solid #bfdbfe;'><p style='margin:0; font-size:14px;'>Custom HTML Code</p></div>",
        styles: {
=======
        content: "Custom HTML",
        htmlContent: `<section class="custom-section py-8 px-6 bg-slate-900 text-white rounded-xl shadow-lg">\n  <h2 class="text-xl font-bold mb-2">⚡ HTML Widget</h2>\n  <p class="text-sm text-slate-350">Double-click or use sidebar to edit this widget's raw HTML.</p>\n</section>`,
        styles: {
          width: "100%",
          marginTop: "16px",
          marginBottom: "16px",
        },
      };
    case "shortcode":
      return {
        id,
        type: "shortcode",
        content: "Shortcode",
        shortcode: "[contact-form]",
        styles: {
          width: "100%",
>>>>>>> 8d95dec (Initial project code)
          marginTop: "12px",
          marginBottom: "12px",
        },
      };
<<<<<<< HEAD
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
=======
    case "plugin":
      return {
        id,
        type: "plugin",
        content: "Plugin Item",
        styles: { width: "100%", marginTop: "0", marginBottom: "0" }
      };
    default:
      return {
        id,
        type: "text",
        content: "Unknown Element",
        styles: {}
>>>>>>> 8d95dec (Initial project code)
      };
  }
}

// ==========================================
<<<<<<< HEAD
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
=======
// Main WebsiteEditor Component
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
=======
  const fileInputRef = useRef<HTMLInputElement | null>(null);

>>>>>>> 8d95dec (Initial project code)
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // State Management
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [elements, setElements] = useState<EditorElement[]>([]);
<<<<<<< HEAD
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const [isPopupManagerOpen, setIsPopupManagerOpen] = useState(false);
  const [activeCanvasMode, setActiveCanvasMode] = useState<"page" | "popup">("page");
  const [activePopupId, setActivePopupId] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

=======
  const [selectedId, setSelectedId] = useState<string | null>(null);
>>>>>>> 8d95dec (Initial project code)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isPreview, setIsPreview] = useState(false);
<<<<<<< HEAD
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
=======
  const [pageCustomCss, setPageCustomCss] = useState(""); // F-103: Page Custom CSS state
  const [newClassInput, setNewClassInput] = useState(""); // F-106: Tag input state
  const [tempHtml, setTempHtml] = useState(""); // F-110: Raw html edit state
  const [tempShortcode, setTempShortcode] = useState(""); // F-111: Shortcode edit state
  const [snippetName, setSnippetName] = useState(""); // F-112: Custom code name
  const [snippetCode, setSnippetCode] = useState(""); // F-112: Custom code content
  const [snippetType, setSnippetType] = useState<"javascript" | "css" | "html">("javascript"); // F-112: Code type
  const [snippetPlacement, setSnippetPlacement] = useState<"head" | "body-start" | "body-end">("body-end"); // F-112: Code placement
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null); // F-112: Edited snippet ID
  const [condType, setCondType] = useState<"device" | "environment" | "auth">("device"); // F-113: Condition scope
  const [condOperator, setCondOperator] = useState<"equals" | "not_equals">("equals"); // F-113: Condition operator
  const [condValue, setCondValue] = useState("desktop"); // F-113: Condition value value
  const [snippetConditions, setSnippetConditions] = useState<any[]>([]); // F-113: Selected snippet rules list
  const [minifyInProduction, setMinifyInProduction] = useState(true); // F-114: Minify toggle
  const [simulatedEnvironment, setSimulatedEnvironment] = useState<"development" | "staging" | "production">("development"); // F-117: Environment simulator
  const isProductionSimulation = simulatedEnvironment === "production"; // F-114/F-117: Derived production simulation toggle
  const [snippetEnvironments, setSnippetEnvironments] = useState<string[]>(["development", "staging", "production"]); // F-117: Target environments checkboxes state
  const [snippetDependencies, setSnippetDependencies] = useState<{ type: "javascript" | "css"; url: string }[]>([]); // F-120: Custom Code dependencies
  const [newDepType, setNewDepType] = useState<"javascript" | "css">("javascript"); // F-120: Add type state
  const [newDepUrl, setNewDepUrl] = useState(""); // F-120: Add URL state
  const [scheduleTargetId, setScheduleTargetId] = useState<string | null>(null); // F-115: ID of snippet being scheduled
  const [scheduleDate, setScheduleDate] = useState<string>(""); // F-115: Scheduled Date state
  const [snippetPriority, setSnippetPriority] = useState<number>(100); // F-116: Priority state
  const [lintDiagnostics, setLintDiagnostics] = useState<{ severity: "error" | "warning"; message: string; line?: number; column?: number }[]>([]); // F-117: Linter results
  const [viewingHistorySnippetId, setViewingHistorySnippetId] = useState<string | null>(null); // F-115: Viewing history snippet ID
  const [viewingRevisionId, setViewingRevisionId] = useState<string | null>(null); // F-115: Viewing revision item ID

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(DEFAULT_BREAKPOINTS);
  const [activeBreakpointId, setActiveBreakpointId] = useState<string>("desktop");
  const [isBpModalOpen, setIsBpModalOpen] = useState(false);

  // F-124 Command Palette State
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Global settings state (F-066 to F-101)
>>>>>>> 8d95dec (Initial project code)
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 8d95dec (Initial project code)
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

<<<<<<< HEAD
  useEffect(() => {
    if (selectedId) {
      setActiveSidebarTab("element");
    } else if (activeCanvasMode === "popup") {
      setActiveSidebarTab("popup");
    } else {
      setActiveSidebarTab("global");
    }
  }, [selectedId, activeCanvasMode]);
=======
  // When an element is selected, switch to element tab (F-066)
  useEffect(() => {
    if (selectedId) {
      setActiveSidebarTab("element");
    } else {
      setActiveSidebarTab("global");
    }
    setNewClassInput("");
  }, [selectedId]);



  // F-110: Sync htmlContent to temporary editing text state
  useEffect(() => {
    const el = selectedId ? findTreeElement(elements, selectedId) : null;
    if (el && el.type === "html") {
      setTempHtml(el.htmlContent || "");
    } else {
      setTempHtml("");
    }
  }, [selectedId, elements]);

  // F-111: Sync shortcode to temporary editing text state
  useEffect(() => {
    const el = selectedId ? findTreeElement(elements, selectedId) : null;
    if (el && el.type === "shortcode") {
      setTempShortcode(el.shortcode || "");
    } else {
      setTempShortcode("");
    }
  }, [selectedId, elements]);

  // F-113: Reset condition value according to chosen condition type
  useEffect(() => {
    if (condType === "device") setCondValue("desktop");
    else if (condType === "environment") setCondValue("preview");
    else if (condType === "auth") setCondValue("logged-in");
  }, [condType]);

  // F-114: Custom Code Minifier/Optimizer (Safe parsed tokenizer check)
  const minifySnippet = (code: string, type: "javascript" | "css" | "html"): string => {
    try {
      const trimmed = code.trim();
      if (!trimmed) return "";

      if (type === "css") {
        let clean = trimmed.replace(/\/\*[\s\S]*?\*\//g, ""); // Strip CSS comments
        clean = clean
          .replace(/\s*([\{\}:;,])\s*/g, "$1") // Remove spaces around characters
          .replace(/;}/g, "}") // Remove trailing semicolons in blocks
          .replace(/\s+/g, " "); // Collapse multiple whitespace to single space
        return clean.trim();
      }

      if (type === "javascript") {
        let result = "";
        let i = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inTemplateLiteral = false;
        let inRegex = false;
        let inLineComment = false;
        let inBlockComment = false;

        while (i < trimmed.length) {
          const char = trimmed[i];
          const nextChar = trimmed[i + 1] || "";

          if (inBlockComment) {
            if (char === "*" && nextChar === "/") {
              inBlockComment = false;
              i += 2;
            } else {
              i++;
            }
            continue;
          }

          if (inLineComment) {
            if (char === "\n" || char === "\r") {
              inLineComment = false;
              result += " \n"; // Preserve newlines to ensure automatic semicolon insertion is safe
            }
            i++;
            continue;
          }

          if (char === "\\" && (inSingleQuote || inDoubleQuote || inTemplateLiteral)) {
            result += char + nextChar;
            i += 2;
            continue;
          }

          if (!inDoubleQuote && !inTemplateLiteral && !inRegex) {
            if (char === "'") {
              inSingleQuote = !inSingleQuote;
              result += char;
              i++;
              continue;
            }
          }

          if (!inSingleQuote && !inTemplateLiteral && !inRegex) {
            if (char === '"') {
              inDoubleQuote = !inDoubleQuote;
              result += char;
              i++;
              continue;
            }
          }

          if (!inSingleQuote && !inDoubleQuote && !inRegex) {
            if (char === "`") {
              inTemplateLiteral = !inTemplateLiteral;
              result += char;
              i++;
              continue;
            }
          }

          if (!inSingleQuote && !inDoubleQuote && !inTemplateLiteral && !inRegex) {
            if (char === "/" && nextChar === "/") {
              inLineComment = true;
              i += 2;
              continue;
            }
            if (char === "/" && nextChar === "*") {
              inBlockComment = true;
              i += 2;
              continue;
            }
          }

          result += char;
          i++;
        }

        let clean = result.replace(/\r/g, "");
        clean = clean.replace(/[ \t]+/g, " ");
        clean = clean.replace(/\s*([=+\-*/%&|<>!{}()[\];,?:])\s*/g, "$1");
        clean = clean.replace(/\n+/g, "\n").trim();
        return clean;
      }

      if (type === "html") {
        let clean = trimmed.replace(/<!--[\s\S]*?-->/g, ""); // Strip comments
        clean = clean.replace(/>\s+</g, "><"); // Minimize tags gap
        return clean.trim();
      }

      return trimmed;
    } catch (err) {
      console.warn("Minification failed. Falling back to original code:", err);
      return code;
    }
  };

  // F-112, F-113, F-116: Custom Code Injection with Conditions and Publish/Deployment Control
  useEffect(() => {
    if (!isPreview) {
      const elementsToDelete = document.querySelectorAll("[data-forgestudio-custom-code]");
      elementsToDelete.forEach(el => el.remove());
      return;
    }

    const snippets = globalSettings?.customCodeList || [];
    const revisions = globalSettings?.customCodeRevisions || [];
    const createdElements: HTMLElement[] = [];
    const injectedUrls = new Set<string>();

    const normalizeUrl = (urlStr: string) => {
      try {
        const raw = urlStr.trim().replace(/\/+$/, "");
        return new URL(raw).href.toLowerCase();
      } catch (e) {
        return urlStr.trim().toLowerCase();
      }
    };

    const evaluateCondition = (cond: any) => {
      let isMet = false;
      if (cond.type === "device") {
        const width = window.innerWidth;
        if (cond.value === "desktop") isMet = width >= 1024;
        else if (cond.value === "tablet") isMet = width >= 768 && width < 1024;
        else if (cond.value === "mobile") isMet = width < 768;
      } else if (cond.type === "environment") {
        if (cond.value === "preview") {
          isMet = !isProductionSimulation;
        } else if (cond.value === "production") {
          isMet = isProductionSimulation;
        }
      } else if (cond.type === "auth") {
        isMet = cond.value === "logged-in";
      }
      return cond.operator === "equals" ? isMet : !isMet;
    };

    snippets.forEach((snip: any) => {
      let codeToInject = "";
      let type = snip.type;
      let placement = snip.placement;
      let conditions = snip.conditions || [];
      let minifyInProd = snip.minifyInProduction;
      let dependencies = snip.dependencies || [];

      if (isProductionSimulation) {
        // PRODUCTION SIMULATION - ONLY inject published version
        if (!snip.publishedRevisionId) {
          return;
        }
        const publishedRev = revisions.find((r: any) => r.id === snip.publishedRevisionId);
        if (!publishedRev) {
          return;
        }
        codeToInject = publishedRev.code;
        type = publishedRev.type;
        placement = publishedRev.placement;
        conditions = publishedRev.conditions || [];
        minifyInProd = publishedRev.minifyInProduction;
        dependencies = publishedRev.dependencies || [];
      } else {
        // DRAFT/PREVIEW ENVIRONMENT - Inject current draft code
        if (!snip.code || !snip.code.trim()) return;
        codeToInject = snip.code;
      }

      const allConditionsMet = conditions.every((cond: any) => evaluateCondition(cond));
      if (!allConditionsMet) return;

      // 1. Inject prefix external dependencies in order first
      (dependencies || []).forEach((dep: any) => {
        if (!dep.url || !dep.url.trim()) return;
        const normalized = normalizeUrl(dep.url);
        if (injectedUrls.has(normalized)) return; // Prevent duplicate external assets
        injectedUrls.add(normalized);

        let depEl: HTMLElement | null = null;
        if (dep.type === "css") {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = dep.url.trim();
          depEl = link;
        } else if (dep.type === "javascript") {
          const script = document.createElement("script");
          script.src = dep.url.trim();
          script.async = false;
          depEl = script;
        }

        if (depEl) {
          depEl.setAttribute("data-forgestudio-custom-code", snip.id);
          if (placement === "head") {
            document.head.appendChild(depEl);
          } else if (placement === "body-start") {
            document.body.insertBefore(depEl, document.body.firstChild);
          } else {
            document.body.appendChild(depEl);
          }
          createdElements.push(depEl);
        }
      });

      // 2. Inject the custom snippet code element
      if (minifyInProd && (isProductionSimulation || isPreview)) {
        codeToInject = minifySnippet(codeToInject, type);
      }

      let el: HTMLElement | null = null;

      if (type === "css") {
        el = document.createElement("style");
        el.textContent = codeToInject;
      } else if (type === "javascript") {
        el = document.createElement("script");
        el.textContent = codeToInject;
      } else if (type === "html") {
        el = document.createElement("div");
        el.style.display = "contents";
        el.innerHTML = codeToInject;
      }

      if (el) {
        el.setAttribute("data-forgestudio-custom-code", snip.id);

        if (placement === "head") {
          document.head.appendChild(el);
        } else if (placement === "body-start") {
          document.body.insertBefore(el, document.body.firstChild);
        } else {
          document.body.appendChild(el);
        }
        createdElements.push(el);
      }
    });

    return () => {
      createdElements.forEach(el => el.remove());
    };
  }, [isPreview, globalSettings?.customCodeList, globalSettings?.customCodeRevisions, activeBreakpointId, isProductionSimulation]);

  // Helper to compile element-level dynamic Custom CSS (F-102 & selectors scoping)
  const compileScopedCss = (customCss: string, elementId: string, customId?: string): string => {
    const trimmed = customCss.trim();
    if (!trimmed) return "";

    const targetSelectorId = customId || elementId;

    if (!trimmed.includes("{")) {
      return `#${targetSelectorId} {\n  ${trimmed}\n}`;
    }

    let compiled = "";
    let tempRawDeclarations = "";
    let i = 0;

    while (i < trimmed.length) {
      if (trimmed[i] === "{") {
        let braceCount = 1;
        let j = i + 1;
        while (j < trimmed.length && braceCount > 0) {
          if (trimmed[j] === "{") braceCount++;
          if (trimmed[j] === "}") braceCount--;
          j++;
        }

        const beforeBlock = trimmed.substring(0, i).trim();
        const blockContent = trimmed.substring(i + 1, j - 1).trim();

        const lastBoundary = Math.max(beforeBlock.lastIndexOf(";"), beforeBlock.lastIndexOf("}"));
        const selectorPart = lastBoundary === -1
          ? beforeBlock
          : beforeBlock.substring(lastBoundary + 1);

        const rawPart = lastBoundary === -1
          ? ""
          : beforeBlock.substring(0, lastBoundary + 1);

        if (rawPart.trim() && !rawPart.trim().includes("{") && rawPart.trim().includes(":")) {
          tempRawDeclarations += rawPart.trim() + "\n";
        }

        const cleanSelector = selectorPart.trim();
        if (cleanSelector) {
          if (cleanSelector.startsWith("@media") || cleanSelector.startsWith("@supports") || cleanSelector.startsWith("@container") || cleanSelector.startsWith("@keyframes")) {
            // Recursive handling for nested blocks (F-107 Media Query support)
            if (cleanSelector.startsWith("@keyframes")) {
              compiled += `${cleanSelector} {\n  ${blockContent}\n}\n`;
            } else {
              const innerCompiled = compileScopedCss(blockContent, elementId, customId);
              compiled += `${cleanSelector} {\n${innerCompiled.split("\n").map((l: string) => "  " + l).join("\n")}\n}\n`;
            }
          } else {
            const scopedSelector = cleanSelector
              .split(",")
              .map((part) => {
                const trimmedPart = part.trim();
                if (!trimmedPart) return "";

                if (trimmedPart.includes("selector") || trimmedPart.includes("self") || trimmedPart.includes("&")) {
                  return trimmedPart.replace(/selector|self|&/g, `#${targetSelectorId}`);
                }

                if (trimmedPart.startsWith(":") || trimmedPart.startsWith("[")) {
                  return `#${targetSelectorId}${trimmedPart}`;
                }

                return `#${targetSelectorId} ${trimmedPart}`;
              })
              .join(", ");

            compiled += `${scopedSelector} {\n  ${blockContent}\n}\n`;
          }
        }

        i = j;
      } else {
        i++;
      }
    }

    const lastBoundary = Math.max(trimmed.lastIndexOf(";"), trimmed.lastIndexOf("}"));
    const endRaw = lastBoundary !== -1 && lastBoundary < trimmed.length - 1
      ? trimmed.substring(lastBoundary + 1).trim()
      : "";

    if (endRaw && !endRaw.includes("{") && endRaw.includes(":")) {
      tempRawDeclarations += endRaw + "\n";
    }

    if (tempRawDeclarations.trim()) {
      compiled = `#${targetSelectorId} {\n  ${tempRawDeclarations.trim()}\n}\n` + compiled;
    }

    return compiled;
  };

  const collectElementsCustomCss = (list: EditorElement[]): string => {
    let cssText = "";
    for (const el of list) {
      if (el.customCss) {
        cssText += `\n/* Custom Element CSS: ${el.id} (${el.type}) */\n` + compileScopedCss(el.customCss, el.id, el.customId) + "\n";
      }
      if (el.children && el.children.length > 0) {
        cssText += collectElementsCustomCss(el.children);
      }
    }
    return cssText;
  };

  // Helper to compile site/page level custom CSS with support for nested media queries & selectors (F-103, F-104, F-107)
  const compileGlobalCss = (cssText: string, websiteIdStr: string): string => {
    const trimmed = cssText.trim();
    if (!trimmed) return "";

    const pageScope = `#page-${websiteId || "active"}`;

    if (!trimmed.includes("{")) {
      return `${pageScope} {\n  ${trimmed}\n}`;
    }

    let compiled = "";
    let i = 0;

    while (i < trimmed.length) {
      if (trimmed[i] === "{") {
        let braceCount = 1;
        let j = i + 1;
        while (j < trimmed.length && braceCount > 0) {
          if (trimmed[j] === "{") braceCount++;
          if (trimmed[j] === "}") braceCount--;
          j++;
        }

        const beforeBlock = trimmed.substring(0, i).trim();
        const blockContent = trimmed.substring(i + 1, j - 1).trim();

        const lastBoundary = Math.max(beforeBlock.lastIndexOf(";"), beforeBlock.lastIndexOf("}"));
        const selectorPart = lastBoundary === -1
          ? beforeBlock
          : beforeBlock.substring(lastBoundary + 1);

        const cleanSelector = selectorPart.trim();
        if (cleanSelector) {
          if (cleanSelector.startsWith("@media") || cleanSelector.startsWith("@supports")) {
            const innerCompiled = compileGlobalCss(blockContent, websiteIdStr);
            compiled += `${cleanSelector} {\n${innerCompiled.split("\n").map(l => "  " + l).join("\n")}\n}\n`;
          } else if (cleanSelector.startsWith("@keyframes") || cleanSelector.startsWith("@-webkit-keyframes")) {
            compiled += `${cleanSelector} {\n  ${blockContent}\n}\n`;
          } else {
            const scopedSelector = cleanSelector
              .split(",")
              .map((part) => {
                const trimmedPart = part.trim();
                if (!trimmedPart) return "";

                if (trimmedPart === "body" || trimmedPart === "html") {
                  return pageScope;
                }
                if (trimmedPart.startsWith(":") || trimmedPart.startsWith("[")) {
                  return `${pageScope}${trimmedPart}`;
                }
                return `${pageScope} ${trimmedPart}`;
              })
              .join(", ");

            compiled += `${scopedSelector} {\n  ${blockContent}\n}\n`;
          }
        }

        i = j;
      } else {
        i++;
      }
    }

    return compiled;
  };

  const compilePageCss = (cssText: string, websiteIdStr: string): string => {
    return compileGlobalCss(cssText, websiteIdStr);
  };

  // Inject global and element CSS styles (F-066, F-067, F-068, F-069, F-092, F-102, F-103, F-104)
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
          
          #page-${websiteId || "active"} h1, 
          #page-${websiteId || "active"} h2, 
          #page-${websiteId || "active"} h3, 
          #page-${websiteId || "active"} h4, 
          #page-${websiteId || "active"} h5, 
          #page-${websiteId || "active"} h6 { 
            font-family: "${globalSettings.fonts?.heading || 'Inter'}", sans-serif !important; 
          }
          #page-${websiteId || "active"} p, 
          #page-${websiteId || "active"} span, 
          #page-${websiteId || "active"} a, 
          #page-${websiteId || "active"} div { 
            font-family: "${globalSettings.fonts?.body || 'Inter'}", sans-serif; 
          }
        `;
      }

      // 1. Global Custom CSS (Lowest precedence, scoped) (F-104)
      if (globalSettings.customCss) {
        css += `\n/* Custom Global CSS */\n` + compileGlobalCss(globalSettings.customCss, websiteId || "active") + "\n";
      }
    }

    // 2. Page-level scoped custom CSS (Medium precedence) (F-103)
    if (pageCustomCss) {
      css += `\n/* Custom Page CSS */\n` + compilePageCss(pageCustomCss, websiteId || "active") + "\n";
    }

    // 3. Element-scoped custom CSS (Highest precedence) (F-102)
    css += collectElementsCustomCss(elements);

    styleEl.textContent = css;
  }, [globalSettings, elements, pageCustomCss, websiteId]);


  // F-112 and F-113: Custom Code & Conditions Runtime Execution Wrapper
  useEffect(() => {
    if (!isPreview) return;

    const list = globalSettings?.customCodeList || [];
    if (list.length === 0) return;

    const injectedNodes: HTMLElement[] = [];

    // F-116: Sort Execution Order by Priority
    const sortedList = [...list].sort((a: any, b: any) => {
      const pA = a.priority ?? 100;
      const pB = b.priority ?? 100;
      if (pA === pB) {
        return (a.id || "").localeCompare(b.id || ""); // Stable fallback
      }
      return pA - pB;
    });

    sortedList.forEach((snip: any) => {
      // 1. Condition Evaluation (F-113)
      if (snip.conditions && snip.conditions.length > 0) {
        let conditionFailed = false;
        for (const cond of snip.conditions) {
          if (cond.type === 'device') {
            const mappedDevice = activeBreakpointId.toLowerCase();
            let isMatch = false;
            if (cond.value === 'mobile' && mappedDevice.includes('mobile')) isMatch = true;
            else if (cond.value === 'tablet' && mappedDevice.includes('tablet')) isMatch = true;
            else if (cond.value === 'desktop' && (mappedDevice.includes('desktop') || mappedDevice === 'widescreen' || mappedDevice === 'laptop')) isMatch = true;

            if (cond.operator === 'equals' && !isMatch) conditionFailed = true;
            if (cond.operator === 'not_equals' && isMatch) conditionFailed = true;
          }
        }
        if (conditionFailed) return; // Skip injection due to device condition
      }

      // 2. Draft Execution Injection (F-112) & Dependencies (F-120)
      const executeSnippet = async () => {
        // Load Dependencies (F-120)
        if (snip.dependencies && snip.dependencies.length > 0) {
          for (const dep of snip.dependencies) {
            await new Promise<void>((resolve) => {
              if (dep.type === 'javascript' && dep.url) {
                const depEl = document.createElement('script');
                depEl.src = dep.url;
                depEl.onload = () => resolve();
                depEl.onerror = () => resolve();
                document.head.appendChild(depEl);
                injectedNodes.push(depEl as any);
              } else if (dep.type === 'css' && dep.url) {
                const depEl = document.createElement('link');
                depEl.rel = "stylesheet";
                depEl.href = dep.url;
                depEl.onload = () => resolve();
                depEl.onerror = () => resolve();
                document.head.appendChild(depEl);
                injectedNodes.push(depEl as any);
              } else {
                resolve();
              }
            });
          }
        }

        // Execute Snippet
        if (snip.code) {
          try {
            if (snip.type === 'javascript') {
              const scriptEl = document.createElement('script');
              scriptEl.id = `fs-custom-snip-${snip.id}`;
              scriptEl.textContent = `
                try {
                  ${snip.code}
                } catch (err) {
                  console.error("ForgeStudio Sandbox Error in snippet:", "${snip.name}", err);
                }
              `;

              if (snip.placement === 'header' || snip.placement === 'head') {
                document.head.appendChild(scriptEl);
              } else {
                document.body.appendChild(scriptEl);
              }
              injectedNodes.push(scriptEl);
            } else if (snip.type === 'css') {
              const styleEl = document.createElement('style');
              styleEl.id = `fs-custom-snip-${snip.id}`;
              styleEl.textContent = snip.code;
              document.head.appendChild(styleEl);
              injectedNodes.push(styleEl);
            } else if (snip.type === 'html') {
              const divEl = document.createElement('div');
              divEl.id = `fs-custom-snip-${snip.id}`;
              // F-112: Reuse HTML Widget Sanitizer Security
              let cleanHtml = snip.code;
              if (typeof sanitizeHtml === 'function') {
                cleanHtml = sanitizeHtml(snip.code);
              }
              divEl.innerHTML = cleanHtml;

              if (snip.placement === 'header' || snip.placement === 'head') {
                document.head.appendChild(divEl);
              } else {
                document.body.appendChild(divEl);
              }
              injectedNodes.push(divEl);
            }
          } catch (e) {
            console.error("Injection error", e);
          }
        }
      };

      executeSnippet();
    });

    return () => {
      // Clean up injected DOM scripts accurately to prevent memory leaks in dev
      injectedNodes.forEach(node => {
        if (node.parentNode) node.parentNode.removeChild(node);
      });
    };
  }, [isPreview, activeBreakpointId, globalSettings?.customCodeList]);

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
>>>>>>> 8d95dec (Initial project code)

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
<<<<<<< HEAD
        if (!res.ok) throw new Error(data?.message || "Failed to load website.");
=======

        if (!res.ok) {
          throw new Error(data?.message || data?.error?.message || "Failed to load website.");
        }
>>>>>>> 8d95dec (Initial project code)

        const loadedSite = data.website || data;
        setWebsite(loadedSite);

        if (loadedSite?.editorData?.elements && Array.isArray(loadedSite.editorData.elements)) {
          setElements(loadedSite.editorData.elements);
        } else {
<<<<<<< HEAD
=======
          // Default starting elements matching screenshot
>>>>>>> 8d95dec (Initial project code)
          setElements([
            createDefaultElement("heading"),
            createDefaultElement("text"),
            createDefaultElement("button"),
<<<<<<< HEAD
          ]);
        }

        if (loadedSite?.editorData?.popups && Array.isArray(loadedSite.editorData.popups)) {
          setPopups(loadedSite.editorData.popups);
        }

=======
            createDefaultElement("heading"),
            createDefaultElement("text"),
            createDefaultElement("button"),
            createDefaultElement("image"),
            createDefaultElement("heading"),
          ]);
        }

>>>>>>> 8d95dec (Initial project code)
        if (loadedSite?.editorData?.breakpoints && Array.isArray(loadedSite.editorData.breakpoints)) {
          setBreakpoints(loadedSite.editorData.breakpoints);
        }

        if (loadedSite?.editorData?.globalSettings) {
          setGlobalSettings(loadedSite.editorData.globalSettings);
<<<<<<< HEAD
=======
        } else if (loadedSite?.name) {
          setGlobalSettings((prev: any) => ({
            ...prev,
            siteIdentity: {
              ...prev.siteIdentity,
              name: loadedSite.name,
            }
          }));
        }

        if (loadedSite?.editorData?.pageCustomCss) {
          setPageCustomCss(loadedSite.editorData.pageCustomCss);
        } else {
          setPageCustomCss("");
>>>>>>> 8d95dec (Initial project code)
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

<<<<<<< HEAD
  // Save Data
=======
  // Save Website Data
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
          popups,
=======
          pageCustomCss, // F-103
>>>>>>> 8d95dec (Initial project code)
        },
      };

      const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
        method: "PUT",
<<<<<<< HEAD
=======
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

      if (data.warnings && data.warnings.length > 0) {
        const warnDetails = data.warnings.map((w: any) => `"${w.name}": ${w.message}`).join(", ");
        setSaveMessage(`Draft saved. Warning: ${warnDetails}`);
        setTimeout(() => setSaveMessage(""), 7000);
      } else {
        setSaveMessage("Saved successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      }
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

  const handleAddPluginElement = (pluginId: string, componentKey: string) => {
    const newEl = createDefaultElement("plugin");
    newEl.pluginId = pluginId;
    newEl.pluginComponentKey = componentKey;
    const pInfo = pluginRegistry.getAvailableComponents().find((c: any) => c.pluginId === pluginId && c.componentKey === componentKey);
    newEl.pluginProps = pInfo?.defaultConfig || {};
    setElements((prev) => insertTreeElement(prev, selectedId, newEl));
    setSelectedId(newEl.id);
  };

  // F-124: Command Palette Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // F-117: Linter Background Service (Debounced)
  useEffect(() => {
    if (!snippetCode) {
      setLintDiagnostics([]);
      return;
    }
    const timer = setTimeout(() => {
      const results: { severity: "error" | "warning"; message: string; line?: number; column?: number }[] = [];
      const codeStr = snippetCode || "";

      // Inline simple event handler check for HTML as security warning
      if (snippetType === "html") {
        if (/on[a-z]+\s*=/i.test(codeStr)) {
          results.push({ severity: "warning", message: "Inline event handlers (e.g. onclick) are blocked by security sanitization during preview.", line: 1 });
        }
        if (/href=["']?javascript:/i.test(codeStr)) {
          results.push({ severity: "error", message: "javascript: protocol is blocked.", line: 1 });
        }

        const htmlVal = getHtmlValidity(codeStr);
        if (!htmlVal.isValid) {
          results.push({ severity: "error", message: htmlVal.errorMsg || "Syntax error", line: 1 });
        }
      } else if (snippetType === "css") {
        const cssVal = getCssSyntaxValidity(codeStr);
        if (!cssVal.isValid) {
          results.push({ severity: "error", message: cssVal.errorMsg || "Syntax error", line: 1 });
        }
      } else if (snippetType === "javascript") {
        if (/\beval\s*\(/.test(codeStr)) {
          results.push({ severity: "error", message: "Use of eval() function is prohibited for security reasons", line: 1 });
        }
        if (/\bnew\s+Function\s*\(/.test(codeStr)) {
          results.push({ severity: "error", message: "Use of new Function() constructor is prohibited", line: 1 });
        }
        if (/document\.write\s*\(/.test(codeStr)) {
          results.push({ severity: "warning", message: "document.write() is prohibited in modern apps.", line: 1 });
        }
        const jsVal = getJSSyntaxValidity(codeStr);
        if (!jsVal.isValid) {
          // Attempt to parse "Line 4, Column 5: Some error" syntax from our parser output if present
          let msg = jsVal.errorMsg || "Syntax error";
          let line: number | undefined;
          let column: number | undefined;

          const match = msg.match(/Line (\d+), Column (\d+):/i);
          if (match) {
            line = parseInt(match[1]);
            column = parseInt(match[2]);
          }
          results.push({ severity: "error", message: msg, line, column });
        }
      }
      setLintDiagnostics(results);
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [snippetCode, snippetType]);

  useEffect(() => {
    if (showCommandPalette && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCommandPalette]);

  const commandList = [

    { name: "Add Heading", action: () => { handleAddElement('heading'); setShowCommandPalette(false); }, icon: "H" },
    { name: "Add Button", action: () => { handleAddElement('button'); setShowCommandPalette(false); }, icon: "🖱️" },
    { name: "Add Container", action: () => { handleAddElement('container'); setShowCommandPalette(false); }, icon: "📦" },
    { name: "HTML Widget", action: () => { handleAddElement('html'); setShowCommandPalette(false); }, icon: "🧑‍💻" },
    { name: "Preview Desktop", action: () => { setActiveBreakpointId('desktop'); setShowCommandPalette(false); }, icon: "💻" },
    { name: "Preview Mobile", action: () => { setActiveBreakpointId('mobile-portrait'); setShowCommandPalette(false); }, icon: "📱" },
    { name: "Publish Site", action: () => { handleSave(); setShowCommandPalette(false); }, icon: "🚀" },
    { name: "Global Settings", action: () => { setActiveSidebarTab('global'); setShowCommandPalette(false); }, icon: "🎨" },
  ].filter(c => c.name.toLowerCase().includes(commandQuery.toLowerCase()));

  const handleDeleteElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setElements((prev) => deleteTreeElement(prev, id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleDuplicateElement = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setElements((prev) => duplicateTreeElement(prev, id));
  };

  const handleSaveSnippet = () => {
    if (!snippetCode.trim()) return;

    // Validate security before saving snippet drafts (MUST block)
    const codeLower = snippetCode.toLowerCase();
    if (codeLower.includes("<?php") || (codeLower.includes("<?") && snippetType === "html")) {
      setErrorMessage("PHP execution blocks are prohibited in Custom Code");
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }
    if (
      codeLower.includes("child_process") ||
      codeLower.includes("require('fs')") ||
      codeLower.includes("require(\"fs\")") ||
      codeLower.includes("require('child_process')") ||
      codeLower.includes("require(\"child_process\")") ||
      codeLower.includes("process.exit") ||
      codeLower.includes("process.env")
    ) {
      setErrorMessage("Server-side and Node.js process APIs are prohibited");
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }
    if (/\beval\s*\(/.test(snippetCode)) {
      setErrorMessage("Use of eval() function is prohibited for security reasons");
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }
    if (/\bnew\s+Function\s*\(/.test(snippetCode)) {
      setErrorMessage("Use of new Function() constructor is prohibited for security reasons");
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }
    if (/\b(exec|spawn|execSync|spawnSync)\s*\(/.test(snippetCode)) {
      setErrorMessage("Use of system process execution APIs is prohibited");
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }

    // Collect non-blocking syntax parser warnings
    let syntaxWarning = "";
    if (snippetType === "javascript") {
      const jsVal = getJSSyntaxValidity(snippetCode);
      if (!jsVal.isValid) syntaxWarning = jsVal.errorMsg || "";
    } else if (snippetType === "css") {
      const cssVal = getCssSyntaxValidity(snippetCode);
      if (!cssVal.isValid) syntaxWarning = cssVal.errorMsg || "";
    } else if (snippetType === "html") {
      const htmlVal = getHtmlValidity(snippetCode);
      if (!htmlVal.isValid) syntaxWarning = `HTML syntax warning: ${htmlVal.errorMsg}`;
    }

    const nameToUse = snippetName.trim() || `${snippetType.toUpperCase()} Snippet (${snippetPlacement})`;

    setGlobalSettings((prev: any) => {
      const list = prev.customCodeList ? [...prev.customCodeList] : [];
      const revisions = prev.customCodeRevisions ? [...prev.customCodeRevisions] : [];
      const targetSnippetId = selectedSnippetId || `snip_${Date.now()}`;

      const newSnippetData: any = {
        id: targetSnippetId,
        name: nameToUse,
        code: snippetCode,
        type: snippetType,
        placement: snippetPlacement,
        conditions: snippetConditions,
        minifyInProduction: minifyInProduction,
        environments: snippetEnvironments, // F-117
        dependencies: snippetDependencies, // F-120
        priority: snippetPriority // F-116
      };

      const existingIdx = list.findIndex(snip => snip.id === targetSnippetId);
      let isChanged = true;
      if (existingIdx !== -1) {
        const doc = list[existingIdx];
        isChanged = doc.code !== snippetCode ||
          doc.type !== snippetType ||
          doc.placement !== snippetPlacement ||
          JSON.stringify(doc.conditions) !== JSON.stringify(snippetConditions) ||
          doc.minifyInProduction !== minifyInProduction ||
          JSON.stringify(doc.environments || []) !== JSON.stringify(snippetEnvironments) ||
          JSON.stringify(doc.dependencies || []) !== JSON.stringify(snippetDependencies) ||
          doc.priority !== snippetPriority; // F-116

        // Keep published revision ID intact when saving draft
        newSnippetData.publishedRevisionId = doc.publishedRevisionId;

        // F-115 Keep Scheduling Status on draft saves unless cancelled manually
        if (doc.scheduleStatus && doc.scheduledPublishAt) {
          newSnippetData.scheduleStatus = doc.scheduleStatus;
          newSnippetData.scheduledPublishAt = doc.scheduledPublishAt;
        }

        list[existingIdx] = newSnippetData;
      } else {
        list.push(newSnippetData);
      }

      if (isChanged) {
        const snippetRevisions = revisions.filter(r => r.snippetId === targetSnippetId);
        const nextVer = snippetRevisions.length + 1;
        revisions.push({
          id: `rev_${Date.now()}`,
          snippetId: targetSnippetId,
          version: nextVer,
          name: nameToUse,
          code: snippetCode,
          type: snippetType,
          placement: snippetPlacement,
          conditions: snippetConditions,
          minifyInProduction: minifyInProduction,
          environments: snippetEnvironments, // F-117
          dependencies: snippetDependencies, // F-120
          priority: snippetPriority, // F-116
          createdAt: new Date().toLocaleString()
        });
      }

      return {
        ...prev,
        customCodeList: list,
        customCodeRevisions: revisions
      };
    });

    setSnippetName("");
    setSnippetCode("");
    setSnippetConditions([]);
    setMinifyInProduction(true);
    setSnippetEnvironments(["development", "staging", "production"]); // F-117 reset
    setSnippetDependencies([]); // F-120 reset
    setNewDepUrl(""); // F-120 reset
    setNewDepType("javascript"); // F-120 reset
    setSelectedSnippetId(null);

    if (syntaxWarning) {
      setSaveMessage(`Draft saved locally. Warning: ${syntaxWarning}`);
      setTimeout(() => setSaveMessage(""), 7000);
    } else {
      setSaveMessage("Draft saved locally!");
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  const moveDependency = (index: number, direction: "up" | "down") => {
    setSnippetDependencies(prev => {
      const next = [...prev];
      if (direction === "up" && index > 0) {
        const temp = next[index];
        next[index] = next[index - 1];
        next[index - 1] = temp;
      } else if (direction === "down" && index < next.length - 1) {
        const temp = next[index];
        next[index] = next[index + 1];
        next[index + 1] = temp;
      }
      return next;
    });
  };

  const handleDeleteSnippet = (id: string) => {
    setGlobalSettings((prev: any) => {
      const list = prev.customCodeList ? prev.customCodeList.filter((s: any) => s.id !== id) : [];
      return {
        ...prev,
        customCodeList: list
      };
    });
    if (selectedSnippetId === id) {
      setSnippetName("");
      setSnippetCode("");
      setSnippetConditions([]);
      setMinifyInProduction(true);
      setSnippetEnvironments(["development", "staging", "production"]); // F-117 reset
      setSnippetDependencies([]); // F-120 reset
      setNewDepUrl(""); // F-120 reset
      setNewDepType("javascript"); // F-120 reset
      setSelectedSnippetId(null);
    }
  };

  interface Conflict {
    severity: "error" | "warning";
    type: string;
    message: string;
    url?: string;
    snippetId?: string;
    snippetName?: string;
  }

  const parseCdnUrl = (url: string): { library: string; version: string } | null => {
    try {
      const parsed = new URL(url.trim().startsWith("//") ? `https:${url.trim()}` : url.trim());
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname;
      if (hostname.includes("jsdelivr.net")) {
        const m = pathname.match(/^\/npm\/([^@/]+)@([^/]+)/);
        if (m) return { library: m[1].toLowerCase(), version: m[2] };
      }
      if (hostname.includes("cdnjs.cloudflare.com")) {
        const m = pathname.match(/^\/ajax\/libs\/([^/]+)\/([^/]+)/);
        if (m) return { library: m[1].toLowerCase(), version: m[2] };
      }
      if (hostname.includes("unpkg.com")) {
        const m = pathname.match(/^\/([^@/]+)@([^/]+)/);
        if (m) return { library: m[1].toLowerCase(), version: m[2] };
      }
    } catch (_) { }
    return null;
  };

  const getLibraryName = (url: string): string => {
    const cdn = parseCdnUrl(url);
    if (cdn) return cdn.library;
    try {
      const parsed = new URL(url.trim().startsWith("//") ? `https:${url.trim()}` : url.trim());
      const pathname = parsed.pathname;
      const filename = pathname.substring(pathname.lastIndexOf("/") + 1);
      const name = filename.replace(/\.(min|bundle|all|slim)\.(js|css)$/i, "").replace(/\.(js|css)$/i, "");
      return name.toLowerCase();
    } catch (_) {
      return "";
    }
  };

  const KNOWN_DEPENDENCIES: Record<string, { requires: string; name: string }> = {
    bootstrap: { requires: "jquery", name: "Bootstrap (v3/v4)" },
    select2: { requires: "jquery", name: "Select2" },
    jqueryui: { requires: "jquery", name: "jQuery UI" },
    "jquery-validation": { requires: "jquery", name: "jQuery Validation" }
  };

  const areConditionsMutuallyExclusive = (condsA: any[], condsB: any[]): boolean => {
    for (const cA of condsA) {
      for (const cB of condsB) {
        if (cA.type === cB.type && cA.operator === "equals" && cB.operator === "equals" && cA.value !== cB.value) {
          return true;
        }
        if (cA.type === cB.type && ((cA.operator === "equals" && cB.operator === "not_equals") || (cA.operator === "not_equals" && cB.operator === "equals")) && cA.value === cB.value) {
          return true;
        }
      }
    }
    return false;
  };

  const detectDependencyConflicts = (customCodeList: any[]): Conflict[] => {
    const conflicts: Conflict[] = [];
    const environments = ["development", "staging", "production"];

    for (const snip of customCodeList) {
      const deps = snip.dependencies || [];
      for (const dep of deps) {
        if (!dep.url) continue;
        try {
          const u = new URL(dep.url.trim().startsWith("//") ? `https:${dep.url.trim()}` : dep.url.trim());
          const pathLower = u.pathname.toLowerCase();
          if (dep.type === "javascript" && pathLower.endsWith(".css")) {
            conflicts.push({
              severity: "warning",
              type: "mismatch",
              message: `Dependency "${dep.url}" is configured as JavaScript, but the URL filename ends with .css.`,
              url: dep.url,
              snippetId: snip.id,
              snippetName: snip.name
            });
          }
          if (dep.type === "css" && pathLower.endsWith(".js")) {
            conflicts.push({
              severity: "warning",
              type: "mismatch",
              message: `Dependency "${dep.url}" is configured as CSS stylesheet, but the URL filename ends with .js.`,
              url: dep.url,
              snippetId: snip.id,
              snippetName: snip.name
            });
          }
        } catch (_) { }
      }
    }

    for (const env of environments) {
      const activeSnippets = customCodeList
        .map((s, idx) => ({ ...s, originalIndex: idx }))
        .filter(snip => {
          const targetEnvs = snip.environments || ["development", "staging", "production"];
          return targetEnvs.includes(env);
        });

      interface FlatDep {
        type: "javascript" | "css";
        url: string;
        requires?: string;
        snippetId: string;
        snippetName: string;
        snippetConditions: any[];
        placement: string;
        snippetIndex: number;
        depIndex: number;
      }

      const flatDeps: FlatDep[] = [];
      activeSnippets.forEach(snip => {
        const deps = snip.dependencies || [];
        deps.forEach((dep: any, dIdx: number) => {
          flatDeps.push({
            type: dep.type,
            url: dep.url,
            requires: dep.requires,
            snippetId: snip.id,
            snippetName: snip.name,
            snippetConditions: snip.conditions || [],
            placement: snip.placement || "body-end",
            snippetIndex: snip.originalIndex,
            depIndex: dIdx
          });
        });
      });

      const getPlacementRank = (p: string) => {
        if (p === "head") return 1;
        if (p === "body-start") return 2;
        return 3;
      };

      const haveOverlappingConditions = (a: FlatDep, b: FlatDep) => {
        return !areConditionsMutuallyExclusive(a.snippetConditions, b.snippetConditions);
      };

      const libVersionGroups: Record<string, { url: string; version: string; snippetName: string }[]> = {};
      const libUrlGroups: Record<string, { url: string; snippetName: string; dep: FlatDep }[]> = {};

      flatDeps.forEach(dep => {
        const libName = getLibraryName(dep.url);
        if (!libName) return;

        if (!libUrlGroups[libName]) {
          libUrlGroups[libName] = [];
        }
        const group = libUrlGroups[libName];
        if (!group.some(item => item.url === dep.url && !areConditionsMutuallyExclusive(item.dep.snippetConditions, dep.snippetConditions))) {
          group.push({ url: dep.url, snippetName: dep.snippetName, dep });
        }

        const cdn = parseCdnUrl(dep.url);
        if (cdn) {
          if (!libVersionGroups[libName]) {
            libVersionGroups[libName] = [];
          }
          const vGroup = libVersionGroups[libName];
          if (!vGroup.some(item => item.url === dep.url)) {
            vGroup.push({ url: dep.url, version: cdn.version, snippetName: dep.snippetName });
          }
        }
      });

      for (const [libName, items] of Object.entries(libVersionGroups)) {
        if (items.length > 1) {
          for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
              const itemA = items[i];
              const itemB = items[j];
              if (itemA.version !== itemB.version) {
                const depA = flatDeps.find(d => d.url === itemA.url);
                const depB = flatDeps.find(d => d.url === itemB.url);
                if (depA && depB && !areConditionsMutuallyExclusive(depA.snippetConditions, depB.snippetConditions)) {
                  conflicts.push({
                    severity: "error",
                    type: "version_conflict",
                    message: `Version conflict: Library "${libName}" is configured with multiple versions in environment "${env}": v${itemA.version} (in snippet "${itemA.snippetName}") and v${itemB.version} (in snippet "${itemB.snippetName}").`,
                    url: itemB.url
                  });
                }
              }
            }
          }
        }
      }

      for (const [libName, items] of Object.entries(libUrlGroups)) {
        if (items.length > 1) {
          const uniqueUrls = Array.from(new Set(items.map(item => item.url)));
          if (uniqueUrls.length > 1) {
            let hasOverlap = false;
            for (let i = 0; i < items.length; i++) {
              for (let j = i + 1; j < items.length; j++) {
                if (items[i].url !== items[j].url && !areConditionsMutuallyExclusive(items[i].dep.snippetConditions, items[j].dep.snippetConditions)) {
                  hasOverlap = true;
                  break;
                }
              }
              if (hasOverlap) break;
            }
            if (hasOverlap) {
              const hasVersionConflict = conflicts.some(c => c.type === "version_conflict" && c.message.includes(`"${libName}"`));
              if (!hasVersionConflict) {
                conflicts.push({
                  severity: "warning",
                  type: "duplicate_library",
                  message: `Potential duplicate library: Same library "${libName}" is included from multiple distinct URLs in environment "${env}": "${uniqueUrls[0]}" (snippet "${items[0].snippetName}") and "${uniqueUrls[1]}".`
                });
              }
            }
          }
        }
      }

      // C. Circular dependency cycles (Run this first to avoid false-positive ordering conflicts)
      const adjList: Record<number, number[]> = {};
      flatDeps.forEach((dep, idx) => {
        adjList[idx] = [];
        const reqList: string[] = [];
        if (dep.requires) reqList.push(dep.requires.trim().toLowerCase());
        const libName = getLibraryName(dep.url);
        if (KNOWN_DEPENDENCIES[libName]) reqList.push(KNOWN_DEPENDENCIES[libName].requires);

        reqList.forEach(reqLib => {
          flatDeps.forEach((otherDep, otherIdx) => {
            if (otherIdx === idx) return;
            if (!haveOverlappingConditions(otherDep, dep)) return;
            const otherLib = getLibraryName(otherDep.url);
            if (otherLib === reqLib || otherDep.url.toLowerCase().includes(reqLib)) {
              adjList[idx].push(otherIdx);
            }
          });
        });
      });

      const visited = new Set<number>();
      const recStack = new Set<number>();
      const path: number[] = [];
      const cycleIndices = new Set<number>();

      const dfs = (u: number): boolean => {
        visited.add(u);
        recStack.add(u);
        path.push(u);

        for (const v of adjList[u] || []) {
          if (!visited.has(v)) {
            if (dfs(v)) return true;
          } else if (recStack.has(v)) {
            const cyclePath = path.slice(path.indexOf(v));
            cyclePath.forEach(idx => cycleIndices.add(idx));
            cyclePath.push(v);
            const urls = cyclePath.map(idx => flatDeps[idx].url);
            conflicts.push({
              severity: "error",
              type: "circular_dependency",
              message: `Circular dependency detected in environment "${env}": ${urls.join(" → ")}`
            });
            return true;
          }
        }

        recStack.delete(u);
        path.pop();
        return false;
      };

      for (let i = 0; i < flatDeps.length; i++) {
        if (!visited.has(i)) {
          dfs(i);
        }
      }

      // B. Missing & Order conflicts
      flatDeps.forEach((dep, idx) => {
        if (cycleIndices.has(idx)) return;
        const reqList: string[] = [];
        if (dep.requires) {
          reqList.push(dep.requires.trim().toLowerCase());
        }
        const libName = getLibraryName(dep.url);
        if (KNOWN_DEPENDENCIES[libName]) {
          const reqLib = KNOWN_DEPENDENCIES[libName].requires;
          if (!reqList.includes(reqLib)) {
            reqList.push(reqLib);
          }
        }

        reqList.forEach((reqLib) => {
          const providers = flatDeps.filter(p => {
            if (p.snippetId === dep.snippetId && p.depIndex === dep.depIndex) return false;
            if (!haveOverlappingConditions(p, dep)) return false;
            const pLib = getLibraryName(p.url);
            return pLib === reqLib || p.url.toLowerCase().includes(reqLib);
          });

          if (providers.length === 0) {
            conflicts.push({
              severity: "error",
              type: "missing_dependency",
              message: `Missing dependency: "${dep.url}" in snippet "${dep.snippetName}" requires library "${reqLib}" which is not configured in environment "${env}".`,
              url: dep.url,
              snippetId: dep.snippetId,
              snippetName: dep.snippetName
            });
          } else {
            const runsBefore = providers.some(p => {
              const rankP = getPlacementRank(p.placement);
              const rankD = getPlacementRank(dep.placement);
              if (rankP < rankD) return true;
              if (rankP > rankD) return false;
              if (p.snippetId === dep.snippetId) {
                return p.depIndex < dep.depIndex;
              }
              return p.snippetIndex < dep.snippetIndex;
            });

            if (!runsBefore) {
              conflicts.push({
                severity: "error",
                type: "ordering_conflict",
                message: `Dependency order conflict: "${dep.url}" in snippet "${dep.snippetName}" requires library "${reqLib}" to load first, but "${providers[0].url}" loads after it.`,
                url: dep.url,
                snippetId: dep.snippetId,
                snippetName: dep.snippetName
              });
            }
          }
        });
      });
    }

    const seenMessages = new Set<string>();
    const uniqConflicts = conflicts.filter(c => {
      const key = `${c.severity}:${c.type}:${c.message}`;
      if (seenMessages.has(key)) return false;
      seenMessages.add(key);
      return true;
    });

    return uniqConflicts;
  };

  const validateSnippetBeforePublish = (
    name: string,
    code: string,
    type: string,
    conditions: any[],
    minifyToggle: boolean,
    environmentsToVerify: string[],
    dependenciesToVerify?: { type: "javascript" | "css"; url: string }[]
  ): { isValid: boolean; errorMsg?: string } => {
    if (!name.trim()) {
      return { isValid: false, errorMsg: "Snippet name cannot be empty" };
    }
    if (!code.trim()) {
      return { isValid: false, errorMsg: "Snippet code content cannot be empty" };
    }

    // Validate target environments
    const targetEnvs = environmentsToVerify || ["development", "staging", "production"];
    if (targetEnvs.length === 0) {
      return { isValid: false, errorMsg: "At least one target environment must be selected" };
    }
    for (const env of targetEnvs) {
      if (!["development", "staging", "production"].includes(env)) {
        return { isValid: false, errorMsg: `Invalid environment type: ${env}` };
      }
    }

    // Validate dependencies URLs
    const seenUrls = new Set<string>();
    for (const dep of dependenciesToVerify || []) {
      if (!dep.url || !dep.url.trim()) {
        return { isValid: false, errorMsg: "Dependency URL cannot be empty" };
      }
      const trimmedUrl = dep.url.trim();
      const lowerUrl = trimmedUrl.toLowerCase();

      const normalized = lowerUrl.replace(/\/+$/, "");
      if (seenUrls.has(normalized)) {
        return { isValid: false, errorMsg: `Duplicate dependency URL found in list: "${trimmedUrl}"` };
      }
      seenUrls.add(normalized);

      if (
        lowerUrl.startsWith("javascript:") ||
        lowerUrl.startsWith("data:") ||
        lowerUrl.startsWith("vbscript:") ||
        lowerUrl.startsWith("file:")
      ) {
        return { isValid: false, errorMsg: `Unsafe dependency URL scheme found: "${trimmedUrl}"` };
      }
      try {
        const valUrl = trimmedUrl.startsWith("//") ? `https:${trimmedUrl}` : trimmedUrl;
        const parsed = new URL(valUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          return { isValid: false, errorMsg: `Dependency URL must use HTTP or HTTPS protocol: "${trimmedUrl}"` };
        }
      } catch (err) {
        return { isValid: false, errorMsg: `Invalid dependency URL: "${trimmedUrl}"` };
      }
    }

    // Validate conditions
    for (const cond of conditions) {
      if (!cond || typeof cond !== "object") {
        return { isValid: false, errorMsg: "Condition structure must be an object" };
      }
      if (!["device", "environment", "auth"].includes(cond.type)) {
        return { isValid: false, errorMsg: `Invalid condition type: ${cond.type}` };
      }
      if (!["equals", "not_equals"].includes(cond.operator)) {
        return { isValid: false, errorMsg: `Invalid condition operator: ${cond.operator}` };
      }
      if (cond.type === "device" && !["desktop", "tablet", "mobile"].includes(cond.value)) {
        return { isValid: false, errorMsg: `Invalid value for device condition: ${cond.value}` };
      }
      if (cond.type === "environment" && !["preview", "production"].includes(cond.value)) {
        return { isValid: false, errorMsg: `Invalid value for environment condition: ${cond.value}` };
      }
      if (cond.type === "auth" && !["authenticated", "anonymous"].includes(cond.value)) {
        return { isValid: false, errorMsg: `Invalid value for auth condition: ${cond.value}` };
      }
    }

    // Validate security patterns
    const codeLower = code.toLowerCase();
    if (codeLower.includes("<?php") || (codeLower.includes("<?") && type === "html")) {
      return { isValid: false, errorMsg: "PHP execution blocks are prohibited in Custom Code" };
    }
    if (
      codeLower.includes("child_process") ||
      codeLower.includes("require('fs')") ||
      codeLower.includes("require(\"fs\")") ||
      codeLower.includes("require('child_process')") ||
      codeLower.includes("require(\"child_process\")") ||
      codeLower.includes("process.exit") ||
      codeLower.includes("process.env")
    ) {
      return { isValid: false, errorMsg: "Server-side and Node.js process APIs are prohibited" };
    }
    if (/\beval\s*\(/.test(code)) {
      return { isValid: false, errorMsg: "Use of eval() function is prohibited for security reasons" };
    }
    if (/\bnew\s+Function\s*\(/.test(code)) {
      return { isValid: false, errorMsg: "Use of new Function() constructor is prohibited for security reasons" };
    }
    if (/\b(exec|spawn|execSync|spawnSync)\s*\(/.test(code)) {
      return { isValid: false, errorMsg: "Use of system process execution APIs is prohibited" };
    }

    // Validate syntax per code type
    if (type === "javascript") {
      const jsVal = getJSSyntaxValidity(code);
      if (!jsVal.isValid) {
        return { isValid: false, errorMsg: jsVal.errorMsg };
      }
    } else if (type === "css") {
      const cssVal = getCssSyntaxValidity(code);
      if (!cssVal.isValid) {
        return { isValid: false, errorMsg: cssVal.errorMsg };
      }
    } else if (type === "html") {
      const htmlVal = getHtmlValidity(code);
      if (!htmlVal.isValid) {
        return { isValid: false, errorMsg: `HTML Syntax Error: ${htmlVal.errorMsg}` };
      }
    }

    // Minifier test compilation
    if (minifyToggle) {
      try {
        minifySnippet(code, type as any);
      } catch (err: any) {
        return { isValid: false, errorMsg: `Minification Optimization Failure: ${err.message || err}` };
      }
    }

    return { isValid: true };
  };

  const handleScheduleSnippet = (snippetId: string, dateStr: string) => {
    if (!dateStr) return;
    const list = globalSettings.customCodeList ? [...globalSettings.customCodeList] : [];
    const updatedList = list.map((s: any) => {
      if (s.id === snippetId) {
        return { ...s, scheduledPublishAt: dateStr, scheduleStatus: "scheduled" };
      }
      return s;
    });
    setGlobalSettings({ ...globalSettings, customCodeList: updatedList });
    setSaveMessage(`Snippet scheduled for ${new Date(dateStr).toLocaleString()}`);
    setTimeout(() => setSaveMessage(""), 5000);
    setScheduleTargetId(null);
    setScheduleDate("");
  };

  const handlePublishSnippet = async (snippetId: string) => {
    try {
      setErrorMessage("");
      setSaveMessage("");
      const list = globalSettings.customCodeList ? [...globalSettings.customCodeList] : [];
      const revisions = globalSettings.customCodeRevisions ? [...globalSettings.customCodeRevisions] : [];
      const snip = list.find((s: any) => s.id === snippetId);
      if (!snip) {
        throw new Error("Snippet not found");
      }
      const validationResult = validateSnippetBeforePublish(
        snip.name,
        snip.code,
        snip.type,
        snip.conditions || [],
        snip.minifyInProduction,
        snip.environments || ["development", "staging", "production"],
        snip.dependencies || []
      );
      if (!validationResult.isValid) {
        throw new Error(validationResult.errorMsg);
      }
      const snippetRevisions = revisions.filter((r: any) => r.snippetId === snippetId);
      if (snippetRevisions.length === 0) {
        throw new Error("No revision history logs found. Save the snippet draft changes first.");
      }
      const latestRev = snippetRevisions.reduce((max: any, r: any) => r.version > max.version ? r : max, snippetRevisions[0]);
      const updatedList = list.map((s: any) => {
        if (s.id === snippetId) {
          return { ...s, publishedRevisionId: latestRev.id, scheduledPublishAt: undefined, scheduleStatus: undefined };
        }
        return s;
      });
      const nextGlobalSettings = { ...globalSettings, customCodeList: updatedList };
      const payload = {
        editorData: {
          version: 1,
          elements,
          breakpoints,
          globalSettings: nextGlobalSettings,
          pageCustomCss,
        },
      };
      setSaving(true);
      const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
        method: "PUT",
>>>>>>> 8d95dec (Initial project code)
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
<<<<<<< HEAD

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to save website.");

      setSaveMessage("Saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save website data.");
=======
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Failed to publish updates to database");
      }
      setGlobalSettings(nextGlobalSettings);
      setSaveMessage("Snippet published successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err: any) {
      console.error("Publish failed:", err);
      setErrorMessage(`Publish failed: ${err.message || err}. Previous version remains active.`);
>>>>>>> 8d95dec (Initial project code)
    } finally {
      setSaving(false);
    }
  };

<<<<<<< HEAD
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
=======
  const handleUnpublishSnippet = async (snippetId: string) => {
    try {
      setErrorMessage("");
      setSaveMessage("");
      const list = globalSettings.customCodeList ? [...globalSettings.customCodeList] : [];
      const snip = list.find((s: any) => s.id === snippetId);
      if (!snip) {
        throw new Error("Snippet not found");
      }
      const updatedList = list.map((s: any) => {
        if (s.id === snippetId) {
          const { publishedRevisionId, ...rest } = s;
          return rest;
        }
        return s;
      });
      const nextGlobalSettings = { ...globalSettings, customCodeList: updatedList };
      const payload = {
        editorData: {
          version: 1,
          elements,
          breakpoints,
          globalSettings: nextGlobalSettings,
          pageCustomCss,
        },
      };
      setSaving(true);
      const res = await fetch(`${apiUrl}/api/websites/${websiteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Failed to unpublish from database");
      }
      setGlobalSettings(nextGlobalSettings);
      setSaveMessage("Snippet unpublished successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err: any) {
      console.error("Unpublish failed:", err);
      setErrorMessage(`Unpublish failed: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCondition = () => {
    setSnippetConditions(prev => [
      ...prev,
      {
        id: `cond_${Date.now()}`,
        type: condType,
        operator: condOperator,
        value: condValue
      }
    ]);
  };

  const handleRemoveCondition = (id: string) => {
    setSnippetConditions(prev => prev.filter(c => c.id !== id));
  };

  const selectedElement = selectedId ? findTreeElement(elements, selectedId) : null;

  const updateSelectedProp = (key: keyof EditorElement, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
>>>>>>> 8d95dec (Initial project code)
      updateTreeElement(prev, selectedId, (el) => ({ ...el, [key]: value }))
    );
  };

<<<<<<< HEAD
  const updateSelectedStyle = (key: keyof ElementStyles, value: any) => {
    if (!selectedId) return;
    setUnifiedElements((prev) =>
=======
  const updateAttributeKey = (oldKey: string, newKey: string) => {
    if (!selectedElement) return;
    const current = { ...(selectedElement.customAttributes || {}) };
    const val = current[oldKey] || "";

    const sanitizedKey = newKey
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .replace(/^on/i, "");

    // Skip if it hasn't changed to avoid unnecessary renders
    if (sanitizedKey === oldKey) return;

    delete current[oldKey];

    if (sanitizedKey) {
      current[sanitizedKey] = val;
    }
    updateSelectedProp("customAttributes", current);
  };

  const updateAttributeValue = (key: string, newVal: string) => {
    if (!selectedElement) return;
    const current = { ...(selectedElement.customAttributes || {}) };
    let sanitizedVal = newVal;
    if (sanitizedVal.trim().toLowerCase().startsWith("javascript:")) {
      sanitizedVal = "";
    }
    current[key] = sanitizedVal;
    updateSelectedProp("customAttributes", current);
  };

  const deleteAttribute = (key: string) => {
    if (!selectedElement) return;
    const current = { ...(selectedElement.customAttributes || {}) };
    delete current[key];
    updateSelectedProp("customAttributes", current);
  };

  const addEmptyAttribute = () => {
    if (!selectedElement) return;
    const current = { ...(selectedElement.customAttributes || {}) };
    let tempKey = "data-attribute";
    let count = 1;
    while (current[tempKey] !== undefined) {
      tempKey = `data-attribute-${count}`;
      count++;
    }
    current[tempKey] = "";
    updateSelectedProp("customAttributes", current);
  };

  const updateSelectedStyle = (key: keyof ElementStyles, value: any) => {
    if (!selectedId) return;
    setElements((prev) =>
>>>>>>> 8d95dec (Initial project code)
      updateTreeElement(prev, selectedId, (el) => {
        if (activeBreakpointId === "desktop") {
          return {
            ...el,
            styles: { ...el.styles, [key]: value },
          };
        } else {
<<<<<<< HEAD
          const responsiveStyles = { ...el.responsiveStyles };
          const bpStyles: Record<string, any> = { ...responsiveStyles[activeBreakpointId] };
          if (value === undefined || value === "") {
            delete bpStyles[key];
          } else {
            bpStyles[key] = value;
          }
          responsiveStyles[activeBreakpointId] = bpStyles as ElementStyles;
=======
          const responsiveStyles: Record<string, ElementStyles> = { ...el.responsiveStyles };
          const bpStyles: ElementStyles = { ...responsiveStyles[activeBreakpointId] };
          if (value === undefined || value === "") {
            delete bpStyles[key];
          } else {
            (bpStyles as any)[key] = value;
          }
          responsiveStyles[activeBreakpointId] = bpStyles;
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
    setUnifiedElements((prev) =>
=======
    setElements((prev) =>
>>>>>>> 8d95dec (Initial project code)
      updateTreeElement(prev, selectedId, (el) => {
        if (activeBreakpointId === "desktop") {
          return {
            ...el,
            layout: { ...el.layout, [key]: value },
          };
        } else {
<<<<<<< HEAD
          const responsiveLayouts = { ...el.responsiveLayouts };
          const bpLayouts: Record<string, any> = { ...responsiveLayouts[activeBreakpointId] };
          if (value === undefined || value === "") {
            delete bpLayouts[key];
          } else {
            bpLayouts[key] = value;
          }
          responsiveLayouts[activeBreakpointId] = bpLayouts as ContainerLayout;
=======
          const responsiveLayouts: Record<string, ContainerLayout> = { ...el.responsiveLayouts };
          const bpLayouts: ContainerLayout = { ...responsiveLayouts[activeBreakpointId] };
          if (value === undefined || value === "") {
            delete bpLayouts[key];
          } else {
            (bpLayouts as any)[key] = value;
          }
          responsiveLayouts[activeBreakpointId] = bpLayouts;
>>>>>>> 8d95dec (Initial project code)
          return {
            ...el,
            responsiveLayouts,
          };
        }
      })
    );
  };

<<<<<<< HEAD
  const renderResponsiveLabel = (
    label: string,
    _styleKey?: keyof ElementStyles,
    _layoutKey?: keyof ContainerLayout
  ) => {
    return (
      <div className="flex items-center justify-between mb-1 mt-2">
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
=======
  const resetSelectedStyle = (key: keyof ElementStyles) => {
    if (!selectedId || activeBreakpointId === "desktop") return;
    setElements((prev) =>
      updateTreeElement(prev, selectedId, (el) => {
        const responsiveStyles: Record<string, ElementStyles> = { ...el.responsiveStyles };
        const bpStyles: ElementStyles = { ...responsiveStyles[activeBreakpointId] };
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
        const responsiveLayouts: Record<string, ContainerLayout> = { ...el.responsiveLayouts };
        const bpLayouts: ContainerLayout = { ...responsiveLayouts[activeBreakpointId] };
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
>>>>>>> 8d95dec (Initial project code)
      </div>
    );
  };

<<<<<<< HEAD
=======
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

>>>>>>> 8d95dec (Initial project code)
  const renderAccordion = (title: string, sectionId: string, content: React.ReactNode) => {
    const isOpen = openSections[sectionId];
    return (
      <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-sm bg-white">
        <button
          type="button"
          onClick={() => toggleSection(sectionId)}
<<<<<<< HEAD
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50/50 hover:bg-slate-50 border-b border-slate-100 transition outline-none"
        >
          <span>{title}</span>
          <span className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
=======
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
>>>>>>> 8d95dec (Initial project code)
        </button>
        {isOpen && <div className="p-3.5 space-y-4">{content}</div>}
      </div>
    );
  };

<<<<<<< HEAD
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
=======
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

  // F-121: Dynamic CPT Tag Parser
  const parseDynamicTags = (text: string | undefined): string => {
    if (!text) return "";
    let parsed = text;
    const cpts = globalSettings?.cpts || [];
    const cptRecords = globalSettings?.cptRecords || [];

    const matches = parsed.match(/\{\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\}\}/g);
    if (matches) {
      matches.forEach(m => {
        const mMatch = /\{\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\}\}/.exec(m);
        if (!mMatch) return;
        const [, cptSlug, property] = mMatch;

        const targetCpt = cpts.find((c: any) => c.slug === cptSlug);
        if (targetCpt) {
          // Find first published matching CPT record (in a scaled environment, routing resolves the exact block record context rather than index 0)
          const record = cptRecords.find((r: any) => r.cptId === targetCpt.id && r.status === 'published');
          if (record) {
            if (property === 'name') parsed = parsed.replace(m, record.name);
            else if (property === 'slug') parsed = parsed.replace(m, record.slug);
            else parsed = parsed.replace(m, record.data?.[property] || `[missing ${cptSlug}.${property}]`);
          }
        }
      });
    }
    return parsed;
  }

  // Recursive Element Tree Renderer
  const renderElementTree = (el: EditorElement): React.ReactNode => {
    const isSelected = selectedId === el.id && !isPreview;
    const isHiddenOnCurrentDevice = el.hiddenDevices?.[activeBreakpointId];

    if (isHiddenOnCurrentDevice && isPreview) {
      return null;
    }

    const resolvedStyles = resolveElementStyles(el, activeBreakpointId, breakpoints, globalSettings);

    // F-105: Safe CSS ID fallback for duplicates or invalid characters
    let safeId = el.customId || el.id;
    if (el.customId) {
      const isDuplicate = checkDuplicateId(elements, el.customId, el.id);
      const isInvalid = !/^[a-zA-Z][\w:.-]*$/.test(el.customId);
      if (isDuplicate || isInvalid) {
        safeId = el.id; // Fallback
      }
    }

    if (el.type === "container") {
      return (
        <div
          key={el.id}
          id={safeId}
          {...getSafeAttributes(el)}
>>>>>>> 8d95dec (Initial project code)
          onClick={(e) => {
            e.stopPropagation();
            if (!isPreview) setSelectedId(el.id);
          }}
<<<<<<< HEAD
          className={`relative transition-all duration-150 ${el.customClass || ""} ${
            isPreview ? "" : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
          } ${
            isSelected ? "border-2 border-blue-500 shadow-sm" : isPreview ? "" : "border border-dashed border-slate-300"
          }`}
          style={{
            ...containerLayoutStyles,
=======
          className={`relative transition-all duration-150 overflow-hidden ${el.customClasses ? el.customClasses.join(" ") : (el.customClass || "")} ${isPreview
            ? ""
            : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
            } ${isSelected
              ? "border-2 border-blue-500 shadow-sm"
              : isPreview
                ? ""
                : "border border-dashed border-slate-300"
            } ${isHiddenOnCurrentDevice ? "opacity-40 border-amber-400 border-2 border-dashed bg-amber-50/10 cursor-not-allowed" : ""}`}
          style={{
            display: "flex",
            flexDirection: getLayoutVal(el, "direction", activeBreakpointId, breakpoints) || "column",
            justifyContent: getLayoutVal(el, "justifyContent", activeBreakpointId, breakpoints) || "flex-start",
            alignItems: getLayoutVal(el, "alignItems", activeBreakpointId, breakpoints) || "stretch",
            gap: `${getLayoutVal(el, "gap", activeBreakpointId, breakpoints) ?? 10}px`,
>>>>>>> 8d95dec (Initial project code)
            ...resolvedStyles,
            width: resolvedStyles.width || "100%",
            height: resolvedStyles.height || "auto",
            paddingTop: resolvedStyles.paddingTop || "16px",
            paddingRight: resolvedStyles.paddingRight || "16px",
            paddingBottom: resolvedStyles.paddingBottom || "16px",
            paddingLeft: resolvedStyles.paddingLeft || "16px",
            marginTop: resolvedStyles.marginTop || "8px",
<<<<<<< HEAD
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
=======
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
                onClick={(e) => handleDeleteElement(el.id, e)}
                className="relative group flex items-center justify-center p-1 rounded hover:bg-red-950/80 text-red-400 hover:text-red-300 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-40 bg-red-950 border border-red-500/20 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                  Delete
                </div>
>>>>>>> 8d95dec (Initial project code)
              </button>
            </div>
          )}

          {(!el.children || el.children.length === 0) && !isPreview ? (
<<<<<<< HEAD
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
              <span className="text-xs font-bold text-slate-500">Empty Container</span>
=======
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center z-10 relative">
              <span className="text-xs font-bold text-slate-500">Empty Container</span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Click an element on the left panel to add inside
              </span>
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
=======
        id={safeId}
        {...getSafeAttributes(el)}
>>>>>>> 8d95dec (Initial project code)
        onClick={(e) => {
          e.stopPropagation();
          if (!isPreview) setSelectedId(el.id);
        }}
<<<<<<< HEAD
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
=======
        className={`relative rounded-xl transition duration-150 ${el.customClasses ? el.customClasses.join(" ") : (el.customClass || "")} ${isPreview
          ? ""
          : "cursor-pointer hover:outline hover:outline-1 hover:outline-blue-400/60"
          } ${isSelected
            ? "border-2 border-blue-500 p-2.5"
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
>>>>>>> 8d95dec (Initial project code)
            </button>
          </div>
        )}

<<<<<<< HEAD
        {el.type === "heading" && (
          <h2 style={{ fontSize: "32px", fontWeight: "700", color: "#0f172a", ...getInnerStyles(resolvedStyles) }}>
            {el.content}
=======
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
              renderTextPath(parseDynamicTags(el.content), resolvedStyles)
            ) : (
              parseDynamicTags(el.content)
            )}
>>>>>>> 8d95dec (Initial project code)
          </h2>
        )}

        {el.type === "text" && (
<<<<<<< HEAD
          <p style={{ fontSize: "16px", color: "#475569", ...getInnerStyles(resolvedStyles) }}>
            {el.content}
=======
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
            {parseDynamicTags(el.content)}
>>>>>>> 8d95dec (Initial project code)
          </p>
        )}

        {el.type === "image" && (
<<<<<<< HEAD
          <div style={{ textAlign: (resolvedStyles.textAlign as any) || "left" }}>
            {el.src ? (
              <img src={resolveImageUrl(el.src, apiUrl)} alt={el.alt || "Image"} className="max-w-full rounded-lg" />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-slate-50">
                <EmptyPictureIcon />
                <span className="text-xs font-bold text-slate-500 mt-2">No Image Selected</span>
=======
          <div style={{ textAlign: (getStyleVal(el, "textAlign", activeBreakpointId, breakpoints) || "left") as React.CSSProperties["textAlign"] }}>
            {el.src ? (
              <img
                src={resolveImageUrl(parseDynamicTags(el.src) || el.src, apiUrl)}
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
>>>>>>> 8d95dec (Initial project code)
              </div>
            )}
          </div>
        )}

        {el.type === "button" && (
<<<<<<< HEAD
          <div style={{ textAlign: (resolvedStyles.textAlign as any) || "left" }}>
            <a
              href={el.href || "#"}
              onClick={(e) => !isPreview && e.preventDefault()}
              className="inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow"
              style={{ ...getInnerStyles(resolvedStyles) }}
            >
              {el.content}
=======
          <div style={{ textAlign: (getStyleVal(el, "textAlign", activeBreakpointId, breakpoints) || "left") as React.CSSProperties["textAlign"] }}>
            <a
              href={parseDynamicTags(el.href) || "#"}
              {...getSafeAttributes(el)}
              {...getSafeLinkAttributes(el)}
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
              {parseDynamicTags(el.content)}
>>>>>>> 8d95dec (Initial project code)
            </a>
          </div>
        )}

<<<<<<< HEAD
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
=======
        {el.type === "html" && (
          <div
            style={getInnerStyles(resolvedStyles)}
            {...(isPreview ? {} : {
              onDoubleClick: (e) => {
                e.stopPropagation();
                setSelectedId(el.id);
                setActiveSidebarTab("element");
              }
            })}
            dangerouslySetInnerHTML={{
              __html: (isPreview && el.htmlAllowScripts)
                ? (parseDynamicTags(el.htmlContent) || (isPreview ? "" : "<div class=\"flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-[#f8fafc] border border-dashed border-slate-300 rounded-xl m-2 select-none\"><div class=\"w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-4\"><svg class=\"w-6 h-6 text-amber-500\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4\" /></svg></div><h3 class=\"text-sm font-extrabold text-slate-700 tracking-tight mb-1\">Custom HTML Configured</h3><p class=\"text-[11px] text-slate-500 font-medium max-w-[200px] text-center leading-relaxed\">Double-click this widget or use the right sidebar to inject raw HTML, IFrames, or Scripts.</p></div>"))
                : (sanitizeHtml(parseDynamicTags(el.htmlContent) || "") || (isPreview ? "" : `<div class="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-[#f8fafc] border border-dashed border-slate-300 rounded-xl m-2 select-none"><div class="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-4"><svg class="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></div><h3 class="text-sm font-extrabold text-slate-700 tracking-tight mb-1">Custom HTML Configured</h3><p class="text-[11px] text-slate-500 font-medium max-w-[200px] text-center leading-relaxed">Double-click this widget or use the right sidebar to inject raw HTML, IFrames, or Scripts.</p></div>`))
            }}
          />
        )}

        {el.type === "shortcode" && (
          <div
            style={getInnerStyles(resolvedStyles)}
            {...(isPreview ? {} : {
              onDoubleClick: (e) => {
                e.stopPropagation();
                setSelectedId(el.id);
                setActiveSidebarTab("element");
              }
            })}
          >
            {isPreview ? (
              (() => {
                if (!el.shortcode) return <div dangerouslySetInnerHTML={{ __html: `<div class="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-50 to-[#f8fafc] border border-dashed border-slate-300 rounded-xl m-2 select-none"><div class="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-4"><svg class="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><h3 class="text-sm font-extrabold text-slate-700 tracking-tight mb-1">Shortcode Module Active</h3><p class="text-[11px] text-slate-500 font-medium max-w-[200px] text-center leading-relaxed">Double-click to link this module to dynamic platform components like forms or APIs.</p></div>` }} />;
                const match = el.shortcode.match(/\[([a-zA-Z0-9_-]+)\]/);
                if (!match) return <div className="p-4 border rounded border-red-500 bg-red-50 text-red-700 font-bold">❌ Error: Invalid shortcode format</div>;
                const type = match[1];
                if (type === "contact-form" || type === "contact_form") {
                  return (
                    <form className="space-y-4 w-full max-w-lg p-6 bg-white rounded-xl shadow-sm border border-slate-200" onSubmit={(e) => { e.preventDefault(); alert('Shortcode form simulated submission'); }}>
                      <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Contact Us</h3>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Name</label>
                        <input type="text" placeholder="John Doe" className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:border-blue-500 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
                        <input type="email" placeholder="john@example.com" className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:border-blue-500 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Message</label>
                        <textarea placeholder="How can we help you?" className="w-full text-sm px-3 py-2 border border-slate-300 rounded h-24 focus:border-blue-500 outline-none" required></textarea>
                      </div>
                      <button type="submit" className="w-full py-2 bg-blue-600 cursor-pointer text-white text-sm font-bold rounded hover:bg-blue-700 transition">Send Message</button>
                    </form>
                  );
                }
                return <div className="p-4 border rounded border-amber-500 bg-amber-50 text-amber-700 font-bold">⚠️ Fallback: Unknown shortcode [{type}]</div>;
              })()
            ) : (
              <div className="p-4 bg-slate-900 border border-dashed border-slate-700 text-white rounded-xl font-mono text-xs select-none">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold mb-1 text-[10px] tracking-wider uppercase">
                  🧩 Shortcode Widget
                </div>
                <div className="text-slate-350 font-medium">
                  {el.shortcode || <span className="text-slate-500 italic">[Enter shortcode in sidebar]</span>}
                </div>
              </div>
            )}
          </div>
        )}
        {el.type === "plugin" && (
          <div
            style={getInnerStyles(resolvedStyles)}
            {...(isPreview ? {} : {
              onDoubleClick: (e) => {
                e.stopPropagation();
                setSelectedId(el.id);
                setActiveSidebarTab("element");
              }
            })}
          >
            {(() => {
              const isPluginEnabled = globalSettings?.plugins?.[el.pluginId!]?.enabled !== false;
              return pluginRegistry.renderPluginComponent(el.pluginId!, el.pluginComponentKey!, isPluginEnabled, { ...el.pluginProps, isPreview });
            })()}
>>>>>>> 8d95dec (Initial project code)
          </div>
        )}
      </div>
    );
  };

<<<<<<< HEAD
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
=======
  // Render Loader
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-xs font-semibold">Loading Website Editor...</p>
        </div>
>>>>>>> 8d95dec (Initial project code)
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans">
<<<<<<< HEAD
      {/* Top Header Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between bg-[#0b1329] px-5 shadow-md">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-xs font-semibold text-slate-300 hover:text-white">
            ‹ Dashboard
          </Link>
          <span className="text-xs font-bold text-white">{website?.name || "Website Editor"}</span>

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
=======

      {/* F-124: macOS style Command Palette Overlay */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowCommandPalette(false)}>
          <div className="w-full max-w-lg bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>

            <div className="relative border-b border-slate-700/50">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                ref={inputRef}
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Search commands... (e.g. Add Button, Preview)"
                className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 py-4 pl-12 pr-4 outline-none text-lg font-medium"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50">
                <span className="px-1.5 py-0.5 border border-slate-600 rounded text-[10px] font-bold text-slate-300">ESC</span>
                <span className="text-[10px] text-slate-400 font-semibold">to close</span>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2 layout-scroll">
              {commandList.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm font-medium">No commands found.</div>
              ) : (
                commandList.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={cmd.action}
                    className="w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 rounded-lg transition-colors"
                  >
                    <span className="text-xl opacity-80">{cmd.icon}</span>
                    <span className="font-semibold text-sm">{cmd.name}</span>
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/50 text-xs text-slate-400 flex items-center justify-between">
              <span>Command Palette</span>
              <span><strong>Cmd/Ctrl + K</strong> to launch anytime.</span>
            </div>
          </div>
        </div>
      )}

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
>>>>>>> 8d95dec (Initial project code)
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

<<<<<<< HEAD
      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
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
=======
      {/* ========================================== */}
      {/* Main Workspace Body                         */}
      {/* ========================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ========================================== */}
        {/* Left Sidebar: ELEMENTS                     */}
        {/* ========================================== */}
        {!isPreview && (
          <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-4 overflow-y-auto shadow-sm">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">
              ELEMENTS
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Container */}
              <button
                onClick={() => handleAddElement("container")}
                className="col-span-2 flex items-center justify-center gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <ContainerBoxIcon />
                <span className="text-xs font-bold text-blue-700 group-hover:text-blue-800">
                  + Add Container
                </span>
              </button>

              {/* Heading */}
              <button
                onClick={() => handleAddElement("heading")}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <HeadingBoxIcon />
                <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  Heading
                </span>
              </button>

              {/* Text */}
              <button
                onClick={() => handleAddElement("text")}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <TextBoxIcon />
                <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  Text
                </span>
              </button>

              {/* Image */}
              <button
                onClick={() => handleAddElement("image")}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <ImageBoxIcon />
                <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  Image
                </span>
              </button>

              {/* Button */}
              <button
                onClick={() => handleAddElement("button")}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-400 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <ButtonBoxIcon />
                <span className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  Button
                </span>
              </button>

              {/* HTML Widget (F-110) */}
              <button
                onClick={() => handleAddElement("html")}
                className="col-span-2 flex items-center justify-center gap-3 rounded-xl border border-amber-200 bg-amber-50/30 p-3 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <CodeBoxIcon />
                <span className="text-xs font-bold text-amber-700 group-hover:text-amber-800">
                  + Add HTML Widget
                </span>
              </button>

              {/* Shortcode Widget (F-111) */}
              <button
                onClick={() => handleAddElement("shortcode")}
                className="col-span-2 flex items-center justify-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-3 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
              >
                <ShortcodeBoxIcon />
                <span className="text-xs font-bold text-indigo-700 group-hover:text-indigo-800">
                  + Add Shortcode Widget
                </span>
              </button>

              {/* F-119 Plugin Components */}
              {pluginRegistry.getAvailableComponents()
                .filter((pComp: any) => globalSettings?.plugins?.[pComp.pluginId]?.enabled !== false)
                .map((pComp: any) => (
                  <button
                    key={`${pComp.pluginId}-${pComp.componentKey}`}
                    onClick={() => handleAddPluginElement(pComp.pluginId, pComp.componentKey)}
                    className="col-span-2 flex items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:shadow hover:-translate-y-0.5 active:scale-95 group"
                  >
                    <span className="text-lg">{pComp.icon}</span>
                    <span className="text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                      + Add {pComp.name}
                    </span>
                  </button>
                ))}
>>>>>>> 8d95dec (Initial project code)
            </div>
          </aside>
        )}

<<<<<<< HEAD
        {/* Center Canvas */}
=======
        {/* ========================================== */}
        {/* Center: White Canvas Container              */}
        {/* ========================================== */}
>>>>>>> 8d95dec (Initial project code)
        <main
          onClick={() => setSelectedId(null)}
          className="flex flex-1 justify-center items-start overflow-y-auto bg-[#f1f5f9] p-6 sm:p-10"
        >
<<<<<<< HEAD
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
=======
          <div
            id={`page-${websiteId || "active"}`}
            style={{
              width: "100%",
              maxWidth: activeBreakpointId === "widescreen" ? "100%"
                : activeBreakpointId === "desktop" ? "var(--siteMaxWidth)"
                  : `${breakpoints.find(b => b.id === activeBreakpointId)?.width || 1024}px`,
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

                  {/* Image Settings */}
                  {selectedElement.type === "image" && (
                    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                        Image Settings
                      </span>

                      {/* Image Preview / Drag & Drop Upload */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                          Upload Image or Paste URL
                        </label>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                          }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition ${dragOver
                            ? "border-blue-500 bg-blue-50/30"
                            : "border-slate-300 bg-slate-50/50 hover:border-slate-400"
                            }`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <UploadCloudIcon />
                          <span className="text-[11px] font-medium text-slate-500 mt-1.5">
                            {isUploading ? "Uploading..." : "Click or drag image here"}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            Max size: 5MB (JPG, PNG, WEBP, GIF, SVG)
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleImageFileSelect(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </div>
                        {uploadError && (
                          <p className="mt-1 text-[10px] font-semibold text-red-500">
                            {uploadError}
                          </p>
                        )}
                      </div>

                      {/* Image Source Input */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          IMAGE SOURCE (URL)
                        </label>
                        <input
                          type="text"
                          value={selectedElement.src || ""}
                          onChange={(e) => updateSelectedProp("src", e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Image Alt Text */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          ALT TEXT (SEO)
                        </label>
                        <input
                          type="text"
                          value={selectedElement.alt || ""}
                          onChange={(e) => updateSelectedProp("alt", e.target.value)}
                          placeholder="e.g. A beautiful view of the beach"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Button / Link Settings (F-109) */}
                  {selectedElement.type === "button" && (
                    <div className="space-y-3.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                        Link Settings & Attributes
                      </span>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Link URL (href)
                        </label>
                        <input
                          type="text"
                          value={selectedElement.href || ""}
                          onChange={(e) => {
                            // Strip javascript links for basic security
                            const val = e.target.value;
                            if (val.trim().toLowerCase().startsWith("javascript:")) {
                              updateSelectedProp("href", "#");
                            } else {
                              updateSelectedProp("href", val);
                            }
                          }}
                          placeholder="e.g. https://example.com"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Target
                          </label>
                          <select
                            value={selectedElement.customLinkAttributes?.target || "_self"}
                            onChange={(e) => {
                              const attrs = { ...(selectedElement.customLinkAttributes || {}) };
                              attrs.target = e.target.value;
                              updateSelectedProp("customLinkAttributes", attrs);
                            }}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="_self">_self</option>
                            <option value="_blank">_blank</option>
                            <option value="_parent">_parent</option>
                            <option value="_top">_top</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Referrer Policy
                          </label>
                          <select
                            value={selectedElement.customLinkAttributes?.referrerPolicy || ""}
                            onChange={(e) => {
                              const attrs = { ...(selectedElement.customLinkAttributes || {}) };
                              attrs.referrerPolicy = e.target.value;
                              updateSelectedProp("customLinkAttributes", attrs);
                            }}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                          >
                            <option value="">default</option>
                            <option value="no-referrer">no-referrer</option>
                            <option value="no-referrer-when-downgrade">no-referrer-when-downgrade</option>
                            <option value="origin">origin</option>
                            <option value="origin-when-cross-origin">origin-when-cross-origin</option>
                            <option value="same-origin">same-origin</option>
                            <option value="strict-origin">strict-origin</option>
                            <option value="strict-origin-when-cross-origin">strict-origin-when-cross-origin</option>
                            <option value="unsafe-url">unsafe-url</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Rel (relationship)
                        </label>
                        <input
                          type="text"
                          value={selectedElement.customLinkAttributes?.rel || ""}
                          onChange={(e) => {
                            const attrs = { ...(selectedElement.customLinkAttributes || {}) };
                            attrs.rel = e.target.value;
                            updateSelectedProp("customLinkAttributes", attrs);
                          }}
                          placeholder="e.g. noopener noreferrer"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Lang
                          </label>
                          <input
                            type="text"
                            value={selectedElement.customLinkAttributes?.hreflang || ""}
                            onChange={(e) => {
                              const attrs = { ...(selectedElement.customLinkAttributes || {}) };
                              attrs.hreflang = e.target.value;
                              updateSelectedProp("customLinkAttributes", attrs);
                            }}
                            placeholder="e.g. en"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Mime
                          </label>
                          <input
                            type="text"
                            value={selectedElement.customLinkAttributes?.type || ""}
                            onChange={(e) => {
                              const attrs = { ...(selectedElement.customLinkAttributes || {}) };
                              attrs.type = e.target.value;
                              updateSelectedProp("customLinkAttributes", attrs);
                            }}
                            placeholder="e.g. text/html"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Download
                          </label>
                          <input
                            type="text"
                            value={selectedElement.customLinkAttributes?.download || ""}
                            onChange={(e) => {
                              const attrs = { ...(selectedElement.customLinkAttributes || {}) };
                              attrs.download = e.target.value;
                              updateSelectedProp("customLinkAttributes", attrs);
                            }}
                            placeholder="filename"
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HTML Type Settings (F-110) */}
                  {selectedElement.type === "html" && (
                    <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                        HTML Widget Studio
                      </span>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">
                            RAW SOURCE EDITOR
                          </label>
                          {(() => {
                            const { isValid, errorMsg } = getHtmlValidity(tempHtml);
                            if (!tempHtml) return <span className="text-[9px] font-bold text-slate-400">Empty</span>;
                            if (isValid) return <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✓ Valid HTML</span>;
                            return <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded cursor-help" title={errorMsg}>⚠️ Parse Warning</span>;
                          })()}
                        </div>

                        <div className="rounded-lg border border-slate-700 bg-[#0d1117] overflow-hidden shadow-inner flex flex-col">
                          <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                              <span className="ml-2 text-[9px] font-mono text-slate-400">index.html</span>
                            </div>
                          </div>
                          <textarea
                            rows={12}
                            value={tempHtml}
                            onChange={(e) => setTempHtml(e.target.value)}
                            placeholder="<!-- Pro Tip: Paste custom embeddings here -->
<section class='custom-section'>
  <h2>My Section</h2>
</section>"
                            className="w-full bg-transparent p-3 font-mono text-xs font-medium text-[#7ee787] outline-none leading-relaxed resize-y min-h-[150px] placeholder:text-slate-600"
                            spellCheck={false}
                          />
                        </div>

                        <div className="flex items-center flex-wrap gap-1.5 pt-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Snippets:</span>
                          <button onClick={() => setTempHtml('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="100%" height="300" frameborder="0" allowfullscreen></iframe>')} className="px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded text-[9px] font-bold border border-slate-200 transition">▶ YouTube</button>
                          <button onClick={() => setTempHtml('<iframe src="https://www.google.com/maps/embed?pb=" width="100%" height="300" style="border:0;" allowfullscreen="" loading="lazy"></iframe>')} className="px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded text-[9px] font-bold border border-slate-200 transition">📍 Google Map</button>
                          <button onClick={() => setTempHtml('<div class="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg border border-blue-400/50 flex flex-col items-center justify-center text-center"><h3 class="text-xl font-bold mb-2">✨ Premium Feature</h3><p class="text-blue-100 text-sm opacity-90 max-w-sm">Upgrade your account to unlock this exclusive component.</p></div>')} className="px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded text-[9px] font-bold border border-slate-200 transition">✨ Promo Card</button>
                        </div>
                      </div>

                      <div className="mt-1">
                        <label className="flex items-center gap-2 cursor-pointer bg-red-50/40 hover:bg-red-50 p-2.5 rounded-lg border border-red-100 transition" title="Bypasses sanitization in preview mode">
                          <input
                            type="checkbox"
                            checked={!!selectedElement.htmlAllowScripts}
                            onChange={(e) => updateSelectedProp("htmlAllowScripts", e.target.checked)}
                            className="accent-red-600 w-3.5 h-3.5"
                          />
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-red-700 leading-none mb-0.5">Allow Raw Scripts & Iframes</span>
                            <span className="text-[8px] font-semibold text-red-400">Required for dynamic embeds (Twitter, Stripe)</span>
                          </div>
                        </label>
                      </div>

                      <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setTempHtml("");
                            updateSelectedProp("htmlContent", "");
                          }}
                          className="rounded-md hover:bg-slate-100 text-slate-500 font-bold px-3 py-1.5 text-xs transition cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateSelectedProp("htmlContent", tempHtml);
                          }}
                          className="rounded-md bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 text-white font-bold px-5 py-1.5 text-[11px] transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Save & Apply</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Shortcode Type Settings (F-111) */}
                  {selectedElement.type === "shortcode" && (
                    <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                        Shortcode Integrations
                      </span>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">
                            DYNAMIC SHORTCODE TAG
                          </label>
                          {(() => {
                            const { isValid, errorMsg } = getShortcodeValidity(tempShortcode);
                            if (!tempShortcode) return <span className="text-[9px] font-bold text-slate-400">Empty</span>;
                            if (isValid) return <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✓ Valid Tag</span>;
                            return <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded cursor-help" title={errorMsg}>⚠️ Malformed</span>;
                          })()}
                        </div>

                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">[</div>
                          <input
                            type="text"
                            value={tempShortcode.replace(/\[|\]/g, '')}
                            onChange={(e) => setTempShortcode(`[${e.target.value}]`)}
                            placeholder="contact-form"
                            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 pl-6 pr-6 font-mono text-xs font-semibold text-blue-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">]</div>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-2">
                          <span className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Available Integrations:</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setTempShortcode('[contact-form]')} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] font-bold border border-slate-200 transition text-left">
                              <span className="text-blue-500 text-xs">✉️</span> Contact Form
                            </button>
                            <button onClick={() => setTempShortcode('[blog-feed]')} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] font-bold border border-slate-200 transition text-left">
                              <span className="text-orange-500 text-xs">📰</span> Latest News
                            </button>
                            <button onClick={() => setTempShortcode('[pricing-table]')} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] font-bold border border-slate-200 transition text-left">
                              <span className="text-emerald-500 text-xs">💳</span> Pricing Tiers
                            </button>
                            <button onClick={() => setTempShortcode('[user-profile]')} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] font-bold border border-slate-200 transition text-left">
                              <span className="text-purple-500 text-xs">👤</span> User Profile
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setTempShortcode("");
                            updateSelectedProp("shortcode", "");
                          }}
                          className="rounded-md hover:bg-slate-100 text-slate-500 font-bold px-3 py-1.5 text-xs transition cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateSelectedProp("shortcode", tempShortcode);
                          }}
                          className="rounded-md bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 text-white font-bold px-5 py-1.5 text-[11px] transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Save & Apply</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        </button>
                      </div>
                    </div>
                  )}


                  {/* 1. Layout & Spacing */}
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

                      {/* CSS Classes (F-106) */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          CSS Classes
                        </label>

                        {selectedElement.customClass ? (
                          <div className="flex flex-wrap gap-1.5 mb-2 p-1.5 bg-slate-50/50 rounded-lg border border-slate-200/60 max-h-24 overflow-y-auto">
                            {selectedElement.customClass
                              .split(" ")
                              .filter(Boolean)
                              .map((cls, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/80 hover:bg-red-50 hover:text-red-650 hover:border-red-200/50 border border-slate-300/40 text-[9px] font-bold text-slate-700 transition cursor-pointer select-none group"
                                  onClick={() => {
                                    const classList = selectedElement.customClass?.split(" ").filter(Boolean) || [];
                                    const updated = classList.filter((_, i) => i !== idx).join(" ");
                                    updateSelectedProp("customClass", updated);
                                  }}
                                  title="Click to remove class"
                                >
                                  <span>{cls}</span>
                                  <span className="text-[10px] font-bold opacity-60 group-hover:opacity-100">×</span>
                                </span>
                              ))}
                          </div>
                        ) : null}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newClassInput}
                            onChange={(e) => {
                              const val = e.target.value
                                .replace(/\s+/g, "-")
                                .replace(/[^a-zA-Z0-9_-]/g, "");
                              setNewClassInput(val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                const trimmed = newClassInput.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "").trim();
                                if (trimmed) {
                                  const classList = selectedElement.customClass ? selectedElement.customClass.split(" ").filter(Boolean) : [];
                                  if (!classList.includes(trimmed)) {
                                    const updated = [...classList, trimmed].join(" ");
                                    updateSelectedProp("customClass", updated);
                                  }
                                  setNewClassInput("");
                                }
                              }
                            }}
                            placeholder="Add class..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newClassInput.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "").trim();
                              if (trimmed) {
                                const classList = selectedElement.customClass ? selectedElement.customClass.split(" ").filter(Boolean) : [];
                                if (!classList.includes(trimmed)) {
                                  const updated = [...classList, trimmed].join(" ");
                                  updateSelectedProp("customClass", updated);
                                }
                                setNewClassInput("");
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition rounded-lg outline-none select-none cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {/* CSS ID (F-105) */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          CSS ID
                        </label>
                        <input
                          type="text"
                          value={selectedElement.customId || ""}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\s+/g, "-")
                              .replace(/[^a-zA-Z0-9_-]/g, ""); // Allow only valid CSS ID characters
                            updateSelectedProp("customId", val);
                          }}
                          placeholder="e.g. main-hero-section"
                          className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 ${selectedElement.customId && checkDuplicateId(elements, selectedElement.customId, selectedElement.id)
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-slate-300"
                            }`}
                        />
                        {selectedElement.customId && checkDuplicateId(elements, selectedElement.customId, selectedElement.id) && (
                          <p className="text-[10px] text-red-500 font-bold mt-1">
                            ⚠️ This CSS ID is already in use by another element. IDs must be unique globally.
                          </p>
                        )}
                      </div>

                      {/* Element Custom CSS (F-102) */}
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-100/60">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Element Custom CSS
                          </label>
                          {selectedElement.customCss && (
                            <button
                              type="button"
                              onClick={() => updateSelectedProp("customCss", "")}
                              className="text-[9px] font-semibold text-red-500 hover:underline cursor-pointer border-none bg-transparent p-0 outline-none"
                            >
                              Clear CSS
                            </button>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                          Use <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px] font-bold text-blue-600">selector</code> or <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px] font-bold text-blue-600">&</code> to target this element dynamically.
                        </div>
                        <textarea
                          rows={4}
                          value={selectedElement.customCss || ""}
                          onChange={(e) => updateSelectedProp("customCss", e.target.value)}
                          placeholder={`color: #1e293b;\npadding: 40px;\n\n&:hover {\n  background: #f8fafc;\n}`}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-700 outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Custom Attributes (F-108) */}
                      <div className="space-y-2 pt-2 border-t border-slate-100/60">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Custom Attributes
                          </label>
                          <button
                            type="button"
                            onClick={addEmptyAttribute}
                            className="text-[9px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer border-none bg-transparent p-0 outline-none"
                          >
                            + Add Attribute
                          </button>
                        </div>

                        {selectedElement.customAttributes && Object.keys(selectedElement.customAttributes).length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex gap-2 text-[9px] font-bold text-slate-400 uppercase">
                              <span className="w-[45%]">Name</span>
                              <span className="w-[45%]">Value</span>
                            </div>
                            {Object.entries(selectedElement.customAttributes).map(([key, val]) => (
                              <div key={key} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  defaultValue={key}
                                  onBlur={(e) => updateAttributeKey(key, e.target.value)}
                                  placeholder="data-testid"
                                  className="w-[45%] rounded border border-slate-350 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                                />
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) => updateAttributeValue(key, e.target.value)}
                                  placeholder="value"
                                  className="w-[45%] rounded border border-slate-350 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => deleteAttribute(key)}
                                  className="text-slate-400 hover:text-red-500 text-sm font-bold p-1 cursor-pointer select-none transition"
                                  title="Delete attribute"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No custom attributes added.</div>
                        )}
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
>>>>>>> 8d95dec (Initial project code)
                              />
                            </div>
                          </div>
                        )}
                      </div>

<<<<<<< HEAD
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
=======
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
>>>>>>> 8d95dec (Initial project code)
                          </div>
                        )}
                      </div>
                    </div>
<<<<<<< HEAD
                  )}
                </div>
              </>
            )}
=======
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
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide font-sans">
                        Global Stylesheet (CSS)
                      </h3>
                      {globalSettings.customCss && (
                        <button
                          type="button"
                          onClick={() => setGlobalSettings((prev: any) => ({
                            ...prev,
                            customCss: ""
                          }))}
                          className="text-[9px] font-semibold text-red-500 hover:underline cursor-pointer border-none bg-transparent p-0 outline-none"
                        >
                          Clear Global CSS
                        </button>
                      )}
                    </div>

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

                  {/* F-103 Page Custom CSS */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide font-sans">
                        Page Stylesheet (CSS)
                      </h3>
                      {pageCustomCss && (
                        <button
                          type="button"
                          onClick={() => setPageCustomCss("")}
                          className="text-[9px] font-semibold text-red-500 hover:underline cursor-pointer border-none bg-transparent p-0 outline-none"
                        >
                          Clear Page CSS
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase">PAGE SPECIFIC RULES</label>
                      <textarea
                        rows={6}
                        value={pageCustomCss || ""}
                        onChange={(e) => setPageCustomCss(e.target.value)}
                        placeholder={`.page-header {\n  padding: 40px;\n}\n\n.page-header h1 {\n  font-size: 48px;\n}`}
                        className="w-full rounded border p-2 text-xs font-mono bg-white outline-none focus:border-blue-500 leading-normal"
                      />
                    </div>
                  </div>

                  {/* F-112: Site Custom Code */}
                  <div className="space-y-3.5 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide font-sans">
                        Developer Custom Code
                      </h3>
                      {globalSettings.customCodeList && globalSettings.customCodeList.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete all custom code snippets?")) {
                              setGlobalSettings((prev: any) => ({ ...prev, customCodeList: [] }));
                            }
                          }}
                          className="text-[9px] font-semibold text-red-500 hover:underline cursor-pointer border-none bg-transparent p-0 outline-none"
                        >
                          Clear All Custom Code
                        </button>
                      )}
                    </div>

                    <div className="border-t border-b border-slate-150 py-2 space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Simulated Environment</label>
                      <select
                        value={simulatedEnvironment}
                        onChange={(e) => setSimulatedEnvironment(e.target.value as any)}
                        className="w-full rounded border px-2 py-1 text-xs bg-white font-semibold text-slate-800 focus:border-indigo-500 outline-none transition"
                      >
                        <option value="development">Development (Draft)</option>
                        <option value="staging">Staging (Draft)</option>
                        <option value="production">Production (Published Only)</option>
                      </select>
                    </div>

                    <p className="text-[10px] text-slate-400 font-medium">
                      ⚠️ Custom scripts only execute in Preview mode. Enter trusted code only.
                    </p>

                    {viewingHistorySnippetId ? (
                      // F-115 Revision History UI Panel
                      <div className="space-y-3 p-0.5">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                          <span className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-wider">
                            Snippet History
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setViewingHistorySnippetId(null);
                              setViewingRevisionId(null);
                            }}
                            className="text-[9.5px] font-bold text-blue-600 hover:underline bg-transparent border-none outline-none cursor-pointer"
                          >
                            &larr; Back to Form
                          </button>
                        </div>

                        <div className="text-[10px] font-bold text-slate-700 bg-slate-100 p-2 rounded border border-slate-200 truncate">
                          Snippet: <span className="text-slate-900">{
                            (globalSettings.customCodeList || []).find((s: any) => s.id === viewingHistorySnippetId)?.name || "Snippet Name"
                          }</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8.5px] font-extrabold text-slate-400 block uppercase">SELECT REVISION</label>
                          <select
                            value={viewingRevisionId || ""}
                            onChange={(e) => setViewingRevisionId(e.target.value || null)}
                            className="w-full rounded border px-2 py-1 text-xs bg-white focus:border-blue-500 outline-none"
                          >
                            <option value="">-- Select a Version to Preview --</option>
                            {(globalSettings.customCodeRevisions || [])
                              .filter((r: any) => r.snippetId === viewingHistorySnippetId)
                              .sort((a: any, b: any) => b.version - a.version)
                              .map((rev: any, idx: number) => (
                                <option key={rev.id} value={rev.id}>
                                  v{rev.version} — {rev.createdAt} {idx === 0 ? "(Latest Configured)" : ""}
                                </option>
                              ))
                            }
                          </select>
                        </div>

                        {(() => {
                          const selectedRevision = (globalSettings.customCodeRevisions || []).find((r: any) => r.id === viewingRevisionId);
                          if (!selectedRevision) {
                            return <p className="text-[10px] text-slate-450 text-center py-4 font-medium">Select a configured revision version above to review and restore.</p>;
                          }

                          return (
                            <div className="space-y-3.5 border-t border-slate-150 pt-3">
                              <div className="grid grid-cols-2 gap-2 text-[9px] font-semibold text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                                <div>Version: <strong className="text-slate-700 font-bold">v{selectedRevision.version}</strong></div>
                                <div>Date: <span className="text-slate-700 font-bold">{selectedRevision.createdAt}</span></div>
                                <div>Type: <strong className="text-slate-700 font-bold capitalize">{selectedRevision.type}</strong></div>
                                <div>Placement: <strong className="text-slate-700 font-bold capitalize">{selectedRevision.placement}</strong></div>
                                <div className="col-span-2">
                                  Optimization: <strong className="text-slate-700 font-bold">{selectedRevision.minifyInProduction ? "Minification Enabled" : "Minification Disabled"}</strong>
                                </div>
                                <div className="col-span-2">
                                  Conditions:{" "}
                                  {selectedRevision.conditions && selectedRevision.conditions.length > 0 ? (
                                    <span className="text-slate-700 font-bold">
                                      {selectedRevision.conditions.map((c: any) => `${c.type} ${c.operator === "equals" ? "=" : "≠"} ${c.value}`).join(", ")}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">None</span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <label className="text-[8.5px] font-extrabold text-slate-400 block mb-1 uppercase">REVISION SOURCE CODE</label>
                                <textarea
                                  rows={8}
                                  readOnly
                                  value={selectedRevision.code}
                                  className="w-full rounded border p-2 text-xs font-mono bg-slate-900 text-teal-400 outline-none select-all"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Restore version v${selectedRevision.version}? Your current Custom Code will be replaced. A new revision will be created.`)) {
                                    // Security block on restoring code
                                    const codeLower = (selectedRevision.code || "").toLowerCase();
                                    if (codeLower.includes("<?php") || (codeLower.includes("<?") && selectedRevision.type === "html")) {
                                      alert("PHP execution blocks are prohibited in Custom Code. Revision cannot be restored.");
                                      return;
                                    }
                                    if (
                                      codeLower.includes("child_process") ||
                                      codeLower.includes("require('fs')") ||
                                      codeLower.includes("require(\"fs\")") ||
                                      codeLower.includes("require('child_process')") ||
                                      codeLower.includes("require(\"child_process\")") ||
                                      codeLower.includes("process.exit") ||
                                      codeLower.includes("process.env")
                                    ) {
                                      alert("Server-side and Node.js process APIs are prohibited. Revision cannot be restored.");
                                      return;
                                    }
                                    if (/\beval\s*\(/.test(selectedRevision.code || "")) {
                                      alert("Use of eval() function is prohibited for security reasons. Revision cannot be restored.");
                                      return;
                                    }
                                    if (/\bnew\s+Function\s*\(/.test(selectedRevision.code || "")) {
                                      alert("Use of new Function() constructor is prohibited. Revision cannot be restored.");
                                      return;
                                    }
                                    if (/\b(exec|spawn|execSync|spawnSync)\s*\(/.test(selectedRevision.code || "")) {
                                      alert("Use of system process execution APIs is prohibited. Revision cannot be restored.");
                                      return;
                                    }

                                    // Collect syntax warnings
                                    let syntaxWarning = "";
                                    if (selectedRevision.type === "javascript") {
                                      const jsVal = getJSSyntaxValidity(selectedRevision.code);
                                      if (!jsVal.isValid) syntaxWarning = jsVal.errorMsg || "";
                                    } else if (selectedRevision.type === "css") {
                                      const cssVal = getCssSyntaxValidity(selectedRevision.code);
                                      if (!cssVal.isValid) syntaxWarning = cssVal.errorMsg || "";
                                    } else if (selectedRevision.type === "html") {
                                      const htmlVal = getHtmlValidity(selectedRevision.code);
                                      if (!htmlVal.isValid) syntaxWarning = `HTML syntax warning: ${htmlVal.errorMsg}`;
                                    }

                                    setSnippetName(selectedRevision.name);
                                    setSnippetCode(selectedRevision.code);
                                    setSnippetType(selectedRevision.type);
                                    setSnippetPlacement(selectedRevision.placement);
                                    setSnippetConditions(selectedRevision.conditions || []);
                                    setMinifyInProduction(selectedRevision.minifyInProduction !== false);
                                    setSnippetEnvironments(selectedRevision.environments || ["development", "staging", "production"]);
                                    setSnippetDependencies(selectedRevision.dependencies || []); // F-120
                                    setSelectedSnippetId(selectedRevision.snippetId);

                                    setGlobalSettings((prev: any) => {
                                      const list = prev.customCodeList ? [...prev.customCodeList] : [];
                                      const revisions = prev.customCodeRevisions ? [...prev.customCodeRevisions] : [];
                                      const targetSnippetId = selectedRevision.snippetId;

                                      const restoreData: any = {
                                        id: targetSnippetId,
                                        name: selectedRevision.name,
                                        code: selectedRevision.code,
                                        type: selectedRevision.type,
                                        placement: selectedRevision.placement,
                                        conditions: selectedRevision.conditions,
                                        minifyInProduction: selectedRevision.minifyInProduction,
                                        environments: selectedRevision.environments || ["development", "staging", "production"],
                                        dependencies: selectedRevision.dependencies || [] // F-120
                                      };

                                      const idx = list.findIndex(snip => snip.id === targetSnippetId);
                                      if (idx !== -1) {
                                        const doc = list[idx];
                                        // Keep published revision ID intact when saving draft
                                        restoreData.publishedRevisionId = doc.publishedRevisionId;
                                        list[idx] = restoreData;
                                      } else {
                                        list.push(restoreData);
                                      }

                                      const snippetRevisions = revisions.filter(r => r.snippetId === targetSnippetId);
                                      const nextVer = snippetRevisions.length + 1;
                                      revisions.push({
                                        id: `rev_${Date.now()}`,
                                        snippetId: targetSnippetId,
                                        version: nextVer,
                                        name: selectedRevision.name,
                                        code: selectedRevision.code,
                                        type: selectedRevision.type,
                                        placement: selectedRevision.placement,
                                        conditions: selectedRevision.conditions,
                                        minifyInProduction: selectedRevision.minifyInProduction,
                                        environments: selectedRevision.environments || ["development", "staging", "production"],
                                        dependencies: selectedRevision.dependencies || [], // F-120
                                        createdAt: new Date().toLocaleString()
                                      });

                                      return {
                                        ...prev,
                                        customCodeList: list,
                                        customCodeRevisions: revisions
                                      };
                                    });

                                    setSnippetName("");
                                    setSnippetCode("");
                                    setSnippetConditions([]);
                                    setMinifyInProduction(true);
                                    setSnippetEnvironments(["development", "staging", "production"]);
                                    setSnippetDependencies([]); // F-120 reset
                                    setNewDepUrl(""); // F-120 reset
                                    setNewDepType("javascript"); // F-120 reset
                                    setSelectedSnippetId(null);
                                    setViewingHistorySnippetId(null);
                                    setViewingRevisionId(null);

                                    if (syntaxWarning) {
                                      setSaveMessage(`Draft restored. Warning: ${syntaxWarning}`);
                                      setTimeout(() => setSaveMessage(""), 7000);
                                    } else {
                                      setSaveMessage("Draft restored successfully!");
                                      setTimeout(() => setSaveMessage(""), 2500);
                                    }
                                  }
                                }}
                                className="w-full rounded bg-indigo-650 hover:bg-indigo-750 text-white font-bold py-1.5 text-xs transition cursor-pointer text-center"
                              >
                                Restore v{selectedRevision.version} as New Version
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 border-t border-slate-100 pt-2">
                          <label className="text-[9px] font-bold text-slate-400 block uppercase">Code Snippet Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Google Analytics"
                            value={snippetName}
                            onChange={(e) => setSnippetName(e.target.value)}
                            className="w-full rounded border px-2 py-1 text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase">Code Type</label>
                            <select
                              value={snippetType}
                              onChange={(e) => setSnippetType(e.target.value as any)}
                              className="w-full rounded border px-2 py-1 text-xs bg-white"
                            >
                              <option value="html">HTML</option>
                              <option value="css">CSS</option>
                              <option value="javascript">JavaScript</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase">Placement</label>
                            <select
                              value={snippetPlacement}
                              onChange={(e) => setSnippetPlacement(e.target.value as any)}
                              className="w-full rounded border px-2 py-1 text-xs bg-white"
                            >
                              <option value="head">Header (head)</option>
                              <option value="body-start">Body Start</option>
                              <option value="body-end">Body End</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block uppercase">Priority (F-116)</label>
                            <input
                              type="number"
                              value={snippetPriority}
                              onChange={(e) => setSnippetPriority(parseInt(e.target.value) || 100)}
                              className="w-full rounded border px-2 py-1 text-xs bg-white"
                            />
                          </div>
                        </div>

                        {/* F-117: Target Environments Selector */}
                        <div className="space-y-1.5 border-t border-slate-100 pt-2 pb-0.5">
                          <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">Target Environments</label>
                          <div className="flex gap-4">
                            {["development", "staging", "production"].map((env) => {
                              const isChecked = snippetEnvironments.includes(env);
                              return (
                                <label key={env} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 cursor-pointer capitalize">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSnippetEnvironments(prev => [...prev, env]);
                                      } else {
                                        setSnippetEnvironments(prev => prev.filter(x => x !== env));
                                      }
                                    }}
                                    className="rounded h-3.5 w-3.5 text-indigo-650 cursor-pointer"
                                  />
                                  <span>{env === "production" ? "Prod" : env === "staging" ? "Stage" : "Dev"}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* F-113: Conditions Builder Panel */}
                        <div className="space-y-2.5 border-t border-slate-100 pt-2.5">
                          <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wide">Snippet Conditions</span>

                          <div className="grid grid-cols-3 gap-1 px-1">
                            <div>
                              <label className="text-[8px] font-bold text-slate-400 block uppercase mb-0.5">When</label>
                              <select
                                value={condType}
                                onChange={(e) => setCondType(e.target.value as any)}
                                className="w-full rounded border px-1 py-0.5 text-[10px] bg-white font-medium outline-none focus:border-blue-500"
                              >
                                <option value="device">Device</option>
                                <option value="environment">Env</option>
                                <option value="auth">User Auth</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[8px] font-bold text-slate-400 block uppercase mb-0.5">Operator</label>
                              <select
                                value={condOperator}
                                onChange={(e) => setCondOperator(e.target.value as any)}
                                className="w-full rounded border px-1 py-0.5 text-[10px] bg-white font-medium outline-none focus:border-blue-500"
                              >
                                <option value="equals">Equals</option>
                                <option value="not_equals">Not Equals</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[8px] font-bold text-slate-400 block uppercase mb-0.5">Value</label>
                              {condType === "device" && (
                                <select
                                  value={condValue}
                                  onChange={(e) => setCondValue(e.target.value)}
                                  className="w-full rounded border px-1 py-0.5 text-[10px] bg-white font-medium outline-none focus:border-blue-500"
                                >
                                  <option value="desktop">Desktop</option>
                                  <option value="tablet">Tablet</option>
                                  <option value="mobile">Mobile</option>
                                </select>
                              )}
                              {condType === "environment" && (
                                <select
                                  value={condValue}
                                  onChange={(e) => setCondValue(e.target.value)}
                                  className="w-full rounded border px-1 py-0.5 text-[10px] bg-white font-medium outline-none focus:border-blue-500"
                                >
                                  <option value="preview">Preview</option>
                                  <option value="production">Live Site</option>
                                </select>
                              )}
                              {condType === "auth" && (
                                <select
                                  value={condValue}
                                  onChange={(e) => setCondValue(e.target.value)}
                                  className="w-full rounded border px-1 py-0.5 text-[10px] bg-white font-medium outline-none focus:border-blue-500"
                                >
                                  <option value="logged-in">Logged In</option>
                                  <option value="guest">Guest</option>
                                </select>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleAddCondition}
                              className="rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 text-[9px] border border-indigo-200 transition cursor-pointer"
                            >
                              + Add Condition
                            </button>
                          </div>

                          {/* Display Selected Conditions */}
                          {snippetConditions.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {snippetConditions.map((cond) => (
                                <div key={cond.id} className="flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                                  <span>
                                    {cond.type} {cond.operator === "equals" ? "=" : "≠"} {cond.value}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCondition(cond.id)}
                                    className="text-[10px] text-red-500 font-bold hover:text-red-700 ml-0.5 bg-transparent border-none p-0 leading-none cursor-pointer outline-none"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="border-t border-slate-100 pt-2 pb-0.5">
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={minifyInProduction}
                              onChange={(e) => setMinifyInProduction(e.target.checked)}
                              className="rounded h-3.5 w-3.5 text-blue-600"
                            />
                            <span>Minify in production</span>
                          </label>
                        </div>

                        {/* F-120: Custom Code Dependency / Asset Management */}
                        <div className="border-t border-slate-150 pt-2.5 pb-1 space-y-2">
                          <label className="text-[9.5px] font-extrabold text-slate-400 block uppercase tracking-wider">Dependencies</label>

                          {/* List of active snippet dependencies */}
                          {(snippetDependencies || []).length > 0 && (
                            <div className="space-y-1 bg-slate-50 border border-slate-200 rounded p-1.5 max-h-40 overflow-y-auto">
                              {snippetDependencies.map((dep, idx) => {
                                // Compute conflicts for this snippet to render live details
                                const liveCodeList = (() => {
                                  const currentList = globalSettings.customCodeList ? [...globalSettings.customCodeList] : [];
                                  if (selectedSnippetId) {
                                    return currentList.map(s => s.id === selectedSnippetId ? {
                                      ...s,
                                      name: snippetName,
                                      code: snippetCode,
                                      type: snippetType,
                                      placement: snippetPlacement,
                                      conditions: snippetConditions,
                                      environments: snippetEnvironments,
                                      dependencies: snippetDependencies
                                    } : s);
                                  } else {
                                    return [...currentList, {
                                      id: "temp_new_snippet",
                                      name: snippetName || "New Snippet",
                                      code: snippetCode,
                                      type: snippetType,
                                      placement: snippetPlacement,
                                      conditions: snippetConditions,
                                      environments: snippetEnvironments,
                                      dependencies: snippetDependencies
                                    }];
                                  }
                                })();

                                const currentSnippetConflicts = detectDependencyConflicts(liveCodeList).filter(
                                  c => c.snippetId === selectedSnippetId || (c.snippetId === "temp_new_snippet" && !selectedSnippetId) || !c.snippetId
                                );

                                const itemConflicts = currentSnippetConflicts.filter(c => c.url === dep.url);

                                return (
                                  <div key={idx} className="flex flex-col bg-white p-1 rounded border border-slate-150 text-[9px] shadow-sm">
                                    <div className="flex justify-between items-center gap-1">
                                      <div className="min-w-0 flex-1 flex items-center gap-1.5 font-sans">
                                        <span className="text-slate-350 cursor-default select-none font-bold text-[10px]">&#9776;</span>
                                        <span className={`px-1 py-0.25 rounded text-[7px] font-bold uppercase shrink-0 ${dep.type === "css" ? "bg-purple-100 text-purple-700" : "bg-yellow-105 text-yellow-800"
                                          }`}>
                                          {dep.type}
                                        </span>
                                        <span className="truncate text-slate-705 select-all font-mono" title={dep.url}>
                                          {dep.url}
                                        </span>
                                      </div>
                                      <div className="flex gap-1 items-center shrink-0">
                                        <button
                                          type="button"
                                          disabled={idx === 0}
                                          onClick={() => moveDependency(idx, "up")}
                                          className="disabled:opacity-25 text-[9px] font-black text-slate-500 hover:text-slate-800 bg-slate-50 rounded border border-slate-200 px-1 py-0.25 cursor-pointer disabled:cursor-not-allowed"
                                          title="Move Up"
                                        >
                                          &uarr;
                                        </button>
                                        <button
                                          type="button"
                                          disabled={idx === snippetDependencies.length - 1}
                                          onClick={() => moveDependency(idx, "down")}
                                          className="disabled:opacity-25 text-[9px] font-black text-slate-500 hover:text-slate-800 bg-slate-50 rounded border border-slate-200 px-1 py-0.25 cursor-pointer disabled:cursor-not-allowed"
                                          title="Move Down"
                                        >
                                          &darr;
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSnippetDependencies(prev => prev.filter((_, i) => i !== idx));
                                          }}
                                          className="text-red-500 hover:text-red-700 text-[9px] font-bold px-1 bg-transparent border-none cursor-pointer"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                    {itemConflicts.length > 0 && (
                                      <div className="mt-1 space-y-0.5 border-t border-slate-100 pt-1 font-sans">
                                        {itemConflicts.map((c, cIdx) => (
                                          <div key={cIdx} className={`text-[8px] leading-tight font-medium flex gap-1 ${c.severity === "error" ? "text-red-650" : "text-amber-655"
                                            }`}>
                                            <span className="font-bold shrink-0">{c.severity === "error" ? "✕" : "⚠"}</span>
                                            <span className="shrink-1">{c.message}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Form to add a new dependent asset */}
                          <div className="flex gap-1.5 items-end">
                            <div className="w-20 shrink-0">
                              <label className="text-[8px] font-bold text-slate-400 block mb-0.5 uppercase">Type</label>
                              <select
                                value={newDepType}
                                onChange={(e) => setNewDepType(e.target.value as any)}
                                className="w-full rounded border px-1 py-0.5 text-[10px] bg-white font-medium outline-none focus:border-blue-500"
                              >
                                <option value="javascript">JS</option>
                                <option value="css">CSS</option>
                              </select>
                            </div>
                            <div className="flex-1 min-w-0">
                              <label className="text-[8px] font-bold text-slate-400 block mb-0.5 uppercase">URL</label>
                              <input
                                type="text"
                                value={newDepUrl}
                                onChange={(e) => setNewDepUrl(e.target.value)}
                                placeholder="https://cdn.example.com/library.js"
                                className="w-full rounded border px-1.5 py-0.5 text-[10px] bg-white font-medium outline-none focus:border-blue-500 font-mono"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!newDepUrl.trim()) return;
                                const urlTrimmed = newDepUrl.trim();

                                // Basic scheme and URL validation
                                const lower = urlTrimmed.toLowerCase();
                                if (
                                  lower.startsWith("javascript:") ||
                                  lower.startsWith("data:") ||
                                  lower.startsWith("vbscript:") ||
                                  lower.startsWith("file:")
                                ) {
                                  alert(`Unsafe dependency URL scheme found: "${urlTrimmed}"`);
                                  return;
                                }
                                try {
                                  const valUrl = urlTrimmed.startsWith("//") ? `https:${urlTrimmed}` : urlTrimmed;
                                  new URL(valUrl);
                                } catch (_) {
                                  alert(`Invalid dependency URL: "${urlTrimmed}"`);
                                  return;
                                }

                                // Check for duplicates in current dependencies list
                                if (snippetDependencies.some(d => d.url.trim().toLowerCase() === urlTrimmed.toLowerCase())) {
                                  alert("This dependency URL has already been added to this snippet.");
                                  return;
                                }

                                setSnippetDependencies(prev => [...prev, { type: newDepType, url: urlTrimmed }]);
                                setNewDepUrl("");
                              }}
                              className="rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.75 text-[9px] border border-indigo-200 transition cursor-pointer shrink-0 h-6"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-1 uppercase">CODE CONTENT</label>
                          <textarea
                            rows={10}
                            value={snippetCode}
                            onChange={(e) => setSnippetCode(e.target.value)}
                            placeholder={
                              snippetType === "javascript"
                                ? "console.log('Hello ForgeStudio');"
                                : snippetType === "css"
                                  ? ".custom-card { padding: 20px; }"
                                  : "<div class='banner'>Hello</div>"
                            }
                            className="w-full rounded border p-2 text-xs font-mono bg-slate-900 text-emerald-400 outline-none focus:border-blue-500 leading-normal"
                          />
                        </div>

                        {/* F-117: Linter Diagnostics View */}
                        {lintDiagnostics.length > 0 && (
                          <div className="flex flex-col gap-1 border border-rose-200 bg-rose-50 p-2 rounded">
                            <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider mb-1">Editor Constraints Failed</span>
                            {lintDiagnostics.map((msg, idx) => (
                              <div key={idx} className="flex gap-2 text-[10px]">
                                <span className="font-bold text-rose-600 bg-rose-200 px-1 rounded shrink-0">{msg.severity === 'error' ? 'ERROR' : 'WARN'}</span>
                                {msg.line ? <span className="text-slate-500 shrink-0">Line {msg.line}{msg.column ? `, Col ${msg.column}` : ''}</span> : null}
                                <span className="text-rose-900 font-medium whitespace-pre-wrap">{msg.message}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedSnippetId && (() => {
                          const snipRevs = (globalSettings.customCodeRevisions || []).filter((r: any) => r.snippetId === selectedSnippetId);
                          const latestRev = snipRevs.reduce((max: any, r: any) => r.version > max.version ? r : max, null as any);
                          const currentVer = latestRev ? latestRev.version : 1;

                          const snip = (globalSettings.customCodeList || []).find((s: any) => s.id === selectedSnippetId);
                          let publishedVer: number | null = null;
                          if (snip && snip.publishedRevisionId) {
                            const pubRev = snipRevs.find((r: any) => r.id === snip.publishedRevisionId);
                            if (pubRev) publishedVer = pubRev.version;
                          }

                          let status = "Not Published";
                          if (snip) {
                            if (!snip.publishedRevisionId) {
                              status = snipRevs.length > 0 ? "Draft" : "Not Published";
                            } else {
                              status = (latestRev && latestRev.id === snip.publishedRevisionId) ? "Published" : "Ready to Publish";
                            }
                          }

                          return (
                            <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 flex items-center justify-between text-[10px] mt-2 mb-2 shadow-inner">
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="font-bold text-slate-400 uppercase text-[7px] tracking-wider">Deployment Status</div>
                                <div className="font-semibold text-slate-700 truncate">
                                  Current: <span className="font-bold text-slate-900">v{currentVer}</span>
                                  {publishedVer && <> &bull; Live: <span className="font-bold text-emerald-700">v{publishedVer}</span></>}
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ml-2 ${status === "Published" ? "bg-emerald-100 text-emerald-800" :
                                status === "Ready to Publish" ? "bg-amber-100 text-amber-800" :
                                  status === "Draft" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-650"
                                }`}>
                                {status}
                              </span>
                            </div>
                          );
                        })()}

                        <div className="flex justify-between items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSnippetName("");
                              setSnippetCode("");
                              setSnippetType("javascript");
                              setSnippetPlacement("body-end");
                              setSnippetConditions([]);
                              setSnippetEnvironments(["development", "staging", "production"]);
                              setSnippetDependencies([]);
                              setNewDepUrl("");
                              setNewDepType("javascript");
                              setMinifyInProduction(true);
                              setSelectedSnippetId(null);
                            }}
                            className="rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2 py-1 text-[10px] transition cursor-pointer"
                          >
                            Reset Form
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveSnippet}
                            className="rounded bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1 text-[10px] transition cursor-pointer"
                          >
                            {selectedSnippetId ? "Update Snippet" : "Add Code Snippet"}
                          </button>
                        </div>

                        {/* LIVE CONFLICT DETECTION PANEL */}
                        {(() => {
                          const liveCodeList = (() => {
                            const currentList = globalSettings.customCodeList ? [...globalSettings.customCodeList] : [];
                            if (selectedSnippetId) {
                              return currentList.map(s => s.id === selectedSnippetId ? {
                                ...s,
                                name: snippetName,
                                code: snippetCode,
                                type: snippetType,
                                placement: snippetPlacement,
                                conditions: snippetConditions,
                                environments: snippetEnvironments,
                                dependencies: snippetDependencies
                              } : s);
                            } else {
                              return [...currentList, {
                                id: "temp_new_snippet",
                                name: snippetName || "New Snippet",
                                code: snippetCode,
                                type: snippetType,
                                placement: snippetPlacement,
                                conditions: snippetConditions,
                                environments: snippetEnvironments,
                                dependencies: snippetDependencies
                              }];
                            }
                          })();

                          const currentConflicts = detectDependencyConflicts(liveCodeList).filter(
                            c => c.snippetId === selectedSnippetId || (c.snippetId === "temp_new_snippet" && !selectedSnippetId) || !c.snippetId
                          );

                          if (currentConflicts.length === 0) return null;

                          return (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-3 space-y-1.5 font-sans">
                              <div className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">Dependency Conflict Analysis</div>
                              <div className="space-y-1 max-h-36 overflow-y-auto">
                                {currentConflicts.map((c, idx) => (
                                  <div key={idx} className={`flex items-start gap-1 p-1 rounded text-[9px] border ${c.severity === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"
                                    }`}>
                                    <span className="font-extrabold shrink-0">{c.severity === "error" ? "✕" : "⚠"}</span>
                                    <span className="leading-tight shrink-1 select-text">{c.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {/* Code Snippets List */}
                    {globalSettings.customCodeList && globalSettings.customCodeList.length > 0 && (
                      <div className="space-y-1.5 border-t border-slate-100 pt-3">
                        <label className="text-[9px] font-extrabold text-slate-400 block uppercase tracking-wider">
                          Configured Snippets ({globalSettings.customCodeList.length})
                        </label>
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                          {globalSettings.customCodeList.map((snip: any) => {
                            const snipRevs = (globalSettings.customCodeRevisions || []).filter((r: any) => r.snippetId === snip.id);
                            const latestRev = snipRevs.reduce((max: any, r: any) => r.version > max.version ? r : max, null as any);
                            const currentVer = latestRev ? latestRev.version : 1;

                            let publishedVer: number | null = null;
                            if (snip.publishedRevisionId) {
                              const pubRev = snipRevs.find((r: any) => r.id === snip.publishedRevisionId);
                              if (pubRev) publishedVer = pubRev.version;
                            }

                            let status = "Not Published";
                            if (!snip.publishedRevisionId) {
                              status = snipRevs.length > 0 ? "Draft" : "Not Published";
                            } else {
                              status = (latestRev && latestRev.id === snip.publishedRevisionId) ? "Published" : "Ready to Publish";
                            }

                            const targetEnvs = snip.environments || ["development", "staging", "production"];
                            const isTargetingCurrent = targetEnvs.includes(simulatedEnvironment);

                            return (
                              <div key={snip.id} className="flex flex-col bg-slate-100 p-2 rounded-lg border border-slate-200/80 space-y-1.5 shadow-sm hover:border-slate-300 transition duration-150">
                                <div className="flex justify-between items-start min-w-0">
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className={`text-[10px] font-bold text-slate-700 truncate ${selectedSnippetId === snip.id ? "text-blue-600" : ""}`}>
                                      {snip.name || "Snippet"}
                                    </span>
                                    <span className="text-[8px] font-semibold text-slate-400 capitalize">
                                      {snip.type} • {snip.placement}
                                      {snip.conditions && snip.conditions.length > 0 && ` (${snip.conditions.length} conds)`}
                                    </span>
                                    <div className="flex gap-1.5 items-center mt-1 text-[8px] font-bold">
                                      <span className="text-slate-400">Target Env:</span>
                                      <span className="text-slate-650 tracking-tight">
                                        {targetEnvs.map((env: string) => env === "production" ? "Prod" : env === "staging" ? "Stage" : "Dev").join(", ")}
                                      </span>
                                    </div>
                                    <div className="text-[8px] font-black mt-0.5">
                                      Current ({simulatedEnvironment === "production" ? "Prod" : simulatedEnvironment === "staging" ? "Stage" : "Dev"}):{" "}
                                      {isTargetingCurrent ? (
                                        <span className="text-emerald-600 font-extrabold uppercase">● Active</span>
                                      ) : (
                                        <span className="text-red-500 font-extrabold uppercase">○ Inactive</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold uppercase tracking-wider shrink-0 ml-1.5 ${snip.scheduleStatus === "scheduled" ? "bg-amber-100 text-amber-700" :
                                    status === "Published" ? "bg-emerald-100 text-emerald-800 animate-pulse-subtle" :
                                      status === "Ready to Publish" ? "bg-amber-100 text-amber-800" :
                                        status === "Draft" ? "bg-blue-100 text-blue-805" : "bg-slate-200 text-slate-650"
                                    }`}>
                                    {snip.scheduleStatus === "scheduled" && snip.scheduledPublishAt ? `Scheduled: ${new Date(snip.scheduledPublishAt).toLocaleString()}` : status}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center border-t border-slate-200/60 pt-1.5">
                                  <span className="text-[8px] font-bold text-slate-400">
                                    v{currentVer}{publishedVer && ` (Live: v${publishedVer})`}
                                  </span>

                                  <div className="flex gap-1 items-center shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setViewingHistorySnippetId(snip.id);
                                        setViewingRevisionId(null);
                                      }}
                                      className="text-[8px] font-bold text-slate-500 hover:text-slate-800 hover:underline bg-transparent outline-none border-none p-0 cursor-pointer"
                                    >
                                      History
                                    </button>
                                    <span className="text-[8px] text-slate-300 select-none">|</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSnippetId(snip.id);
                                        setSnippetName(snip.name);
                                        setSnippetCode(snip.code);
                                        setSnippetType(snip.type);
                                        setSnippetPlacement(snip.placement);
                                        setSnippetConditions(snip.conditions || []);
                                        setMinifyInProduction(snip.minifyInProduction !== false);
                                        setSnippetEnvironments(snip.environments || ["development", "staging", "production"]);
                                        setSnippetDependencies(snip.dependencies || []);
                                        setSnippetPriority(snip.priority ?? 100);
                                      }}
                                      className="text-[8px] font-bold text-blue-500 hover:text-blue-700 hover:underline bg-transparent outline-none border-none p-0 cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-[8px] text-slate-300 select-none">|</span>
                                    {status !== "Published" ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setScheduleTargetId(snip.id === scheduleTargetId ? null : snip.id)}
                                          className="text-[8px] font-bold text-amber-500 hover:text-amber-700 hover:underline bg-transparent outline-none border-none p-0 cursor-pointer"
                                        >
                                          {snip.scheduleStatus === "scheduled" ? "Reschedule" : "Schedule"}
                                        </button>
                                        <span className="text-[8px] text-slate-300 select-none">|</span>
                                        <button
                                          type="button"
                                          onClick={() => handlePublishSnippet(snip.id)}
                                          className="text-[8px] font-black text-emerald-600 hover:text-emerald-800 hover:underline bg-transparent outline-none border-none p-0 cursor-pointer"
                                        >
                                          Publish
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleUnpublishSnippet(snip.id)}
                                        className="text-[8px] font-bold text-slate-500 hover:text-slate-800 hover:underline bg-transparent outline-none border-none p-0 cursor-pointer"
                                      >
                                        Unpublish
                                      </button>
                                    )}
                                    <span className="text-[8px] text-slate-300 select-none">|</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSnippet(snip.id)}
                                      className="text-[8px] font-bold text-red-500 hover:text-red-700 hover:underline bg-transparent outline-none border-none p-0 cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                {scheduleTargetId === snip.id && (
                                  <div className="mt-2 flex items-center justify-between border border-amber-200 bg-amber-50 p-2 rounded">
                                    <input
                                      type="datetime-local"
                                      className="text-[10px] w-full bg-white border border-slate-300 rounded px-1 py-0.5 outline-none font-mono"
                                      value={scheduleDate}
                                      onChange={(e) => setScheduleDate(e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleScheduleSnippet(snip.id, new Date(scheduleDate).toISOString())}
                                      className="ml-2 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold py-0.5 px-2 rounded tracking-wider"
                                    >
                                      Confirm
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* F-119: Developer Plugins Setup */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h3 className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wide">
                        Plugins & Extensions
                      </h3>
                    </div>
                    {pluginRegistry.getRegisteredPlugins().length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-medium">No plugins installed locally.</p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {pluginRegistry.getRegisteredPlugins().map((p: any) => {
                          // Persisted enable state mapped dynamically via Editor JSON globalSettings F-119
                          const isEnabled = globalSettings?.plugins?.[p.id]?.enabled !== false;
                          return (
                            <div key={p.id} className={`p-2 border rounded flex items-center justify-between shadow-sm transition ${isEnabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white opacity-60 grayscale'}`}>
                              <div className="flex flex-col gap-0.5 max-w-[200px]">
                                <span className="text-[11px] font-bold text-slate-800 tracking-tight">{p.name} <span className="text-[9px] font-normal text-slate-400 ml-1">v{p.version}</span></span>
                                <span className="text-[9.5px] text-slate-500 font-medium leading-tight">{p.description}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {p.capabilities.map((cap: string) => (
                                    <span key={cap} className="px-1 py-0.5 bg-slate-200 text-slate-600 text-[8px] rounded uppercase font-bold tracking-wider">{cap}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-[9px] font-bold text-slate-400">EN</label>
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  className="w-4 h-4 rounded cursor-pointer"
                                  onChange={(e) => setGlobalSettings((prev: any) => ({
                                    ...prev,
                                    plugins: {
                                      ...(prev.plugins || {}),
                                      [p.id]: { enabled: e.target.checked }
                                    }
                                  }))}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* F-120: Third-Party Plugin Compatibility Checker */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h3 className="text-[10px] font-extrabold text-violet-600 uppercase tracking-wide flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        Check Third-Party Plugin
                      </h3>
                    </div>
                    <textarea
                      id="f120-plugin-manifest-input"
                      className="w-full text-[9.5px] font-mono bg-white border border-slate-300 rounded p-2 h-[90px] outline-none resize-none focus:border-violet-400 leading-relaxed"
                      placeholder={`Paste plugin manifest JSON:\n{\n  "id": "my-plugin",\n  "name": "My Plugin",\n  "version": "1.0.0",\n  "apiVersion": "1.0.0",\n  "capabilities": ["element"]\n}`}
                    />
                    <button
                      type="button"
                      className="w-full bg-violet-600 text-white text-[9.5px] font-bold py-1.5 rounded hover:bg-violet-700 transition"
                      onClick={async () => {
                        const ta = document.getElementById("f120-plugin-manifest-input") as HTMLTextAreaElement;
                        const res = document.getElementById("f120-compat-result");
                        if (!ta || !res) return;
                        try {
                          const manifest = JSON.parse(ta.value);
                          const resp = await fetch(`${apiUrl}/api/v1/plugins/check-compatibility`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify(manifest),
                          });
                          const data = await resp.json();
                          res.textContent = data.compatible
                            ? `✅ ${data.result}  (API: ${data.builderApiVersion})`
                            : `❌ ${data.result}${data.detail ? " — " + data.detail : ""}${(data.errors || []).join(", ")}`;
                          res.className = `mt-1 text-[9px] font-bold rounded p-1.5 ${data.compatible ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`;
                        } catch {
                          res!.textContent = "❌ Invalid JSON — check manifest format.";
                          res!.className = "mt-1 text-[9px] font-bold rounded p-1.5 bg-rose-50 text-rose-700 border border-rose-200";
                        }
                      }}
                    >
                      Check Compatibility
                    </button>
                    <p id="f120-compat-result" className="text-[9px] text-slate-400"></p>
                  </div>

                  {/* F-122: Composer Status (optional PHP integration — Node.js app is unaffected) */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h3 className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        Composer (PHP — Optional)
                      </h3>
                      <button
                        type="button"
                        className="bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded hover:bg-amber-600"
                        onClick={async () => {
                          const panel = document.getElementById("f122-composer-panel");
                          if (!panel) return;
                          panel.textContent = "Checking…";
                          try {
                            const resp = await fetch(`${apiUrl}/api/v1/composer/status`, { credentials: "include" });
                            const data = await resp.json();
                            if (!resp.ok) { panel.textContent = "⚠️ " + (data.message || "Error"); return; }
                            const s = data.data;
                            panel.innerHTML = `
                              <div class="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                <span class="text-slate-500">Composer</span><span class="font-bold ${s.composerAvailable ? "text-emerald-600" : "text-rose-500"}">${s.composerAvailable ? "✅ " + s.composerVersion : "❌ Not Found"}</span>
                                <span class="text-slate-500">PHP</span><span class="font-bold ${s.phpAvailable ? "text-emerald-600" : "text-rose-500"}">${s.phpAvailable ? "✅ " + s.phpVersion : "❌ Not Found"}</span>
                                <span class="text-slate-500">composer.json</span><span class="font-bold ${s.composerJsonExists ? "text-emerald-600" : "text-slate-400"}">${s.composerJsonExists ? "✅ Present" : "—"}</span>
                                <span class="text-slate-500">vendor/</span><span class="font-bold ${s.vendorExists ? "text-emerald-600" : "text-slate-400"}">${s.vendorExists ? "✅ Installed" : "—"}</span>
                                <span class="text-slate-500">autoload.php</span><span class="font-bold ${s.autoloadExists ? "text-emerald-600" : "text-slate-400"}">${s.autoloadExists ? "✅ Ready" : "—"}</span>
                              </div>`;
                          } catch { panel.textContent = "⚠️ Could not connect to backend."; }
                        }}
                      >
                        Check Status
                      </button>
                    </div>
                    <p className="text-[9.5px] text-slate-500 leading-relaxed">
                      ForgeStudio runs on Node.js. Composer is an optional PHP integration for sites that
                      use PHP packages. Node.js/npm is unaffected.
                    </p>
                    <div id="f122-composer-panel" className="text-[9.5px] text-slate-400 font-medium">
                      Click "Check Status" to probe server environment.
                    </div>
                  </div>

                </div>
              )}
            </div>
>>>>>>> 8d95dec (Initial project code)
          </aside>
        )}
      </div>

<<<<<<< HEAD
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
=======
      {/* Full Screen Image Lightbox Modal Overlay (F-095) */}
      {
        lightboxImage && (
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
        )
      }

      {/* ========================================== */}
      {/* Breakpoint Manager Modal                   */}
      {/* ========================================== */}
      {
        isBpModalOpen && (
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

                  {/* F-121: Custom Post Type (CPTs) */}
                  <div className="space-y-3 p-3 border border-slate-200 bg-slate-50/50 rounded-xl">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <h3 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wide flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Custom Post Types
                      </h3>
                      <button type="button" onClick={() => {
                        const name = prompt("Enter CPT Name (e.g. Products):");
                        if (!name) return;
                        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                        setGlobalSettings((prev: any) => ({
                          ...prev,
                          cpts: [...(prev.cpts || []), { id: generateId(), name, slug, fields: [], enabled: true }]
                        }));
                      }} className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow hover:bg-blue-700">+ Add CPT</button>
                    </div>
                    {(globalSettings.cpts || []).length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-medium">No custom post types defined.</p>
                    ) : (
                      <div className="space-y-2">
                        {(globalSettings.cpts || []).map((cpt: any, i: number) => (
                          <div key={cpt.id} className="p-2 border border-slate-200 rounded bg-white shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-800">{cpt.name}</span>
                                <span className="text-[9px] font-mono text-slate-400">/{cpt.slug}</span>
                              </div>
                              <button onClick={() => {
                                setGlobalSettings((prev: any) => ({
                                  ...prev,
                                  cpts: prev.cpts.filter((c: any) => c.id !== cpt.id)
                                }));
                              }} className="text-[9px] text-red-500 font-bold hover:underline">Delete</button>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded p-1.5 flex flex-col gap-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-500">FIELDS:</span>
                                <button onClick={() => {
                                  const fname = prompt("Field Name (e.g. Price):");
                                  if (!fname) return;
                                  const fslug = fname.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                  const newCpts = [...globalSettings.cpts];
                                  newCpts[i] = { ...newCpts[i], fields: [...(newCpts[i].fields || []), { name: fname, slug: fslug, type: "text" }] };
                                  setGlobalSettings((prev: any) => ({ ...prev, cpts: newCpts }));
                                }} className="text-[8.5px] font-bold text-blue-600">+ Add Field</button>
                              </div>
                              {(cpt.fields || []).map((field: any, fi: number) => (
                                <div key={fi} className="flex items-center justify-between bg-white text-[9px] p-1 border border-slate-200 rounded shadow-sm">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-700">{field.name}</span>
                                    <span className="text-slate-400 font-mono">({field.slug})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button onClick={() => {
                              const recordName = prompt(`Create new ${cpt.name} record:`);
                              if (!recordName) return;
                              const rslug = recordName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                              setGlobalSettings((prev: any) => ({
                                ...prev,
                                cptRecords: [...(prev.cptRecords || []), { id: generateId(), cptId: cpt.id, name: recordName, slug: rslug, data: {}, status: 'published' }]
                              }));
                              alert(`Created ${recordName}! Use dynamic tag {{${cpt.slug}.[field]}} in widgets.`);
                            }} className="w-full bg-slate-800 text-white text-[9px] font-bold py-1 rounded shadow-sm mt-1">
                              + Create Record
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
        )
      }
    </div >
  );
}
>>>>>>> 8d95dec (Initial project code)
