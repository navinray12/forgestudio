/**
 * Design Token & Global CSS Class Reference Safeguards
 * Module 17 - Step 7
 * Safe rename and delete behaviors across all element representations without data loss.
 */

import type { EditorElement } from "../types";

/**
 * Escapes characters for safe regular expression construction.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalizes a token name to include leading '--'.
 */
export function normalizeTokenName(token: string): string {
  if (!token) return "";
  const trimmed = token.trim();
  return trimmed.startsWith("--") ? trimmed : `--${trimmed}`;
}

/**
 * Normalizes a class name to remove leading '.' and trim whitespace.
 */
export function normalizeClassName(className: string): string {
  if (!className) return "";
  return className.trim().replace(/^\.+/, "");
}

/**
 * Checks if a style value references a specific CSS variable token.
 */
export function styleValueReferencesToken(value: unknown, tokenName: string): boolean {
  if (typeof value !== "string") return false;
  const norm = normalizeTokenName(tokenName);
  if (!norm) return false;

  if (value.trim() === norm) return true;

  const regex = new RegExp(`var\\s*\\(\\s*${escapeRegex(norm)}(\\s*[,\\)])`);
  return regex.test(value);
}

/**
 * Replaces references to an old CSS variable token with a new token in a style value.
 */
export function replaceTokenInStyleValue(value: unknown, oldToken: string, newToken: string): unknown {
  if (typeof value !== "string") return value;
  const normOld = normalizeTokenName(oldToken);
  const normNew = normalizeTokenName(newToken);
  if (!normOld || !normNew || normOld === normNew) return value;

  if (value.trim() === normOld) {
    return normNew;
  }

  const regex = new RegExp(`var\\s*\\(\\s*${escapeRegex(normOld)}(\\s*[,\\)])`, "g");
  return value.replace(regex, `var(${normNew}$1`);
}

/**
 * Detaches a CSS variable reference from a style value, replacing it with fallback value.
 */
export function detachTokenInStyleValue(value: unknown, tokenToDelete: string, fallbackValue: string): unknown {
  if (typeof value !== "string") return value;
  const norm = normalizeTokenName(tokenToDelete);
  if (!norm) return value;

  const fallback = String(fallbackValue ?? "").trim();

  if (value.trim() === norm) {
    return fallback;
  }

  // Matches var(--token) or var(--token, fallback)
  const regex = new RegExp(`var\\s*\\(\\s*${escapeRegex(norm)}(?:\\s*,\\s*([^)]+?))?\\s*\\)`, "g");
  return value.replace(regex, (_match, embeddedFallback) => {
    if (embeddedFallback && embeddedFallback.trim()) {
      return embeddedFallback.trim();
    }
    return fallback;
  });
}

/**
 * Checks if a class list string or array contains a specific class name.
 */
export function classListContains(classList: unknown, targetClass: string): boolean {
  const normTarget = normalizeClassName(targetClass);
  if (!normTarget) return false;

  if (Array.isArray(classList)) {
    return classList.some((c) => typeof c === "string" && normalizeClassName(c) === normTarget);
  }

  if (typeof classList === "string") {
    const tokens = classList.trim().split(/\s+/);
    return tokens.some((t) => normalizeClassName(t) === normTarget);
  }

  return false;
}

/**
 * Renames a class in a space-delimited string, normalizing whitespace and deduplicating.
 */
export function renameClassInString(classListStr: string, oldClass: string, newClass: string): string {
  const normOld = normalizeClassName(oldClass);
  const normNew = normalizeClassName(newClass);
  if (!normOld || !normNew) return classListStr;

  const tokens = classListStr.trim().split(/\s+/).filter(Boolean);
  const updatedTokens: string[] = [];

  for (const t of tokens) {
    const curNorm = normalizeClassName(t);
    const replaced = curNorm === normOld ? normNew : curNorm;
    if (replaced && !updatedTokens.includes(replaced)) {
      updatedTokens.push(replaced);
    }
  }

  return updatedTokens.join(" ");
}

/**
 * Removes a class from a space-delimited string, normalizing whitespace and deduplicating.
 */
export function removeClassFromString(classListStr: string, classToDelete: string): string {
  const normTarget = normalizeClassName(classToDelete);
  if (!normTarget) return classListStr;

  const tokens = classListStr.trim().split(/\s+/).filter(Boolean);
  const updatedTokens: string[] = [];

  for (const t of tokens) {
    const curNorm = normalizeClassName(t);
    if (curNorm !== normTarget && !updatedTokens.includes(curNorm)) {
      updatedTokens.push(curNorm);
    }
  }

  return updatedTokens.join(" ");
}

/**
 * Counts the number of elements and total references to a design token across element trees.
 */
