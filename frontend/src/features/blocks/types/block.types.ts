export const BlockBindingConfig = {};
export interface BlockBindingConfig {
  provider: "static" | "site" | "post" | "user" | "media" | "custom_field" | string;
  key?: string;
  field?: string;
  defaultValue?: any;
  metaKey?: string;
}

export const BlockNode = {};
export interface BlockNode {
  id: string;
  name: string; // e.g., "core/paragraph", "core/heading", "core/image", "core/button"
  attributes: Record<string, any>;
  innerBlocks?: BlockNode[];
  parentId?: string | null;
  context?: Record<string, any>;
  bindings?: Record<string, BlockBindingConfig>;
  variation?: string;
  metadata?: Record<string, any>;
  supports?: Record<string, any>;
  className?: string;
  anchor?: string;
  style?: Record<string, any>;
  responsive?: Record<string, any>;
}

export const BlockAttributeSchema = {};
export interface BlockAttributeSchema {
  type: "string" | "number" | "boolean" | "object" | "array";
  default?: any;
  enum?: any[];
  sanitized?: boolean;
  required?: boolean;
}

export const BlockVariation = {};
export interface BlockVariation {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  isDefault?: boolean;
  attributes?: Record<string, any>;
  innerBlocks?: BlockNode[];
  scope?: ("inserter" | "block" | "transform")[];
}

export const BlockTransform = {};
export interface BlockTransform {
  targetType: string;
  title: string;
  transform: (block: BlockNode) => BlockNode;
}

export const BlockTypeDefinition = {};

export interface BlockTypeDefinition {
  name: string;
  title: string;
  category: "text" | "media" | "design" | "widgets" | "theme" | "embed";
  icon: string;
  description: string;
  attributes: Record<string, BlockAttributeSchema>;
  supports?: {
    align?: boolean | ("left" | "center" | "right" | "wide" | "full")[];
    color?: boolean;
    typography?: boolean;
    spacing?: boolean;
    customClassName?: boolean;
    anchor?: boolean;
    reusable?: boolean;
    [key: string]: any;
  };
  variations?: BlockVariation[];
  transforms?: BlockTransform[];
  providesContext?: Record<string, string>; // Maps block attributes to context keys
  usesContext?: string[]; // Keys of context needed
}

