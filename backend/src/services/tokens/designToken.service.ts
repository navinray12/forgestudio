/**
 * Design Token & Global Class Service
 * F-338 to F-350, F-066 to F-101
 * Centralized CSS variable tokens, global classes, JSON export/import, and CSS generator.
 */

export interface DesignVariable {
  id: string;
  name: string;
  category: "color" | "typography" | "spacing" | "shadow" | "radius" | "custom";
  token: string; // e.g. "--fs-color-primary"
  value: string; // e.g. "#4f46e5" or "16px"
  description?: string;
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
}

export interface DesignSystemPayload {
  version: number;
  exportedAt: string;
  variables: DesignVariable[];
  classes: GlobalClass[];
}

/**
 * Sanitize a CSS variable name so it cannot break out of CSS rules.
 */
export function sanitizeTokenName(rawToken: string): string {
  let cleaned = rawToken.trim().toLowerCase().replace(/<[^>]*>/g, "").replace(/[^a-z0-9_-]/g, "-");
  cleaned = cleaned.replace(/^-+/, "");
  return `--${cleaned}`;
}

/**
 * Sanitize a CSS class name.
 */
export function sanitizeClassName(rawName: string): string {
  let cleaned = rawName.trim().replace(/^\.+/, "");
  cleaned = cleaned.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+/, "");
  return cleaned;
}

/**
 * Validate and sanitize an array of Design Variables.
 */
export function validateVariables(input: any[]): DesignVariable[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const id = String(item.id || `var-${Date.now()}-${index}`);
      const name = String(item.name || `Variable ${index + 1}`).trim();
      const category = ["color", "typography", "spacing", "shadow", "radius", "custom"].includes(item.category)
        ? item.category
        : "custom";
      const token = sanitizeTokenName(String(item.token || `--fs-${category}-${index + 1}`));
      // Basic CSS injection prevention on the value
      const value = String(item.value || "").replace(/[;{}]/g, "").trim();
      const description = item.description ? String(item.description).slice(0, 300) : undefined;
      return { id, name, category, token, value, description };
    });
}

/**
 * Validate and sanitize an array of Global Classes.
 */
export function validateClasses(input: any[]): GlobalClass[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const id = String(item.id || `cls-${Date.now()}-${index}`);
      const name = String(item.name || `Class ${index + 1}`).trim();
      const rawClassName = String(item.className || item.name || `fs-class-${index + 1}`);
      const className = sanitizeClassName(rawClassName);
      const description = item.description ? String(item.description).slice(0, 300) : undefined;

      const sanitizeStyles = (obj: any): Record<string, string | number> => {
        if (!obj || typeof obj !== "object") return {};
        const safe: Record<string, string | number> = {};
        for (const [k, v] of Object.entries(obj)) {
          const safeKey = String(k).replace(/[^a-zA-Z0-9-]/g, "");
          const safeVal = String(v).replace(/[;{}]/g, "").trim();
          if (safeKey && safeVal) {
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

      return {
        id,
        name,
        className,
        description,
        styles,
        pseudoStyles: Object.keys(pseudoStyles).length > 0 ? pseudoStyles : undefined,
        createdByRole: item.createdByRole ? String(item.createdByRole) : undefined,
      };
    });
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

  // 1. Root variables
  if (variables.length > 0) {
    cssLines.push("/* --- ForgeStudio Design Tokens (:root) --- */");
    cssLines.push(":root {");
    for (const v of variables) {
      if (v.token && v.value) {
        cssLines.push(`  ${v.token}: ${v.value};`);
      }
    }
    cssLines.push("}\n");
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
export function exportDesignSystem(variables: DesignVariable[], classes: GlobalClass[]): DesignSystemPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    variables: validateVariables(variables),
    classes: validateClasses(classes),
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

  const variables = validateVariables(parsed.variables || []);
  const classes = validateClasses(parsed.classes || []);
  const compiledCss = compileDesignSystemCss(variables, classes);

  return { variables, classes, compiledCss };
}