export function countTokenReferences(
  tokenName: string,
  trees: EditorElement[][]
): { elementCount: number; totalReferences: number } {
  let elementCount = 0;
  let totalReferences = 0;

  const visit = (el: EditorElement) => {
    let elHasRef = false;

    const checkStyleObj = (obj?: Record<string, any>) => {
      if (!obj || typeof obj !== "object") return;
      for (const val of Object.values(obj)) {
        if (styleValueReferencesToken(val, tokenName)) {
          totalReferences++;
          elHasRef = true;
        }
      }
    };

    checkStyleObj(el.styles);
    checkStyleObj(el.hoverStyles);

    if (el.responsiveStyles && typeof el.responsiveStyles === "object") {
      for (const bpObj of Object.values(el.responsiveStyles)) {
        checkStyleObj(bpObj as any);
      }
    }

    if (el.responsiveHoverStyles && typeof el.responsiveHoverStyles === "object") {
      for (const bpObj of Object.values(el.responsiveHoverStyles)) {
        checkStyleObj(bpObj as any);
      }
    }

    if (elHasRef) {
      elementCount++;
    }

    if (Array.isArray(el.children)) {
      el.children.forEach(visit);
    }
    if (Array.isArray(el.elements)) {
      el.elements.forEach(visit);
    }
  };

  for (const tree of trees) {
    if (Array.isArray(tree)) {
      tree.forEach(visit);
    }
  }

  return { elementCount, totalReferences };
}

/**
 * Counts the number of elements referencing a global class across element trees.
 */
export function countClassReferences(
  className: string,
  trees: EditorElement[][]
): { elementCount: number; totalReferences: number } {
  let elementCount = 0;
  let totalReferences = 0;

  const visit = (el: EditorElement) => {
    let elHasRef = false;

    if (classListContains(el.customClass, className)) {
      totalReferences++;
      elHasRef = true;
    }
    if (classListContains(el.classes, className)) {
      totalReferences++;
      elHasRef = true;
    }
    if (classListContains((el as any).className, className)) {
      totalReferences++;
      elHasRef = true;
    }
    if (classListContains((el as any).cssClasses, className)) {
      totalReferences++;
      elHasRef = true;
    }

    if (elHasRef) {
      elementCount++;
    }

    if (Array.isArray(el.children)) {
      el.children.forEach(visit);
    }
    if (Array.isArray(el.elements)) {
      el.elements.forEach(visit);
    }
  };

  for (const tree of trees) {
    if (Array.isArray(tree)) {
      tree.forEach(visit);
    }
  }

  return { elementCount, totalReferences };
}

/**
 * Safely updates style objects for a single element.
 */
function transformStyleObject(
  obj: Record<string, any> | undefined,
  transformer: (val: unknown) => unknown
): Record<string, any> | undefined {
  if (!obj || typeof obj !== "object") return obj;
  const updated: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    updated[k] = transformer(v);
  }
  return updated;
}

/**
 * Renames a design token across an element tree recursively.
 */
export function renameTokenInTree(
  elements: EditorElement[],
  oldToken: string,
  newToken: string
): EditorElement[] {
  return elements.map((el) => {
    const updated: EditorElement = { ...el };

    const transformer = (val: unknown) => replaceTokenInStyleValue(val, oldToken, newToken);

    if (updated.styles) {
      updated.styles = transformStyleObject(updated.styles, transformer) as any;
    }
    if (updated.hoverStyles) {
      updated.hoverStyles = transformStyleObject(updated.hoverStyles, transformer) as any;
    }

    if (updated.responsiveStyles && typeof updated.responsiveStyles === "object") {
      const updatedResp: Record<string, any> = {};
      for (const [bp, bpStyles] of Object.entries(updated.responsiveStyles)) {
        updatedResp[bp] = transformStyleObject(bpStyles as any, transformer);
      }
      updated.responsiveStyles = updatedResp as any;
    }

    if (updated.responsiveHoverStyles && typeof updated.responsiveHoverStyles === "object") {
      const updatedRespHover: Record<string, any> = {};
      for (const [bp, bpStyles] of Object.entries(updated.responsiveHoverStyles)) {
        updatedRespHover[bp] = transformStyleObject(bpStyles as any, transformer);
      }
      updated.responsiveHoverStyles = updatedRespHover as any;
    }

    if (Array.isArray(updated.children)) {
      updated.children = renameTokenInTree(updated.children, oldToken, newToken);
    }
    if (Array.isArray(updated.elements)) {
      updated.elements = renameTokenInTree(updated.elements, oldToken, newToken);
    }

    return updated;
  });
}

/**
 * Detaches a design token (replaces with fallback) across an element tree recursively.
 */
