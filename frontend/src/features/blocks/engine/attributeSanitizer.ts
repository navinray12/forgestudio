import type { BlockNode, HTMLAttributeConfig } from "../types/block.types";

export interface ClassValidationResult {
  cleaned: string;
  errors: string[];
}

export interface AnchorValidationResult {
  unique: boolean;
  duplicateBlockId?: string;
}

/**
 * Validates and cleans CSS class names.
 */
export function validateAndCleanCssClasses(input: string): ClassValidationResult {
  if (!input) {
    return { cleaned: "", errors: [] };
  }

  const errors: string[] = [];
  const classes = input.trim().split(/\s+/);
  const validClasses: string[] = [];
  const invalidCharRegex = /[^a-zA-Z0-9_\-]/;

  for (const cls of classes) {
    if (!cls) continue;
    if (invalidCharRegex.test(cls)) {
      errors.push(`Invalid CSS class name "${cls}": contains disallowed characters.`);
      const cleanedCls = cls.replace(/[^a-zA-Z0-9_\-]/g, "");
      if (cleanedCls) validClasses.push(cleanedCls);
    } else {
      validClasses.push(cls);
    }
  }

  return {
    cleaned: validClasses.join(" "),
    errors,
  };
}

/**
 * Normalizes an HTML anchor / ID string.
 */
export function normalizeHtmlAnchor(input: string): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Validates if an anchor ID is unique among all blocks.
 */
export function validateUniqueAnchor(
  anchor: string,
  currentBlockId: string,
  allBlocks: BlockNode[] = []
): AnchorValidationResult {
  if (!anchor || !anchor.trim()) {
    return { unique: true };
  }

  const normalized = normalizeHtmlAnchor(anchor);
  const duplicate = allBlocks.find(
    (b) => b.id !== currentBlockId && b.anchor && normalizeHtmlAnchor(b.anchor) === normalized
  );

  if (duplicate) {
    return { unique: false, duplicateBlockId: duplicate.id };
  }

  return { unique: true };
}

// Disallowed attributes for security
const DISALLOWED_ATTR_PREFIXES = ["on", "javascript:"];
const DISALLOWED_ATTR_NAMES = ["srcdoc", "formaction"];

/**
 * Sanitizes an array of HTML attributes to prevent XSS and invalid markup.
 */
export function sanitizeHtmlAttributes(attrs: HTMLAttributeConfig[] = []): HTMLAttributeConfig[] {
  return attrs.filter((attr) => {
    if (!attr.name || !attr.name.trim()) return false;
    const lowerName = attr.name.trim().toLowerCase();
    
    // Block event handlers (onclick, onload, etc.)
    if (DISALLOWED_ATTR_PREFIXES.some((prefix) => lowerName.startsWith(prefix))) {
      return false;
    }

    if (DISALLOWED_ATTR_NAMES.includes(lowerName)) {
      return false;
    }

    return true;
  }).map((attr) => ({
    name: attr.name.trim(),
    value: attr.value ? attr.value.trim() : "",
  }));
}
