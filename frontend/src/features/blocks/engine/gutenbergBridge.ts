import type { BlockNode } from "../types/block.types";
import { sanitizeHtmlContent } from "./blockNormalization";
import { buildGutenbergStyleObject } from "./blockStyleEngine";

/**
 * Serializes canonical BlockNode tree to WordPress Gutenberg comment markup.
 */
export function serializeBlockToGutenbergMarkup(block: BlockNode): string {
  if (!block || !block.name) return "";

  const name = block.name.startsWith("core/") ? block.name : `core/${block.name}`;
  const blockSlug = name.replace(/^core\//, "");

  const attrs = { ...block.attributes };
  if (block.className) attrs.className = block.className;
  if (block.anchor) attrs.anchor = block.anchor;
  
  const gutenbergStyleObj = buildGutenbergStyleObject(block);
  if (Object.keys(gutenbergStyleObj).length > 0 || block.style) {
    attrs.style = {
      ...(block.style || {}),
      ...gutenbergStyleObj,
    };
  }

  const hasAttrs = Object.keys(attrs).length > 0;
  const attrJson = hasAttrs ? ` ${JSON.stringify(attrs)}` : "";

  const hasInner = Array.isArray(block.innerBlocks) && block.innerBlocks.length > 0;
  const innerMarkup = hasInner
    ? block.innerBlocks!.map(serializeBlockToGutenbergMarkup).join("\n\n")
    : "";

  let innerHTML = attrs.content || attrs.innerHTML || "";
  if (!innerHTML && block.name === "core/paragraph") {
    innerHTML = `<p>${sanitizeHtmlContent(attrs.content || "")}</p>`;
  } else if (!innerHTML && block.name === "core/heading") {
    const level = attrs.level || 2;
    innerHTML = `<h${level}>${sanitizeHtmlContent(attrs.content || "")}</h${level}>`;
  } else if (!innerHTML && block.name === "core/image") {
    const src = attrs.url || attrs.src || "";
    const alt = sanitizeHtmlContent(attrs.alt || "");
    const srcset = attrs.srcset ? ` srcset="${sanitizeHtmlContent(attrs.srcset)}"` : "";
    const sizes = attrs.sizes ? ` sizes="${sanitizeHtmlContent(attrs.sizes)}"` : "";
    const loading = attrs.loading || "lazy";
    innerHTML = `<figure class="wp-block-image"><img src="${sanitizeHtmlContent(src)}" alt="${alt}"${srcset}${sizes} loading="${loading}"/></figure>`;
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

/**
 * Parses WordPress Gutenberg comment markup into BlockNode tree.
 */
export function parseGutenbergMarkupToBlocks(markup: string): BlockNode[] {
  if (!markup || typeof markup !== "string") return [];

  const blocks: BlockNode[] = [];
  const selfClosingRegex = /<!--\s+wp:([a-z0-9\/\-]+)\s*({.*?})?\s*\/-->/gi;
  const blockRegex = /<!--\s+wp:([a-z0-9\/\-]+)\s*({.*?})?\s*-->([\s\S]*?)<!--\s+\/wp:\1\s*-->/gi;

  let match: RegExpExecArray | null;

  // Simple parser for standard blocks
  while ((match = blockRegex.exec(markup)) !== null) {
    const rawName = match[1];
    const rawJson = match[2];
    const innerContent = match[3];

    let attributes: Record<string, any> = {};
    if (rawJson) {
      try {
        attributes = JSON.parse(rawJson);
      } catch (e) {
        attributes = {};
      }
    }

    const name = rawName.includes("/") ? rawName : `core/${rawName}`;

    blocks.push({
      id: `block-${Math.random().toString(36).substring(2, 9)}`,
      name,
      attributes: {
        ...attributes,
        content: attributes.content || innerContent.replace(/<[^>]+>/g, "").trim(),
      },
    });
  }

  if (blocks.length === 0) {
    // Check self closing blocks
    while ((match = selfClosingRegex.exec(markup)) !== null) {
      const rawName = match[1];
      const rawJson = match[2];

      let attributes: Record<string, any> = {};
      if (rawJson) {
        try {
          attributes = JSON.parse(rawJson);
        } catch (e) {
          attributes = {};
        }
      }

      const name = rawName.includes("/") ? rawName : `core/${rawName}`;

      blocks.push({
        id: `block-${Math.random().toString(36).substring(2, 9)}`,
        name,
        attributes,
      });
    }
  }

  return blocks;
}