export function detachTokenInTree(
  elements: EditorElement[],
  tokenToDelete: string,
  fallbackValue: string
): EditorElement[] {
  return elements.map((el) => {
    const updated: EditorElement = { ...el };

    const transformer = (val: unknown) => detachTokenInStyleValue(val, tokenToDelete, fallbackValue);

    if (updated.styles) {
      updated.styles = transformStyleObject(updated.styles, transformer) as any;
    }
    if (updated.hoverStyles) {
      updated.hoverStyles = transformStyleObject(updated.hoverStyles, transformer) as any;
    }

    if (updated.responsiveStyles && typeof updated.responsiveStyles === "object") {
      const updatedResp: Record<string, any> = {};
      for (const [bp, bpStyles] of Object.entries(updated.responsiveStyles)) {
        updatedResp[bp] = transformStyleObject(bpStyles as any, transformer);
      }
      updated.responsiveStyles = updatedResp as any;
    }

    if (updated.responsiveHoverStyles && typeof updated.responsiveHoverStyles === "object") {
      const updatedRespHover: Record<string, any> = {};
      for (const [bp, bpStyles] of Object.entries(updated.responsiveHoverStyles)) {
        updatedRespHover[bp] = transformStyleObject(bpStyles as any, transformer);
      }
      updated.responsiveHoverStyles = updatedRespHover as any;
    }

    if (Array.isArray(updated.children)) {
      updated.children = detachTokenInTree(updated.children, tokenToDelete, fallbackValue);
    }
    if (Array.isArray(updated.elements)) {
      updated.elements = detachTokenInTree(updated.elements, tokenToDelete, fallbackValue);
    }

    return updated;
  });
}

/**
 * Renames a global CSS class across all supported element representations.
 */
export function renameClassInTree(
  elements: EditorElement[],
  oldClassName: string,
  newClassName: string
): EditorElement[] {
  const normOld = normalizeClassName(oldClassName);
  const normNew = normalizeClassName(newClassName);
  if (!normOld || !normNew || normOld === normNew) return elements;

  return elements.map((el) => {
    const updated: any = { ...el };

    // 1. customClass (string)
    if (typeof updated.customClass === "string") {
      updated.customClass = renameClassInString(updated.customClass, normOld, normNew);
    }

    // 2. classes (string[])
    if (Array.isArray(updated.classes)) {
      const seen = new Set<string>();
      updated.classes = updated.classes
        .map((c: string) => {
          const cNorm = normalizeClassName(c);
          return cNorm === normOld ? normNew : cNorm;
        })
        .filter((c: string) => {
          if (!c || seen.has(c)) return false;
          seen.add(c);
          return true;
        });
    }

    // 3. className (string)
    if (typeof updated.className === "string") {
      updated.className = renameClassInString(updated.className, normOld, normNew);
    }

    // 4. cssClasses (string or string[])
    if (Array.isArray(updated.cssClasses)) {
      const seen = new Set<string>();
      updated.cssClasses = updated.cssClasses
        .map((c: string) => {
          const cNorm = normalizeClassName(c);
          return cNorm === normOld ? normNew : cNorm;
        })
        .filter((c: string) => {
          if (!c || seen.has(c)) return false;
          seen.add(c);
          return true;
        });
    } else if (typeof updated.cssClasses === "string") {
      updated.cssClasses = renameClassInString(updated.cssClasses, normOld, normNew);
    }

    // Recursive children
    if (Array.isArray(updated.children)) {
      updated.children = renameClassInTree(updated.children, normOld, normNew);
    }
    if (Array.isArray(updated.elements)) {
      updated.elements = renameClassInTree(updated.elements, normOld, normNew);
    }

    return updated;
  });
}

/**
 * Removes a deleted global CSS class across all supported element representations.
 */
export function removeClassInTree(
  elements: EditorElement[],
  classToDelete: string
): EditorElement[] {
  const normTarget = normalizeClassName(classToDelete);
  if (!normTarget) return elements;

  return elements.map((el) => {
    const updated: any = { ...el };

    // 1. customClass (string)
    if (typeof updated.customClass === "string") {
      updated.customClass = removeClassFromString(updated.customClass, normTarget);
    }

    // 2. classes (string[])
    if (Array.isArray(updated.classes)) {
      const seen = new Set<string>();
      updated.classes = updated.classes
        .map((c: string) => normalizeClassName(c))
        .filter((c: string) => {
          if (!c || c === normTarget || seen.has(c)) return false;
          seen.add(c);
          return true;
        });
    }

    // 3. className (string)
    if (typeof updated.className === "string") {
      updated.className = removeClassFromString(updated.className, normTarget);
    }

    // 4. cssClasses (string or string[])
    if (Array.isArray(updated.cssClasses)) {
      const seen = new Set<string>();
      updated.cssClasses = updated.cssClasses
        .map((c: string) => normalizeClassName(c))
        .filter((c: string) => {
          if (!c || c === normTarget || seen.has(c)) return false;
          seen.add(c);
          return true;
        });
    } else if (typeof updated.cssClasses === "string") {
      updated.cssClasses = removeClassFromString(updated.cssClasses, normTarget);
    }

    // Recursive children
    if (Array.isArray(updated.children)) {
      updated.children = removeClassInTree(updated.children, normTarget);
    }
    if (Array.isArray(updated.elements)) {
      updated.elements = removeClassInTree(updated.elements, normTarget);
    }

    return updated;
  });
}
