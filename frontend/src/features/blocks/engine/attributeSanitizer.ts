import type { HTMLAttributeConfig, BlockNode } from "../types/block.types";

/**
 * Validates and cleans CSS class names.
 * Ensures class names contain only valid characters [a-zA-Z0-9_-] and prevents injection.
 */
export function validateAndCleanCssClasses(classNames: string): { valid: boolean; cleaned: string; errors: string[] } {
  if (!classNames || typeof classNames !== "string") {
    return { valid: true, cleaned: "", errors: [] };
  }

  const errors: string[] = [];
  const rawClasses = classNames.trim().split(/\s+/);
  const cleanedList: string[] = [];

  for (const cls of rawClasses) {
    if (!cls) continue;

    // Check for dangerous injection characters like quotes, brackets, semicolons, HTML tags
    if (/[<>{};"'\(\)]/.test(cls)) {
      errors.push(`Invalid character in class name "${cls}". Injection symbols rejected.`);
      continue;
    }

    // Standard CSS class pattern
    const cleanCls = cls.replace(/[^a-zA-Z0-9_\-]/g, "");
    if (cleanCls) {
      cleanedList.push(cleanCls);
    }
  }

  return {
    valid: errors.length === 0,
    cleaned: Array.from(new Set(cleanedList)).join(" "),
    errors,
  };
}

/**
 * Normalizes HTML anchor ID into valid URL slug (e.g. "#My Section!" -> "my-section").
 */
export function normalizeHtmlAnchor(anchor: string): string {
  if (!anchor || typeof anchor !== "string") return "";
  let clean = anchor.trim();
  clean = clean.replace(/^#+/, "");
  clean = clean
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean;
}

/**
 * Validates that an anchor ID is unique across a tree of blocks.
 */
export function validateUniqueAnchor(
  anchor: string,
  currentBlockId: string,
  allBlocks: BlockNode[]
): { unique: boolean; duplicateBlockId?: string } {
  const normalized = normalizeHtmlAnchor(anchor);
  if (!normalized) return { unique: true };

  const checkTree = (nodes: BlockNode[]): string | null => {
    for (const node of nodes) {
      if (node.id !== currentBlockId && node.anchor && normalizeHtmlAnchor(node.anchor) === normalized) {
        return node.id;
      }
      if (node.innerBlocks && node.innerBlocks.length > 0) {
        const found = checkTree(node.innerBlocks);
        if (found) return found;
      }
    }
    return null;
  };

  const duplicateId = checkTree(allBlocks);
  return {
    unique: !duplicateId,
    duplicateBlockId: duplicateId || undefined,
  };
}

/**
 * Whitelisted safe HTML attribute prefixes and names.
 */
const SAFE_ATTRIBUTE_PREFIXES = ["aria-", "data-"];
const SAFE_ATTRIBUTE_NAMES = new Set([
  "title",
  "role",
  "dir",
  "lang",
  "tabindex",
  "rel",
  "target",
  "download",
  "alt",
  "type",
]);

/**
 * Strict sanitizer for additional HTML attributes (F-531).
 * Blocks event handlers, javascript: URLs, and unsafe DOM attributes.
 */
export function sanitizeHtmlAttributes(attrs: HTMLAttributeConfig[]): HTMLAttributeConfig[] {
  if (!Array.isArray(attrs)) return [];

  const safeAttrs: HTMLAttributeConfig[] = [];

  for (const attr of attrs) {
    if (!attr || !attr.name) continue;
    const name = attr.name.trim().toLowerCase();
    const value = String(attr.value || "").trim();

    // 1. Explicitly block event handlers (onclick, onload, onerror, etc.)
    if (name.startsWith("on")) continue;

    // 2. Explicitly block dangerous DOM attributes
    if (["srcdoc", "innerhtml", "outerhtml", "formaction", "action", "href"].includes(name)) continue;

    // 3. Block javascript: or data:text/html URLs in values
    if (/javascript\s*:/i.test(value) || /data\s*:\s*text\/html/i.test(value)) continue;

    // 4. Verify attribute name against whitelist or safe prefixes (aria-*, data-*)
    const isSafeName =
      SAFE_ATTRIBUTE_NAMES.has(name) ||
      SAFE_ATTRIBUTE_PREFIXES.some((prefix) => name.startsWith(prefix));

    if (!isSafeName) continue;

    // Clean value
    const cleanValue = value.replace(/[<>{}]/g, "");

    safeAttrs.push({
      name,
      value: cleanValue,
    });
  }

  return safeAttrs;
}
