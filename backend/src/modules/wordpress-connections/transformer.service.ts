/**
 * @file Wordpress connections: business operations and coordination with persistence or external services. File responsibility: transformer service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
/**
 * WordPress Block & Content Transformer for ForgeStudio
 *
 * Converts canonical ForgeStudio Page JSON into WordPress-compatible Gutenberg
 * block markup and structured post metadata without losing structural integrity.
 */

export interface TransformedWordPressPage {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: "publish" | "draft";
  meta: Record<string, any>;
  forms: Array<{ formId: string; fields: any[] }>;
  mediaReferences: Array<{ url: string; alt?: string; id?: string }>;
  contentHtml?: string;
  customCss?: string;
  gutenbergBlocks?: any[];
  yoastMeta?: Record<string, any>;
  rankMathMeta?: Record<string, any>;
  elementorData?: any;
}

/**
 * Transform Page To Word Press.
 * @param page Page supplied to this operation (type: any).
 * @param siteSettings Site Settings supplied to this operation (type: any). Defaults to {}.
 * @param _globalStyles Global Styles supplied to this operation (type: any). Defaults to {}.
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

  // Transform elements to Gutenberg block representations
  const blocksMarkup: string[] = [];

  for (const element of elements) {
    const block = transformElementToGutenberg(element, mediaReferences, forms);
    if (block) {
      blocksMarkup.push(block);
    }
  }

  const content = blocksMarkup.join("\n\n");

  // Build clean SEO metadata (compatible with Yoast, RankMath, and ForgeStudio WP Connector)
  const meta: Record<string, any> = {
    _forgestudio_page_id: page.id,
    _forgestudio_synced_at: new Date().toISOString(),
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
  };
}

/**
 * Transform Element To Gutenberg.
 * @param el El supplied to this operation (type: any).
 * @param mediaRefs Media Refs supplied to this operation (type: Array<{ url: string; alt?: string; id?: string }>).
 * @param forms Forms supplied to this operation (type: Array<{ formId: string; fields: any[] }>).
 */
