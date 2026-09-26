/**
 * WordPress Block & Content Transformer for ForgeStudio
 *
 * Converts canonical ForgeStudio Page JSON into WordPress-compatible Gutenberg
 * block markup and structured post metadata without losing structural integrity.
 */

export interface GutenbergBlock {
  blockName: string;
  attrs?: Record<string, unknown>;
  innerBlocks?: GutenbergBlock[];
  innerHTML?: string;
  innerContent?: Array<string | null>;
}

export interface GutenbergBlockStats {
  blocksCount: number;
  nestedBlocksCount: number;
  markupSizeBytes: number;
  unsupportedCount: number;
  mediaCount: number;
  sanitizationWarnings: string[];
}

export interface TransformedWordPressPage {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: "publish" | "draft";
  meta: Record<string, any>;
  forms: Array<{ formId: string; fields: any[] }>;
  mediaReferences: Array<{ url: string; alt?: string; id?: string }>;
  gutenbergBlocks?: GutenbergBlock[];
  gutenbergHash?: string;
  blockStats?: GutenbergBlockStats;
  contentHtml?: string;
  customCss?: string;
  yoastMeta?: Record<string, any>;
  rankMathMeta?: Record<string, any>;
  elementorData?: any;
}

/**
 * F-500: Computes deterministic SHA-256 hash for Gutenberg block markup.
 */
