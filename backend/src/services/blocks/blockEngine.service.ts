import crypto from "crypto";

export interface BlockBindingConfig {
  provider: "static" | "site" | "post" | "user" | "media" | "custom_field" | string;
  key?: string;
  field?: string;
  defaultValue?: any;
  metaKey?: string;
}

export interface BlockNode {
  id: string;
  name: string; // e.g. "core/paragraph", "core/heading", "core/image", "core/button"
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

export interface BlockValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedBlock?: BlockNode;
}

export interface BindingProviderContext {
  site?: { name?: string; description?: string; url?: string };
  post?: { id?: string; title?: string; slug?: string; date?: string; excerpt?: string; author?: string };
  user?: { id?: string; name?: string; email?: string; avatarUrl?: string };
  media?: Record<string, string>;
  customFields?: Record<string, any>;
}

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

/**
 * Validates and normalizes a single BlockNode and recursively its innerBlocks.
 */
export function validateAndNormalizeBlock(
  block: BlockNode,
  visitedIds: Set<string> = new Set(),
  depth: number = 0
): BlockValidationResult {
  const errors: string[] = [];

  if (!block || typeof block !== "object") {
    return { valid: false, errors: ["Invalid block object provided."] };
  }

  if (depth > MAX_NESTING_DEPTH) {
    return { valid: false, errors: [`Maximum block nesting depth of ${MAX_NESTING_DEPTH} exceeded.`] };
  }

  if (!block.id || typeof block.id !== "string") {
    errors.push("Block missing valid 'id'.");
  } else if (visitedIds.has(block.id)) {
    return { valid: false, errors: [`Circular reference or duplicate block ID detected: ${block.id}`] };
  } else {
    visitedIds.add(block.id);
  }

  if (!block.name || typeof block.name !== "string") {
    errors.push("Block missing valid 'name'.");
  }

  const rawAttrs = block.attributes || {};
  const sanitizedAttrs: Record<string, any> = {};

  for (const [key, val] of Object.entries(rawAttrs)) {
    if (typeof val === "string") {
      sanitizedAttrs[key] = sanitizeHtmlContent(val);
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      // Prevent prototype pollution
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        errors.push(`Disallowed attribute key '${key}' detected.`);
        continue;
      }
      sanitizedAttrs[key] = val;
    } else {
      sanitizedAttrs[key] = val;
    }
  }

  const sanitizedInnerBlocks: BlockNode[] = [];
  if (Array.isArray(block.innerBlocks)) {
    for (const inner of block.innerBlocks) {
      const res = validateAndNormalizeBlock(inner, new Set(visitedIds), depth + 1);
      if (!res.valid) {
        errors.push(...res.errors);
      } else if (res.sanitizedBlock) {
        sanitizedInnerBlocks.push(res.sanitizedBlock);
      }
    }
  }

  const sanitizedBlock: BlockNode = {
    ...block,
    attributes: sanitizedAttrs,
    innerBlocks: sanitizedInnerBlocks,
    className: block.className ? sanitizeHtmlContent(block.className) : undefined,
    anchor: block.anchor ? sanitizeHtmlContent(block.anchor) : undefined,
  };

  return {
    valid: errors.length === 0,
    errors,
    sanitizedBlock,
  };
}

/**
 * Resolves dynamic data bindings on block attributes based on provider context.
 */
export function resolveBlockBindings(
  block: BlockNode,
  providerContext: BindingProviderContext
): BlockNode {
  if (!block.bindings || Object.keys(block.bindings).length === 0) {
    return block;
  }

  const resolvedAttributes = { ...block.attributes };

  for (const [attrName, binding] of Object.entries(block.bindings)) {
    let value: any = undefined;

    switch (binding.provider) {
      case "static":
        value = binding.defaultValue;
        break;

      case "site": {
        const key = binding.field || binding.key;
        if (key && providerContext.site) {
          value = (providerContext.site as any)[key];
        }
        break;
      }

      case "post": {
        const key = binding.field || binding.key;
        if (key && providerContext.post) {
          value = (providerContext.post as any)[key];
        }
        break;
      }

      case "user": {
        const key = binding.field || binding.key;
        if (key && providerContext.user) {
          value = (providerContext.user as any)[key];
        }
        break;
      }

      case "media": {
        const key = binding.field || binding.key;
        if (key && providerContext.media) {
          value = providerContext.media[key];
        }
        break;
      }

      case "custom_field": {
        const key = binding.metaKey || binding.field || binding.key;
        if (key && providerContext.customFields) {
          value = providerContext.customFields[key];
        }
        break;
      }

      default:
        value = binding.defaultValue;
        break;
    }

    if (value !== undefined) {
      resolvedAttributes[attrName] = value;
    }
  }

  return {
    ...block,
    attributes: resolvedAttributes,
  };
}

