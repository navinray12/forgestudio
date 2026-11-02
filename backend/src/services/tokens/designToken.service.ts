/**
 * Design Token & Global Class Service
 * F-338 to F-350, F-066 to F-101
 * Centralized CSS variable tokens, global classes, JSON export/import, and CSS generator.
 */

export interface VariableModeValue {
  modeId: "light" | "dark" | string;
  value: string;
}

export type TokenCategory =
  | "color"
  | "typography"
  | "font"
  | "spacing"
  | "shadow"
  | "radius"
  | "dimension"
  | "number"
  | "custom";

export interface DesignVariable {
  id: string;
  name: string;
  category: TokenCategory;
  token: string; // e.g. "--fs-color-primary"
  value: string; // e.g. "#4f46e5" or "16px"
  description?: string;
  defaultMode?: "light" | "dark";
  modes?: Record<string, string>; // e.g. { light: '#ffffff', dark: '#0f172a' }
  createdAt?: string;
  updatedAt?: string;
}

export interface GlobalClass {
  id: string;
  name: string; // e.g. "Elevated Card"
  className: string; // e.g. "fs-card-elevated"
  description?: string;
  styles: Record<string, string | number>;
  pseudoStyles?: {
    hover?: Record<string, string | number>;
    focus?: Record<string, string | number>;
    active?: Record<string, string | number>;
  };
  createdByRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DesignSystemPayload {
  version: number;
  exportedAt: string;
  variables: DesignVariable[];
  classes: GlobalClass[];
  metadata?: {
    websiteId?: string;
    websiteName?: string;
    totalVariables?: number;
    totalClasses?: number;
  };
}

const FORBIDDEN_PROPERTY_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "valueOf",
  "toString",
]);

const DANGEROUS_CSS_PATTERNS = [
  /expression\s*\(/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /behavior\s*:/i,
  /-moz-binding\s*:/i,
  /<\s*script/i,
  /<\s*\/\s*script/i,
  /<\s*style/i,
  /<\s*\/\s*style/i,
  /@import/i,
];

const MAX_TOKENS = 500;
const MAX_CLASSES = 300;
const MAX_VALUE_LENGTH = 1000;

/**
 * Sanitize a CSS variable name so it cannot break out of CSS rules.
 */
export function sanitizeTokenName(rawToken: string): string {
  let cleaned = String(rawToken || "")
    .trim()
    .toLowerCase()
    .replace(/[<>]/g, "")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!cleaned) cleaned = "custom-token";
  return `--${cleaned}`;
}

/**
 * Sanitize a CSS class name.
 */
export function sanitizeClassName(rawName: string): string {
  let cleaned = String(rawName || "")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[<>]/g, "");
  cleaned = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!cleaned) cleaned = "fs-custom-class";
  return cleaned;
}

/**
 * Sanitize a CSS value to prevent CSS rule breakout and script execution.
 */
export function sanitizeCssValue(rawValue: string): string {
  if (!rawValue) return "";
  let val = String(rawValue).slice(0, MAX_VALUE_LENGTH);

  // Handle url() values safely first to neutralize script / unauthorized protocols
  val = val.replace(/url\s*\((?:[^()]*|\([^()]*\))*\)/gi, (match) => {
    const inner = match.replace(/^url\s*\(\s*|\s*\)$/gi, "");
    const rawUrl = inner.trim().replace(/^['"]|['"]$/g, "");
    if (/^(javascript|vbscript|data:(?!image\/(png|jpeg|webp|gif|svg\+xml)))/i.test(rawUrl)) {
      return "url('')";
    }
    // Block script in SVG data URIs
    if (/data:image\/svg\+xml/i.test(rawUrl) && /<script/i.test(rawUrl)) {
      return "url('')";
    }
    return match;
  });

  // Check dangerous patterns
  for (const pattern of DANGEROUS_CSS_PATTERNS) {
    if (pattern.test(val)) {
      val = val.replace(pattern, "/* blocked */");
    }
  }

  // Strip closing curly braces, semicolons, and angle brackets to avoid injection
  return val.replace(/[;{}]/g, " ").replace(/[<>]/g, "").trim();
}

/**
 * Detect circular references in CSS variables (e.g., --a depends on --b, --b depends on --a).
 */
export function detectCircularTokenReferences(variables: DesignVariable[]): Set<string> {
  const circularTokens = new Set<string>();
  const graph = new Map<string, string[]>();

  for (const v of variables) {
    const refs: string[] = [];
    const valString = `${v.value || ""} ${JSON.stringify(v.modes || {})}`;
    const matches = valString.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g);
    for (const match of matches) {
      if (match[1]) refs.push(match[1].toLowerCase());
    }
    graph.set(v.token.toLowerCase(), refs);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(token: string, path: string[]) {
    visited.add(token);
    recursionStack.add(token);

    const neighbors = graph.get(token) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        circularTokens.add(token);
        circularTokens.add(neighbor);
        for (const p of path) circularTokens.add(p);
      }
    }

    recursionStack.delete(token);
  }

  for (const token of graph.keys()) {
    if (!visited.has(token)) {
      dfs(token, [token]);
    }
  }

  return circularTokens;
}