export const BlockPattern = {};
export interface BlockPattern {
  id: string;
  name: string;
  title: string;
  description?: string;
  category: string;
  categories?: string[];
  content: BlockNode[];
  viewportWidth?: number;
  blockTypes?: string[];
  keywords?: string[];
  isSynced?: boolean;
  syncStatus?: "ACTIVE" | "DETACHED" | "ARCHIVED";
  workspaceId?: string | null;
  organizationId?: string | null;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const BindingProviderContext = {};
export interface BindingProviderContext {
  site?: { name?: string; description?: string; url?: string };
  post?: { id?: string; title?: string; slug?: string; date?: string; excerpt?: string; author?: string };
  user?: { id?: string; name?: string; email?: string; avatarUrl?: string };
  media?: Record<string, string>;
  customFields?: Record<string, any>;
}

// ===================================================
// PART 2: STYLES, CONTROLS, TEMPLATES & TEMPLATE PARTS
// ===================================================

export interface TypographyControlConfig {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | string;
  textDecoration?: "none" | "underline" | "line-through" | string;
  responsive?: {
    tablet?: Partial<TypographyControlConfig>;
    mobile?: Partial<TypographyControlConfig>;
  };
}

export interface ColorControlConfig {
  text?: string;
  background?: string;
  link?: string;
  border?: string;
  gradient?: string;
  presetRef?: string;
}

export interface SpacingControlConfig {
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  padding?: { top?: string; right?: string; bottom?: string; left?: string };
  gap?: string;
  blockGap?: string;
  responsive?: {
    tablet?: Partial<SpacingControlConfig>;
    mobile?: Partial<SpacingControlConfig>;
  };
}

export interface LayoutControlConfig {
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

export interface DimensionsControlConfig {
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  aspectRatio?: string;
  responsive?: {
    tablet?: Partial<DimensionsControlConfig>;
    mobile?: Partial<DimensionsControlConfig>;
  };
}

export interface GlobalStyleConfig {
  id?: string;
  name?: string;
  colors?: Record<string, string>;
  typography?: TypographyControlConfig;
  spacing?: SpacingControlConfig;
  layout?: LayoutControlConfig;
  dimensions?: DimensionsControlConfig;
  blockDefaults?: Record<string, {
    typography?: TypographyControlConfig;
    color?: ColorControlConfig;
    spacing?: SpacingControlConfig;
    layout?: LayoutControlConfig;
    dimensions?: DimensionsControlConfig;
  }>;
}

export type TemplateType = "single" | "page" | "archive" | "404" | "front-page" | "custom";
export type TemplateLockMode = "all" | "insert" | "contentOnly" | false;

export interface BlockTemplate {
  id: string;
  slug: string;
  title: string;
  description?: string;
  type: TemplateType;
  content: BlockNode[];
  templateLock?: TemplateLockMode;
  isDefault?: boolean;
  assignedPageIds?: string[];
  workspaceId?: string | null;
  organizationId?: string | null;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type TemplatePartArea = "header" | "footer" | "sidebar" | "content" | "navigation" | "custom" | "uncategorized";

export interface TemplatePart {
  id: string;
  slug: string;
  title: string;
  area: TemplatePartArea;
  content: BlockNode[];
  workspaceId?: string | null;
  organizationId?: string | null;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ===================================================
// PART 3: ADVANCED DESIGN CONTROLS & ATTRIBUTES
// ===================================================

export interface BorderSideConfig {
  width?: string;
  style?: "none" | "solid" | "dashed" | "dotted" | "double" | string;
  color?: string;
}

export interface BorderControlConfig {
  width?: string;
  style?: "none" | "solid" | "dashed" | "dotted" | "double" | string;
  color?: string;
  radius?: string;
  top?: BorderSideConfig;
  right?: BorderSideConfig;
  bottom?: BorderSideConfig;
  left?: BorderSideConfig;
  radiusCorners?: {
    topLeft?: string;
    topRight?: string;
    bottomRight?: string;
    bottomLeft?: string;
  };
  responsive?: {
    tablet?: Partial<BorderControlConfig>;
    mobile?: Partial<BorderControlConfig>;
  };
}

export interface SingleShadowItem {
  x: string;
  y: string;
  blur: string;
  spread: string;
  color: string;
  inset?: boolean;
}

export interface ShadowControlConfig {
  x?: string;
  y?: string;
  blur?: string;
  spread?: string;
  color?: string;
  inset?: boolean;
  preset?: string;
  multiple?: SingleShadowItem[];
}

export interface BackgroundControlConfig {
  color?: string;
  gradient?: string;
  image?: string;
  position?: string;
  size?: "cover" | "contain" | "auto" | string;
  repeat?: "no-repeat" | "repeat" | "repeat-x" | "repeat-y" | string;
  attachment?: "scroll" | "fixed" | "local" | string;
  overlay?: {
    color?: string;
    opacity?: number | string;
    gradient?: string;
  };
  responsive?: {
    tablet?: Partial<BackgroundControlConfig>;
    mobile?: Partial<BackgroundControlConfig>;
  };
}

export interface ResponsiveImageConfig {
  src: string;
  srcset?: string;
  sizes?: string;
  width?: number | string;
  height?: number | string;
  alt?: string;
  title?: string;
  caption?: string;
  loading?: "lazy" | "eager";
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down" | string;
  objectPosition?: string;
  mediaId?: string | number;
}

export interface HTMLAttributeConfig {
  name: string; // e.g., "aria-label", "data-tracking", "title", "role"
  value: string;
}

// ===================================================
// PART 4: EDITOR UX, PREFERENCES & OUTLINE TYPES
// ===================================================

export interface EditorPreferences {
  spotlightMode: boolean;
  fullscreen: boolean;
  topToolbarMode: boolean;
  distractionFree: boolean;
  panelPreferences: {
    inspectorOpen: boolean;
    navigatorOpen: boolean;
    outlineOpen: boolean;
    inserterOpen: boolean;
  };
  keyboardShortcuts: Record<string, string>; // commandId -> keybinding e.g. "toggle-spotlight" -> "Ctrl+Alt+S"
  fitTextDefaults: {
    minFontSize: number;
    maxFontSize: number;
  };
}

export interface ShortcutCommand {
  id: string;
  name: string;
  category: "editor" | "navigation" | "formatting" | "blocks";
  defaultKey: string;
  description: string;
}

export interface DocumentOutlineItem {
  id: string;
  blockId: string;
  blockName: string;
  headingLevel?: number; // 1 to 6 for core/heading
  text: string;
  depth: number;
  hasChildren?: boolean;
}

export interface DocumentStats {
  words: number;
  characters: number;
  blocks: number;
  headings: number;
  paragraphs: number;
  images: number;
}

export interface HeadingValidationIssue {
  type: "missing-h1" | "multiple-h1" | "skipped-level" | "missing-alt";
  message: string;
  blockId?: string;
  severity: "warning" | "error";
}

export interface FitTextConfig {
  enabled: boolean;
  minFontSize?: number; // e.g., 12
  maxFontSize?: number; // e.g., 120
  containerWidthRatio?: number;
}