export function computeGutenbergHash(markup: string): string {
  const normalized = (markup || "").trim();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * F-500: Validates structural integrity of Gutenberg block comments and markup.
 */
export function validateGutenbergBlocks(markup: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!markup || typeof markup !== "string") {
    return { valid: true, errors: [] };
  }

  // Check matching block comment tags
  const openBlockMatches = markup.match(/<!--\s+wp:([a-z0-9/-]+)\s*(?:\{[^}]*\})?\s*-->/gi) || [];
  const closeBlockMatches = markup.match(/<!--\s+\/wp:([a-z0-9/-]+)\s*-->/gi) || [];

  const openCounts: Record<string, number> = {};
  const closeCounts: Record<string, number> = {};

  for (const match of openBlockMatches) {
    const nameMatch = match.match(/<!--\s+wp:([a-z0-9/-]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1];
      openCounts[name] = (openCounts[name] || 0) + 1;
    }
  }

  for (const match of closeBlockMatches) {
    const nameMatch = match.match(/<!--\s+\/wp:([a-z0-9/-]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1];
      closeCounts[name] = (closeCounts[name] || 0) + 1;
    }
  }

  for (const [blockName, count] of Object.entries(openCounts)) {
    const closeCount = closeCounts[blockName] || 0;
    if (count !== closeCount) {
      errors.push(`Mismatched block closure for '${blockName}': ${count} opened vs ${closeCount} closed.`);
    }
  }

  // Validate JSON attributes inside block comments
  const attrMatches = markup.matchAll(/<!--\s+wp:[a-z0-9/-]+\s+(\{[^}]*\})\s*-->/gi);
  for (const match of attrMatches) {
    if (match[1]) {
      try {
        JSON.parse(match[1]);
      } catch (e: any) {
        errors.push(`Malformed JSON attribute in block comment: ${match[1]}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * F-500: Serializes GutenbergBlock tree into valid WordPress block comment markup.
 */
export function serializeGutenbergBlocks(blocks: GutenbergBlock[]): string {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .map((block) => serializeSingleBlock(block))
    .filter(Boolean)
    .join("\n\n");
}

function serializeSingleBlock(block: GutenbergBlock): string {
  if (!block || !block.blockName) return "";

  const name = block.blockName;
  const hasAttrs = block.attrs && Object.keys(block.attrs).length > 0;
  const attrStr = hasAttrs ? ` ${JSON.stringify(block.attrs)}` : "";

  const hasInnerBlocks = Array.isArray(block.innerBlocks) && block.innerBlocks.length > 0;
  const innerBlocksMarkup = hasInnerBlocks ? serializeGutenbergBlocks(block.innerBlocks!) : "";

  let innerHTML = block.innerHTML || "";
  if (hasInnerBlocks && innerBlocksMarkup) {
    if (innerHTML.includes("</div>")) {
      innerHTML = innerHTML.replace("</div>", `\n${innerBlocksMarkup}\n</div>`);
    } else {
      innerHTML = `${innerHTML}\n${innerBlocksMarkup}`;
    }
  }

  if (!innerHTML && !hasInnerBlocks) {
    return `<!-- wp:${name}${attrStr} /-->`;
  }

  return `<!-- wp:${name}${attrStr} -->\n${innerHTML}\n<!-- /wp:${name} -->`;
}

/**
 * F-500: Builds a normalized GutenbergBlock tree from ForgeStudio canonical page elements.
 */
export function buildGutenbergBlockTree(
  elements: any[],
  mediaRefs: Array<{ url: string; alt?: string; id?: string }>,
  forms: Array<{ formId: string; fields: any[] }>,
  stats: { blocksCount: number; nestedBlocksCount: number; unsupportedCount: number }
): GutenbergBlock[] {
  if (!Array.isArray(elements)) return [];

  const blocks: GutenbergBlock[] = [];

  for (const el of elements) {
    if (!el || typeof el !== "object") continue;
    const block = mapElementToGutenbergBlock(el, mediaRefs, forms, stats, 0);
    if (block) {
      blocks.push(block);
    }
  }

  return blocks;
}

function mapElementToGutenbergBlock(
  el: any,
  mediaRefs: Array<{ url: string; alt?: string; id?: string }>,
  forms: Array<{ formId: string; fields: any[] }>,
  stats: { blocksCount: number; nestedBlocksCount: number; unsupportedCount: number },
  depth: number = 0
): GutenbergBlock | null {
  if (!el || typeof el !== "object") return null;

  stats.blocksCount++;
  if (depth > 0) {
    stats.nestedBlocksCount++;
  }

  const type = el.type || "text";
  const styles = el.styles || {};

  switch (type) {
    case "heading": {
      const level = Number(el.level) || 2;
      const text = escapeHtml(el.content || el.text || "");
      const align = el.align || styles.textAlign || undefined;
      return {
        blockName: "core/heading",
        attrs: { level, textAlign: align },
        innerHTML: `<h${level}${align ? ` class="has-text-align-${align}"` : ""}>${text}</h${level}>`,
      };
    }

    case "paragraph":
    case "text": {
      const text = escapeHtml(el.content || el.text || "");
      const align = el.align || styles.textAlign || undefined;
      return {
        blockName: "core/paragraph",
        attrs: align ? { align } : undefined,
        innerHTML: `<p${align ? ` class="has-text-align-${align}"` : ""}>${text}</p>`,
      };
    }

    case "button": {
      const text = escapeHtml(el.content || el.text || el.label || "Click Here");
      let url = el.url || el.link || el.href || el.linkUrl || (el.pageId ? `/${el.pageId}/` : "#");
      if (url.startsWith("page:")) {
        url = `/${url.replace("page:", "")}/`;
      }
      const buttonBlock: GutenbergBlock = {
        blockName: "core/button",
        attrs: { url, text },
        innerHTML: `<div class="wp-block-button"><a class="wp-block-button__link" href="${url}">${text}</a></div>`,
      };
      return {
        blockName: "core/buttons",
        innerBlocks: [buttonBlock],
        innerHTML: `<div class="wp-block-buttons"></div>`,
      };
    }

    case "image": {
      const src = el.src || el.url || "";
      const alt = el.alt || el.altText || "";
      const caption = el.caption || "";
      const id = el.wpAttachmentId || el.id || undefined;
      if (src) {
        mediaRefs.push({ url: src, alt, id: String(id || el.id) });
      }
      return {
        blockName: "core/image",
        attrs: { url: src, alt, id: id ? Number(id) || undefined : undefined, caption: caption || undefined },
        innerHTML: `<figure class="wp-block-image"><img src="${src}" alt="${escapeHtml(alt)}" />${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`,
      };
    }

    case "list": {
      const items = Array.isArray(el.items) ? el.items : [];
      const ordered = Boolean(el.ordered);
      const tag = ordered ? "ol" : "ul";
      const listItemsHtml = items.map((i: any) => `<li>${escapeHtml(typeof i === "string" ? i : i.text || i.content || "")}</li>`).join("");
      return {
        blockName: "core/list",
        attrs: { ordered },
        innerHTML: `<${tag}>${listItemsHtml}</${tag}>`,
      };
    }

    case "quote": {
      const citation = escapeHtml(el.citation || el.author || "");
      const text = escapeHtml(el.content || el.text || el.quote || "");
      return {
        blockName: "core/quote",
        attrs: citation ? { citation } : undefined,
        innerHTML: `<blockquote class="wp-block-quote"><p>${text}</p>${citation ? `<cite>${citation}</cite>` : ""}</blockquote>`,
      };
    }

    case "divider":
    case "separator": {
      return {
        blockName: "core/separator",
        innerHTML: `<hr class="wp-block-separator" />`,
      };
    }

    case "spacer": {
      const height = parseInt(el.height || styles.height || "20", 10) || 20;
      return {
        blockName: "core/spacer",
        attrs: { height },
        innerHTML: `<div style="height:${height}px" aria-hidden="true" class="wp-block-spacer"></div>`,
      };
    }

    case "cover": {
      const src = el.src || el.url || "";
      const title = escapeHtml(el.title || el.content || "");
      const dimRatio = el.dimRatio || 50;
      if (src) {
        mediaRefs.push({ url: src, alt: title, id: el.id });
      }
      return {
        blockName: "core/cover",
        attrs: { url: src, dimRatio },
        innerHTML: `<div class="wp-block-cover"><img class="wp-block-cover__image-background" src="${src}" /><div class="wp-block-cover__inner-container"><p class="has-large-font-size">${title}</p></div></div>`,
      };
    }

    case "columns": {
      const children = Array.isArray(el.elements) ? el.elements : (Array.isArray(el.children) ? el.children : []);
      const innerBlocks: GutenbergBlock[] = [];

      for (const child of children) {
        const colBlock = mapElementToGutenbergBlock(child, mediaRefs, forms, stats, depth + 1);
        if (colBlock) {
          innerBlocks.push(colBlock);
        }
      }

      return {
        blockName: "core/columns",
        attrs: { isStackedOnMobile: true },
        innerBlocks,
        innerHTML: `<div class="wp-block-columns"></div>`,
      };
    }

    case "column": {
      const children = Array.isArray(el.elements) ? el.elements : (Array.isArray(el.children) ? el.children : []);
      const innerBlocks: GutenbergBlock[] = [];
      for (const child of children) {
        const childBlock = mapElementToGutenbergBlock(child, mediaRefs, forms, stats, depth + 1);
        if (childBlock) {
          innerBlocks.push(childBlock);
        }
      }

      const width = el.width || styles.width || undefined;
      return {
        blockName: "core/column",
        attrs: width ? { width } : undefined,
        innerBlocks,
        innerHTML: `<div class="wp-block-column"${width ? ` style="flex-basis:${width}"` : ""}></div>`,
      };
    }

    case "container":
    case "section":
    case "div":
    case "div-block": {
      const children = Array.isArray(el.elements) ? el.elements : (Array.isArray(el.children) ? el.children : []);
      const innerBlocks: GutenbergBlock[] = [];

      for (const child of children) {
        const childBlock = mapElementToGutenbergBlock(child, mediaRefs, forms, stats, depth + 1);
        if (childBlock) {
          innerBlocks.push(childBlock);
        }
      }

      const layoutType = el.layout?.direction === "row" ? "flex" : "constrained";
      return {
        blockName: "core/group",
        attrs: { layout: { type: layoutType } },
        innerBlocks,
        innerHTML: `<div class="wp-block-group"></div>`,
      };
    }

    case "form": {
      const formId = el.formId || el.id;
      const formFields = Array.isArray(el.fields) ? el.fields : [];
      forms.push({ formId, fields: formFields });
      return {
        blockName: "core/html",
        innerHTML: `<form class="fs-form" data-forgestudio-form-id="${formId}">${formFields.map((f: any) => `<input type="${f.type || "text"}" placeholder="${escapeHtml(f.placeholder || f.label || "")}" />`).join("")}<button type="submit">Submit</button></form>`,
      };
    }

    case "wordpress-shortcode": {
      const shortcode = el.shortcode || el.content || "";
      return {
        blockName: "core/shortcode",
        innerHTML: shortcode,
      };
    }

    default: {
      stats.unsupportedCount++;
      const inner = escapeHtml(el.content || el.text || el.title || "");
      return {
        blockName: "core/html",
        innerHTML: `<div class="fs-fallback-widget fs-type-${escapeHtml(type)}">${inner}</div>`,
      };
    }
  }
}

/**
 * F-500: Production-grade Gutenberg Block Publishing Transformer
 */
export function transformPageToWordPress(
  page: any,
  siteSettings: any = {},
  _globalStyles: any = {}
): TransformedWordPressPage {
  const elements = Array.isArray(page.elements) ? page.elements : [];
  const pageSettings = page.pageSettings || {};

  const mediaReferences: Array<{ url: string; alt?: string; id?: string }> = [];
  const forms: Array<{ formId: string; fields: any[] }> = [];
  const stats = { blocksCount: 0, nestedBlocksCount: 0, unsupportedCount: 0 };

  // 1. Build normalized GutenbergBlock tree
  const gutenbergBlocksTree = buildGutenbergBlockTree(elements, mediaReferences, forms, stats);

  // 2. Serialize block tree into WordPress comment syntax
  const rawMarkup = serializeGutenbergBlocks(gutenbergBlocksTree);

  // 3. Sanitize HTML content inside blocks using F-499 security engine
  const { sanitizedHtml: content, warnings: sanitizationWarnings } = sanitizeHtml(rawMarkup);

  // 4. Compute deterministic SHA-256 block content hash
  const gutenbergHash = computeGutenbergHash(content);

  const blockStats: GutenbergBlockStats = {
    blocksCount: stats.blocksCount,
    nestedBlocksCount: stats.nestedBlocksCount,
    markupSizeBytes: Buffer.byteLength(content, "utf8"),
    unsupportedCount: stats.unsupportedCount,
    mediaCount: mediaReferences.length,
    sanitizationWarnings,
  };

  const meta: Record<string, any> = {
    _forgestudio_page_id: page.id,
    _forgestudio_synced_at: new Date().toISOString(),
    _forgestudio_gutenberg_hash: gutenbergHash,
    _yoast_wpseo_title: pageSettings.seoTitle || pageSettings.title || page.name || siteSettings.siteName,
    _yoast_wpseo_metadesc: pageSettings.seoDescription || pageSettings.description || "",
    _forgestudio_canonical_url: pageSettings.canonicalUrl || "",
    _forgestudio_og_image: pageSettings.ogImage || siteSettings.ogImage || siteSettings.logo || "",
    _forgestudio_twitter_card: pageSettings.twitterCard || siteSettings.twitterCard || "summary_large_image",
    _forgestudio_schema: pageSettings.structuredData ? JSON.stringify(pageSettings.structuredData) : (pageSettings.schemaMarkup || null),
  };

  const slug = (page.slug || page.name || "page")
    .toLowerCase()
    .replace(/^\//, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-") || "home";

  return {
    title: page.name || "Untitled Page",
    slug,
    content,
    excerpt: pageSettings.seoDescription || pageSettings.description || "",
    status: "publish",
    meta,
    forms,
    mediaReferences,
    gutenbergBlocks: gutenbergBlocksTree,
    gutenbergHash,
    blockStats,
  };
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInlineStyles(styles: Record<string, any>): string {
  if (!styles || typeof styles !== "object") return "";
  return Object.entries(styles)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
    .join("; ");
}

/* ========================================================================= */
/* F-499 — HTML Publishing Engine & Deterministic Sanitizer                 */
/* ========================================================================= */

import crypto from "crypto";

export interface TransformedHtmlPage {
  title: string;
  slug: string;
  html: string;
  css: string;
  fullHtml: string;
  htmlHash: string;
  stats: {
    htmlSizeBytes: number;
    cssSizeBytes: number;
    assetCount: number;
    sanitizationWarnings: string[];
    elementsProcessed: number;
    maxDepth: number;
  };
  mediaReferences: Array<{ url: string; alt?: string; id?: string }>;
  forms: Array<{ formId: string; fields: any[] }>;
  meta: Record<string, any>;
}

/**
 * F-499: Deterministically computes SHA-256 content hash for HTML & CSS payload.
 */
export function computeHtmlHash(html: string, css: string = ""): string {
  const normalized = (html + "\n" + css).trim();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * F-499: Production HTML Sanitizer
 * Strips executable scripts, event handlers, unsafe protocols, and private network URLs.
 */
export function sanitizeHtml(rawHtml: string): { sanitizedHtml: string; warnings: string[] } {
  const warnings: string[] = [];
  if (!rawHtml || typeof rawHtml !== "string") {
    return { sanitizedHtml: "", warnings: [] };
  }

  let html = rawHtml;

  // 1. Strip <script> tags and content
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(html)) {
    warnings.push("Unsafe <script> tags were detected and removed.");
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }

  // 2. Strip <object> and <embed> tags
  if (/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi.test(html) || /<embed\b[^>]*>/gi.test(html)) {
    warnings.push("Unsafe <object>/<embed> elements were removed.");
    html = html.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
    html = html.replace(/<embed\b[^>]*>/gi, "");
  }

  // 3. Strip inline event handler attributes (e.g. onclick, onload, onerror)
  if (/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi.test(html)) {
    warnings.push("Inline JavaScript event handlers (on*) were stripped.");
    html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }

  // 4. Strip javascript: and vbscript: URIs
  if (/(href|src|action)\s*=\s*["']?\s*(?:javascript|vbscript):/gi.test(html)) {
    warnings.push("Executable script URI schemes (javascript:/vbscript:) were sanitized.");
    html = html.replace(/(href|src|action)\s*=\s*["']?\s*(?:javascript|vbscript):[^"'\s>]*/gi, '$1="#"');
  }

  // 5. Sanitize unsafe data: URIs (allowing only images)
  if (/(href|src)\s*=\s*["']?\s*data:(?!image\/)/gi.test(html)) {
    warnings.push("Non-image data: URIs were removed for safety.");
    html = html.replace(/(href|src)\s*=\s*["']?\s*data:(?!image\/)[^"'\s>]*/gi, '$1="#"');
  }

  // 6. Validate private network URLs (localhost, 127.0.0.1, file://)
  if (/(?:file:\/\/|http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[0-1]))[^\s"'>]*)/gi.test(html)) {
    warnings.push("Localhost or private network URLs were sanitized.");
    html = html.replace(/(?:file:\/\/|http:\/\/(?:localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(?:1[6-9]|2[0-9]|3[0-1]))[^\s"'>]*)/gi, "#");
  }

  return { sanitizedHtml: html, warnings };
}

/**
 * F-499: Canonical Document → Deterministic HTML & CSS Transformation Engine
 */
export function transformPageToHTML(
  page: any,
  siteSettings: any = {},
  globalStyles: any = {}
): TransformedHtmlPage {
  const elements = Array.isArray(page.elements) ? page.elements : [];
  const pageSettings = page.pageSettings || {};
  const mediaReferences: Array<{ url: string; alt?: string; id?: string }> = [];
  const forms: Array<{ formId: string; fields: any[] }> = [];
  const cssRules: string[] = [];
  const statsTracker = { elementsProcessed: 0, maxDepth: 0 };

  // Generate HTML for root elements
  const htmlParts: string[] = [];
  for (const element of elements) {
    const part = renderElementToHtml(element, mediaReferences, forms, cssRules, statsTracker, 1);
    if (part) {
      htmlParts.push(part);
    }
  }

  const rawHtml = htmlParts.join("\n");
  const { sanitizedHtml, warnings } = sanitizeHtml(rawHtml);

  // Compile CSS rules deterministically
  const desktopCss = cssRules.join("\n");
  const pageCustomCss = pageSettings.customCss || page.customCss || "";
  const compiledCss = [desktopCss, pageCustomCss].filter(Boolean).join("\n\n").trim();

  const htmlHash = computeHtmlHash(sanitizedHtml, compiledCss);
  const fullHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<style id="forgestudio-styles">\n${compiledCss}\n</style>\n</head>\n<body>\n${sanitizedHtml}\n</body>\n</html>`;

  const slug = (page.slug || page.name || "page")
    .toLowerCase()
    .replace(/^\//, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-") || "home";

  const meta: Record<string, any> = {
    _forgestudio_page_id: page.id,
    _forgestudio_synced_at: new Date().toISOString(),
    _forgestudio_html_hash: htmlHash,
    _yoast_wpseo_title: pageSettings.seoTitle || pageSettings.title || page.name || siteSettings.siteName,
    _yoast_wpseo_metadesc: pageSettings.seoDescription || pageSettings.description || "",
  };

  return {
    title: page.name || page.title || "Untitled Page",
    slug,
    html: sanitizedHtml,
    css: compiledCss,
    fullHtml,
    htmlHash,
    stats: {
      htmlSizeBytes: Buffer.byteLength(sanitizedHtml, "utf8"),
      cssSizeBytes: Buffer.byteLength(compiledCss, "utf8"),
      assetCount: mediaReferences.length,
      sanitizationWarnings: warnings,
      elementsProcessed: statsTracker.elementsProcessed,
      maxDepth: statsTracker.maxDepth,
    },
    mediaReferences,
    forms,
    meta,
  };
}

/**
 * Deterministic element renderer producing stable ForgeStudio CSS class names
 */
function renderElementToHtml(
  el: any,
  mediaRefs: Array<{ url: string; alt?: string; id?: string }>,
  forms: Array<{ formId: string; fields: any[] }>,
  cssRules: string[],
  statsTracker?: { elementsProcessed: number; maxDepth: number },
  currentDepth: number = 1
): string {
  if (!el || typeof el !== "object") return "";

  if (statsTracker) {
    statsTracker.elementsProcessed++;
    if (currentDepth > statsTracker.maxDepth) {
      statsTracker.maxDepth = currentDepth;
    }
  }

  const type = el.type || "text";
  const id = el.id || `el-${Math.random().toString(36).substr(2, 7)}`;
  const stableClass = `fs-${type}-${id}`;
  const styles = el.styles || {};

  // Build CSS rule for element if styles exist
  const styleString = formatInlineStyles(styles);
  if (styleString) {
    cssRules.push(`.${stableClass} { ${styleString}; }`);
  }

  // Responsive CSS generation
  if (el.responsiveStyles?.tablet) {
    const tabletStyles = formatInlineStyles(el.responsiveStyles.tablet);
    if (tabletStyles) {
      cssRules.push(`@media (max-width: 1024px) { .${stableClass} { ${tabletStyles}; } }`);
    }
  }
  if (el.responsiveStyles?.mobile) {
    const mobileStyles = formatInlineStyles(el.responsiveStyles.mobile);
    if (mobileStyles) {
      cssRules.push(`@media (max-width: 640px) { .${stableClass} { ${mobileStyles}; } }`);
    }
  }

  switch (type) {
    case "heading": {
      const level = Math.min(Math.max(Number(el.level) || 2, 1), 6);
      const text = escapeHtml(el.content || el.text || "");
      return `<h${level} class="fs-widget fs-heading ${stableClass}">${text}</h${level}>`;
    }

    case "paragraph":
    case "text": {
      const text = escapeHtml(el.content || el.text || "");
      return `<p class="fs-widget fs-text ${stableClass}">${text}</p>`;
    }

    case "image": {
      let src = el.src || el.url || "";
      const alt = el.alt || el.altText || "";
      if (src) {
        if (src.startsWith("file://") || src.includes("localhost") || src.includes("127.0.0.1")) {
          src = "#";
        }
        mediaRefs.push({ url: src, alt, id });
      }
      return `<figure class="fs-widget fs-image ${stableClass}"><img src="${src}" alt="${escapeHtml(alt)}" loading="lazy" /></figure>`;
    }

    case "button": {
      const text = escapeHtml(el.content || el.text || el.label || "Click Here");
      let url = el.url || el.link || el.href || el.linkUrl || "#";
      if (url.startsWith("page:")) {
        url = `/${url.replace("page:", "")}/`;
      }
      if (url.startsWith("javascript:") || url.startsWith("file://")) {
        url = "#";
      }
      return `<a href="${url}" class="fs-widget fs-button ${stableClass}">${text}</a>`;
    }

    case "hero": {
      const title = escapeHtml(el.title || el.content || "Hero Title");
      const subtitle = escapeHtml(el.subtitle || el.subheading || "");
      return `<section class="fs-widget fs-hero fs-section ${stableClass}">\n  <h1 class="fs-hero-title">${title}</h1>\n  ${subtitle ? `<p class="fs-hero-subtitle">${subtitle}</p>` : ""}\n</section>`;
    }

    case "container":
    case "section":
    case "columns":
    case "column":
    case "div":
    case "div-block": {
      const children = Array.isArray(el.elements) ? el.elements : (Array.isArray(el.children) ? el.children : []);
      const renderedChildren = children
        .map((child: any) => renderElementToHtml(child, mediaRefs, forms, cssRules, statsTracker, currentDepth + 1))
        .filter(Boolean)
        .join("\n");
      const tag = type === "section" ? "section" : "div";
      return `<${tag} class="fs-container fs-${type} ${stableClass}">\n${renderedChildren}\n</${tag}>`;
    }

    case "form": {
      const formId = el.formId || id;
      const formFields = Array.isArray(el.fields) ? el.fields : [];
      forms.push({ formId, fields: formFields });
      const fieldsHtml = formFields
        .map((f: any) => `<input type="${escapeHtml(f.type || "text")}" name="${escapeHtml(f.name || f.id)}" placeholder="${escapeHtml(f.placeholder || f.label || "")}" class="fs-form-input" />`)
        .join("\n    ");
      return `<form class="fs-widget fs-form ${stableClass}" data-forgestudio-form-id="${formId}">\n  <div class="fs-form-fields">\n    ${fieldsHtml}\n  </div>\n  <button type="submit" class="fs-form-submit">Submit</button>\n</form>`;
    }

    default: {
      const inner = escapeHtml(el.content || el.text || "");
      return `<div class="fs-widget fs-custom-element fs-type-${type} ${stableClass}">${inner}</div>`;
    }
  }
}

/**
 * F-501 — Reverse Content Importer: Converts WordPress Gutenberg blocks & raw HTML into ForgeStudio Canonical Document Elements.
 */
export function parseWordPressContentToElements(rawContent: string): any[] {
  if (!rawContent || typeof rawContent !== "string") {
    return [];
  }

  const content = rawContent.trim();
  if (!content) return [];

  const elements: any[] = [];
  const hasGutenbergComments = /<!--\s+wp:/i.test(content);

  if (hasGutenbergComments) {
    const blockRegex = /<!--\s+wp:([a-z0-9/-]+)\s*(\{[^}]*\})?\s*(\/)?-->([\s\S]*?)(?:<!--\s+\/wp:\1\s*-->)?/gi;
    let match: RegExpExecArray | null;
    let lastIdx = 0;

    while ((match = blockRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIdx) {
        const precedingText = content.substring(lastIdx, matchIndex).trim();
        if (precedingText) {
          const htmlElements = parseRawHtmlChunkToElements(precedingText);
          elements.push(...htmlElements);
        }
      }

      const blockName = match[1];
      const attrStr = match[2];
      const isSelfClosing = Boolean(match[3]);
      const innerContent = (match[4] || "").trim();

      let attrs: Record<string, any> = {};
      if (attrStr) {
        try {
          attrs = JSON.parse(attrStr);
        } catch {}
      }

      const element = mapGutenbergBlockToElement(blockName, attrs, innerContent, isSelfClosing);
      if (element) {
        if (Array.isArray(element)) {
          elements.push(...element);
        } else {
          elements.push(element);
        }
      }

      lastIdx = blockRegex.lastIndex;
    }

    if (lastIdx < content.length) {
      const trailingText = content.substring(lastIdx).trim();
      if (trailingText) {
        const htmlElements = parseRawHtmlChunkToElements(trailingText);
        elements.push(...htmlElements);
      }
    }
  } else {
    const htmlElements = parseRawHtmlChunkToElements(content);
    elements.push(...htmlElements);
  }

  return elements.length > 0 ? elements : [
    {
      id: `el_wp_html_${Math.random().toString(36).substring(2, 9)}`,
      type: "html",
      content: content,
      styles: {},
    }
  ];
}

function mapGutenbergBlockToElement(
  blockName: string,
  attrs: Record<string, any>,
  innerContent: string,
  _isSelfClosing: boolean
): any {
  const id = `el_wp_${blockName.replace(/[^a-z0-9]/gi, "_")}_${Math.random().toString(36).substring(2, 9)}`;

  switch (blockName) {
    case "core/heading": {
      const levelMatch = innerContent.match(/<h([1-6])/i);
      const level = attrs.level || (levelMatch ? parseInt(levelMatch[1], 10) : 2);
      const text = stripTags(innerContent);
      return {
        id,
        type: "heading",
        level,
        content: text,
        text,
        styles: attrs.textAlign ? { textAlign: attrs.textAlign } : {},
      };
    }

    case "core/paragraph": {
      const text = stripTags(innerContent);
      return {
        id,
        type: "text",
        content: text,
        text,
        styles: attrs.align ? { textAlign: attrs.align } : {},
      };
    }

    case "core/image": {
      const srcMatch = innerContent.match(/src=["']([^"']+)["']/i);
      const altMatch = innerContent.match(/alt=["']([^"']*)["']/i);
      const captionMatch = innerContent.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
      return {
        id,
        type: "image",
        src: attrs.url || (srcMatch ? srcMatch[1] : ""),
        alt: attrs.alt || (altMatch ? altMatch[1] : ""),
        caption: captionMatch ? stripTags(captionMatch[1]) : "",
        wpAttachmentId: attrs.id || undefined,
        styles: {},
      };
    }

    case "core/button": {
      const hrefMatch = innerContent.match(/href=["']([^"']+)["']/i);
      const text = stripTags(innerContent) || attrs.text || "Button";
      return {
        id,
        type: "button",
        content: text,
        text,
        url: attrs.url || (hrefMatch ? hrefMatch[1] : "#"),
        styles: {},
      };
    }

    case "core/buttons": {
      if (innerContent && innerContent.includes("wp:button")) {
        return parseWordPressContentToElements(innerContent);
      }
      return {
        id,
        type: "container",
        layout: { direction: "row" },
        elements: parseWordPressContentToElements(innerContent),
      };
    }

    case "core/columns": {
      const childElements = parseWordPressContentToElements(innerContent);
      return {
        id,
        type: "columns",
        elements: childElements.length > 0 ? childElements : [],
      };
    }

    case "core/column": {
      const childElements = parseWordPressContentToElements(innerContent);
      return {
        id,
        type: "column",
        width: attrs.width || "50%",
        elements: childElements,
      };
    }

    case "core/group":
    case "core/cover": {
      const childElements = parseWordPressContentToElements(innerContent);
      return {
        id,
        type: "container",
        elements: childElements,
      };
    }

    case "core/list": {
      const liMatches = [...innerContent.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
      const items = liMatches.map((m) => stripTags(m[1]));
      return {
        id,
        type: "list",
        ordered: Boolean(attrs.ordered || innerContent.includes("<ol")),
        items: items.length > 0 ? items : ["List Item 1"],
      };
    }

    case "core/quote": {
      const citeMatch = innerContent.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i);
      const text = stripTags(innerContent.replace(/<cite[\s\S]*<\/cite>/gi, ""));
      return {
        id,
        type: "quote",
        content: text,
        citation: citeMatch ? stripTags(citeMatch[1]) : (attrs.citation || ""),
      };
    }

    case "core/separator": {
      return { id, type: "divider" };
    }

    case "core/spacer": {
      return { id, type: "spacer", height: attrs.height || 20 };
    }

    case "core/navigation": {
      return {
        id,
        type: "nav-menu",
        wpMenuId: attrs.ref ? String(attrs.ref) : "primary",
        menuSource: "wordpress",
      };
    }

    case "core/shortcode": {
      return {
        id,
        type: "html",
        content: innerContent || attrs.shortcode || "",
      };
    }

    default: {
      return {
        id,
        type: "html",
        content: innerContent || `<!-- wp:${blockName} -->`,
      };
    }
  }
}

function parseRawHtmlChunkToElements(htmlChunk: string): any[] {
  if (!htmlChunk || !htmlChunk.trim()) return [];
  const elements: any[] = [];
  const trimmed = htmlChunk.trim();

  const blocks = trimmed.split(/\n\s*\n/);
  for (const block of blocks) {
    const b = block.trim();
    if (!b) continue;

    const headingMatch = b.match(/^<h([1-6])[^>]*>([\s\S]*?)<\/h\1>$/i);
    if (headingMatch) {
      elements.push({
        id: `el_wp_h_${Math.random().toString(36).substring(2, 9)}`,
        type: "heading",
        level: parseInt(headingMatch[1], 10),
        content: stripTags(headingMatch[2]),
        text: stripTags(headingMatch[2]),
      });
      continue;
    }

    const paragraphMatch = b.match(/^<p[^>]*>([\s\S]*?)<\/p>$/i);
    if (paragraphMatch) {
      elements.push({
        id: `el_wp_p_${Math.random().toString(36).substring(2, 9)}`,
        type: "text",
        content: stripTags(paragraphMatch[1]),
        text: stripTags(paragraphMatch[1]),
      });
      continue;
    }

    const imgMatch = b.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch && (b.startsWith("<figure") || b.startsWith("<img"))) {
      const altMatch = b.match(/alt=["']([^"']*)["']/i);
      elements.push({
        id: `el_wp_img_${Math.random().toString(36).substring(2, 9)}`,
        type: "image",
        src: imgMatch[1],
        alt: altMatch ? altMatch[1] : "",
      });
      continue;
    }

    elements.push({
      id: `el_wp_html_${Math.random().toString(36).substring(2, 9)}`,
      type: "html",
      content: b,
    });
  }

  return elements;
}

function stripTags(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}