/**
 * Validate and sanitize an array of Design Variables.
 */
export function validateVariables(input: any[]): DesignVariable[] {
  if (!Array.isArray(input)) return [];
  const boundedInput = input.slice(0, MAX_TOKENS);
  const seenTokens = new Set<string>();
  const validated: DesignVariable[] = [];

  for (let index = 0; index < boundedInput.length; index++) {
    const item = boundedInput[index];
    if (!item || typeof item !== "object") continue;

    const id = String(item.id || `var-${Date.now()}-${index}`);
    const name = String(item.name || `Variable ${index + 1}`).trim().slice(0, 100);

    const rawCat = String(item.category || item.type || "custom").toLowerCase();
    const category: TokenCategory = [
      "color",
      "typography",
      "font",
      "spacing",
      "shadow",
      "radius",
      "dimension",
      "number",
      "custom",
    ].includes(rawCat as any)
      ? (rawCat as TokenCategory)
      : "custom";

    let token = sanitizeTokenName(
      String(item.token || item.key || (item.name?.startsWith("--") ? item.name : undefined) || `--fs-${category}-${index + 1}`)
    );

    // Ensure unique token key
    if (seenTokens.has(token)) {
      token = `${token}-${index + 1}`;
    }
    seenTokens.add(token);

    const value = sanitizeCssValue(String(item.value || ""));
    const description = item.description ? String(item.description).slice(0, 300) : undefined;
    const defaultMode = item.defaultMode === "dark" ? "dark" : "light";

    let modes: Record<string, string> | undefined = undefined;
    if (item.modes && typeof item.modes === "object") {
      modes = {};
      for (const [mKey, mVal] of Object.entries(item.modes)) {
        if (FORBIDDEN_PROPERTY_KEYS.has(mKey)) continue;
        const cleanKey = String(mKey).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
        const cleanVal = sanitizeCssValue(String(mVal || ""));
        if (cleanKey && cleanVal) {
          modes[cleanKey] = cleanVal;
        }
      }
    }

    validated.push({
      id,
      name,
      category,
      token,
      value,
      description,
      defaultMode,
      modes,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Detect and resolve circular references
  const circulars = detectCircularTokenReferences(validated);
  if (circulars.size > 0) {
    for (const v of validated) {
      if (circulars.has(v.token.toLowerCase())) {
        // Fallback to avoid infinite CSS evaluation loop
        v.value = v.value.replace(/var\([^)]+\)/g, "inherit");
        if (v.modes) {
          for (const mKey of Object.keys(v.modes)) {
            v.modes[mKey] = v.modes[mKey].replace(/var\([^)]+\)/g, "inherit");
          }
        }
      }
    }
  }

  return validated;
}

/**
 * Validate and sanitize an array of Global Classes.
 */
export function validateClasses(input: any[]): GlobalClass[] {
  if (!Array.isArray(input)) return [];
  const boundedInput = input.slice(0, MAX_CLASSES);
  const seenClassNames = new Set<string>();
  const validated: GlobalClass[] = [];

  for (let index = 0; index < boundedInput.length; index++) {
    const item = boundedInput[index];
    if (!item || typeof item !== "object") continue;

    const id = String(item.id || `cls-${Date.now()}-${index}`);
    const name = String(item.name || `Class ${index + 1}`).trim().slice(0, 100);
    const rawClassName = String(item.className || item.key || item.name || `fs-class-${index + 1}`);
    let className = sanitizeClassName(rawClassName);

    if (seenClassNames.has(className)) {
      className = `${className}-${index + 1}`;
    }
    seenClassNames.add(className);

    const description = item.description ? String(item.description).slice(0, 300) : undefined;

    const sanitizeStyles = (obj: any): Record<string, string | number> => {
      if (!obj || typeof obj !== "object") return Object.create(null);
      const safe: Record<string, string | number> = Object.create(null);
      for (const [k, v] of Object.entries(obj)) {
        if (FORBIDDEN_PROPERTY_KEYS.has(k)) continue;
        const safeKey = String(k).replace(/[^a-zA-Z0-9-]/g, "");
        if (!safeKey) continue;
        const safeVal = typeof v === "number" ? v : sanitizeCssValue(String(v || ""));
        if (safeVal !== "") {
          safe[safeKey] = safeVal;
        }
      }
      return safe;
    };

    const styles = sanitizeStyles(item.styles);
    const pseudoStyles: GlobalClass["pseudoStyles"] = {};
    if (item.pseudoStyles?.hover) pseudoStyles.hover = sanitizeStyles(item.pseudoStyles.hover);
    if (item.pseudoStyles?.focus) pseudoStyles.focus = sanitizeStyles(item.pseudoStyles.focus);
    if (item.pseudoStyles?.active) pseudoStyles.active = sanitizeStyles(item.pseudoStyles.active);

    validated.push({
      id,
      name,
      className,
      description,
      styles,
      pseudoStyles: Object.keys(pseudoStyles).length > 0 ? pseudoStyles : undefined,
      createdByRole: item.createdByRole ? String(item.createdByRole) : undefined,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return validated;
}

/**
 * Converts camelCase to kebab-case CSS property names.
 */
function toKebabCase(prop: string): string {
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Compiles an array of variables and classes into valid, production-ready CSS.
 */
export function compileDesignSystemCss(variables: DesignVariable[], classes: GlobalClass[]): string {
  const cssLines: string[] = [];

  // 1. Root variables (Light / Base)
  if (variables.length > 0) {
    cssLines.push("/* --- ForgeStudio Design Tokens (:root) --- */");
    cssLines.push(":root {");
    for (const v of variables) {
      if (v.token) {
        const lightVal = v.modes?.light || v.value;
        if (lightVal) {
          cssLines.push(`  ${v.token}: ${lightVal};`);
        }
      }
    }
    cssLines.push("}\n");

    // Check for Dark Mode token overrides
    const darkModeEntries = variables.filter((v) => v.token && v.modes?.dark);
    if (darkModeEntries.length > 0) {
      cssLines.push("/* --- ForgeStudio Design Tokens (Dark Theme Overrides) --- */");
      cssLines.push('[data-theme="dark"], .dark {');
      for (const v of darkModeEntries) {
        cssLines.push(`  ${v.token}: ${v.modes!.dark};`);
      }
      cssLines.push("}\n");

      // Auto-respect visitor system preference
      cssLines.push("@media (prefers-color-scheme: dark) {");
      cssLines.push('  :root:not([data-theme="light"]) {');
      for (const v of darkModeEntries) {
        cssLines.push(`    ${v.token}: ${v.modes!.dark};`);
      }
      cssLines.push("  }");
      cssLines.push("}\n");
    }
  }

  // 2. Global Utility Classes
  if (classes.length > 0) {
    cssLines.push("/* --- ForgeStudio Global Utility Classes --- */");
    for (const cls of classes) {
      if (!cls.className) continue;

      // Base class
      const baseProps = Object.entries(cls.styles)
        .map(([k, v]) => `  ${toKebabCase(k)}: ${v};`)
        .join("\n");
      if (baseProps) {
        cssLines.push(`.${cls.className} {\n${baseProps}\n}`);
      }

      // Pseudo classes
      if (cls.pseudoStyles?.hover && Object.keys(cls.pseudoStyles.hover).length > 0) {
        const hoverProps = Object.entries(cls.pseudoStyles.hover)
          .map(([k, v]) => `  ${toKebabCase(k)}: ${v};`)
          .join("\n");
        cssLines.push(`.${cls.className}:hover {\n${hoverProps}\n}`);
      }

      if (cls.pseudoStyles?.focus && Object.keys(cls.pseudoStyles.focus).length > 0) {
        const focusProps = Object.entries(cls.pseudoStyles.focus)
          .map(([k, v]) => `  ${toKebabCase(k)}: ${v};`)
          .join("\n");
        cssLines.push(`.${cls.className}:focus {\n${focusProps}\n}`);
      }

      if (cls.pseudoStyles?.active && Object.keys(cls.pseudoStyles.active).length > 0) {
        const activeProps = Object.entries(cls.pseudoStyles.active)
          .map(([k, v]) => `  ${toKebabCase(k)}: ${v};`)
          .join("\n");
        cssLines.push(`.${cls.className}:active {\n${activeProps}\n}`);
      }
    }
  }

  return cssLines.join("\n");
}

/**
 * Export design system as a portable JSON structure (F-342, F-343).
 */
export function exportDesignSystem(
  variables: DesignVariable[],
  classes: GlobalClass[],
  metadata?: { websiteId?: string; websiteName?: string }
): DesignSystemPayload {
  const safeVars = validateVariables(variables);
  const safeClasses = validateClasses(classes);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    variables: safeVars,
    classes: safeClasses,
    metadata: {
      ...metadata,
      totalVariables: safeVars.length,
      totalClasses: safeClasses.length,
    },
  };
}

/**
 * Import and validate a design system JSON structure (F-342, F-343).
 */
export function importDesignSystem(jsonInput: string | object): {
  variables: DesignVariable[];
  classes: GlobalClass[];
  compiledCss: string;
} {
  let parsed: any;
  if (typeof jsonInput === "string") {
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      throw new Error("Invalid JSON string supplied to importDesignSystem");
    }
  } else {
    parsed = jsonInput;
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Design system payload must be an object");
  }

  const rawVars = Array.isArray(parsed.variables)
    ? parsed.variables
    : Array.isArray(parsed)
    ? parsed
    : [];
  const rawClasses = Array.isArray(parsed.classes) ? parsed.classes : [];

  const variables = validateVariables(rawVars);
  const classes = validateClasses(rawClasses);
  const compiledCss = compileDesignSystemCss(variables, classes);

  return { variables, classes, compiledCss };
}