/**
 * Resolves block context inheritance from parent block down to child blocks.
 */
export function resolveBlockContext(
  block: BlockNode,
  inheritedContext: Record<string, any> = {}
): BlockNode {
  const currentContext = { ...inheritedContext, ...(block.context || {}) };

  const processedInnerBlocks = (block.innerBlocks || []).map((inner) =>
    resolveBlockContext(inner, currentContext)
  );

  return {
    ...block,
    context: currentContext,
    innerBlocks: processedInnerBlocks,
  };
}

/**
 * Executes a block transformation between compatible block types.
 */
export function transformBlock(
  block: BlockNode,
  targetType: string
): { success: boolean; transformedBlock?: BlockNode; error?: string } {
  if (!block || block.name === targetType) {
    return { success: true, transformedBlock: block };
  }

  const attrs = block.attributes || {};

  switch (`${block.name}->${targetType}`) {
    case "core/paragraph->core/heading":
      return {
        success: true,
        transformedBlock: {
          ...block,
          name: "core/heading",
          attributes: {
            content: attrs.content || "",
            level: attrs.level || 2,
            textAlign: attrs.align || attrs.textAlign || "left",
          },
        },
      };

    case "core/heading->core/paragraph":
      return {
        success: true,
        transformedBlock: {
          ...block,
          name: "core/paragraph",
          attributes: {
            content: attrs.content || "",
            align: attrs.textAlign || attrs.align || "left",
          },
        },
      };

    case "core/paragraph->core/list": {
      const content = attrs.content || "";
      const items = content
        .split("\n")
        .map((str: string) => str.trim())
        .filter(Boolean);
      return {
        success: true,
        transformedBlock: {
          ...block,
          name: "core/list",
          attributes: {
            ordered: false,
            values: items.length > 0 ? items : [content],
          },
        },
      };
    }

    case "core/image->core/media":
      return {
        success: true,
        transformedBlock: {
          ...block,
          name: "core/media",
          attributes: {
            url: attrs.url || attrs.src || "",
            alt: attrs.alt || "",
            caption: attrs.caption || "",
            mediaType: "image",
          },
        },
      };

    case "core/button->core/link":
      return {
        success: true,
        transformedBlock: {
          ...block,
          name: "core/link",
          attributes: {
            url: attrs.url || attrs.href || "#",
            text: attrs.text || attrs.content || "Link",
            target: attrs.linkTarget || "_self",
          },
        },
      };

    case "core/group->core/container":
    case "core/container->core/group":
      return {
        success: true,
        transformedBlock: {
          ...block,
          name: targetType,
          attributes: {
            ...attrs,
          },
        },
      };

    default:
      return {
        success: false,
        error: `Unsupported block transformation from '${block.name}' to '${targetType}'.`,
      };
  }
}

/**
 * Serializes BlockNode tree to WordPress Gutenberg block comment markup.
 */
export function serializeBlockToGutenberg(block: BlockNode): string {
  if (!block || !block.name) return "";

  const name = block.name.startsWith("core/") ? block.name : `core/${block.name}`;
  const wpBlockName = name.replace(/^core\//, "wp:");
  const blockSlug = name.replace(/^core\//, "");

  const attrs = { ...block.attributes };
  if (block.className) attrs.className = block.className;
  if (block.anchor) attrs.anchor = block.anchor;
  if (block.style) attrs.style = block.style;

  const hasAttrs = Object.keys(attrs).length > 0;
  const attrJson = hasAttrs ? ` ${JSON.stringify(attrs)}` : "";

  const hasInner = Array.isArray(block.innerBlocks) && block.innerBlocks.length > 0;
  const innerMarkup = hasInner
    ? block.innerBlocks!.map(serializeBlockToGutenberg).join("\n\n")
    : "";

  let innerHTML = attrs.content || attrs.innerHTML || "";
  if (!innerHTML && block.name === "core/paragraph") {
    innerHTML = `<p>${sanitizeHtmlContent(attrs.content || "")}</p>`;
  } else if (!innerHTML && block.name === "core/heading") {
    const level = attrs.level || 2;
    innerHTML = `<h${level}>${sanitizeHtmlContent(attrs.content || "")}</h${level}>`;
  }

  if (!innerHTML && !hasInner) {
    return `<!-- wp:${blockSlug}${attrJson} /-->`;
  }

  if (hasInner && innerMarkup) {
    if (innerHTML.includes("</div>")) {
      innerHTML = innerHTML.replace("</div>", `\n${innerMarkup}\n</div>`);
    } else {
      innerHTML = `${innerHTML}\n${innerMarkup}`;
    }
  }

  return `<!-- wp:${blockSlug}${attrJson} -->\n${innerHTML}\n<!-- /wp:${blockSlug} -->`;
}