function transformElementToGutenberg(
  el: any,
  mediaRefs: Array<{ url: string; alt?: string; id?: string }>,
  forms: Array<{ formId: string; fields: any[] }>
): string {
  if (!el || typeof el !== "object") return "";

  const type = el.type || "text";
  const styles = el.styles || {};
  const attrs = {
    id: el.id,
    type: el.type,
    ...(el.customAttributes || {}),
  };

  switch (type) {
    case "heading": {
      const level = el.level || 2;
      const text = escapeHtml(el.content || el.text || "");
      return `<!-- wp:heading {"level":${level},"attrs":${JSON.stringify(attrs)}} -->\n<h${level}>${text}</h${level}>\n<!-- /wp:heading -->`;
    }

    case "paragraph":
    case "text": {
      const text = escapeHtml(el.content || el.text || "");
      return `<!-- wp:paragraph {"attrs":${JSON.stringify(attrs)}} -->\n<p>${text}</p>\n<!-- /wp:paragraph -->`;
    }

    case "image": {
      const src = el.src || el.url || "";
      const alt = el.alt || el.altText || "";
      if (src) {
        mediaRefs.push({ url: src, alt, id: el.id });
      }
      return `<!-- wp:image {"url":"${src}","alt":"${escapeHtml(alt)}","attrs":${JSON.stringify(attrs)}} -->\n<figure class="wp-block-image"><img src="${src}" alt="${escapeHtml(alt)}" /></figure>\n<!-- /wp:image -->`;
    }

    case "button": {
      const text = escapeHtml(el.content || el.text || el.label || "Click Here");
      let url = el.url || el.link || el.href || el.linkUrl || (el.pageId ? `/${el.pageId}/` : "#");
      if (url.startsWith("page:")) {
        const targetPageId = url.replace("page:", "");
        url = `/${targetPageId}/`;
      }
      return `<!-- wp:buttons {"attrs":${JSON.stringify(attrs)}} -->\n<div class="wp-block-buttons"><div class="wp-block-button"><a class="wp-block-button__link" href="${url}">${text}</a></div></div>\n<!-- /wp:buttons -->`;
    }

    case "hero": {
      const title = escapeHtml(el.title || el.content || "Hero Title");
      const subtitle = escapeHtml(el.subtitle || el.subheading || "");
      return `<!-- wp:forgestudio/hero {"id":"${el.id}","title":"${title}","attrs":${JSON.stringify(attrs)}} -->\n<section class="fs-hero">\n  <h1>${title}</h1>\n  ${subtitle ? `<p>${subtitle}</p>` : ""}\n</section>\n<!-- /wp:forgestudio/hero -->`;
    }

    case "pricing": {
      const planName = escapeHtml(el.planName || el.title || "Plan");
      const price = escapeHtml(String(el.price || "$0"));
      return `<!-- wp:forgestudio/pricing {"id":"${el.id}","plan":"${planName}","price":"${price}"} -->\n<div class="fs-pricing-card">\n  <h3>${planName}</h3>\n  <span class="fs-price">${price}</span>\n</div>\n<!-- /wp:forgestudio/pricing -->`;
    }

    case "faq": {
      const question = escapeHtml(el.question || "Frequently Asked Question");
      const answer = escapeHtml(el.answer || "");
      return `<!-- wp:forgestudio/faq {"id":"${el.id}","question":"${question}"} -->\n<details class="fs-faq-item">\n  <summary>${question}</summary>\n  <p>${answer}</p>\n</details>\n<!-- /wp:forgestudio/faq -->`;
    }

    case "form": {
      const formId = el.formId || el.id;
      const formFields = Array.isArray(el.fields) ? el.fields : [];
      forms.push({ formId, fields: formFields });
      return `<!-- wp:forgestudio/form {"id":"${el.id}","formId":"${formId}"} -->\n<form class="fs-form" data-forgestudio-form-id="${formId}">\n  <div class="fs-form-fields">\n    ${formFields.map((f: any) => `<input type="${f.type || "text"}" name="${f.name || f.id}" placeholder="${escapeHtml(f.placeholder || f.label || "")}" />`).join("\n    ")}\n  </div>\n  <button type="submit">Submit</button>\n</form>\n<!-- /wp:forgestudio/form -->`;
    }

    case "wordpress-shortcode": {
      const shortcode = el.shortcode || el.content || "";
      return `<!-- wp:shortcode -->\n${shortcode}\n<!-- /wp:shortcode -->`;
    }

    case "container":
    case "section":
    case "div":
    case "div-block": {
      const children = Array.isArray(el.elements) ? el.elements : (Array.isArray(el.children) ? el.children : []);
      const childrenBlocks = children
        .map((child: any) => transformElementToGutenberg(child, mediaRefs, forms))
        .filter(Boolean)
        .join("\n\n");
      const isMasonry = el.layout?.layoutType === "masonry";
      const isGrid = el.layout?.layoutType === "grid";
      const layoutStyles: Record<string, any> = {
        ...styles,
        display: isMasonry ? "block" : (isGrid ? "grid" : "flex"),
        ...(isMasonry
          ? {
              columnCount: el.layout?.masonryColumns || 3,
              columnGap: `${el.layout?.gap ?? 16}px`,
            }
          : isGrid
          ? {
              gridTemplateColumns: el.layout?.gridTemplateColumns || "repeat(2, minmax(0, 1fr))",
              gridAutoFlow: el.layout?.gridAutoFlow || undefined,
              gap: `${el.layout?.gap ?? 10}px`,
            }
          : {
              flexDirection: el.layout?.direction || "column",
              justifyContent: el.layout?.justifyContent || "flex-start",
              alignItems: el.layout?.alignItems || "stretch",
              gap: `${el.layout?.gap ?? 10}px`,
            }),
      };
      if (el.layout?.scrollSnapType && el.layout?.scrollSnapType !== "none") {
        layoutStyles.scrollSnapType = el.layout.scrollSnapType;
      }
      if (el.layout?.overflowX) layoutStyles.overflowX = el.layout.overflowX;
      if (el.layout?.overflowY) layoutStyles.overflowY = el.layout.overflowY;
      return `<!-- wp:group {"attrs":${JSON.stringify(attrs)}} -->\n<div class="fs-container" style="${formatInlineStyles(layoutStyles)}">\n${childrenBlocks}\n</div>\n<!-- /wp:group -->`;
    }

    default: {
      const inner = escapeHtml(el.content || el.text || "");
      return `<!-- wp:forgestudio/element {"id":"${el.id}","type":"${type}"} -->\n<div class="fs-custom-element fs-type-${type}" style="${formatInlineStyles(styles)}">\n  ${inner}\n</div>\n<!-- /wp:forgestudio/element -->`;
    }
  }
}

/**
 * Escape Html.
 * @param str Str supplied to this operation (type: string).
 */
function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format Inline Styles.
 * @param styles Styles supplied to this operation (type: Record<string, any>).
 */
function formatInlineStyles(styles: Record<string, any>): string {
  if (!styles || typeof styles !== "object") return "";
  return Object.entries(styles)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
    .join("; ");
}
