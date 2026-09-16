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
}

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
    _yoast_wpseo_title: pageSettings.seoTitle || page.name || siteSettings.siteName,
    _yoast_wpseo_metadesc: pageSettings.seoDescription || pageSettings.description || "",
    _forgestudio_canonical_url: pageSettings.canonicalUrl || "",
    _forgestudio_og_image: pageSettings.ogImage || "",
    _forgestudio_schema: pageSettings.schemaMarkup || null,
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

    default: {
      const inner = escapeHtml(el.content || el.text || "");
      return `<!-- wp:forgestudio/element {"id":"${el.id}","type":"${type}"} -->\n<div class="fs-custom-element fs-type-${type}" style="${formatInlineStyles(styles)}">\n  ${inner}\n</div>\n<!-- /wp:forgestudio/element -->`;
    }
  }
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
