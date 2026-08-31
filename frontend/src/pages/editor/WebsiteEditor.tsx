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

        if (loadedSite?.editorData?.pageSettings) {
          setPageSettings((prev) => ({ ...prev, ...loadedSite.editorData.pageSettings }));
        } else if (loadedSite?.name) {
          setPageSettings((prev) => ({ ...prev, title: loadedSite.name }));
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load website data.");
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
          pageSettings,
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImportAsset(e.dataTransfer.files[0]);
    }
  };

  const compileBackgroundAndBorderStyles = (mergedStyles: ElementStyles): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (mergedStyles.backgroundColor) {
      styles.backgroundColor = mergedStyles.backgroundColor;
    }
    if (mergedStyles.backgroundImage) {
      const bgImg = mergedStyles.backgroundImage.startsWith("url(")
        ? mergedStyles.backgroundImage
        : `url('${resolveImageUrl(mergedStyles.backgroundImage, apiUrl)}')`;
      styles.backgroundImage = bgImg;
    }
    if (mergedStyles.backgroundPosition) {
      styles.backgroundPosition = mergedStyles.backgroundPosition;
    }
    if (mergedStyles.backgroundSize) {
      styles.backgroundSize = mergedStyles.backgroundSize;
    }
    if (mergedStyles.backgroundRepeat) {
      styles.backgroundRepeat = mergedStyles.backgroundRepeat;
    }

    if (mergedStyles.borderStyle && mergedStyles.borderStyle !== "none") {
      styles.borderStyle = mergedStyles.borderStyle;
      styles.borderWidth = mergedStyles.borderWidth || "1px";
      styles.borderColor = mergedStyles.borderColor || "#cbd5e1";
    }

    if (
      mergedStyles.borderTopLeftRadius ||
      mergedStyles.borderTopRightRadius ||
      mergedStyles.borderBottomRightRadius ||
      mergedStyles.borderBottomLeftRadius
    ) {
      styles.borderTopLeftRadius = mergedStyles.borderTopLeftRadius || mergedStyles.borderRadius || "0px";
      styles.borderTopRightRadius = mergedStyles.borderTopRightRadius || mergedStyles.borderRadius || "0px";
      styles.borderBottomRightRadius = mergedStyles.borderBottomRightRadius || mergedStyles.borderRadius || "0px";
      styles.borderBottomLeftRadius = mergedStyles.borderBottomLeftRadius || mergedStyles.borderRadius || "0px";
    } else if (mergedStyles.borderRadius) {
      styles.borderRadius = mergedStyles.borderRadius;
    }

    if (mergedStyles.boxShadow) {
      styles.boxShadow = mergedStyles.boxShadow;
    }

    return styles;
  };

  const compilePositioningStyles = (mergedStyles: ElementStyles): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (mergedStyles.position && mergedStyles.position !== "static") {
      styles.position = mergedStyles.position;
    }

    if (mergedStyles.top !== undefined && mergedStyles.top !== "") {
      styles.top = mergedStyles.top;
    }
    if (mergedStyles.right !== undefined && mergedStyles.right !== "") {
      styles.right = mergedStyles.right;
    }
    if (mergedStyles.bottom !== undefined && mergedStyles.bottom !== "") {
      styles.bottom = mergedStyles.bottom;
    }
    if (mergedStyles.left !== undefined && mergedStyles.left !== "") {
      styles.left = mergedStyles.left;
    }

    if (mergedStyles.zIndex !== undefined && mergedStyles.zIndex !== null && mergedStyles.zIndex !== "") {
      styles.zIndex = Number(mergedStyles.zIndex);
    }

    return styles;
  };

  const renderPositioningControls = () => {
    if (!selectedElement) return null;

    const currentPos = getControlStyleValue(selectedElement, activeDevice, activeElementState, "position") || "static";

    const rawTop = String(getControlStyleValue(selectedElement, activeDevice, activeElementState, "top") || "");
    const rawRight = String(getControlStyleValue(selectedElement, activeDevice, activeElementState, "right") || "");
    const rawBottom = String(getControlStyleValue(selectedElement, activeDevice, activeElementState, "bottom") || "");
    const rawLeft = String(getControlStyleValue(selectedElement, activeDevice, activeElementState, "left") || "");

    const currentZIndex = getControlStyleValue(selectedElement, activeDevice, activeElementState, "zIndex");
    const zIndexStr = currentZIndex !== undefined && currentZIndex !== null ? String(currentZIndex) : "";

    const parsedTop = parseSpacingUnit(rawTop);
    const parsedRight = parseSpacingUnit(rawRight);
    const parsedBottom = parseSpacingUnit(rawBottom);
    const parsedLeft = parseSpacingUnit(rawLeft);

    const activeOffsetUnit = parsedTop.unit || parsedRight.unit || parsedBottom.unit || parsedLeft.unit || "px";

    const isPosOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "position") : hasStyleOverride(selectedElement, activeDevice, "position");
    const isOffsetsOverridden = activeElementState === "hover"
      ? hasHoverStyleOverride(selectedElement, activeDevice, "top") ||
        hasHoverStyleOverride(selectedElement, activeDevice, "right") ||
        hasHoverStyleOverride(selectedElement, activeDevice, "bottom") ||
        hasHoverStyleOverride(selectedElement, activeDevice, "left")
      : hasStyleOverride(selectedElement, activeDevice, "top") ||
        hasStyleOverride(selectedElement, activeDevice, "right") ||
        hasStyleOverride(selectedElement, activeDevice, "bottom") ||
        hasStyleOverride(selectedElement, activeDevice, "left");
    const isZIndexOverridden = activeElementState === "hover" ? hasHoverStyleOverride(selectedElement, activeDevice, "zIndex") : hasStyleOverride(selectedElement, activeDevice, "zIndex");

    const handleOffsetChange = (key: keyof ElementStyles, numVal: string, unitVal: string) => {
      const formattedVal = numVal.trim() === "" ? "" : `${numVal}${unitVal}`;
      updateSelectedStyle(key, formattedVal);
    };

    const handleUnitChange = (newUnit: string) => {
      const convertUnit = (parsed: { num: string; unit: string }, sideKey: keyof ElementStyles) => {
        if (parsed.num) {
          updateSelectedStyle(sideKey, `${parsed.num}${newUnit}`);
        }
      };
      convertUnit(parsedTop, "top");
      convertUnit(parsedRight, "right");
      convertUnit(parsedBottom, "bottom");
      convertUnit(parsedLeft, "left");
    };

    return (
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Positioning & Layering
        </h3>

        {/* 1. Position Type Dropdown */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Position Type
              {isPosOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(selectedElement?.styles?.position || isPosOverridden) && (
              <button
                type="button"
                onClick={() => resetSelectedStyle("position")}
                title="Reset Position Type to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <select
            value={currentPos}
            onChange={(e) => updateSelectedStyle("position", e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="static">Default (Static)</option>
            <option value="relative">Relative</option>
            <option value="absolute">Absolute</option>
            <option value="fixed">Fixed</option>
            <option value="sticky">Sticky</option>
          </select>
        </div>

        {/* 2. Position Offsets (Top, Right, Bottom, Left) */}
        {currentPos !== "static" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Position Offsets
                {isOffsetsOverridden && (
                  <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                    {activeDevice}
                  </span>
                )}
              </label>

              <div className="flex items-center gap-1.5">
                <select
                  value={activeOffsetUnit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="px">px</option>
                  <option value="%">%</option>
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                </select>

                {(selectedElement?.styles?.top || selectedElement?.styles?.right || selectedElement?.styles?.bottom || selectedElement?.styles?.left || isOffsetsOverridden) && (
                  <button
                    type="button"
                    onClick={() => {
                      resetSelectedStyle("top");
                      resetSelectedStyle("right");
                      resetSelectedStyle("bottom");
                      resetSelectedStyle("left");
                    }}
                    title="Reset Offsets to Default"
                    className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
                  >
                    ↺ Reset
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                  Top
                </span>
                <ScrubbableNumberInput
                  value={parsedTop.num}
                  onChange={(val) => handleOffsetChange("top", val, activeOffsetUnit)}
                  placeholder="auto"
                  className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                  Right
                </span>
                <ScrubbableNumberInput
                  value={parsedRight.num}
                  onChange={(val) => handleOffsetChange("right", val, activeOffsetUnit)}
                  placeholder="auto"
                  className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                  Bottom
                </span>
                <ScrubbableNumberInput
                  value={parsedBottom.num}
                  onChange={(val) => handleOffsetChange("bottom", val, activeOffsetUnit)}
                  placeholder="auto"
                  className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="block text-[9px] font-semibold text-slate-400 text-center mb-0.5">
                  Left
                </span>
                <ScrubbableNumberInput
                  value={parsedLeft.num}
                  onChange={(val) => handleOffsetChange("left", val, activeOffsetUnit)}
                  placeholder="auto"
                  className="w-full rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Z-Index Control */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Z-Index
              {isZIndexOverridden && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                  {activeDevice}
                </span>
              )}
            </label>
            {(selectedElement?.styles?.zIndex !== undefined || isZIndexOverridden) && (
              <button
                type="button"
                onClick={() => resetSelectedStyle("zIndex")}
                title="Reset Z-Index to Default"
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset
              </button>
            )}
          </div>
          <ScrubbableNumberInput
            value={zIndexStr}
            onChange={(val) =>
              updateSelectedStyle(
                "zIndex",
                val !== "" ? Number(val) : undefined
              )
            }
            placeholder="0"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
          />
        </div>
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



  // Recursive Element Tree Renderer
  const renderElementTree = (el: EditorElement): React.ReactNode => {
    const isSelected = (selectedIds.includes(el.id) || selectedId === el.id) && !isPreview;
    const isEditingHoverState = isSelected && activeElementState === "hover";
    const mergedStyles = getMergedStyles(el, activeDevice, isEditingHoverState ? "hover" : "normal");

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
          className={`relative transition-all duration-150 ${
            draggingId === el.id ? "opacity-50 scale-95" : ""
          } ${
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
          } ${
            isDropTarget && dropPosition === "before"
              ? "border-t-4 border-t-blue-500"
              : isDropTarget && dropPosition === "after"
              ? "border-b-4 border-b-blue-500"
              : isDropTarget && dropPosition === "inside"
              ? "outline outline-2 outline-blue-500 bg-blue-50/20"
              : ""
          }`}
          style={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: mergedLayout.direction || "column",
            justifyContent: mergedLayout.justifyContent || "flex-start",
            alignItems: mergedLayout.alignItems || "stretch",
            gap: `${mergedLayout.gap ?? 10}px`,
            width: mergedStyles.width || "100%",
            height: mergedStyles.height || "auto",
            paddingTop: mergedStyles.paddingTop ?? (mergedStyles.padding || "16px"),
            paddingRight: mergedStyles.paddingRight ?? (mergedStyles.padding || "16px"),
            paddingBottom: mergedStyles.paddingBottom ?? (mergedStyles.padding || "16px"),
            paddingLeft: mergedStyles.paddingLeft ?? (mergedStyles.padding || "16px"),
            marginTop: mergedStyles.marginTop ?? "8px",
            marginRight: mergedStyles.marginRight ?? "0px",
            marginBottom: mergedStyles.marginBottom ?? "8px",
            marginLeft: mergedStyles.marginLeft ?? "0px",
            ...compileBackgroundAndBorderStyles(mergedStyles),
            ...compilePositioningStyles(mergedStyles),
          }}
        >
          {!isSelected && !isPreview && (
            <span className="absolute top-1 left-2 text-[9px] font-bold text-slate-300 uppercase pointer-events-none select-none">
              Container
            </span>
          )}

          {isSelected && (
            <div className="absolute -top-3.5 right-3 z-30 flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
              {path && path.length > 1 ? (
                <span className="flex items-center gap-1">
                  {path.map((item, idx) => (
                    <span key={item.id} className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(item.id);
                        }}
                        className={`capitalize hover:underline ${
                          item.id === el.id ? "font-bold text-white" : "text-blue-200"
                        }`}
                      >
                        {item.type}
                      </button>
                      {idx < path.length - 1 && <span>›</span>}
                    </span>
                  ))}
                </span>
              ) : (
                <span>Container</span>
              )}
              <span>•</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReorderElement(el.id, "up");
                }}
                className="hover:underline"
                title="Move Section Up"
              >
                ▲
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReorderElement(el.id, "down");
                }}
                className="hover:underline"
                title="Move Section Down"
              >
                ▼
              </button>
              <span>•</span>
              <button
                onClick={(e) => handleCopyElement(el.id, e)}
                className="hover:underline"
              >
                Copy
              </button>
              <span>•</span>
              <button
                onClick={(e) => handleCopyStyle(el.id, e)}
                className="hover:underline"
                title="Copy Element Style"
              >
                Copy Style
              </button>
              {copiedStyles && (
                <>
                  <span>•</span>
                  <button
                    onClick={(e) => handlePasteStyle(el.id, e)}
                    className="hover:underline text-emerald-200 hover:text-white"
                    title="Paste Copied Style"
                  >
                    Paste Style
                  </button>
                </>
              )}
              <span>•</span>
              <button
                onClick={(e) => handleDuplicateElement(el.id, e)}
                className="hover:underline"
              >
                Duplicate
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
                className="hover:underline text-red-200 hover:text-white"
              >
                Delete
              </button>
            </div>
          )}

          {(!el.children || el.children.length === 0) && !isPreview ? (
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center">
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
        onMouseEnter={(e) => {
          e.stopPropagation();
          if (!isPreview) setHoveredId(el.id);
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          if (!isPreview && hoveredId === el.id) setHoveredId(null);
        }}
        className={`relative transition duration-150 ${
          draggingId === el.id ? "opacity-50 scale-95" : ""
        } ${
          isPreview
            ? ""
            : "cursor-grab active:cursor-grabbing hover:outline hover:outline-1 hover:outline-blue-400/60"
        } ${
          isSelected
            ? "border-2 border-blue-500 p-2.5"
            : isHovered
            ? "border border-blue-400 outline outline-2 outline-blue-400/80 p-2.5 shadow-sm"
            : "p-2.5 border border-transparent"
        } ${
          isDropTarget && dropPosition === "before"
            ? "border-t-4 border-t-blue-500"
            : isDropTarget && dropPosition === "after"
            ? "border-b-4 border-b-blue-500"
            : ""
        }`}
        style={{
          boxSizing: "border-box",
          width: mergedStyles.width,
          height: mergedStyles.height,
          marginTop: mergedStyles.marginTop,
          marginRight: mergedStyles.marginRight,
          marginBottom: mergedStyles.marginBottom,
          marginLeft: mergedStyles.marginLeft,
          paddingTop: mergedStyles.paddingTop,
          paddingRight: mergedStyles.paddingRight,
          paddingBottom: mergedStyles.paddingBottom,
          paddingLeft: mergedStyles.paddingLeft,
          padding: mergedStyles.padding,
          ...compileBackgroundAndBorderStyles(mergedStyles),
          ...compilePositioningStyles(mergedStyles),
        }}
      >
        {isHovered && !isSelected && !isPreview && (
          <span className="absolute -top-3 left-3 z-30 rounded-full bg-blue-500/90 text-white px-2 py-0.5 text-[9px] font-bold shadow-sm pointer-events-none uppercase tracking-wider">
            {el.type}
          </span>
        )}

        {isSelected && (
          <div className="absolute -top-3.5 right-3 z-30 flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
            {path && path.length > 1 ? (
              <span className="flex items-center gap-1">
                {path.map((item, idx) => (
                  <span key={item.id} className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(item.id);
                      }}
                      className={`capitalize hover:underline ${
                        item.id === el.id ? "font-bold text-white" : "text-blue-200"
                      }`}
                    >
                      {item.type}
                    </button>
                    {idx < path.length - 1 && <span>›</span>}
                  </span>
                ))}
              </span>
            ) : (
              <span className="capitalize">{el.type}</span>
            )}
            <span>•</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReorderElement(el.id, "up");
              }}
              className="hover:underline"
              title="Move Element Up"
            >
              ▲
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReorderElement(el.id, "down");
              }}
              className="hover:underline"
              title="Move Element Down"
            >
              ▼
            </button>
            <span>•</span>
            <button
              onClick={(e) => handleCopyElement(el.id, e)}
              className="hover:underline"
            >
              Copy
            </button>
            <span>•</span>
            <button
              onClick={(e) => handleCopyStyle(el.id, e)}
              className="hover:underline"
              title="Copy Element Style"
            >
              Copy Style
            </button>
            {copiedStyles && (
              <>
                <span>•</span>
                <button
                  onClick={(e) => handlePasteStyle(el.id, e)}
                  className="hover:underline text-emerald-200 hover:text-white"
                  title="Paste Copied Style"
                >
                  Paste Style
                </button>
              </>
            )}
            <span>•</span>
            <button
              onClick={(e) => handleDuplicateElement(el.id, e)}
              className="hover:underline"
            >
              Duplicate
            </button>
            <span>•</span>
            <button
              onClick={(e) => handleDeleteElement(el.id, e)}
              className="hover:underline text-red-200 hover:text-white"
            >
              Delete
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
              margin: 0,
              padding: 0,
              boxSizing: "border-box",
              outline: "none",
              color: mergedStyles.color || "#0f172a",
              fontSize: mergedStyles.fontSize || "32px",
              fontWeight: mergedStyles.fontWeight || "700",
              textAlign: mergedStyles.textAlign || "left",
              lineHeight: mergedStyles.lineHeight || "1.2",
              fontFamily: mergedStyles.fontFamily,
              fontStyle: mergedStyles.fontStyle,
              textTransform: mergedStyles.textTransform,
              textDecoration: mergedStyles.textDecoration,
              letterSpacing: mergedStyles.letterSpacing,
              textShadow: mergedStyles.textShadow,
            }}
          >
            {el.content}
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
              margin: 0,
              padding: 0,
              boxSizing: "border-box",
              outline: "none",
              color: mergedStyles.color || "#475569",
              fontSize: mergedStyles.fontSize || "16px",
              fontWeight: mergedStyles.fontWeight || "400",
              textAlign: mergedStyles.textAlign || "left",
              lineHeight: mergedStyles.lineHeight || "1.6",
              fontFamily: mergedStyles.fontFamily,
              fontStyle: mergedStyles.fontStyle,
              textTransform: mergedStyles.textTransform,
              textDecoration: mergedStyles.textDecoration,
              letterSpacing: mergedStyles.letterSpacing,
              textShadow: mergedStyles.textShadow,
            }}
          >
            {el.content}
          </p>
        )}

        {el.type === "image" && (
          <div style={{ textAlign: mergedStyles.textAlign || "left", width: "100%", boxSizing: "border-box" }}>
            {el.src ? (
              <img
                src={resolveImageUrl(el.src, apiUrl)}
                alt={el.alt || "Uploaded Image"}
                className="inline-block object-cover max-w-full"
                style={{
                  display: "block",
                  width: mergedStyles.width || "100%",
                  height: mergedStyles.height || "auto",
                  borderRadius: mergedStyles.borderRadius || "8px",
                  boxSizing: "border-box",
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
          <div style={{ textAlign: mergedStyles.textAlign || "left", width: "100%", boxSizing: "border-box" }}>
            <a
              href={el.href || "#"}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onFocus={() => handleSelectElement(el.id)}
              onBlur={(e) => updateElementContent(el.id, e.currentTarget.textContent || "")}
              onInput={(e) => updateElementContent(el.id, e.currentTarget.textContent || "")}
              onClick={(e) => {
                if (!isPreview) e.preventDefault();
              }}
              className="inline-block transition hover:opacity-90 shadow-sm focus:ring-2 focus:ring-blue-400/60 cursor-text"
              style={{
                boxSizing: "border-box",
                outline: "none",
                color: mergedStyles.color || "#ffffff",
                backgroundColor: mergedStyles.backgroundColor || "#2563eb",
                fontSize: mergedStyles.fontSize || "14px",
                fontWeight: mergedStyles.fontWeight || "600",
                paddingTop: mergedStyles.paddingTop ?? (mergedStyles.padding ? undefined : "10px"),
                paddingRight: mergedStyles.paddingRight ?? (mergedStyles.padding ? undefined : "22px"),
                paddingBottom: mergedStyles.paddingBottom ?? (mergedStyles.padding ? undefined : "10px"),
                paddingLeft: mergedStyles.paddingLeft ?? (mergedStyles.padding ? undefined : "22px"),
                padding: mergedStyles.padding,
                borderRadius: mergedStyles.borderRadius || "8px",
                fontFamily: mergedStyles.fontFamily,
                fontStyle: mergedStyles.fontStyle,
                textTransform: mergedStyles.textTransform,
                textDecoration: mergedStyles.textDecoration,
                letterSpacing: mergedStyles.letterSpacing,
                textShadow: mergedStyles.textShadow,
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
      {!isFullScreenCanvas && (
        <header className={`flex h-12 shrink-0 items-center justify-between px-5 shadow-md transition ${
          userPreferences.themeMode === "light"
            ? "bg-white border-b border-slate-200 text-slate-800"
            : "bg-[#0b1329] text-white"
        }`}>
          {/* Left: Quit Editor & Site Name */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleQuitEditor}
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Quit visual editor and return to dashboard"
            >
              <span>←</span>
              <span>{t("quitEditor", "Quit Editor")}</span>
            </button>

            <span className="text-xs font-bold text-white tracking-wide border-l border-slate-700 pl-4">
              {website?.name || "new 1"}
            </span>

            <button
              type="button"
              onClick={() => setIsFinderOpen(true)}
              className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer ml-2"
              title="Search pages, templates, settings and features (Ctrl+K)"
            >
              <span>🔍</span>
              <span>Search</span>
              <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">Ctrl+K</kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsShortcutsHelpOpen(true)}
              className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="View Keyboard Shortcuts Cheat Sheet (?)"
            >
              <span>⌨️</span>
              <span>Shortcuts</span>
              <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">?</kbd>
            </button>
          </div>

          {/* Middle: Responsive Device Selector */}
          <div className="flex items-center gap-1 bg-[#16203a] p-1 rounded-lg border border-slate-700">
            {(["desktop", "tablet", "mobile"] as DeviceMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveDevice(mode)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition flex items-center gap-1 ${
                  activeDevice === mode
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>
                  {mode === "desktop" && "💻"}
                  {mode === "tablet" && "📱"}
                  {mode === "mobile" && "📲"}
                </span>
                <span>{mode}</span>
              </button>
            ))}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Undo / Redo Buttons (F-013) */}
            <div className="flex items-center gap-1 bg-[#16203a] p-1 rounded-lg border border-slate-700">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="px-2.5 py-1 text-xs font-bold rounded-md text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center gap-1"
                title="Undo (Ctrl+Z)"
              >
                <span>↩</span>
                <span>Undo</span>
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="px-2.5 py-1 text-xs font-bold rounded-md text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center gap-1"
                title="Redo (Ctrl+Y)"
              >
                <span>↪</span>
                <span>Redo</span>
              </button>
            </div>

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
              onClick={() => selectedId && handleReorderElement(selectedId, "up")}
              disabled={!selectedId}
              className="rounded-full border border-slate-600 bg-transparent px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
              title="Move selected section/element up"
            >
              Move Up ▲
            </button>

            <button
              onClick={() => selectedId && handleReorderElement(selectedId, "down")}
              disabled={!selectedId}
              className="rounded-full border border-slate-600 bg-transparent px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
              title="Move selected section/element down"
            >
              Move Down ▼
            </button>

            <button
              onClick={(e) => handleCopyElement(selectedId, e)}
              disabled={!selectedId}
              className="rounded-full border border-slate-600 bg-transparent px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
              title="Copy selected element (Ctrl+C)"
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

            <button
              onClick={() => setIsFullScreenCanvas(!isFullScreenCanvas)}
              className={`rounded-full border border-slate-600 bg-transparent px-3.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white ${
                isFullScreenCanvas ? "bg-blue-600/30 text-blue-300 border-blue-500" : ""
              }`}
              title="Toggle full screen distraction-free canvas mode"
            >
              {isFullScreenCanvas ? "Exit Full Screen" : "Full Screen ⛶"}
            </button>

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
          {/* Dynamic Hover Styles Block (F-036) */}
          <style dangerouslySetInnerHTML={{ __html: generateElementsHoverCSS(elements, activeDevice) }} />

          {/* Floating Exit Full Screen Overlay Button (F-015) */}
          {isFullScreenCanvas && (
            <div className="absolute top-4 right-6 z-50">
              <button
                type="button"
                onClick={() => setIsFullScreenCanvas(false)}
                className="flex items-center gap-1.5 rounded-full bg-slate-900/90 text-white px-4 py-2 text-xs font-bold shadow-lg border border-slate-700 hover:bg-black hover:scale-105 transition"
                title="Exit Full Screen Mode (Esc)"
              >
                <span>✕</span>
                <span>Exit Full Screen (Esc)</span>
              </button>
            </div>
          )}
          <div
            style={{
              backgroundColor: pageSettings.backgroundColor || "#ffffff",
              backgroundImage: userPreferences.gridOverlay
                ? "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)"
                : undefined,
              backgroundSize: userPreferences.gridOverlay ? "20px 20px" : undefined,
            }}
            className={`relative w-full transition-all duration-300 min-h-[750px] h-auto shrink-0 my-2 rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm pb-20 ${
              activeDevice === "mobile"
                ? "max-w-[380px]"
                : activeDevice === "tablet"
                ? "max-w-[768px]"
                : "max-w-[1024px]"
            }`}
          >
            {/* Blank Page Layout Bar (F-016) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6 select-none opacity-60 hover:opacity-100 transition">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>📄</span>
                <span>Blank Page Canvas Layout</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Page Editor (No Theme Chrome)
              </span>
            </div>

            {/* Maintenance Mode Public / Preview Screen (F-019) */}
            {isPreview && pageSettings.isMaintenanceMode ? (
              <div className="flex min-h-[500px] flex-col items-center justify-center rounded-2xl bg-amber-50/60 border border-amber-200/80 p-8 sm:p-12 text-center shadow-inner my-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-md mb-6 animate-pulse">
                  <span className="text-4xl">🛠️</span>
                </div>
                <span className="inline-block rounded-full bg-amber-200/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 mb-3">
                  Temporary Maintenance State
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                  Website Under Maintenance
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                  This website is currently undergoing scheduled maintenance and upgrades. Please check back shortly!
                </p>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPreview(false)}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-black transition"
                  >
                    Return to Editor
                  </button>
                </div>
              </div>
            ) : elements.length === 0 ? (
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
          <aside className="w-80 shrink-0 border-l border-slate-200 bg-white p-5 overflow-y-auto shadow-sm">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              SETTINGS & STYLING
            </h2>

            {selectedIds.length > 1 && (
              <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-2 text-center text-xs font-semibold text-blue-700">
                Multi-Select ({selectedIds.length} elements selected)
              </div>
            )}

            {selectedElement ? (
              <div className="space-y-5">
                {/* Element Type Header & Quick Actions */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    {selectedElement.type}
                  </span>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <button
                      onClick={(e) => handleCopyStyle(selectedElement.id, e)}
                      className="text-slate-600 hover:text-blue-600 hover:underline"
                      title="Copy Element Style"
                    >
                      Copy Style
                    </button>
                    {copiedStyles && (
                      <button
                        onClick={(e) => handlePasteStyle(selectedElement.id, e)}
                        className="text-emerald-600 hover:underline"
                        title="Paste Copied Style"
                      >
                        Paste Style
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDuplicateElement(selectedElement.id, e)}
                      className="text-blue-600 hover:underline"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => handleDeleteElement(selectedElement.id, e)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Element State Selector (F-036) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Element State
                    </span>
                    {activeElementState === "hover" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Editing :hover State
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/70 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveElementState("normal")}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                        activeElementState === "normal"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveElementState("hover")}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                        activeElementState === "hover"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Hover (:hover)
                    </button>
                  </div>
                </div>

                {/* Container Specific Layout Controls */}
                {selectedElement.type === "container" && (
                  <div className="space-y-4">
                    {/* Direction */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Direction
                      </label>
                      <select
                        value={selectedElement.layout?.direction || "column"}
                        onChange={(e) => updateSelectedLayout("direction", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="column">Column (Vertical)</option>
                        <option value="row">Row (Horizontal)</option>
                      </select>
                    </div>

                    {/* Justify Content */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Justify Content
                      </label>
                      <select
                        value={selectedElement.layout?.justifyContent || "flex-start"}
                        onChange={(e) => updateSelectedLayout("justifyContent", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="flex-start">Start (flex-start)</option>
                        <option value="center">Center</option>
                        <option value="flex-end">End (flex-end)</option>
                        <option value="space-between">Space Between</option>
                        <option value="space-around">Space Around</option>
                        <option value="space-evenly">Space Evenly</option>
                      </select>
                    </div>

                    {/* Align Items */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Align Items
                      </label>
                      <select
                        value={selectedElement.layout?.alignItems || "stretch"}
                        onChange={(e) => updateSelectedLayout("alignItems", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="stretch">Stretch</option>
                        <option value="flex-start">Start (flex-start)</option>
                        <option value="center">Center</option>
                        <option value="flex-end">End (flex-end)</option>
                      </select>
                    </div>

                    {/* Gap (px) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Gap (px)
                      </label>
                      <ScrubbableNumberInput
                        value={selectedElement.layout?.gap ?? 10}
                        onChange={(val) => updateSelectedLayout("gap", Number(val))}
                        min={0}
                        step={1}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Width & Height */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Width
                        </label>
                        <select
                          value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "width") || "100%"}
                          onChange={(e) => updateSelectedStyle("width", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="100%">100%</option>
                          <option value="75%">75%</option>
                          <option value="50%">50%</option>
                          <option value="33%">33%</option>
                          <option value="25%">25%</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Height
                        </label>
                        <select
                          value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "height") || "auto"}
                          onChange={(e) => updateSelectedStyle("height", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="auto">Auto</option>
                          <option value="200px">200px</option>
                          <option value="300px">300px</option>
                          <option value="400px">400px</option>
                          <option value="500px">500px</option>
                        </select>
                      </div>
                    </div>

                    {/* Container Background Color */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Background Color
                        </label>
                        {isControlStyleConfigured(selectedElement, activeDevice, activeElementState, "backgroundColor") && (
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
                          value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundColor") || "#f8fafc"}
                          onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                          className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundColor") || "#f8fafc"}
                          onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
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

                    {/* Advanced Spacing Controls for Containers */}
                    {render4SideSpacingControl("Margin", "margin", isMarginLinked, setIsMarginLinked)}
                    {render4SideSpacingControl("Padding", "padding", isPaddingLinked, setIsPaddingLinked)}
                  </div>
                )}

                {/* Content Input */}
                {selectedElement.type !== "image" && selectedElement.type !== "container" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Text
                    </label>
                    <textarea
                      rows={selectedElement.type === "text" ? 3 : 2}
                      value={selectedElement.content}
                      onChange={(e) => updateSelectedProp("content", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Advanced Typography Section */}
                {renderTypographySection()}

                {/* Text Color Input */}
                {selectedElement.type !== "image" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Text Color
                      </label>
                      {isControlStyleConfigured(selectedElement, activeDevice, activeElementState, "color") && (
                        <button
                          type="button"
                          onClick={() => resetSelectedStyle("color")}
                          title="Reset Text Color to Default"
                          className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
                        >
                          ↺ Reset
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "color") || "#0f172a"}
                        onChange={(e) => updateSelectedStyle("color", e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "color") || "#0f172a"}
                        onChange={(e) => updateSelectedStyle("color", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
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
                  </div>
                )}

                {/* Alignment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alignment
                  </label>
                  <select
                    value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "textAlign") || "left"}
                    onChange={(e) => updateSelectedStyle("textAlign", e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                  </select>
                </div>

                {/* Button Href Link */}
                {selectedElement.type === "button" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Button Link (URL)
                    </label>
                    <input
                      type="text"
                      value={selectedElement.href || "#"}
                      onChange={(e) => updateSelectedProp("href", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Button Background Color */}
                {selectedElement.type === "button" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Button Color
                      </label>
                      {isControlStyleConfigured(selectedElement, activeDevice, activeElementState, "backgroundColor") && (
                        <button
                          type="button"
                          onClick={() => resetSelectedStyle("backgroundColor")}
                          title="Reset Button Color to Default"
                          className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline"
                        >
                          ↺ Reset
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundColor") || "#2563eb"}
                        onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "backgroundColor") || "#2563eb"}
                        onChange={(e) => updateSelectedStyle("backgroundColor", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
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
                )}

                {/* Image Upload Dropzone & Controls */}
                {selectedElement.type === "image" && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700">
                      Upload Computer Image
                    </label>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                        dragOver
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-300 bg-slate-50/50 hover:border-slate-400"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageFileSelect(e.target.files[0]);
                          }
                        }}
                      />

                      <UploadCloudIcon />
                      <p className="mt-2 text-xs font-semibold text-slate-700">
                        {isUploading ? "Uploading..." : "Choose Image from Computer"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        Supports JPG, PNG, WEBP, GIF, SVG (Max 5MB)
                      </p>

                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {isUploading ? "Uploading..." : "Browse Files"}
                      </button>
                    </div>

                    {uploadError && (
                      <p className="text-xs font-semibold text-red-500">{uploadError}</p>
                    )}

                    {/* Active Preview Thumbnail */}
                    {selectedElement.src && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="block text-[11px] font-bold text-slate-500 mb-2">
                          Image Preview:
                        </span>
                        <img
                          src={resolveImageUrl(selectedElement.src, apiUrl)}
                          alt="Thumbnail"
                          className="h-24 w-full rounded-lg object-cover border border-slate-200"
                        />
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 rounded-lg border border-slate-300 bg-white py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            Change
                          </button>
                          <button
                            onClick={() => updateSelectedProp("src", "")}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
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

                    {/* Direct Image URL input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Or Image Web URL
                      </label>
                      <input
                        type="text"
                        value={selectedElement.src || ""}
                        onChange={(e) => updateSelectedProp("src", e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Image Sizing Controls */}
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Width
                        </label>
                        <select
                          value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "width") || "100%"}
                          onChange={(e) => updateSelectedStyle("width", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="100%">100% (Full Width)</option>
                          <option value="75%">75%</option>
                          <option value="50%">50% (Half Width)</option>
                          <option value="25%">25%</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Height
                        </label>
                        <select
                          value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "height") || "auto"}
                          onChange={(e) => updateSelectedStyle("height", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="auto">Auto</option>
                          <option value="200px">200px</option>
                          <option value="300px">300px</option>
                          <option value="400px">400px</option>
                          <option value="500px">500px</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Border Radius
                        </label>
                        <select
                          value={getControlStyleValue(selectedElement, activeDevice, activeElementState, "borderRadius") || "8px"}
                          onChange={(e) => updateSelectedStyle("borderRadius", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="0px">0px (Square)</option>
                          <option value="4px">4px (Small)</option>
                          <option value="8px">8px (Medium)</option>
                          <option value="16px">16px (Large)</option>
                          <option value="9999px">Rounded Pill / Circle</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Alt Text
                        </label>
                        <input
                          type="text"
                          value={selectedElement.alt || ""}
                          onChange={(e) => updateSelectedProp("alt", e.target.value)}
                          placeholder="Image alt description"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                        />
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
