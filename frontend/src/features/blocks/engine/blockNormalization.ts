import type { BlockNode } from "../types/block.types";
import { getRegisteredBlockType } from "../registry/blockRegistry";

const MAX_NESTING_DEPTH = 50;

/**
 * XSS & HTML Sanitizer for Block Content and Attributes
 */
export function sanitizeHtmlContent(html: string): string {
  if (!html || typeof html !== "string") return "";
  let clean = html;

  // Strip dangerous tags like <script>, <iframe>, <object>, <embed>, <applet>, <form>, <base>
  clean = clean.replace(/<\s*(script|iframe|object|embed|applet|form|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  clean = clean.replace(/<\s*(script|iframe|object|embed|applet|form|base)[^>]*\/?\s*>/gi, "");

  // Strip event handlers (onload, onerror, onclick, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Strip dangerous URL schemes (javascript:, data:text/html, vbscript:)
  clean = clean.replace(/\s+(href|src|action)\s*=\s*["']?\s*(?:javascript|data\s*:\s*text\/html|vbscript)\s*:[^"'\s>]*/gi, "");

  return clean;
}

export function validateAndNormalizeFrontendBlock(
  block: BlockNode,
  visitedIds: Set<string> = new Set(),
  depth: number = 0
): { valid: boolean; errors: string[]; block: BlockNode } {
  const errors: string[] = [];

  if (!block || typeof block !== "object") {
    return {
      valid: false,
      errors: ["Invalid block object"],
      block: { id: `block-${Date.now()}`, name: "core/paragraph", attributes: {} },
    };
  }

  if (depth > MAX_NESTING_DEPTH) {
    return {
      valid: false,
      errors: [`Max nesting depth of ${MAX_NESTING_DEPTH} exceeded`],
      block,
    };
  }

  const blockId = block.id || `block-${Math.random().toString(36).substring(2, 9)}`;

  if (visitedIds.has(blockId)) {
    return {
      valid: false,
      errors: [`Circular reference or duplicate block ID: ${blockId}`],
      block,
    };
  }
  visitedIds.add(blockId);

  const blockDef = getRegisteredBlockType(block.name);
  const rawAttrs = block.attributes || {};
  const sanitizedAttrs: Record<string, any> = {};

  // Fill default attributes from schema if missing
  if (blockDef?.attributes) {
    for (const [attrKey, schema] of Object.entries(blockDef.attributes)) {
      if (rawAttrs[attrKey] === undefined && schema.default !== undefined) {
        sanitizedAttrs[attrKey] = schema.default;
      }
    }
  }

  // Process and sanitize passed attributes
  for (const [key, val] of Object.entries(rawAttrs)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      errors.push(`Disallowed key ${key}`);
      continue;
    }
    if (typeof val === "string") {
      sanitizedAttrs[key] = sanitizeHtmlContent(val);
    } else {
      sanitizedAttrs[key] = val;
    }
  }

  const normalizedInnerBlocks: BlockNode[] = [];
  if (Array.isArray(block.innerBlocks)) {
    for (const inner of block.innerBlocks) {
      const res = validateAndNormalizeFrontendBlock(inner, new Set(visitedIds), depth + 1);
      if (!res.valid) {
        errors.push(...res.errors);
      }
      normalizedInnerBlocks.push(res.block);
    }
  }

  const normalizedBlock: BlockNode = {
    ...block,
    id: blockId,
    name: block.name.startsWith("core/") ? block.name : `core/${block.name}`,
    attributes: sanitizedAttrs,
    innerBlocks: normalizedInnerBlocks,
    className: block.className ? sanitizeHtmlContent(block.className) : undefined,
    anchor: block.anchor ? sanitizeHtmlContent(block.anchor) : undefined,
  };

  return {
    valid: errors.length === 0,
    errors,
    block: normalizedBlock,
  };
}
