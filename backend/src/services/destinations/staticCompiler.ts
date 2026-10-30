import type { StaticBundle, GeneratedFile } from "./types.js";
export type CanonicalSite = any;
import { matchesThemeCondition, resolveTokensInTree } from "../website.service.js";
import {
  compileDesignSystemCss,
  validateVariables,
  validateClasses,
} from "../tokens/designToken.service.js";
import { escapeJsonLd, generateStructuredData } from "../seo/seoAnalyzer.service.js";
import { getWidgetCapability, isStaticCompatible, WIDGET_CAPABILITIES } from "./widgetManifest.js";

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function sanitizeCustomHead(rawHead: string | undefined): string {
  if (!rawHead || typeof rawHead !== "string") return "";
  let sanitized = rawHead.trim();
  if (!sanitized) return "";

  // Strip dangerous framing and embedding elements
  sanitized = sanitized
    .replace(/<iframe\b[^>]*>([\s\S]*?<\/iframe>)?/gi, "")
    .replace(/<object\b[^>]*>([\s\S]*?<\/object>)?/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    .replace(/<applet\b[^>]*>([\s\S]*?<\/applet>)?/gi, "")
    .replace(/<form\b[^>]*>([\s\S]*?<\/form>)?/gi, "");

  // Strip dangerous inline event handlers (onload=, onerror=, etc.)
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, "");

  // Neutralize javascript: and vbscript: URI schemes in attributes
  sanitized = sanitized.replace(/(href|src)\s*=\s*['"]\s*(javascript|vbscript):[^'"]*['"]/gi, "$1=\"#\"");

  return sanitized;
}

export function resolveStaticHtmlHref(rawHref: string | undefined, allPages: any[] = []): string {
  if (!rawHref) return "#";
  const trimmed = rawHref.trim();
  if (!trimmed || trimmed === "#") return "#";

  if (/^(javascript:|data:|vbscript:)/i.test(trimmed)) return "#";
  if (/^(https?:\/\/|\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("#")) return trimmed;

  if (trimmed.startsWith("page:")) {
    const pageId = trimmed.replace("page:", "").trim();
    const targetPage = allPages.find((p) => p.id === pageId);
    if (targetPage) {
      return targetPage.isHome || targetPage.slug === "/" ? "index.html" : `${(targetPage.slug || targetPage.id).replace(/^\//, "")}.html`;
    }
    return "#";
  }

  const [basePath, queryOrHash] = trimmed.split(/(?=[?#])/);
  const clean = basePath.replace(/^\//, "");

  const matched = allPages.find(
    (p) =>
      p.id === basePath ||
      p.id === clean ||
      p.slug === basePath ||
      p.slug === `/${clean}` ||
      (p.slug && p.slug.replace(/^\//, "") === clean) ||
      (clean === "" && (p.isHome || p.id === "home"))
  );

  if (matched) {
    const fileName = matched.isHome || matched.slug === "/" || clean === "" ? "index.html" : `${(matched.slug || matched.id).replace(/^\//, "")}.html`;
    return queryOrHash ? `${fileName}${queryOrHash}` : fileName;
  }

  return trimmed;
}

function renderElementToHtml(el: any, allPages: any[], websiteId?: string): string {
  if (!el) return "";

  const styleObj = el.styles || {};
  const inlineCss = Object.entries(styleObj)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v}`)
    .join("; ");
  const styleAttr = inlineCss ? ` style="${escapeHtml(inlineCss)}"` : "";
  const classAttr = el.className ? ` class="${escapeHtml(el.className)}"` : "";
  const idAttr = el.id ? ` id="${escapeHtml(el.id)}"` : "";

  switch (el.type) {
    case "heading": {
      const level = Math.min(Math.max(el.level || 2, 1), 6);
      return `<h${level}${idAttr}${classAttr}${styleAttr}>${escapeHtml(el.content || el.text || "")}</h${level}>`;
    }
    case "text":
    case "paragraph": {
      return `<p${idAttr}${classAttr}${styleAttr}>${escapeHtml(el.content || el.text || "")}</p>`;
    }
    case "button": {
      const rawHref = el.href || el.linkUrl || el.link || (el.pageId ? `page:${el.pageId}` : "") || "#";
      const href = resolveStaticHtmlHref(rawHref, allPages);
      return `<a href="${escapeHtml(href)}"${idAttr}${classAttr}${styleAttr}>${escapeHtml(el.content || el.text || "Click Here")}</a>`;
    }
    case "image": {
      const rawHref = el.href || el.linkUrl || (el.pageId ? `page:${el.pageId}` : "");
      const imgTag = `<img src="${escapeHtml(el.src || "")}" alt="${escapeHtml(el.alt || "")}"${idAttr}${classAttr}${styleAttr} />`;
      if (rawHref) {
        const href = resolveStaticHtmlHref(rawHref, allPages);
        const targetAttr = el.target ? ` target="${escapeHtml(el.target)}"` : "";
        return `<a href="${escapeHtml(href)}"${targetAttr}>${imgTag}</a>`;
      }
      return imgTag;
    }
    case "divider": {
      return `<hr${idAttr}${classAttr}${styleAttr} />`;
    }
    case "spacer": {
      return `<div class="fs-spacer"${idAttr}${classAttr}${styleAttr}></div>`;
    }
    case "icon":
    case "icon-library": {
      const iconGlyph = el.iconName || el.icon || "★";
      return `<div class="fs-icon-box"${idAttr}${classAttr}${styleAttr}><span class="fs-icon">${escapeHtml(iconGlyph)}</span>${el.title ? `<h4 class="fs-icon-title">${escapeHtml(el.title)}</h4>` : ""}${el.content ? `<p class="fs-icon-desc">${escapeHtml(el.content)}</p>` : ""}</div>`;
    }
    case "custom-svg": {
      return `<div class="fs-custom-svg"${idAttr}${classAttr}${styleAttr}>${el.svgRawContent ? el.svgRawContent : (el.svgUrl ? `<img src="${escapeHtml(el.svgUrl)}" alt="SVG" />` : "")}</div>`;
    }
    case "nav-menu": {
      const navItems = Array.isArray(el.navMenuItems) ? el.navMenuItems : (Array.isArray(el.items) ? el.items : []);
      const itemsHtml = navItems.map((item: any) => {
        const itemHref = resolveStaticHtmlHref(item.url || item.href || (item.pageId ? `page:${item.pageId}` : ""), allPages);
        const subItems = Array.isArray(item.submenu) ? item.submenu : [];
        let subHtml = "";
        if (subItems.length > 0) {
          subHtml = `\n<ul class="sub-menu">\n${subItems.map((s: any) => {
            const sHref = resolveStaticHtmlHref(s.url || s.href || (s.pageId ? `page:${s.pageId}` : ""), allPages);
            return `<li><a href="${escapeHtml(sHref)}">${escapeHtml(s.label || s.title || "Link")}</a></li>`;
          }).join("\n")}\n</ul>`;
        }
        return `<li><a href="${escapeHtml(itemHref)}">${escapeHtml(item.label || item.title || "Link")}</a>${subHtml}</li>`;
      }).join("\n");
      return `<nav class="nav-menu"${idAttr}${classAttr}${styleAttr}>\n<ul>\n${itemsHtml}\n</ul>\n</nav>`;
    }
    case "mega-menu": {
      let megaCategories: any[] = [];
      if (Array.isArray(el.megaMenuItems) && el.megaMenuItems.length > 0) {
        megaCategories = el.megaMenuItems;
      } else if (Array.isArray(el.columns) && el.columns.length > 0) {
        megaCategories = [{ title: el.title || "Menu", columns: el.columns }];
      } else if (typeof el.content === "string" && el.content.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(el.content);
          if (Array.isArray(parsed)) {
            if (parsed.length > 0 && parsed[0].links) {
              megaCategories = [{ title: el.title || "Menu", columns: parsed }];
            } else {
              megaCategories = parsed;
            }
          }
        } catch {
          // ignore JSON parse error
        }
      }

      const categoriesHtml = megaCategories.map((cat: any) => {
        const catHref = cat.href ? resolveStaticHtmlHref(cat.href || (cat.pageId ? `page:${cat.pageId}` : ""), allPages) : "";
        const catTitle = catHref
          ? `<a href="${escapeHtml(catHref)}" class="fs-mega-category-title">${escapeHtml(cat.title || "")}</a>`
          : `<span class="fs-mega-category-title">${escapeHtml(cat.title || "")}</span>`;
        const cols = Array.isArray(cat.columns) ? cat.columns : [];
        const colsHtml = cols.map((col: any) => {
          const links = Array.isArray(col.links) ? col.links : [];
          const linksHtml = links.map((link: any) => {
            const lHref = resolveStaticHtmlHref(link.href || link.url || (link.pageId ? `page:${link.pageId}` : ""), allPages);
            const badgeHtml = link.badge ? ` <span class="fs-mega-badge">${escapeHtml(link.badge)}</span>` : "";
            const descHtml = link.description ? `<span class="fs-mega-desc">${escapeHtml(link.description)}</span>` : "";
            return `<li><a href="${escapeHtml(lHref)}">${escapeHtml(link.label || link.title || "Link")}${badgeHtml}</a>${descHtml}</li>`;
          }).join("\n");
          return `<div class="fs-mega-col">
            ${col.title ? `<h4 class="fs-mega-col-title">${escapeHtml(col.title)}</h4>` : ""}
            <ul class="fs-mega-links">\n${linksHtml}\n</ul>
          </div>`;
        }).join("\n");

        return `<div class="fs-mega-category">
          ${catTitle}
          <div class="fs-mega-dropdown">\n${colsHtml}\n</div>
        </div>`;
      }).join("\n");

      let promoHtml = "";
      const showPromo = el.megaMenuPromoEnabled === true || el.megaMenuPromoEnabled === "true" || el.styles?.megaMenuPromoEnabled === "true";
      if (showPromo || el.megaMenuPromoTitle || el.styles?.megaMenuPromoTitle) {
        const pTitle = el.megaMenuPromoTitle || el.styles?.megaMenuPromoTitle || "Special Offer";
        const pText = el.megaMenuPromoText || el.styles?.megaMenuPromoText || "";
        const pBtn = el.megaMenuPromoButtonText || el.styles?.megaMenuPromoButtonText || "Learn More";
        const pUrl = resolveStaticHtmlHref(el.megaMenuPromoButtonUrl || el.styles?.megaMenuPromoButtonUrl || "#", allPages);
        promoHtml = `\n<div class="fs-mega-promo">
          <h4>${escapeHtml(pTitle)}</h4>
          ${pText ? `<p>${escapeHtml(pText)}</p>` : ""}
          <a href="${escapeHtml(pUrl)}" class="btn fs-mega-promo-btn">${escapeHtml(pBtn)}</a>
        </div>`;
      }

      return `<nav class="fs-mega-menu"${idAttr}${classAttr}${styleAttr}>\n<div class="fs-mega-categories">\n${categoriesHtml}\n</div>${promoHtml}\n</nav>`;
    }
    case "menu-anchor": {
      const anchorRaw = el.anchorId || el.styles?.anchorId || el.content || el.id || "anchor";
      const anchorTarget = String(anchorRaw).replace(/^#/, "");
      const offsetRaw = el.anchorOffset || el.styles?.anchorScrollOffset || 80;
      const offsetNum = typeof offsetRaw === "number" ? offsetRaw : (parseInt(String(offsetRaw), 10) || 80);
      return `<div id="${escapeHtml(anchorTarget)}" class="fs-menu-anchor"${classAttr} style="scroll-margin-top: ${offsetNum}px; height: 0;"></div>`;
    }
    case "search-bar":
    case "search-form":
    case "site-search": {
      const actionUrl = el.searchRedirectUrl || el.formActionUrl || el.styles?.formActionUrl || "/search";
      const method = el.formMethod || el.styles?.formMethod || "GET";
      const paramName = el.formParamName || el.styles?.formParamName || "q";
      const placeholder = el.searchPlaceholder || el.styles?.searchPlaceholder || el.formPlaceholder || el.styles?.formPlaceholder || el.content || "Search...";
      const buttonText = el.searchButtonText || el.styles?.searchButtonText || el.formButtonText || el.styles?.formButtonText || el.buttonText || "Search";
      return `<form action="${escapeHtml(actionUrl)}" method="${escapeHtml(method)}" class="fs-search-form"${idAttr}${classAttr}${styleAttr}>\n<input type="search" name="${escapeHtml(paramName)}" placeholder="${escapeHtml(placeholder)}" class="fs-search-input" />\n<button type="submit" class="fs-search-btn">${escapeHtml(buttonText)}</button>\n</form>`;
    }
    case "taxonomy-filter": {
      let taxItems = Array.isArray(el.taxonomyItems) ? el.taxonomyItems : [];
      if (taxItems.length === 0 && typeof el.content === "string" && el.content.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(el.content);
          if (Array.isArray(parsed)) taxItems = parsed;
        } catch {
          // ignore JSON parse error
        }
      }
      const targetGrid = el.targetGridId || el.styles?.targetGridId || "";
      const buttonsHtml = taxItems.map((item: any) => {
        const slug = item.slug || item.id || "";
        const label = item.label || item.name || item.title || "Topic";
        const count = item.count !== undefined ? item.count : 0;
        return `<button class="fs-tax-btn" data-slug="${escapeHtml(slug)}">${escapeHtml(label)} (${count})</button>`;
      }).join("");
      return `<div class="fs-taxonomy-filter"${idAttr}${classAttr}${styleAttr} data-target-grid="${escapeHtml(targetGrid)}">${buttonsHtml}</div>`;
    }
    case "post-nav": {
      const prevUrl = resolveStaticHtmlHref(el.prevUrl || el.styles?.postNavPrevUrl || "#", allPages);
      const prevTitle = el.prevTitle || el.styles?.postNavPrevTitle || el.postNavPrevLabel || "Previous";
      const nextUrl = resolveStaticHtmlHref(el.nextUrl || el.styles?.postNavNextUrl || "#", allPages);
      const nextTitle = el.nextTitle || el.styles?.postNavNextTitle || el.postNavNextLabel || "Next";
      return `<nav class="fs-post-navigation"${idAttr}${classAttr}${styleAttr} aria-label="Post Navigation">\n<div class="fs-post-prev"><a href="${escapeHtml(prevUrl)}">← ${escapeHtml(prevTitle)}</a></div>\n<div class="fs-post-next"><a href="${escapeHtml(nextUrl)}">${escapeHtml(nextTitle)} →</a></div>\n</nav>`;
    }
    case "container":
    case "section":
    case "div":
    case "div-block": {
      const children = Array.isArray(el.elements) ? el.elements : (Array.isArray(el.children) ? el.children : []);
      const childrenHtml = children.map((child: any) => renderElementToHtml(child, allPages, websiteId)).join("\n");

      const layout = el.layout || {};
      const isMasonry = layout.layoutType === "masonry";
      const isGrid = layout.layoutType === "grid";
      const containerStyles: Record<string, any> = {
        ...styleObj,
        display: isMasonry ? "block" : (isGrid ? "grid" : (styleObj.display || "flex")),
      };
      if (isMasonry) {
        containerStyles["column-count"] = layout.masonryColumns || 3;
        containerStyles["column-gap"] = layout.columnGap !== undefined
          ? (typeof layout.columnGap === "number" ? `${layout.columnGap}px` : layout.columnGap)
          : (layout.gap !== undefined ? `${layout.gap}px` : "16px");
      } else if (isGrid) {
        containerStyles["grid-template-columns"] = layout.gridTemplateColumns || "repeat(2, minmax(0, 1fr))";
        if (layout.gridTemplateRows) containerStyles["grid-template-rows"] = layout.gridTemplateRows;
        if (layout.gridAutoFlow) containerStyles["grid-auto-flow"] = layout.gridAutoFlow;
        if (layout.justifyItems) containerStyles["justify-items"] = layout.justifyItems;
        if (layout.alignItems) containerStyles["align-items"] = layout.alignItems;
        if (layout.gap !== undefined) containerStyles["gap"] = `${layout.gap}px`;
        if (layout.rowGap !== undefined) containerStyles["row-gap"] = typeof layout.rowGap === "number" ? `${layout.rowGap}px` : layout.rowGap;
        if (layout.columnGap !== undefined) containerStyles["column-gap"] = typeof layout.columnGap === "number" ? `${layout.columnGap}px` : layout.columnGap;
      } else {
        containerStyles["flex-direction"] = layout.direction || "column";
        containerStyles["justify-content"] = layout.justifyContent || "flex-start";
        containerStyles["align-items"] = layout.alignItems || "stretch";
        if (layout.gap !== undefined) containerStyles["gap"] = `${layout.gap}px`;
        if (layout.rowGap !== undefined) containerStyles["row-gap"] = typeof layout.rowGap === "number" ? `${layout.rowGap}px` : layout.rowGap;
        if (layout.columnGap !== undefined) containerStyles["column-gap"] = typeof layout.columnGap === "number" ? `${layout.columnGap}px` : layout.columnGap;
      }

      if (layout.scrollSnapType && layout.scrollSnapType !== "none") {
        containerStyles["scroll-snap-type"] = layout.scrollSnapType;
      }
      if (layout.overflowX) {
        containerStyles["overflow-x"] = layout.overflowX;
      }
      if (layout.overflowY) {
        containerStyles["overflow-y"] = layout.overflowY;
      }

      const containerCss = Object.entries(containerStyles)
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v}`)
        .join("; ");
      const containerStyleAttr = containerCss ? ` style="${escapeHtml(containerCss)}"` : "";

      return `<div${idAttr}${classAttr}${containerStyleAttr}>\n${childrenHtml}\n</div>`;
    }
    case "columns": {
      const cols = Array.isArray(el.columns) ? el.columns : [];
      const colsHtml = cols
        .map((col: any) => {
          const colChildren = Array.isArray(col.elements) ? col.elements : (Array.isArray(col.children) ? col.children : []);
          const childrenHtml = colChildren.map((child: any) => renderElementToHtml(child, allPages, websiteId)).join("\n");
          return `<div class="col" style="flex: ${col.width || 1};">\n${childrenHtml}\n</div>`;
        })
        .join("\n");
      return `<div${idAttr} class="row ${escapeHtml(el.className || "")}"${styleAttr} style="display: flex; gap: 1rem;">\n${colsHtml}\n</div>`;
    }
    case "form": {
      const formFields = Array.isArray(el.fields) ? el.fields : (Array.isArray(el.formFields) ? el.formFields : []);
      const fieldsHtml = formFields
        .map((f: any) => {
          const fieldId = escapeHtml(f.name || f.id || "field");
          const label = f.label ? `<label for="${fieldId}">${escapeHtml(f.label)}</label>` : "";
          let input = "";
          if (f.type === "textarea") {
            input = `<textarea id="${fieldId}" name="${fieldId}" ${f.required ? "required" : ""}></textarea>`;
          } else if (f.type === "select") {
            const options = Array.isArray(f.options) ? f.options : [];
            const optsHtml = options
              .map((opt: any) => {
                const val = typeof opt === "string" ? opt : opt.value ?? opt.label;
                const lab = typeof opt === "string" ? opt : opt.label ?? opt.value;
                return `<option value="${escapeHtml(String(val))}">${escapeHtml(String(lab))}</option>`;
              })
              .join("\n");
            input = `<select id="${fieldId}" name="${fieldId}" ${f.required ? "required" : ""}>\n${optsHtml}\n</select>`;
          } else {
            input = `<input type="${escapeHtml(f.type || "text")}" id="${fieldId}" name="${fieldId}" ${f.required ? "required" : ""} />`;
          }
          return `<div class="form-group">\n${label}\n${input}\n</div>`;
        })
        .join("\n");
      const submitText = el.submitButtonText || "Submit";
      const actualWebsiteId = websiteId || el.websiteId || "";
      const formId = el.id || el.formId || "form";
      const redirectUrl = el.redirectUrl || el.formRedirectUrl || "";
      const redirectAttr = redirectUrl ? ` data-redirect="${escapeHtml(redirectUrl)}"` : "";
      const hiddenInputs = `  <input type="hidden" name="websiteId" value="${escapeHtml(actualWebsiteId)}" />\n  <input type="hidden" name="formId" value="${escapeHtml(formId)}" />\n  <input type="text" name="_fs_hp_check" value="" style="display:none !important; opacity:0; position:absolute; top:-9999px; left:-9999px;" tabindex="-1" autocomplete="off" />`;

      return `<form${idAttr}${classAttr}${styleAttr}${redirectAttr} action="/api/forms/submit" method="POST">\n${hiddenInputs}\n${fieldsHtml}\n<div class="fs-form-status" style="display:none; margin: 10px 0; padding: 10px; border-radius: 4px;"></div>\n<button type="submit" class="btn btn-primary">${escapeHtml(submitText)}</button>\n</form>`;
    }
    case "slides": {
      const slides = Array.isArray(el.slides) ? el.slides : [];
      const slidesHtml = slides.map((s: any) => {
        const bgStyle = s.bgImage || s.image ? ` style="background-image: url('${escapeHtml(s.bgImage || s.image)}'); background-size: cover; background-position: center;"` : "";
        const title = s.title ? `<h3 class="fs-slide-title">${escapeHtml(s.title)}</h3>` : "";
        const desc = s.description || s.subtitle ? `<p class="fs-slide-desc">${escapeHtml(s.description || s.subtitle)}</p>` : "";
        const btn = s.buttonText ? `<a href="${escapeHtml(resolveStaticHtmlHref(s.buttonUrl || s.buttonLink, allPages))}" class="btn fs-slide-btn">${escapeHtml(s.buttonText)}</a>` : "";
        return `<div class="fs-slide"${bgStyle}>${title}${desc}${btn}</div>`;
      }).join("\n");
      return `<div class="fs-slider"${idAttr}${classAttr}${styleAttr}>\n<div class="fs-slides-wrapper">\n${slidesHtml}\n</div>\n</div>`;
    }
    case "price-table":
    case "pricing": {
      const plans = Array.isArray(el.pricingPlans) ? el.pricingPlans : (Array.isArray(el.pricePlans) ? el.pricePlans : (Array.isArray(el.items) ? el.items : []));
      const plansHtml = plans.map((p: any) => {
        const badge = p.badge || p.ribbon ? `<span class="fs-price-badge">${escapeHtml(p.badge || p.ribbon)}</span>` : "";
        const features = Array.isArray(p.features) ? p.features.map((f: any) => {
          const isInc = f.included !== false;
          const text = typeof f === "string" ? f : f.text;
          return `<li class="${isInc ? "fs-included" : "fs-excluded"}">${isInc ? "✓" : "✕"} ${escapeHtml(text || "")}</li>`;
        }).join("\n") : "";
        const btn = p.buttonText ? `<a href="${escapeHtml(resolveStaticHtmlHref(p.buttonUrl || p.buttonHref || "#", allPages))}" class="btn fs-plan-btn">${escapeHtml(p.buttonText)}</a>` : "";
        return `<div class="fs-price-card${p.isPopular || p.isFeatured ? " fs-featured" : ""}">
          ${badge}
          <h3 class="fs-plan-name">${escapeHtml(p.name || p.title || "Plan")}</h3>
          <div class="fs-price-val">
            <span class="fs-currency">${escapeHtml(p.currency || "$")}</span>
            <span class="fs-amount">${escapeHtml(p.price || "0")}</span>
            <span class="fs-period">${escapeHtml(p.period || "/mo")}</span>
          </div>
          ${p.description ? `<p class="fs-plan-desc">${escapeHtml(p.description)}</p>` : ""}
          <ul class="fs-plan-features">${features}</ul>
          ${btn}
        </div>`;
      }).join("\n");
      return `<div class="fs-pricing-table"${idAttr}${classAttr}${styleAttr}>\n${plansHtml}\n</div>`;
    }
    case "price-list": {
      const items = Array.isArray(el.priceListItems) ? el.priceListItems : (Array.isArray(el.items) ? el.items : []);
      const itemsHtml = items.map((it: any) => `
        <div class="fs-price-list-item">
          ${it.image ? `<img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.title || "")}" class="fs-pli-img" />` : ""}
          <div class="fs-pli-content">
            <div class="fs-pli-header">
              <span class="fs-pli-title">${escapeHtml(it.title || "")}</span>
              <span class="fs-pli-dots"></span>
              <span class="fs-pli-price">${escapeHtml(it.price || "")}</span>
            </div>
            ${it.description ? `<p class="fs-pli-desc">${escapeHtml(it.description)}</p>` : ""}
          </div>
        </div>
      `).join("\n");
      return `<div class="fs-price-list"${idAttr}${classAttr}${styleAttr}>\n${itemsHtml}\n</div>`;
    }
    case "gallery":
    case "basic-gallery": {
      const images = Array.isArray(el.galleryImages) ? el.galleryImages : (Array.isArray(el.basicGalleryImages) ? el.basicGalleryImages : (Array.isArray(el.images) ? el.images : []));
      const cols = el.basicGalleryColumns || 3;
      const imagesHtml = images.map((img: any) => `
        <figure class="fs-gallery-item">
          <img src="${escapeHtml(img.url || img.src || "")}" alt="${escapeHtml(img.alt || img.caption || "")}" loading="lazy" />
          ${img.caption ? `<figcaption>${escapeHtml(img.caption)}</figcaption>` : ""}
        </figure>
      `).join("\n");
      return `<div class="fs-gallery fs-cols-${cols}"${idAttr}${classAttr}${styleAttr}>\n${imagesHtml}\n</div>`;
    }
    case "flip-box": {
      const frontTitle = el.flipFrontTitle || el.title || "Front Title";
      const frontDesc = el.flipFrontDesc || el.content || "";
      const backTitle = el.flipBackTitle || "Back Title";
      const backDesc = el.flipBackDesc || "";
      const btn = el.flipButtonText ? `<a href="${escapeHtml(resolveStaticHtmlHref(el.flipButtonUrl, allPages))}" class="btn fs-flip-btn">${escapeHtml(el.flipButtonText)}</a>` : "";
      return `<div class="fs-flip-box"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-flip-box-inner">
          <div class="fs-flip-front">
            ${el.iconName ? `<span class="fs-flip-icon">${escapeHtml(el.iconName)}</span>` : ""}
            <h4 class="fs-flip-title">${escapeHtml(frontTitle)}</h4>
            <p class="fs-flip-desc">${escapeHtml(frontDesc)}</p>
          </div>
          <div class="fs-flip-back">
            <h4 class="fs-flip-title">${escapeHtml(backTitle)}</h4>
            <p class="fs-flip-desc">${escapeHtml(backDesc)}</p>
            ${btn}
          </div>
        </div>
      </div>`;
    }
    case "call-to-action":
    case "cta": {
      const heading = el.title || el.heading || "Ready to build?";
      const desc = el.ctaDesc || el.content || "";
      const btn = el.buttonText ? `<a href="${escapeHtml(resolveStaticHtmlHref(el.buttonUrl || el.href, allPages))}" class="btn fs-cta-btn">${escapeHtml(el.buttonText)}</a>` : "";
      const img = el.image || el.src ? `<img src="${escapeHtml(el.image || el.src)}" alt="${escapeHtml(heading)}" class="fs-cta-img" />` : "";
      return `<div class="fs-cta"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-cta-body">
          <h3 class="fs-cta-title">${escapeHtml(heading)}</h3>
          ${desc ? `<p class="fs-cta-desc">${escapeHtml(desc)}</p>` : ""}
          ${btn}
        </div>
        ${img}
      </div>`;
    }
    case "countdown": {
      const targetDate = el.countdownTargetDate || el.targetDate || "";
      return `<div class="fs-countdown"${idAttr}${classAttr}${styleAttr} data-target="${escapeHtml(targetDate)}">
        <div class="fs-countdown-box"><span class="fs-countdown-num">00</span><span class="fs-countdown-lbl">${escapeHtml(el.countdownDaysLabel || "Days")}</span></div>
        <div class="fs-countdown-box"><span class="fs-countdown-num">00</span><span class="fs-countdown-lbl">${escapeHtml(el.countdownHoursLabel || "Hours")}</span></div>
        <div class="fs-countdown-box"><span class="fs-countdown-num">00</span><span class="fs-countdown-lbl">${escapeHtml(el.countdownMinutesLabel || "Mins")}</span></div>
        <div class="fs-countdown-box"><span class="fs-countdown-num">00</span><span class="fs-countdown-lbl">${escapeHtml(el.countdownSecondsLabel || "Secs")}</span></div>
      </div>`;
    }
    case "reviews": {
      const reviews = Array.isArray(el.reviewItems) ? el.reviewItems : (Array.isArray(el.reviews) ? el.reviews : []);
      const reviewsHtml = reviews.map((r: any) => {
        const rating = Math.min(Math.max(r.rating || 5, 1), 5);
        return `<div class="fs-review-card">
          <div class="fs-review-header">
            ${r.avatar || r.image ? `<img src="${escapeHtml(r.avatar || r.image)}" alt="${escapeHtml(r.author || r.name || "")}" class="fs-review-avatar" />` : ""}
            <div>
              <div class="fs-review-author">${escapeHtml(r.author || r.name || "Customer")}</div>
              <div class="fs-review-stars">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</div>
            </div>
          </div>
          <p class="fs-review-text">${escapeHtml(r.text || r.content || r.review || "")}</p>
        </div>`;
      }).join("\n");
      return `<div class="fs-reviews-grid"${idAttr}${classAttr}${styleAttr}>\n${reviewsHtml}\n</div>`;
    }
    case "loop-carousel": {
      const dynamicItems = Array.isArray(el.cptEntries) && el.cptEntries.length > 0
        ? el.cptEntries.map((e: any) => ({
            title: e.title || e.name || "Untitled",
            description: e.data?.description || e.data?.excerpt || e.description || "",
            imageUrl: e.data?.image || e.data?.featuredImage || e.imageUrl || "",
            badge: e.data?.category || e.badge || "",
            buttonText: e.data?.buttonText || "Read More",
            linkUrl: e.slug ? `/portfolio/${escapeHtml(e.slug)}` : "#",
          }))
        : null;

      const items = dynamicItems || (Array.isArray(el.loopCarouselItems) && el.loopCarouselItems.length > 0 ? el.loopCarouselItems : (Array.isArray(el.items) ? el.items : []));
      const slidesHtml = items.map((it: any, idx: number) => `
        <div class="fs-carousel-slide fs-loop-carousel-card" data-slide-index="${idx}">
          ${it.imageUrl || it.image ? `<img src="${escapeHtml(it.imageUrl || it.image)}" alt="${escapeHtml(it.title || "")}" />` : ""}
          <div class="fs-loop-carousel-body">
            ${it.badge ? `<span class="fs-loop-badge">${escapeHtml(it.badge)}</span>` : ""}
            <h4 class="fs-loop-card-title">${escapeHtml(it.title || "")}</h4>
            ${it.description ? `<p class="fs-loop-card-desc">${escapeHtml(it.description)}</p>` : ""}
            ${it.buttonText ? `<a href="${escapeHtml(it.linkUrl || "#")}" class="fs-loop-card-btn">${escapeHtml(it.buttonText)}</a>` : ""}
          </div>
        </div>
      `).join("\n");

      return `<div class="fs-carousel-widget fs-loop-carousel"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-carousel-track">${slidesHtml}</div>
        <button type="button" class="fs-carousel-prev" aria-label="Previous">❮</button>
        <button type="button" class="fs-carousel-next" aria-label="Next">❯</button>
      </div>`;
    }
    case "media-carousel":
    case "testimonial-carousel":
    case "nested-carousel":
    case "image-carousel": {
      const items = Array.isArray(el.mediaCarouselItems) ? el.mediaCarouselItems :
        (Array.isArray(el.testimonialCarouselItems) ? el.testimonialCarouselItems :
        (Array.isArray(el.imageCarouselItems) ? el.imageCarouselItems :
        (Array.isArray(el.items) ? el.items : [])));
      const itemsHtml = items.map((it: any) => `
        <div class="fs-carousel-slide">
          ${it.image || it.url ? `<img src="${escapeHtml(it.image || it.url)}" alt="${escapeHtml(it.title || it.name || "")}" />` : ""}
          ${it.quote || it.content ? `<blockquote class="fs-carousel-quote">${escapeHtml(it.quote || it.content)}</blockquote>` : ""}
          ${it.author || it.name ? `<cite class="fs-carousel-author">${escapeHtml(it.author || it.name)}</cite>` : ""}
        </div>
      `).join("\n");
      return `<div class="fs-carousel"${idAttr}${classAttr}${styleAttr}>\n<div class="fs-carousel-track">\n${itemsHtml}\n</div>\n</div>`;
    }
    case "social-icons":
    case "share-buttons": {
      const networks = Array.isArray(el.shareNetworks) ? el.shareNetworks : (Array.isArray(el.networks) ? el.networks : (Array.isArray(el.items) ? el.items : []));
      const iconsHtml = networks.map((net: any) => `
        <a href="${escapeHtml(net.url || "#")}" target="_blank" rel="noopener noreferrer" class="fs-social-btn fs-${escapeHtml(net.network || net.type || "link")}">
          <span>${escapeHtml(net.network || net.label || "Share")}</span>
        </a>
      `).join("\n");
      return `<div class="fs-social-icons"${idAttr}${classAttr}${styleAttr}>\n${iconsHtml}\n</div>`;
    }
    case "google-maps": {
      const addr = el.mapAddress || el.address || "New York, USA";
      const zoom = el.mapZoom || 14;
      const height = el.mapHeight || 350;
      return `<div class="fs-google-maps"${idAttr}${classAttr}${styleAttr}>
        <iframe width="100%" height="${escapeHtml(String(height))}" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${encodeURIComponent(addr)}&t=m&z=${escapeHtml(String(zoom))}&output=embed" allowfullscreen loading="lazy"></iframe>
      </div>`;
    }
    case "lottie": {
      const lottieUrl = el.lottieUrl || "";
      return `<div class="fs-lottie"${idAttr}${classAttr}${styleAttr} data-lottie="${escapeHtml(lottieUrl)}">
        <div class="fs-lottie-player"></div>
      </div>`;
    }
    case "code-highlight":
    case "code": {
      const lang = el.codeLanguage || "javascript";
      const snippet = el.codeSnippet || el.content || "";
      return `<pre class="fs-code-block"${idAttr}${classAttr}${styleAttr}><code class="language-${escapeHtml(lang)}">${escapeHtml(snippet)}</code></pre>`;
    }
    case "breadcrumbs": {
      return `<nav aria-label="Breadcrumb" class="fs-breadcrumbs"${idAttr}${classAttr}${styleAttr}>
        <ol>
          <li><a href="index.html">Home</a></li>
          <li><span>›</span></li>
          <li aria-current="page">${escapeHtml(el.currentLabel || el.content || "Page")}</li>
        </ol>
      </nav>`;
    }
    case "counter":
    case "animated-counter": {
      const prefix = el.counterPrefix || "";
      const val = el.counterEndNumber ?? el.content ?? 100;
      const suffix = el.counterSuffix || "+";
      const title = el.counterTitle || el.title || "";
      return `<div class="fs-counter"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-counter-num">${escapeHtml(prefix)}<span class="fs-counter-val">${escapeHtml(String(val))}</span>${escapeHtml(suffix)}</div>
        ${title ? `<div class="fs-counter-title">${escapeHtml(title)}</div>` : ""}
      </div>`;
    }
    case "progress-bar": {
      const pct = Math.min(Math.max(el.percentage || 80, 0), 100);
      const title = el.title || el.content || "";
      return `<div class="fs-progress-wrapper"${idAttr}${classAttr}${styleAttr}>
        ${title ? `<div class="fs-progress-header"><span>${escapeHtml(title)}</span><span>${pct}%</span></div>` : ""}
        <div class="fs-progress-track">
          <div class="fs-progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>`;
    }
    case "alert": {
      const alertType = el.alertType || "info";
      const iconMap: Record<string, string> = { success: "✓", warning: "⚠", danger: "✕", info: "ℹ" };
      return `<div class="fs-alert fs-alert-${escapeHtml(alertType)}"${idAttr}${classAttr}${styleAttr} role="alert">
        <span class="fs-alert-icon">${iconMap[alertType] || "ℹ"}</span>
        <div class="fs-alert-msg">${escapeHtml(el.content || el.alertMessage || "Notice")}</div>
      </div>`;
    }
    case "blockquote": {
      const author = el.quoteAuthor || el.author || "";
      return `<blockquote class="fs-blockquote"${idAttr}${classAttr}${styleAttr}>
        <p>${escapeHtml(el.quoteContent || el.content || "")}</p>
        ${author ? `<cite>— ${escapeHtml(author)}</cite>` : ""}
      </blockquote>`;
    }
    case "video":
    case "video-playlist": {
      const src = el.videoUrl || el.src || "";
      const isEmbed = src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com");
      return `<div class="fs-video-wrapper"${idAttr}${classAttr}${styleAttr}>
        ${isEmbed ? `<iframe src="${escapeHtml(src)}" frameborder="0" allowfullscreen loading="lazy"></iframe>` : `<video controls src="${escapeHtml(src)}" poster="${escapeHtml(el.videoPoster || "")}"></video>`}
      </div>`;
    }
    case "audio-playlist": {
      const tracks = Array.isArray(el.audioPlaylistTracks) ? el.audioPlaylistTracks : (Array.isArray(el.tracks) ? el.tracks : []);
      const tracksHtml = tracks.map((t: any) => `<li>${escapeHtml(t.title || "Track")} - ${escapeHtml(t.artist || "")}</li>`).join("\n");
      return `<div class="fs-audio-playlist"${idAttr}${classAttr}${styleAttr}>
        <audio controls src="${escapeHtml(el.audioUrl || el.src || "")}"></audio>
        ${tracks.length > 0 ? `<ul class="fs-audio-tracks">${tracksHtml}</ul>` : ""}
      </div>`;
    }
    case "wc-product-title": {
      return `<h2 class="fs-wc-title"${idAttr}${classAttr}${styleAttr}>${escapeHtml(el.content || el.productTitle || "Product Title")}</h2>`;
    }
    case "wc-product-price": {
      return `<div class="fs-wc-price"${idAttr}${classAttr}${styleAttr}><span class="fs-price">${escapeHtml(el.content || el.productPrice || "$99.00")}</span></div>`;
    }
    case "wc-product-images": {
      return `<div class="fs-wc-images"${idAttr}${classAttr}${styleAttr}><img src="${escapeHtml(el.src || el.productImage || "/placeholder.jpg")}" alt="Product" /></div>`;
    }
    case "wc-add-to-cart": {
      return `<div class="fs-wc-add-to-cart"${idAttr}${classAttr}${styleAttr}><button type="button" class="btn btn-cart btn-add-to-cart" data-product-id="${escapeHtml(el.productId || "default")}">${escapeHtml(el.content || el.buttonText || "Add to Cart")}</button></div>`;
    }
    case "wc-product-rating": {
      return `<div class="fs-wc-rating"${idAttr}${classAttr}${styleAttr}><span class="fs-stars">★★★★★</span></div>`;
    }
    case "wc-builder":
    case "wc-product": {
      const childMarkup = Array.isArray(el.children)
        ? el.children.map((c: any) => renderElementToHtml(c, allPages, websiteId)).join("\n")
        : "";
      return `<div class="fs-wc-product-builder"${idAttr}${classAttr}${styleAttr}>${childMarkup}</div>`;
    }
    case "wc-product-stock": {
      const threshold = el.stockThreshold ?? 5;
      const inStockLabel = el.inStockLabel || "In Stock (Ready to Ship)";
      const inStockColor = el.inStockColor || "#10b981";
      return `<div class="fs-wc-stock"${idAttr}${classAttr}${styleAttr}><span class="fs-stock-badge" style="color: ${escapeHtml(inStockColor)};">✓ ${escapeHtml(inStockLabel)}</span></div>`;
    }
    case "wc-product-meta": {
      const showSku = el.metaShowSku !== false;
      const showCat = el.metaShowCategory !== false;
      const showTags = el.metaShowTags !== false;
      const sep = el.metaSeparator || " | ";
      const parts: string[] = [];
      if (showSku) parts.push(`<span><strong>SKU:</strong> FS-9000</span>`);
      if (showCat) parts.push(`<span><strong>Category:</strong> Electronics</span>`);
      if (showTags) parts.push(`<span><strong>Tags:</strong> Audio, Pro</span>`);
      return `<div class="fs-wc-meta"${idAttr}${classAttr}${styleAttr}>${parts.join(`<span class="sep">${escapeHtml(sep)}</span>`)}</div>`;
    }
    case "wc-product-content": {
      const content = el.productDescriptionOverride || el.content || "Detailed product description explaining features, craftsmanship, technical specifications, and manufacturer highlights.";
      return `<div class="fs-wc-content"${idAttr}${classAttr}${styleAttr}><p>${escapeHtml(content)}</p></div>`;
    }
    case "wc-short-description": {
      const shortDesc = el.productDescriptionOverride || el.content || "Premium flagship edition crafted with precision engineering and high-fidelity acoustics.";
      return `<div class="fs-wc-short-desc"${idAttr}${classAttr}${styleAttr}><p>${escapeHtml(shortDesc)}</p></div>`;
    }
    case "wc-product-data-tabs": {
      const tabs = Array.isArray(el.tabsData) && el.tabsData.length > 0 ? el.tabsData : [
        { id: "desc", title: "Description", content: "Comprehensive specifications and user guide." },
        { id: "info", title: "Additional Information", content: "Weight: 250g | Dimensions: 18x16x8cm" },
        { id: "reviews", title: "Reviews (24)", content: "Customer satisfaction rating 4.9/5 stars." },
      ];
      return `<div class="fs-wc-tabs"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-tabs-nav">${tabs.map((t: any, i: number) => `<button class="tab-btn${i === 0 ? " active" : ""}">${escapeHtml(t.title)}</button>`).join("")}</div>
        <div class="fs-tabs-body"><div class="tab-pane">${escapeHtml(tabs[0]?.content || "")}</div></div>
      </div>`;
    }
    case "wc-additional-info": {
      const attrs = Array.isArray(el.additionalInfoAttributes) && el.additionalInfoAttributes.length > 0 ? el.additionalInfoAttributes : [
        { key: "Weight", value: "250g" },
        { key: "Dimensions", value: "18 x 16 x 8 cm" },
        { key: "Warranty", value: "2 Years Limited" },
        { key: "Material", value: "Aviation Aluminum & Leather" },
      ];
      return `<table class="fs-wc-attributes"${idAttr}${classAttr}${styleAttr}>
        <tbody>${attrs.map((a: any) => `<tr><th>${escapeHtml(a.key)}</th><td>${escapeHtml(a.value)}</td></tr>`).join("")}</tbody>
      </table>`;
    }
    case "wc-related-products":
    case "wc-upsells": {
      const isUpsell = el.type === "wc-upsells";
      const heading = isUpsell ? "Complete the Experience" : "Related Products";
      const limit = el.relatedLimit || el.upsellsLimit || 4;
      const cols = el.relatedColumns || el.upsellsColumns || 4;
      const dummyProducts = [
        { title: "Wireless Noise-Cancelling Earbuds", price: "$149.00", img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500" },
        { title: "Hi-Fi DAC Headphone Amp", price: "$199.00", img: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500" },
        { title: "Braided Silver Audio Cable", price: "$39.00", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500" },
        { title: "Studio Aluminum Headphone Stand", price: "$49.00", img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500" },
      ].slice(0, limit);
      return `<section class="fs-wc-grid-section fs-wc-${isUpsell ? "upsells" : "related"}"${idAttr}${classAttr}${styleAttr}>
        <h3 class="fs-wc-section-title">${escapeHtml(heading)}</h3>
        <div class="fs-wc-grid" style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 20px;">
          ${dummyProducts.map((p) => `<div class="fs-wc-card"><img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.title)}" loading="lazy" /><h4 class="title">${escapeHtml(p.title)}</h4><div class="price">${escapeHtml(p.price)}</div></div>`).join("")}
        </div>
      </section>`;
    }
    case "wc-products":
    case "wc-product-archive":
    case "wc-shop-layouts": {
      const cols = el.shopLayoutColumns || 3;
      const gap = el.shopLayoutGap ?? 24;
      const count = el.productsPerPage || 6;
      const items = Array.from({ length: Math.min(count, 8) }).map((_, i) => ({
        id: `prod-${i + 1}`,
        title: `Store Product #${i + 1}`,
        price: `$${(49 + i * 20).toFixed(2)}`,
        img: `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500`,
      }));
      return `<div class="fs-wc-catalog"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-wc-catalog-grid" style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: ${gap}px;">
          ${items.map((it) => `<div class="fs-wc-product-card" data-product-id="${it.id}">
            <img src="${escapeHtml(it.img)}" alt="${escapeHtml(it.title)}" loading="lazy" />
            <h3>${escapeHtml(it.title)}</h3>
            <div class="price">${escapeHtml(it.price)}</div>
            <button type="button" class="btn btn-cart btn-add-to-cart" data-product-id="${it.id}">Add to Cart</button>
          </div>`).join("")}
        </div>
      </div>`;
    }
    case "wc-custom-add-to-cart": {
      const pid = el.customAddToCartProductId || "custom-product";
      const label = el.content || el.buttonText || "Buy Now";
      return `<div class="fs-wc-custom-btn"${idAttr}${classAttr}${styleAttr}>
        <button type="button" class="btn btn-primary btn-add-to-cart" data-product-id="${escapeHtml(pid)}">${escapeHtml(label)}</button>
      </div>`;
    }
    case "wc-product-categories": {
      const cats = ["Headphones (12)", "Amplifiers & DACs (6)", "Accessories & Cables (18)", "Audio Interfaces (4)"];
      return `<div class="fs-wc-categories"${idAttr}${classAttr}${styleAttr}>
        <h4>Product Categories</h4>
        <ul>${cats.map((c) => `<li><a href="#">${escapeHtml(c)}</a></li>`).join("")}</ul>
      </div>`;
    }
    case "wc-menu-cart": {
      return `<div class="fs-wc-menu-cart"${idAttr}${classAttr}${styleAttr}>
        <a href="cart.html" class="fs-menu-cart-link">
          <span class="icon">🛒</span>
          <span class="fs-cart-count">0</span>
        </a>
      </div>`;
    }
    case "wc-cart": {
      const btnLabel = el.cartButtonLabel || "Proceed to Checkout";
      const accent = el.cartAccentColor || "#2563eb";
      return `<div class="fs-wc-cart-view"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-cart-table-wrapper">
          <table class="fs-cart-table">
            <thead><tr><th>Product</th><th>Price</th><th>Quantity</th><th>Total</th><th></th></tr></thead>
            <tbody id="fs-cart-tbody">
              <tr><td colspan="5" style="text-align: center; padding: 24px;">Your cart is currently empty.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="fs-cart-summary">
          <div class="subtotal-row"><strong>Subtotal:</strong> <span id="fs-cart-subtotal">$0.00</span></div>
          <a href="checkout.html" class="btn btn-checkout" style="background-color: ${escapeHtml(accent)}; color: #fff;">${escapeHtml(btnLabel)}</a>
        </div>
      </div>`;
    }
    case "wc-checkout": {
      const btnLabel = el.checkoutButtonLabel || "Place Order";
      const accent = el.checkoutAccentColor || "#2563eb";
      return `<div class="fs-wc-checkout-view"${idAttr}${classAttr}${styleAttr}>
        <form id="fs-checkout-form" class="fs-checkout-form">
          <div class="form-cols" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="billing-col">
              <h3>Billing Information</h3>
              <input type="text" name="customerName" placeholder="Full Name" required />
              <input type="email" name="customerEmail" placeholder="Email Address" required />
              <input type="text" name="address" placeholder="Street Address" required />
              <input type="text" name="city" placeholder="City" required />
            </div>
            <div class="order-col">
              <h3>Your Order</h3>
              <div id="fs-checkout-items">Items from cart will appear here</div>
              <button type="submit" class="btn btn-order" style="background-color: ${escapeHtml(accent)}; color: #fff; width: 100%; margin-top: 16px;">${escapeHtml(btnLabel)}</button>
            </div>
          </div>
        </form>
      </div>`;
    }
    case "wc-my-account": {
      return `<div class="fs-wc-account"${idAttr}${classAttr}${styleAttr}>
        <h3>My Account</h3>
        <p>Login or register to view recent orders, manage shipping and billing addresses, and edit account details.</p>
      </div>`;
    }
    case "wc-purchase-summary": {
      return `<div class="fs-wc-order-summary"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-alert fs-alert-success">Thank you. Your order has been received.</div>
      </div>`;
    }
    case "wc-notices": {
      return `<div class="fs-wc-notices"${idAttr}${classAttr}${styleAttr} id="fs-store-notices"></div>`;
    }
    case "wc-product-page-templates":
    case "wc-product-archive-templates": {
      const childMarkup = Array.isArray(el.children)
        ? el.children.map((c: any) => renderElementToHtml(c, allPages, websiteId)).join("\n")
        : "";
      return `<div class="fs-wc-template-wrapper"${idAttr}${classAttr}${styleAttr}>${childMarkup}</div>`;
    }
    case "wc-product-addons": {
      const addons = Array.isArray(el.productAddons) && el.productAddons.length > 0 ? el.productAddons : [
        { id: "addon-gift", label: "Luxury Gift Wrapping & Ribbon", type: "checkbox", priceAdjustment: 4.99 },
        { id: "addon-warranty", label: "2-Year Extended Hardware Protection", type: "checkbox", priceAdjustment: 19.99 },
        { id: "addon-engrave", label: "Custom Laser Name Engraving", type: "text", priceAdjustment: 9.99 },
        { id: "addon-cable", label: "Audio Cable Upgrade", type: "select", priceAdjustment: 14.99, options: ["Braided Silver 3.5mm (+$14.99)", "Balanced 4.4mm (+$24.99)"] },
      ];
      return `<div class="fs-wc-addons-card"${idAttr}${classAttr}${styleAttr}>
        <h4 class="fs-addons-title">Customizable Product Options & Add-Ons</h4>
        <div class="fs-addons-list">
          ${addons.map((a: any) => {
            const adj = Number(a.priceAdjustment || 0);
            const adjStr = adj > 0 ? ` (+₹/${adj.toFixed(2)})` : "";
            if (a.type === "checkbox") {
              return `<label class="fs-addon-field"><input type="checkbox" name="fs_addon_${escapeHtml(a.id)}" data-price="${adj}" /> ${escapeHtml(a.label)}${escapeHtml(adjStr)}</label>`;
            }
            if (a.type === "select") {
              const opts = Array.isArray(a.options) ? a.options : ["Standard (+$0.00)"];
              return `<div class="fs-addon-field"><label>${escapeHtml(a.label)}${escapeHtml(adjStr)}</label><select name="fs_addon_${escapeHtml(a.id)}">${opts.map((o: string) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("")}</select></div>`;
            }
            return `<div class="fs-addon-field"><label>${escapeHtml(a.label)}${escapeHtml(adjStr)}</label><input type="text" name="fs_addon_${escapeHtml(a.id)}" placeholder="Enter custom detail..." /></div>`;
          }).join("")}
        </div>
      </div>`;
    }
    case "customHtml":
    case "rawHtml":
    case "html":
    case "shortcode": {
      return el.content || el.html || "";
    }
    case "loop-grid": {
      const defaultPosts = [
        { title: "Design Systems in 2026", excerpt: "How to build modular scalable component libraries.", category: "Design", date: "Jan 15, 2026", slug: "design-systems-2026", featuredImage: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80" },
        { title: "Next-Gen CSS Architecture", excerpt: "Mastering subgrid, container queries, and native nesting.", category: "Architecture", date: "Jan 22, 2026", slug: "next-gen-css", featuredImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80" },
        { title: "Modern Headless WordPress", excerpt: "Decoupled frontends with lightning fast response times.", category: "Development", date: "Feb 02, 2026", slug: "headless-wordpress", featuredImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80" },
      ];
      const dynamicPosts = Array.isArray(el.cptEntries) && el.cptEntries.length > 0
        ? el.cptEntries.map((e: any) => ({
            title: e.title || e.name || "Untitled",
            excerpt: e.data?.description || e.data?.excerpt || e.description || "",
            featuredImage: e.data?.image || e.data?.featuredImage || e.featuredImage || "",
            category: e.data?.category || e.category || "",
            date: e.createdAt || e.data?.date || "",
            slug: e.slug || "",
          }))
        : null;
      const posts = dynamicPosts || (Array.isArray(el.posts) && el.posts.length > 0 ? el.posts : defaultPosts);
      const cols = Math.min(Math.max(el.loopColumns || 3, 1), 6);
      const gap = el.loopGap ?? 24;
      const limit = el.queryLimit || 6;
      const displayPosts = posts.slice(0, limit);

      const cardsHtml = displayPosts.map((post: any, idx: number) => {
        const isAlternate = idx % 2 === 1 && !!el.alternateTemplateId;
        const altClass = isAlternate ? " fs-loop-card-alt" : "";
        const title = escapeHtml(post.title || "Untitled");
        const excerpt = escapeHtml(post.excerpt || "");
        const img = post.featuredImage ? `<img src="${escapeHtml(post.featuredImage)}" alt="${title}" class="fs-loop-card-img" loading="lazy" />` : "";
        const category = post.category ? `<span class="fs-loop-card-cat">${escapeHtml(post.category)}</span>` : "";
        const date = post.date ? `<span class="fs-loop-card-date">${escapeHtml(post.date)}</span>` : "";
        const slug = post.slug || "#";
        return `
        <article class="fs-loop-card${altClass}" data-loop-item-index="${idx}" data-modulo="${idx % 2}" data-alternate="${isAlternate ? "true" : "false"}">
          ${img ? `<div class="fs-loop-card-media">${img}${category}</div>` : ""}
          <div class="fs-loop-card-body">
            ${date}
            <h3 class="fs-loop-card-title"><a href="/${escapeHtml(slug)}">${title}</a></h3>
            ${excerpt ? `<p class="fs-loop-card-excerpt">${excerpt}</p>` : ""}
            <a href="/${escapeHtml(slug)}" class="fs-loop-card-link">Read Article →</a>
          </div>
        </article>`;
      }).join("\n");

      const gridStyle = `display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:${gap}px;`;
      return `<div class="fs-loop-grid"${idAttr}${classAttr} style="${gridStyle}${styleAttr ? styleAttr.replace(/^\\s*style="/, "").replace(/"$/, "") : ""}">\n${cardsHtml}\n</div>`;
    }
    case "posts": {
      const defaultPosts = [
        { title: "Design Systems in 2026", excerpt: "Building modular component systems with speed.", date: "Jan 15, 2026", author: "Forge Team", thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80", link: "#" },
        { title: "Responsive Layout Architecture", excerpt: "CSS Grid and Container Queries explained.", date: "Jan 22, 2026", author: "Frontend Lead", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80", link: "#" },
        { title: "Static Site Optimization", excerpt: "Delivering zero-runtime footprint static builds.", date: "Feb 02, 2026", author: "Core Dev", thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80", link: "#" }
      ];
      const posts = Array.isArray(el.posts) && el.posts.length > 0 ? el.posts : defaultPosts;
      const cols = Math.min(Math.max(el.columns || 3, 1), 6);
      const cardsHtml = posts.map((post: any) => {
        const title = escapeHtml(post.title || "Untitled Post");
        const excerpt = escapeHtml(post.excerpt || "");
        const author = post.author ? `<span class="fs-post-author">${escapeHtml(post.author)}</span>` : "";
        const date = post.date ? `<span class="fs-post-date">${escapeHtml(post.date)}</span>` : "";
        const href = resolveStaticHtmlHref(post.link || post.url || "#", allPages);
        const thumb = post.thumbnail ? `<div class="fs-post-thumb"><img src="${escapeHtml(post.thumbnail)}" alt="${title}" loading="lazy" /></div>` : "";
        return `<article class="fs-post-card">
          ${thumb}
          <div class="fs-post-body">
            <div class="fs-post-meta">${author}${date}</div>
            <h3 class="fs-post-title"><a href="${escapeHtml(href)}">${title}</a></h3>
            ${excerpt ? `<p class="fs-post-excerpt">${excerpt}</p>` : ""}
            <a href="${escapeHtml(href)}" class="fs-post-link">Read More →</a>
          </div>
        </article>`;
      }).join("\n");
      return `<div class="fs-posts-grid"${idAttr}${classAttr} style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:24px;${styleAttr ? styleAttr.replace(/^\\s*style="/, "").replace(/"$/, "") : ""}">\n${cardsHtml}\n</div>`;
    }
    case "portfolio": {
      const defaultItems = [
        { title: "Brand Identity Project", category: "Branding", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80", link: "#" },
        { title: "Digital Platform Redesign", category: "Web Design", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80", link: "#" },
        { title: "Mobile Commerce App", category: "Mobile UI", image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80", link: "#" }
      ];
      const items = Array.isArray(el.items) && el.items.length > 0 ? el.items : defaultItems;
      const cols = Math.min(Math.max(el.columns || 3, 1), 6);
      const itemsHtml = items.map((item: any) => {
        const title = escapeHtml(item.title || "Portfolio Item");
        const category = escapeHtml(item.category || "");
        const href = resolveStaticHtmlHref(item.link || item.url || "#", allPages);
        return `<div class="fs-portfolio-item">
          <div class="fs-portfolio-thumb">
            <img src="${escapeHtml(item.image || "")}" alt="${title}" loading="lazy" />
            <div class="fs-portfolio-overlay">
              <span class="fs-portfolio-cat">${category}</span>
              <h4 class="fs-portfolio-title"><a href="${escapeHtml(href)}">${title}</a></h4>
            </div>
          </div>
        </div>`;
      }).join("\n");
      return `<div class="fs-portfolio-grid"${idAttr}${classAttr} style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:20px;${styleAttr ? styleAttr.replace(/^\\s*style="/, "").replace(/"$/, "") : ""}">\n${itemsHtml}\n</div>`;
    }
    case "rating": {
      const max = Math.min(Math.max(Number(el.maxRating || el.scale || 5), 1), 10);
      const val = Math.min(Math.max(Number(el.rating || el.value || 4.5), 0), max);
      const stars = [];
      for (let i = 1; i <= max; i++) {
        stars.push(i <= Math.round(val) ? "★" : "☆");
      }
      return `<div class="fs-rating-widget"${idAttr}${classAttr}${styleAttr}>
        <span class="fs-rating-stars" style="color:${escapeHtml(el.starColor || "#f59e0b")};letter-spacing:2px;font-size:1.25rem;">${stars.join("")}</span>
        ${el.showNumber !== false ? `<span class="fs-rating-score" style="margin-left:8px;font-weight:600;color:#64748b;">${val.toFixed(1)} / ${max}</span>` : ""}
      </div>`;
    }
    case "soundcloud": {
      const trackUrl = el.trackUrl || el.url || "https://soundcloud.com/forss/flickermood";
      const height = el.height || 166;
      const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
      return `<div class="fs-soundcloud-widget"${idAttr}${classAttr}${styleAttr}>
        <iframe width="100%" height="${height}" scrolling="no" frameborder="no" allow="autoplay" src="${escapeHtml(src)}"></iframe>
      </div>`;
    }
    case "link-in-bio": {
      const name = escapeHtml(el.name || el.title || "Creator Profile");
      const bio = escapeHtml(el.bio || el.subtitle || "Welcome to my official links page.");
      const avatar = el.avatar || el.image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
      const links = Array.isArray(el.links) && el.links.length > 0 ? el.links : [
        { label: "My Latest Projects", url: "#", icon: "🌐" },
        { label: "Book a Consultation", url: "#", icon: "📅" },
        { label: "Join the Newsletter", url: "#", icon: "✉️" }
      ];
      const linksHtml = links.map((l: any) => {
        const href = resolveStaticHtmlHref(l.url || l.href || "#", allPages);
        return `<a href="${escapeHtml(href)}" class="fs-bio-btn">${l.icon ? `<span class="fs-bio-btn-icon">${escapeHtml(l.icon)}</span>` : ""}<span class="fs-bio-btn-label">${escapeHtml(l.label || l.title || "Link")}</span></a>`;
      }).join("\n");
      return `<div class="fs-link-in-bio"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-bio-avatar-wrap"><img src="${escapeHtml(avatar)}" alt="${name}" class="fs-bio-avatar" /></div>
        <h2 class="fs-bio-name">${name}</h2>
        <p class="fs-bio-desc">${bio}</p>
        <div class="fs-bio-links">${linksHtml}</div>
      </div>`;
    }
    case "image-box": {
      const title = escapeHtml(el.title || "Image Box Title");
      const desc = escapeHtml(el.description || el.content || "");
      const src = el.image || el.src || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80";
      const href = resolveStaticHtmlHref(el.link || el.href || "", allPages);
      const inner = `
        <div class="fs-image-box-img"><img src="${escapeHtml(src)}" alt="${title}" loading="lazy" /></div>
        <div class="fs-image-box-content">
          <h3 class="fs-image-box-title">${title}</h3>
          ${desc ? `<p class="fs-image-box-desc">${desc}</p>` : ""}
        </div>`;
      if (href && href !== "#") {
        return `<a href="${escapeHtml(href)}" class="fs-image-box"${idAttr}${classAttr}${styleAttr}>${inner}</a>`;
      }
      return `<div class="fs-image-box"${idAttr}${classAttr}${styleAttr}>${inner}</div>`;
    }
    case "icon-box": {
      const title = escapeHtml(el.title || "Feature Title");
      const desc = escapeHtml(el.description || el.content || "Feature description providing essential details.");
      const icon = escapeHtml(el.icon || el.iconName || "✦");
      const href = resolveStaticHtmlHref(el.link || el.href || "", allPages);
      const inner = `
        <div class="fs-icon-box-icon" style="color:${escapeHtml(el.iconColor || "var(--primary-color)")};">${icon}</div>
        <div class="fs-icon-box-content">
          <h3 class="fs-icon-box-title">${title}</h3>
          ${desc ? `<p class="fs-icon-box-desc">${desc}</p>` : ""}
        </div>`;
      if (href && href !== "#") {
        return `<a href="${escapeHtml(href)}" class="fs-icon-box"${idAttr}${classAttr}${styleAttr}>${inner}</a>`;
      }
      return `<div class="fs-icon-box"${idAttr}${classAttr}${styleAttr}>${inner}</div>`;
    }
    case "icon-list": {
      const defaultItems = [
        { text: "Fast static compilation with zero runtime overhead", icon: "✓" },
        { text: "Fully responsive multi-breakpoint layout engine", icon: "✓" },
        { text: "Enterprise security and tenant isolation", icon: "✓" }
      ];
      const items = Array.isArray(el.items) && el.items.length > 0 ? el.items : defaultItems;
      const itemsHtml = items.map((it: any) => {
        const text = escapeHtml(it.text || it.title || "");
        const icon = escapeHtml(it.icon || el.defaultIcon || "✓");
        return `<li class="fs-icon-list-item"><span class="fs-icon-list-bullet">${icon}</span><span class="fs-icon-list-text">${text}</span></li>`;
      }).join("\n");
      return `<ul class="fs-icon-list"${idAttr}${classAttr}${styleAttr}>\n${itemsHtml}\n</ul>`;
    }
    case "tabs":
    case "nested-tabs": {
      const tabs = Array.isArray(el.tabs) && el.tabs.length > 0 ? el.tabs : [
        { id: "tab-1", title: "Overview", content: "Comprehensive overview of platform capabilities and features." },
        { id: "tab-2", title: "Specifications", content: "Deterministic architecture and responsive parity specifications." },
        { id: "tab-3", title: "Integration", content: "Seamless workflow between editor, published site, and static export." }
      ];
      const navHtml = tabs.map((t: any, idx: number) => {
        const tabId = escapeHtml(t.id || `tab_${idx}`);
        const activeClass = idx === 0 ? " active" : "";
        return `<button type="button" class="fs-tab-btn${activeClass}" data-tab-target="${tabId}">${escapeHtml(t.title || `Tab ${idx + 1}`)}</button>`;
      }).join("\n");
      const panesHtml = tabs.map((t: any, idx: number) => {
        const tabId = escapeHtml(t.id || `tab_${idx}`);
        const activeClass = idx === 0 ? " active" : "";
        let contentHtml = "";
        if (Array.isArray(t.elements) && t.elements.length > 0) {
          contentHtml = t.elements.map((child: any) => renderElementToHtml(child, allPages, websiteId)).join("\n");
        } else {
          contentHtml = escapeHtml(t.content || "");
        }
        return `<div class="fs-tab-pane${activeClass}" data-tab-id="${tabId}" id="${tabId}">${contentHtml}</div>`;
      }).join("\n");
      return `<div class="fs-tabs-widget"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-tabs-nav">${navHtml}</div>
        <div class="fs-tabs-content">${panesHtml}</div>
      </div>`;
    }
    case "accordion":
    case "nested-accordion":
    case "toggle": {
      const items = Array.isArray(el.items) && el.items.length > 0 ? el.items : [
        { title: "What is Tri-Renderer Parity?", content: "Tri-Renderer Parity guarantees identical behavior across Editor Canvas, Published SPA, and Static Export.", open: true },
        { title: "How does Responsive Layout work?", content: "All media query breakpoints cascade gracefully across Desktop, Tablet, and Mobile viewports.", open: false },
        { title: "How are backend dependencies secured?", content: "Commerce, form submissions, and authentication strictly require validated server endpoints.", open: false }
      ];
      const itemsHtml = items.map((it: any, idx: number) => {
        const isOpen = it.open || (idx === 0 && el.firstItemOpen !== false);
        const activeClass = isOpen ? " active" : "";
        let contentHtml = "";
        if (Array.isArray(it.elements) && it.elements.length > 0) {
          contentHtml = it.elements.map((child: any) => renderElementToHtml(child, allPages, websiteId)).join("\n");
        } else {
          contentHtml = escapeHtml(it.content || "");
        }
        return `<div class="fs-accordion-item${activeClass}">
          <button type="button" class="fs-accordion-header">
            <span>${escapeHtml(it.title || `Section ${idx + 1}`)}</span>
            <span class="fs-accordion-icon">▾</span>
          </button>
          <div class="fs-accordion-content" style="${isOpen ? "display:block;" : "display:none;"}">${contentHtml}</div>
        </div>`;
      }).join("\n");
      return `<div class="fs-accordion-widget"${idAttr}${classAttr}${styleAttr}>\n${itemsHtml}\n</div>`;
    }
    case "animated-headline": {
      const prefix = escapeHtml(el.prefix || el.beforeText || "We Build");
      const animated = escapeHtml(el.animatedText || el.highlightedText || el.text || "Extraordinary");
      const suffix = escapeHtml(el.suffix || el.afterText || "Web Experiences");
      const styleType = escapeHtml(el.animationStyle || "highlight");
      return `<div class="fs-animated-headline fs-headline-${styleType}"${idAttr}${classAttr}${styleAttr}>
        <span class="fs-headline-prefix">${prefix}</span>
        <span class="fs-headline-dynamic" style="color:var(--primary-color);font-weight:bold;text-decoration:underline;">${animated}</span>
        <span class="fs-headline-suffix">${suffix}</span>
      </div>`;
    }
    case "table-of-contents":
    case "toc": {
      const title = escapeHtml(el.title || "Table of Contents");
      const defaultHeadings = [
        { text: "1. Overview & Objectives", anchor: "overview" },
        { text: "2. Architecture & Design", anchor: "architecture" },
        { text: "3. Implementation Details", anchor: "implementation" },
        { text: "4. Verification & Testing", anchor: "testing" }
      ];
      const headings = Array.isArray(el.headings) && el.headings.length > 0 ? el.headings : defaultHeadings;
      const linksHtml = headings.map((h: any) => {
        return `<li><a href="#${escapeHtml(h.anchor || h.id || "")}">${escapeHtml(h.text || h.title || "")}</a></li>`;
      }).join("\n");
      return `<nav class="fs-toc-widget"${idAttr}${classAttr}${styleAttr}>
        <h4 class="fs-toc-title">${title}</h4>
        <ul class="fs-toc-list">\n${linksHtml}\n</ul>
      </nav>`;
    }
    case "facebook-page": {
      const pageUrl = el.pageUrl || el.url || "https://www.facebook.com/facebook";
      const title = escapeHtml(el.title || "Follow us on Facebook");
      return `<div class="fs-facebook-page"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-fb-card">
          <div class="fs-fb-icon">f</div>
          <div class="fs-fb-info">
            <h4 class="fs-fb-title">${title}</h4>
            <a href="${escapeHtml(pageUrl)}" target="_blank" rel="noopener noreferrer" class="fs-fb-link">Visit Facebook Page →</a>
          </div>
        </div>
      </div>`;
    }
    case "paypal-button": {
      const btnText = escapeHtml(el.buttonText || el.text || "Pay with PayPal");
      const amount = Number(el.amount || 29.99).toFixed(2);
      const isConfigured = Boolean(el.clientId || el.merchantId);
      return `<div class="fs-paypal-button-wrap"${idAttr}${classAttr}${styleAttr}>
        <button type="button" class="fs-paypal-btn" data-paypal-amount="${amount}" ${!isConfigured ? 'data-requires-config="true"' : ""}>
          <span class="fs-paypal-icon">PayPal</span>
          <span class="fs-paypal-text">${btnText} ($${amount})</span>
        </button>
        ${!isConfigured ? `<p class="fs-payment-notice" style="font-size:0.75rem;color:#64748b;margin-top:4px;">Live payment processing requires merchant configuration.</p>` : ""}
      </div>`;
    }
    case "stripe-button": {
      const btnText = escapeHtml(el.buttonText || el.text || "Checkout with Stripe");
      const amount = Number(el.amount || 49.00).toFixed(2);
      const isConfigured = Boolean(el.publishableKey || el.priceId);
      return `<div class="fs-stripe-button-wrap"${idAttr}${classAttr}${styleAttr}>
        <button type="button" class="fs-stripe-btn" data-stripe-amount="${amount}" ${!isConfigured ? 'data-requires-config="true"' : ""}>
          <span class="fs-stripe-icon">Stripe</span>
          <span class="fs-stripe-text">${btnText} ($${amount})</span>
        </button>
        ${!isConfigured ? `<p class="fs-payment-notice" style="font-size:0.75rem;color:#64748b;margin-top:4px;">Stripe live checkout requires merchant publishable key.</p>` : ""}
      </div>`;
    }
    case "login": {
      const title = escapeHtml(el.title || "Sign In to Your Account");
      const btnText = escapeHtml(el.buttonText || "Log In");
      return `<div class="fs-login-widget"${idAttr}${classAttr}${styleAttr}>
        <form class="fs-login-form" action="/api/auth/login" method="POST">
          <h3 class="fs-login-title">${title}</h3>
          <div class="fs-field-group">
            <label for="fs_login_user_${escapeHtml(el.id || "0")}">Username or Email</label>
            <input type="text" id="fs_login_user_${escapeHtml(el.id || "0")}" name="username" required autocomplete="username" />
          </div>
          <div class="fs-field-group">
            <label for="fs_login_pass_${escapeHtml(el.id || "0")}">Password</label>
            <input type="password" id="fs_login_pass_${escapeHtml(el.id || "0")}" name="password" required autocomplete="current-password" />
          </div>
          <div class="fs-form-options">
            <label><input type="checkbox" name="remember" /> Remember me</label>
            <a href="#forgot" class="fs-forgot-link">Forgot password?</a>
          </div>
          <button type="submit" class="btn btn-primary fs-login-submit">${btnText}</button>
        </form>
      </div>`;
    }
    case "off-canvas": {
      const triggerText = escapeHtml(el.triggerText || el.label || "Open Panel");
      const panelId = escapeHtml(el.panelId || `panel_${el.id || "drawer"}`);
      const children = Array.isArray(el.elements) ? el.elements : (Array.isArray(el.children) ? el.children : []);
      const drawerContent = children.length > 0
        ? children.map((c: any) => renderElementToHtml(c, allPages, websiteId)).join("\n")
        : escapeHtml(el.content || "Off-canvas panel content");
      return `<div class="fs-off-canvas-container"${idAttr}${classAttr}${styleAttr}>
        <button type="button" class="btn fs-off-canvas-toggle" data-off-canvas-toggle="${panelId}">
          ${triggerText}
        </button>
        <div class="fs-off-canvas-drawer" id="${panelId}" data-off-canvas-panel="${panelId}">
          <div class="fs-off-canvas-header">
            <h4>${escapeHtml(el.title || "Menu")}</h4>
            <button type="button" class="fs-off-canvas-close" data-off-canvas-close="${panelId}">✕</button>
          </div>
          <div class="fs-off-canvas-body">${drawerContent}</div>
        </div>
        <div class="fs-off-canvas-backdrop" data-off-canvas-backdrop="${panelId}"></div>
      </div>`;
    }
    case "basic-media-carousel": {
      const slides = Array.isArray(el.slides) && el.slides.length > 0 ? el.slides : [
        { url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80", caption: "Slide 1" },
        { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80", caption: "Slide 2" },
        { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80", caption: "Slide 3" }
      ];
      const slidesHtml = slides.map((s: any, idx: number) => {
        return `<div class="fs-carousel-slide" data-slide-index="${idx}">
          <img src="${escapeHtml(s.url || s.image || "")}" alt="${escapeHtml(s.caption || `Slide ${idx + 1}`)}" loading="lazy" />
          ${s.caption ? `<div class="fs-carousel-caption">${escapeHtml(s.caption)}</div>` : ""}
        </div>`;
      }).join("\n");
      return `<div class="fs-carousel-widget"${idAttr}${classAttr}${styleAttr}>
        <div class="fs-carousel-track">${slidesHtml}</div>
        <button type="button" class="fs-carousel-prev" aria-label="Previous">❮</button>
        <button type="button" class="fs-carousel-next" aria-label="Next">❯</button>
      </div>`;
    }
    case "dynamic-lightbox": {
      const src = el.src || el.image || "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80";
      const alt = escapeHtml(el.alt || el.title || "Lightbox Image");
      return `<div class="fs-lightbox-item"${idAttr}${classAttr}${styleAttr}>
        <a href="${escapeHtml(src)}" data-lightbox-src="${escapeHtml(src)}" class="fs-lightbox-trigger">
          <img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" />
          <span class="fs-lightbox-zoom-icon">🔍</span>
        </a>
      </div>`;
    }
    case "wp-menu": {
      const menuItems = Array.isArray(el.menuItems) ? el.menuItems : (Array.isArray(el.items) ? el.items : [
        { label: "Home", url: "/" },
        { label: "About", url: "/about" },
        { label: "Services", url: "/services" },
        { label: "Contact", url: "/contact" }
      ]);
      const itemsHtml = menuItems.map((item: any) => {
        const href = resolveStaticHtmlHref(item.url || item.href || "#", allPages);
        return `<li class="fs-wp-menu-item"><a href="${escapeHtml(href)}">${escapeHtml(item.label || item.title || "Link")}</a></li>`;
      }).join("\n");
      return `<nav class="fs-wp-menu"${idAttr}${classAttr}${styleAttr}><ul class="fs-wp-menu-list">\n${itemsHtml}\n</ul></nav>`;
    }
    default: {
      const cap = getWidgetCapability(el.type);
      const isKnownLayout = ["container", "div", "div-block", "section", "row", "column"].includes(el.type);
      const children = Array.isArray(el.elements) ? el.elements : (Array.isArray(el.children) ? el.children : []);
      const fallbackChildren = children.length > 0
        ? children.map((child: any) => renderElementToHtml(child, allPages, websiteId)).join("\n")
        : escapeHtml(el.content || "");

      if (!isKnownLayout && (!cap || cap.staticExport === false || cap.staticSupportLevel === "not-supported")) {
        return `<div class="fs-unsupported-widget"${idAttr}${classAttr}${styleAttr} data-unsupported-widget="${escapeHtml(el.type || 'unknown')}">
          <div class="fs-unsupported-notice">
            <span class="fs-unsupported-badge">Interactive Widget</span>
            <span class="fs-unsupported-msg">Widget <strong>${escapeHtml(el.type || 'unknown')}</strong> is not supported in static export or requires server runtime.</span>
          </div>
          ${fallbackChildren}
        </div>`;
      }
      return `<div${idAttr}${classAttr}${styleAttr}>${fallbackChildren}</div>`;
    }
  }
}

function generatePageHtml(
  page: any,
  websiteData: any,
  allPages: any[],
  compiledCss: string
): string {
  const siteSettings = websiteData.siteSettings || {};
  const pSettings = page.pageSettings || {};
  const rawTitle = pSettings.title || page.title || page.name || "";
  const pageTitle = rawTitle
    ? `${rawTitle} | ${siteSettings.siteName || websiteData.name || "ForgeStudio"}`
    : siteSettings.siteName || websiteData.name || "ForgeStudio";
  const metaDesc = pSettings.description || page.metaDescription || siteSettings.metaDescription || "";
  const favicon = siteSettings.favicon || "/favicon.ico";

  // OpenGraph & Social Metadata with Site-wide Fallback Inheritance
  const ogTitle = pSettings.ogTitle || rawTitle || pageTitle;
  const ogDesc = pSettings.ogDescription || metaDesc;
  const ogImg = pSettings.ogImage || siteSettings.ogImage || siteSettings.logo || "";
  const canonicalUrl = pSettings.canonicalUrl || "";

  // Twitter Card Metadata
  const twitterCard = pSettings.twitterCard || siteSettings.twitterCard || (ogImg ? "summary_large_image" : "summary");
  const twitterTitle = pSettings.twitterTitle || ogTitle;
  const twitterDesc = pSettings.twitterDescription || ogDesc;
  const twitterImg = pSettings.twitterImage || ogImg;

  // Structured Data (Schema.org JSON-LD)
  let structuredDataScript = "";
  const structuredDataConfig = pSettings.structuredData || siteSettings.structuredData;
  const schemaType = pSettings.schemaType || siteSettings.schemaType;
  if (structuredDataConfig) {
    structuredDataScript = `<script type="application/ld+json">\n${escapeJsonLd(structuredDataConfig)}\n</script>`;
  } else if (schemaType) {
    const generated = generateStructuredData(schemaType, page, websiteData);
    structuredDataScript = `<script type="application/ld+json">\n${escapeJsonLd(generated)}\n</script>`;
  }

  // Robots Directives
  const robotsDirectives: string[] = [];
  if (pSettings.noindex) robotsDirectives.push("noindex");
  if (pSettings.nofollow) robotsDirectives.push("nofollow");

  // Site Header (supports both isEnabled and enabled, plus theme conditions)
  const currentWebsiteId = websiteData.id || websiteData.websiteId || "";
  let headerHtml = "";
  const headerPart = websiteData.siteParts?.header;
  const headerMatches = matchesThemeCondition(headerPart?.conditions, {
    pageId: page.id,
    isHome: page.isHome,
    slug: page.slug,
  });
  if (headerMatches && (headerPart?.isEnabled || headerPart?.enabled) && Array.isArray(headerPart.elements) && headerPart.elements.length > 0) {
    headerHtml = `<header class="site-header">\n${headerPart.elements.map((el: any) => renderElementToHtml(el, allPages, currentWebsiteId)).join("\n")}\n</header>`;
  }

  // Page Elements
  const pageElements = Array.isArray(page.elements) ? page.elements : [];
  const mainContent = pageElements.map((el: any) => renderElementToHtml(el, allPages, currentWebsiteId)).join("\n");

  // Site Footer (supports both isEnabled and enabled, plus theme conditions)
  let footerHtml = "";
  const footerPart = websiteData.siteParts?.footer;
  const footerMatches = matchesThemeCondition(footerPart?.conditions, {
    pageId: page.id,
    isHome: page.isHome,
    slug: page.slug,
  });
  if (footerMatches && (footerPart?.isEnabled || footerPart?.enabled) && Array.isArray(footerPart.elements) && footerPart.elements.length > 0) {
    footerHtml = `<footer class="site-footer">\n${footerPart.elements.map((el: any) => renderElementToHtml(el, allPages, currentWebsiteId)).join("\n")}\n</footer>`;
  }

  return `<!DOCTYPE html>
<html lang="${escapeHtml(siteSettings.siteLanguage || pSettings.siteLanguage || "en")}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  ${metaDesc ? `<meta name="description" content="${escapeHtml(metaDesc)}">` : ""}
  ${robotsDirectives.length > 0 ? `<meta name="robots" content="${escapeHtml(robotsDirectives.join(", "))}">` : ""}
  ${canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">` : ""}
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  ${ogDesc ? `<meta property="og:description" content="${escapeHtml(ogDesc)}">` : ""}
  ${ogImg ? `<meta property="og:image" content="${escapeHtml(ogImg)}">` : ""}
  <meta name="twitter:card" content="${escapeHtml(twitterCard)}">
  <meta name="twitter:title" content="${escapeHtml(twitterTitle)}">
  ${twitterDesc ? `<meta name="twitter:description" content="${escapeHtml(twitterDesc)}">` : ""}
  ${twitterImg ? `<meta name="twitter:image" content="${escapeHtml(twitterImg)}">` : ""}
  <link rel="icon" href="${escapeHtml(favicon)}">
  <link rel="stylesheet" href="styles.css">
  ${structuredDataScript ? `${structuredDataScript}` : ""}
  ${sanitizeCustomHead(siteSettings.customHead)}
  ${sanitizeCustomHead(pSettings.customHead)}
</head>
<body>
  ${headerHtml}
  <main class="page-content">
    ${mainContent}
  </main>
  ${footerHtml}
  <script src="runtime.js"></script>
</body>
</html>`;
}

function collectAllElements(nodes: any[]): any[] {
  const result: any[] = [];
  for (const node of nodes || []) {
    if (!node) continue;
    result.push(node);
    const children = Array.isArray(node.elements) ? node.elements : (Array.isArray(node.children) ? node.children : []);
    if (children.length > 0) {
      result.push(...collectAllElements(children));
    }
  }
  return result;
}

function objectToCssDeclarations(obj: any): string {
  if (!obj || typeof obj !== "object") return "";
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `    ${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v};`)
    .join("\n");
}

function generateResponsiveCss(websiteData: any): string {
  const allNodes: any[] = [];
  if (Array.isArray(websiteData.elements)) allNodes.push(...websiteData.elements);
  if (Array.isArray(websiteData.pages)) {
    for (const p of websiteData.pages) {
      if (Array.isArray(p.elements)) allNodes.push(...p.elements);
    }
  }
  if (websiteData.siteParts) {
    if (Array.isArray(websiteData.siteParts.header?.elements)) allNodes.push(...websiteData.siteParts.header.elements);
    if (Array.isArray(websiteData.siteParts.footer?.elements)) allNodes.push(...websiteData.siteParts.footer.elements);
  }

  const allElements = collectAllElements(allNodes);
  const desktopRules: string[] = [];
  const tabletRules: string[] = [];
  const mobileRules: string[] = [];

  for (const el of allElements) {
    if (!el || !el.id) continue;
    const selector = `#${el.id}`;

    // Desktop visibility
    if (el.visibility && el.visibility.desktop === false) {
      desktopRules.push(`${selector} { display: none !important; }`);
    }

    // Tablet visibility & styles (max-width: 1024px)
    if (el.visibility && el.visibility.tablet === false) {
      tabletRules.push(`  ${selector} { display: none !important; }`);
    }
    if (el.responsiveStyles && el.responsiveStyles.tablet) {
      const decls = objectToCssDeclarations(el.responsiveStyles.tablet);
      if (decls) {
        tabletRules.push(`  ${selector} {\n${decls}\n  }`);
      }
    }

    // Mobile visibility & styles (max-width: 768px)
    if (el.visibility && (el.visibility.mobile === false || el.visibility.phone === false)) {
      mobileRules.push(`  ${selector} { display: none !important; }`);
    }
    if (el.responsiveStyles && el.responsiveStyles.mobile) {
      const decls = objectToCssDeclarations(el.responsiveStyles.mobile);
      if (decls) {
        mobileRules.push(`  ${selector} {\n${decls}\n  }`);
      }
    }
  }

  let css = "";
  if (desktopRules.length > 0) {
    css += `\n/* Desktop Element Visibility Rules */\n${desktopRules.join("\n")}\n`;
  }
  css += `\n/* Responsive Layout Engine - Tablet Breakpoint (1024px) */\n@media (max-width: 1024px) {\n${tabletRules.join("\n")}\n}\n`;
  css += `\n/* Responsive Layout Engine - Mobile Breakpoint (768px) */\n@media (max-width: 768px) {\n  .fs-posts-grid, .fs-portfolio-grid, .fs-loop-grid, .fs-pricing-table {\n    grid-template-columns: 1fr !important;\n  }\n${mobileRules.join("\n")}\n}\n`;
  css += `\n/* Responsive Layout Engine - Narrow Mobile (480px) */\n@media (max-width: 480px) {\n  body { font-size: 15px; }\n}\n`;

  return css;
}

function generateGlobalCss(websiteData: any): string {
  const safeData = websiteData || {};
  const globalStyles = safeData.globalStyles || safeData.editorData?.globalStyles || {};
  const colors = globalStyles.colors || {};
  const typography = globalStyles.typography || {};

  const globalVars = validateVariables(safeData.globalVariables || safeData.editorData?.globalVariables || []);
  const globalClasses = validateClasses(safeData.globalClasses || safeData.editorData?.globalClasses || []);
  const designSystemCss = compileDesignSystemCss(globalVars, globalClasses);

  return `${designSystemCss ? designSystemCss + "\n\n" : ""}/* ForgeStudio Generated CSS */
:root {
  --primary-color: ${colors.primary || "#3b82f6"};
  --secondary-color: ${colors.secondary || "#10b981"};
  --background-color: ${colors.background || "#ffffff"};
  --text-color: ${colors.text || "#1f2937"};
  --font-family: ${typography.fontFamily || "system-ui, -apple-system, sans-serif"};
  --font-size-base: ${typography.fontSize || "16px"};
  --line-height-base: ${typography.lineHeight || "1.5"};
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--text-color);
  background-color: var(--background-color);
}

a {
  color: var(--primary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

.page-content {
  min-height: calc(100vh - 120px);
}

.site-header, .site-footer {
  width: 100%;
  padding: 1rem 2rem;
}

.btn {
  display: inline-block;
  padding: 0.625rem 1.25rem;
  background-color: var(--primary-color);
  color: #ffffff;
  border-radius: 6px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  text-decoration: none;
}

/* Pricing Table Widget */
.fs-pricing-table {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}
.fs-price-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem;
  background: #ffffff;
  position: relative;
}
.fs-price-card.fs-featured {
  border-color: var(--primary-color);
  box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.15);
}
.fs-price-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--primary-color);
  color: #fff;
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  font-weight: bold;
}
.fs-plan-name { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; }
.fs-price-val { font-size: 2rem; font-weight: 800; margin: 1rem 0; color: #0f172a; }
.fs-plan-features { list-style: none; margin: 1.5rem 0; }
.fs-plan-features li { padding: 0.4rem 0; font-size: 0.9rem; }
.fs-plan-features li.fs-excluded { color: #94a3b8; text-decoration: line-through; }

/* Flip Box Widget */
.fs-flip-box { perspective: 1000px; min-height: 250px; margin: 1rem 0; }
.fs-flip-box-inner { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; border-radius: 12px; border: 1px solid #e2e8f0; min-height: 250px; }
.fs-flip-box:hover .fs-flip-box-inner { transform: rotateY(180deg); }
.fs-flip-front, .fs-flip-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; padding: 2rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
.fs-flip-back { background: var(--primary-color); color: #fff; transform: rotateY(180deg); }

/* Gallery Widget */
.fs-gallery { display: grid; gap: 1rem; margin: 2rem 0; }
.fs-cols-2 { grid-template-columns: repeat(2, 1fr); }
.fs-cols-3 { grid-template-columns: repeat(3, 1fr); }
.fs-cols-4 { grid-template-columns: repeat(4, 1fr); }
.fs-gallery-item img { width: 100%; border-radius: 8px; object-fit: cover; }

/* Call To Action */
.fs-cta { display: flex; align-items: center; justify-content: space-between; gap: 2rem; padding: 3rem; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 2rem 0; }
.fs-cta-img { max-width: 300px; border-radius: 12px; }

/* Countdown */
.fs-countdown { display: flex; gap: 1rem; margin: 1.5rem 0; }
.fs-countdown-box { display: flex; flex-direction: column; align-items: center; padding: 1rem; background: #f1f5f9; border-radius: 8px; min-width: 70px; }
.fs-countdown-num { font-size: 1.75rem; font-weight: bold; color: #0f172a; }
.fs-countdown-lbl { font-size: 0.75rem; text-transform: uppercase; color: #64748b; }

/* Reviews */
.fs-reviews-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
.fs-review-card { padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.fs-review-header { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; }
.fs-review-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
.fs-review-stars { color: #f59e0b; }

/* Social Icons */
.fs-social-icons { display: flex; gap: 0.75rem; flex-wrap: wrap; margin: 1rem 0; }
.fs-social-btn { display: inline-flex; align-items: center; padding: 0.5rem 1rem; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 0.85rem; font-weight: 600; text-decoration: none; }

/* Breadcrumbs */
.fs-breadcrumbs ol { display: flex; list-style: none; gap: 0.5rem; font-size: 0.85rem; color: #64748b; }

/* Progress Bar */
.fs-progress-wrapper { margin: 1.5rem 0; }
.fs-progress-header { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; margin-bottom: 0.5rem; }
.fs-progress-track { width: 100%; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; }
.fs-progress-fill { height: 100%; background: var(--primary-color); border-radius: 5px; }

/* Alert */
.fs-alert { display: flex; gap: 0.75rem; padding: 1rem 1.25rem; border-radius: 8px; margin: 1rem 0; font-size: 0.9rem; }
.fs-alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
.fs-alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
.fs-alert-warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
.fs-alert-danger { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }

/* Counter */
.fs-counter { text-align: center; padding: 1.5rem; }
.fs-counter-num { font-size: 2.5rem; font-weight: 800; color: var(--primary-color); }
.fs-counter-title { font-size: 0.9rem; color: #64748b; margin-top: 0.5rem; }

/* Navigation & Search (Module 10) */
.fs-mega-menu { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem 0; position: relative; }
.fs-mega-categories { display: flex; gap: 2rem; }
.fs-mega-category { position: relative; }
.fs-mega-category-title { font-weight: 600; cursor: pointer; display: inline-block; padding: 0.5rem 0; }
.fs-mega-dropdown { display: flex; gap: 2rem; padding: 1.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); margin-top: 0.5rem; }
.fs-mega-col { min-width: 140px; }
.fs-mega-col-title { font-size: 0.85rem; text-transform: uppercase; color: #64748b; margin-bottom: 0.75rem; letter-spacing: 0.05em; }
.fs-mega-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.fs-mega-links li a { color: var(--text-color); font-size: 0.95rem; text-decoration: none; }
.fs-mega-links li a:hover { color: var(--primary-color); }
.fs-mega-badge { display: inline-block; padding: 0.15rem 0.4rem; font-size: 0.7rem; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-weight: 600; margin-left: 0.25rem; }
.fs-mega-desc { display: block; font-size: 0.8rem; color: #64748b; margin-top: 0.2rem; }
.fs-mega-promo { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; max-width: 260px; }
.fs-mega-promo h4 { margin-bottom: 0.5rem; }
.fs-mega-promo p { font-size: 0.85rem; color: #64748b; margin-bottom: 0.75rem; }
.fs-mega-promo-btn { display: inline-block; padding: 0.4rem 0.8rem; font-size: 0.85rem; }

.fs-menu-anchor { display: block; height: 0; visibility: hidden; }

.fs-search-form { display: flex; gap: 0.5rem; align-items: center; max-width: 480px; width: 100%; }
.fs-search-input { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; outline: none; }
.fs-search-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.fs-search-btn { padding: 0.5rem 1rem; background: var(--primary-color); color: #fff; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.95rem; }
.fs-search-btn:hover { opacity: 0.9; }

.fs-taxonomy-filter { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
.fs-tax-btn { padding: 0.35rem 0.75rem; border: 1px solid #cbd5e1; background: #fff; border-radius: 9999px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
.fs-tax-btn:hover, .fs-tax-btn.active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }

.fs-post-navigation { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin: 2rem 0; }
.fs-post-prev a, .fs-post-next a { font-weight: 500; color: var(--primary-color); text-decoration: none; }
.fs-post-prev a:hover, .fs-post-next a:hover { text-decoration: underline; }

/* Phase 6 Widget Styles */
.fs-posts-grid { display: grid; gap: 24px; }
.fs-post-card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
.fs-post-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.fs-post-thumb img { width: 100%; height: 200px; object-fit: cover; }
.fs-post-body { padding: 1.25rem; display: flex; flex-direction: column; flex: 1; }
.fs-post-meta { font-size: 0.8rem; color: #64748b; margin-bottom: 0.5rem; display: flex; gap: 0.75rem; }
.fs-post-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; line-height: 1.3; }
.fs-post-title a { color: var(--text-color); text-decoration: none; }
.fs-post-title a:hover { color: var(--primary-color); }
.fs-post-excerpt { font-size: 0.9rem; color: #475569; margin-bottom: 1rem; line-height: 1.5; flex: 1; }
.fs-post-link { font-weight: 600; font-size: 0.9rem; color: var(--primary-color); text-decoration: none; align-self: flex-start; }

.fs-portfolio-grid { display: grid; gap: 20px; }
.fs-portfolio-item { position: relative; border-radius: 8px; overflow: hidden; }
.fs-portfolio-thumb { position: relative; width: 100%; overflow: hidden; }
.fs-portfolio-thumb img { width: 100%; height: 240px; object-fit: cover; transition: transform 0.3s ease; }
.fs-portfolio-item:hover img { transform: scale(1.04); }
.fs-portfolio-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 70%); display: flex; flex-direction: column; justify-content: flex-end; padding: 1.25rem; color: #fff; }
.fs-portfolio-cat { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #cbd5e1; }
.fs-portfolio-title { font-size: 1.1rem; font-weight: 600; margin-top: 0.25rem; }
.fs-portfolio-title a { color: #fff; text-decoration: none; }

.fs-rating-widget { display: inline-flex; align-items: center; }

.fs-soundcloud-widget { width: 100%; margin: 1rem 0; border-radius: 8px; overflow: hidden; }

.fs-link-in-bio { max-width: 480px; margin: 2rem auto; text-align: center; padding: 2rem 1.5rem; }
.fs-bio-avatar-wrap { width: 96px; height: 96px; margin: 0 auto 1rem; border-radius: 9999px; overflow: hidden; border: 3px solid var(--primary-color); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.fs-bio-avatar { width: 100%; height: 100%; object-fit: cover; }
.fs-bio-name { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
.fs-bio-desc { font-size: 0.95rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.5; }
.fs-bio-links { display: flex; flex-direction: column; gap: 0.75rem; }
.fs-bio-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.85rem 1.25rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; color: var(--text-color); font-weight: 600; text-decoration: none; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.fs-bio-btn:hover { background: var(--primary-color); color: #fff; border-color: var(--primary-color); transform: translateY(-1px); }

.fs-image-box { display: flex; flex-direction: column; gap: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff; text-decoration: none; color: inherit; }
.fs-image-box-img img { width: 100%; height: 200px; object-fit: cover; }
.fs-image-box-content { padding: 1.25rem; }
.fs-image-box-title { font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem; }
.fs-image-box-desc { font-size: 0.9rem; color: #64748b; line-height: 1.5; }

.fs-icon-box { display: flex; align-items: flex-start; gap: 1rem; padding: 1.5rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; text-decoration: none; color: inherit; }
.fs-icon-box-icon { font-size: 2rem; line-height: 1; flex-shrink: 0; }
.fs-icon-box-content { flex: 1; }
.fs-icon-box-title { font-size: 1.15rem; font-weight: 600; margin-bottom: 0.35rem; }
.fs-icon-box-desc { font-size: 0.9rem; color: #64748b; line-height: 1.5; }

.fs-icon-list { list-style: none; padding: 0; margin: 1rem 0; display: flex; flex-direction: column; gap: 0.6rem; }
.fs-icon-list-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.95rem; }
.fs-icon-list-bullet { color: var(--primary-color); font-weight: bold; }

.fs-tabs-widget { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 1.5rem 0; background: #fff; }
.fs-tabs-nav { display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; overflow-x: auto; }
.fs-tab-btn { padding: 0.75rem 1.25rem; border: none; background: transparent; font-size: 0.95rem; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap; }
.fs-tab-btn:hover { color: var(--text-color); }
.fs-tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); background: #fff; }
.fs-tabs-content { padding: 1.5rem; }
.fs-tab-pane { display: none; }
.fs-tab-pane.active { display: block; animation: fsFadeIn 0.2s ease-in-out; }

.fs-accordion-widget { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 1.5rem 0; background: #fff; }
.fs-accordion-item { border-bottom: 1px solid #e2e8f0; }
.fs-accordion-item:last-child { border-bottom: none; }
.fs-accordion-header { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: #fff; border: none; font-size: 1rem; font-weight: 600; text-align: left; cursor: pointer; transition: background 0.2s; }
.fs-accordion-header:hover { background: #f8fafc; }
.fs-accordion-icon { transition: transform 0.2s ease; }
.fs-accordion-item.active .fs-accordion-icon { transform: rotate(180deg); }
.fs-accordion-content { padding: 1rem 1.25rem; font-size: 0.95rem; color: #475569; line-height: 1.6; background: #fafafa; border-top: 1px solid #f1f5f9; }

.fs-animated-headline { font-size: 2rem; font-weight: 800; margin: 1.5rem 0; line-height: 1.3; }
.fs-headline-prefix { margin-right: 0.35rem; }
.fs-headline-suffix { margin-left: 0.35rem; }

.fs-toc-widget { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; background: #f8fafc; margin: 1.5rem 0; }
.fs-toc-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; }
.fs-toc-list { list-style: none; padding-left: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.fs-toc-list li a { color: var(--primary-color); text-decoration: none; font-size: 0.95rem; }
.fs-toc-list li a:hover { text-decoration: underline; }

.fs-facebook-page { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; max-width: 400px; background: #fff; }
.fs-fb-card { display: flex; align-items: center; gap: 1rem; }
.fs-fb-icon { width: 44px; height: 44px; border-radius: 9999px; background: #1877f2; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.5rem; }
.fs-fb-info { flex: 1; }
.fs-fb-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
.fs-fb-link { font-size: 0.85rem; color: #1877f2; text-decoration: none; }

.fs-paypal-button-wrap, .fs-stripe-button-wrap { margin: 1rem 0; }
.fs-paypal-btn { display: inline-flex; align-items: center; gap: 0.5rem; background: #ffc439; color: #003087; font-weight: 700; border: none; border-radius: 4px; padding: 0.75rem 1.5rem; font-size: 1rem; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.fs-stripe-btn { display: inline-flex; align-items: center; gap: 0.5rem; background: #635bff; color: #fff; font-weight: 600; border: none; border-radius: 4px; padding: 0.75rem 1.5rem; font-size: 1rem; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.fs-login-widget { max-width: 400px; margin: 2rem auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 2rem; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.fs-login-title { font-size: 1.35rem; font-weight: 700; margin-bottom: 1.25rem; }
.fs-field-group { margin-bottom: 1rem; }
.fs-field-group label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem; color: #475569; }
.fs-field-group input { width: 100%; padding: 0.6rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; }
.fs-form-options { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 1.25rem; }
.fs-forgot-link { color: var(--primary-color); text-decoration: none; }
.fs-login-submit { width: 100%; padding: 0.75rem; font-size: 1rem; }

.fs-off-canvas-drawer { position: fixed; top: 0; right: 0; width: 320px; height: 100vh; background: #fff; box-shadow: -4px 0 15px rgba(0,0,0,0.15); transform: translateX(100%); transition: transform 0.3s ease; z-index: 1000; display: flex; flex-direction: column; }
.fs-off-canvas-drawer.active { transform: translateX(0); }
.fs-off-canvas-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem; border-bottom: 1px solid #e2e8f0; }
.fs-off-canvas-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; }
.fs-off-canvas-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
.fs-off-canvas-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; display: none; opacity: 0; transition: opacity 0.3s ease; }
.fs-off-canvas-backdrop.active { display: block; opacity: 1; }

.fs-carousel-widget { position: relative; overflow: hidden; margin: 1.5rem 0; border-radius: 8px; }
.fs-carousel-track { display: flex; overflow-x: hidden; scroll-behavior: smooth; }
.fs-carousel-slide { min-width: 100%; position: relative; }
.fs-carousel-slide img { width: 100%; height: 350px; object-fit: cover; }
.fs-carousel-caption { position: absolute; bottom: 0; inset-inline: 0; padding: 1rem; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); color: #fff; font-size: 0.95rem; }
.fs-carousel-prev, .fs-carousel-next { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: #fff; border: none; border-radius: 9999px; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; transition: background 0.2s; }
.fs-carousel-prev { left: 1rem; }
.fs-carousel-next { right: 1rem; }
.fs-carousel-prev:hover, .fs-carousel-next:hover { background: rgba(0,0,0,0.8); }

.fs-lightbox-item { display: inline-block; }
.fs-lightbox-trigger { position: relative; display: inline-block; overflow: hidden; border-radius: 8px; }
.fs-lightbox-trigger img { transition: transform 0.2s; }
.fs-lightbox-trigger:hover img { transform: scale(1.02); }
.fs-lightbox-zoom-icon { position: absolute; bottom: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); color: #fff; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }

.fs-wp-menu-list { list-style: none; padding: 0; margin: 0; display: flex; gap: 1.5rem; flex-wrap: wrap; }
.fs-wp-menu-item a { color: var(--text-color); text-decoration: none; font-weight: 500; font-size: 0.95rem; }
.fs-wp-menu-item a:hover { color: var(--primary-color); }

.fs-unsupported-widget { border: 1px dashed #cbd5e1; border-radius: 8px; padding: 1.25rem; background: #f8fafc; margin: 1rem 0; }
.fs-unsupported-notice { display: flex; align-items: center; gap: 0.75rem; }
.fs-unsupported-badge { display: inline-block; padding: 0.2rem 0.5rem; background: #e2e8f0; color: #475569; font-size: 0.75rem; font-weight: 700; border-radius: 4px; text-transform: uppercase; }
.fs-unsupported-msg { font-size: 0.85rem; color: #64748b; }

@keyframes fsFadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Custom Page Styles */
${safeData.pageCss || safeData.editorData?.pageCss || ""}

${generateResponsiveCss(safeData)}
`;
}

function generateRuntimeJs(): string {
  return `/* ForgeStudio Static Runtime */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Intercept form submissions for ForgeStudio API integration
    document.querySelectorAll('form').forEach(function(form) {
      form.addEventListener('submit', async function(e) {
        var action = form.getAttribute('action') || '';
        if (action.indexOf('/api/forms/submit') !== -1) {
          e.preventDefault();
          var submitBtn = form.querySelector('button[type="submit"]');
          var originalBtnText = submitBtn ? submitBtn.innerText : '';
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Submitting...';
          }
          var statusBox = form.querySelector('.fs-form-status');
          if (statusBox) {
            statusBox.style.display = 'none';
          }

          var formData = new FormData(form);
          var data = {};
          var websiteId = formData.get('websiteId') || '';
          var formId = formData.get('formId') || form.id || '';
          var honeypotValue = formData.get('_fs_hp_check') || '';

          formData.forEach(function(val, key) {
            if (key !== 'websiteId' && key !== 'formId' && key !== '_fs_hp_check') {
              data[key] = val;
            }
          });

          var payload = {
            websiteId: String(websiteId),
            formId: String(formId),
            data: data,
            honeypotValue: String(honeypotValue)
          };

          try {
            var response = await fetch('/api/forms/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            var result = await response.json();
            if (response.ok && result.success !== false) {
              if (statusBox) {
                statusBox.textContent = result.message || 'Thank you! Your submission has been received.';
                statusBox.style.display = 'block';
                statusBox.style.color = '#155724';
                statusBox.style.backgroundColor = '#d4edda';
                statusBox.style.border = '1px solid #c3e6cb';
              }
              form.reset();
              var redirectUrl = form.getAttribute('data-redirect') || result.redirectUrl;
              if (redirectUrl) {
                setTimeout(function() {
                  window.location.href = redirectUrl;
                }, 1000);
              }
            } else {
              throw new Error(result.error || result.message || 'Submission failed');
            }
          } catch (err) {
            if (statusBox) {
              statusBox.textContent = err.message || 'An error occurred. Please try again.';
              statusBox.style.display = 'block';
              statusBox.style.color = '#721c24';
              statusBox.style.backgroundColor = '#f8d7da';
              statusBox.style.border = '1px solid #f5c6cb';
            }
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = originalBtnText;
            }
          }
        }
      });
    });
  });

  // Standalone Client-Side E-Commerce Store Engine
  var CART_KEY = 'fs_static_cart';
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {}
    updateCartBadges();
    renderCartTable();
    renderCheckoutReview();
  }
  function updateCartBadges() {
    var cart = getCart();
    var count = cart.reduce(function(acc, item) { return acc + (item.quantity || 1); }, 0);
    document.querySelectorAll('.fs-cart-count').forEach(function(el) {
      el.textContent = String(count);
    });
  }
  function renderCartTable() {
    var tbody = document.getElementById('fs-cart-tbody');
    var subtotalEl = document.getElementById('fs-cart-subtotal');
    if (!tbody) return;
    var cart = getCart();
    if (cart.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px;">Your cart is currently empty.</td></tr>';
      if (subtotalEl) subtotalEl.textContent = '$0.00';
      return;
    }
    var total = 0;
    var html = '';
    cart.forEach(function(item, index) {
      var itemTotal = (item.price || 0) * (item.quantity || 1);
      total += itemTotal;
      html += '<tr>' +
        '<td><strong>' + (item.title || 'Product') + '</strong>' + (item.options ? '<br><small style="color: #64748b;">' + item.options + '</small>' : '') + '</td>' +
        '<td>$' + (item.price || 0).toFixed(2) + '</td>' +
        '<td><input type="number" min="1" class="qty-stepper" data-idx="' + index + '" value="' + (item.quantity || 1) + '" style="width: 50px; padding: 4px;" /></td>' +
        '<td>$' + itemTotal.toFixed(2) + '</td>' +
        '<td><button type="button" class="btn-cart-remove" data-idx="' + index + '" style="color: #ef4444; background: none; border: none; cursor: pointer;">✕</button></td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
    if (subtotalEl) subtotalEl.textContent = '$' + total.toFixed(2);
  }
  function renderCheckoutReview() {
    var reviewEl = document.getElementById('fs-checkout-items');
    if (!reviewEl) return;
    var cart = getCart();
    if (cart.length === 0) {
      reviewEl.innerHTML = '<p style="color: #64748b;">No items in cart.</p>';
      return;
    }
    var total = 0;
    var html = '<ul style="list-style: none; padding: 0; margin: 0 0 16px 0;">';
    cart.forEach(function(item) {
      var itemTotal = (item.price || 0) * (item.quantity || 1);
      total += itemTotal;
      html += '<li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">' +
        '<span>' + (item.title || 'Product') + ' × ' + (item.quantity || 1) + '</span>' +
        '<span>$' + itemTotal.toFixed(2) + '</span>' +
      '</li>';
    });
    html += '</ul><div style="font-weight: 700; font-size: 16px; display: flex; justify-content: space-between;"><span>Total:</span><span>$' + total.toFixed(2) + '</span></div>';
    reviewEl.innerHTML = html;
  }

  // Bind Add to Cart Clicks
  document.addEventListener('click', function(e) {
    var target = e.target;
    if (!target) return;
    if (target.classList && target.classList.contains('btn-add-to-cart')) {
      var card = target.closest('.fs-wc-product-card') || target.closest('.fs-wc-add-to-cart') || target.closest('.fs-wc-custom-btn') || target.closest('.fs-wc-catalog') || document;
      var titleEl = card ? card.querySelector('.title, .fs-wc-title, h3, h2') : null;
      var priceEl = card ? card.querySelector('.price, .fs-wc-price, .fs-price') : null;
      var title = titleEl ? titleEl.textContent.trim() : 'Store Product';
      var price = 49.99;
      if (priceEl) {
        var num = parseFloat(priceEl.textContent.replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0) price = num;
      }
      var cart = getCart();
      var existing = cart.find(function(it) { return it.title === title; });
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        cart.push({ id: 'item-' + Date.now(), title: title, price: price, quantity: 1 });
      }
      saveCart(cart);
      alert('Added "' + title + '" to your cart!');
    }
    if (target.classList && target.classList.contains('btn-cart-remove')) {
      var idx = parseInt(target.getAttribute('data-idx') || '-1', 10);
      if (idx >= 0) {
        var c = getCart();
        c.splice(idx, 1);
        saveCart(c);
      }
    }
  });

  // Bind Quantity Changes
  document.addEventListener('change', function(e) {
    var target = e.target;
    if (target && target.classList && target.classList.contains('qty-stepper')) {
      var idx = parseInt(target.getAttribute('data-idx') || '-1', 10);
      var val = parseInt(target.value || '1', 10);
      if (idx >= 0 && val >= 1) {
        var c = getCart();
        if (c[idx]) {
          c[idx].quantity = val;
          saveCart(c);
        }
      }
    }
  });

  // Bind Checkout Submission
  var checkoutForm = document.getElementById('fs-checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      var cart = getCart();
      if (cart.length === 0) {
        alert('Your cart is empty. Please add items before checking out.');
        return;
      }
      var formData = new FormData(checkoutForm);
      var customer = {
        name: formData.get('customerName') || 'Guest Customer',
        email: formData.get('customerEmail') || 'customer@example.com',
        address: formData.get('address') || '',
        city: formData.get('city') || ''
      };
      var subtotal = cart.reduce(function(acc, it) { return acc + (it.price * (it.quantity || 1)); }, 0);
      var websiteId = document.body.getAttribute('data-website-id') || window.location.pathname.split('/')[2] || 'site-main';
      var payload = {
        items: cart.map(function(it) {
          return { productId: it.id || 'prod', name: it.title, quantity: it.quantity || 1, unitPrice: it.price };
        }),
        subtotal: subtotal,
        total: subtotal,
        customer: customer
      };
      try {
        var res = await fetch('/api/websites/' + encodeURIComponent(websiteId) + '/commerce/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          saveCart([]);
          alert('Order placed successfully! Thank you for your purchase.');
          window.location.href = 'purchase-summary.html';
        } else {
          var errData = {};
          try { errData = await res.json(); } catch(e) {}
          alert('Checkout failed: ' + (errData.error || errData.message || 'Payment or order processing declined.'));
        }
      } catch (err) {
        alert('Checkout error: Unable to contact order service. Cart preserved.');
      }
    });
  }

  // Phase 6 Interactive Widgets Runtime
  // 1. Tabs widget interaction
  document.querySelectorAll('.fs-tabs-widget').forEach(function(tabsWidget) {
    tabsWidget.querySelectorAll('.fs-tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var targetId = btn.getAttribute('data-tab-target');
        tabsWidget.querySelectorAll('.fs-tab-btn').forEach(function(b) { b.classList.remove('active'); });
        tabsWidget.querySelectorAll('.fs-tab-pane').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var targetPane = tabsWidget.querySelector('[data-tab-id="' + targetId + '"]') || document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  });

  // 2. Accordion widget interaction
  document.querySelectorAll('.fs-accordion-item').forEach(function(item) {
    var header = item.querySelector('.fs-accordion-header');
    if (header) {
      header.addEventListener('click', function() {
        var isOpen = item.classList.contains('active');
        var content = item.querySelector('.fs-accordion-content');
        if (isOpen) {
          item.classList.remove('active');
          if (content) content.style.display = 'none';
        } else {
          item.classList.add('active');
          if (content) content.style.display = 'block';
        }
      });
    }
  });

  // 3. Off-canvas panel interaction
  document.querySelectorAll('[data-off-canvas-toggle]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var panelId = btn.getAttribute('data-off-canvas-toggle');
      var panel = document.getElementById(panelId);
      var backdrop = document.querySelector('[data-off-canvas-backdrop="' + panelId + '"]');
      if (panel) panel.classList.add('active');
      if (backdrop) backdrop.classList.add('active');
    });
  });
  document.querySelectorAll('[data-off-canvas-close], [data-off-canvas-backdrop]').forEach(function(el) {
    el.addEventListener('click', function() {
      var panelId = el.getAttribute('data-off-canvas-close') || el.getAttribute('data-off-canvas-backdrop');
      var panel = document.getElementById(panelId);
      var backdrop = document.querySelector('[data-off-canvas-backdrop="' + panelId + '"]');
      if (panel) panel.classList.remove('active');
      if (backdrop) backdrop.classList.remove('active');
    });
  });

  // 4. Countdown timer live update
  document.querySelectorAll('.fs-countdown').forEach(function(counter) {
    var targetAttr = counter.getAttribute('data-target-date');
    var targetDate = targetAttr ? new Date(targetAttr).getTime() : (Date.now() + 86400000 * 7);
    function updateCountdown() {
      var now = Date.now();
      var diff = Math.max(0, targetDate - now);
      var days = Math.floor(diff / (1000 * 60 * 60 * 24));
      var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      var mins = Math.floor((diff / (1000 * 60)) % 60);
      var secs = Math.floor((diff / 1000) % 60);
      var dEl = counter.querySelector('.fs-countdown-days');
      var hEl = counter.querySelector('.fs-countdown-hours');
      var mEl = counter.querySelector('.fs-countdown-minutes');
      var sEl = counter.querySelector('.fs-countdown-seconds');
      if (dEl) dEl.textContent = String(days).padStart(2, '0');
      if (hEl) hEl.textContent = String(hours).padStart(2, '0');
      if (mEl) mEl.textContent = String(mins).padStart(2, '0');
      if (sEl) sEl.textContent = String(secs).padStart(2, '0');
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
  });

  // 5. Basic Carousel navigation
  document.querySelectorAll('.fs-carousel-widget').forEach(function(carousel) {
    var track = carousel.querySelector('.fs-carousel-track');
    var prev = carousel.querySelector('.fs-carousel-prev');
    var next = carousel.querySelector('.fs-carousel-next');
    if (track && prev && next) {
      prev.addEventListener('click', function() {
        track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
      });
      next.addEventListener('click', function() {
        track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
      });
    }
  });

  // 6. Dynamic Lightbox
  document.querySelectorAll('[data-lightbox-src]').forEach(function(trigger) {
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      var src = trigger.getAttribute('data-lightbox-src');
      var modal = document.createElement('div');
      modal.className = 'fs-lightbox-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;';
      var img = document.createElement('img');
      img.src = src;
      img.style.cssText = 'max-width:90%;max-height:90%;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);';
      modal.appendChild(img);
      modal.addEventListener('click', function() { document.body.removeChild(modal); });
      document.body.appendChild(modal);
    });
  });

  // Initialize store state on load
  updateCartBadges();
  renderCartTable();
  renderCheckoutReview();
})();
`;
}

/**
 * Compiles CanonicalWebsiteData into a complete static website bundle.
 * Pure deterministic generation: produces exact file lists, sizes, and content.
 */
export function compileCanonicalToStaticBundle(
  websiteId: string,
  version: number,
  websiteData: any
): StaticBundle {
  const files: GeneratedFile[] = [];

  // 1. Compile CSS
  const compiledCss = generateGlobalCss(websiteData);
  files.push({
    path: "styles.css",
    content: compiledCss,
    size: Buffer.byteLength(compiledCss, "utf8"),
    contentType: "text/css",
  });

  // 2. Compile Runtime JS
  const runtimeJs = generateRuntimeJs();
  files.push({
    path: "runtime.js",
    content: runtimeJs,
    size: Buffer.byteLength(runtimeJs, "utf8"),
    contentType: "application/javascript",
  });

  // 3. Resolve pages
  const rawPages = Array.isArray(websiteData.pages) && websiteData.pages.length > 0
    ? websiteData.pages
    : [
        {
          id: websiteData.homePageId || "home",
          title: "Home",
          slug: "",
          isHome: true,
          elements: Array.isArray(websiteData.elements) ? websiteData.elements : [],
        },
      ];

  const homePageExists = websiteData.homePageId && rawPages.some((p: any) => p.id === websiteData.homePageId);
  const homePageId = homePageExists ? websiteData.homePageId : undefined;
  const hasExplicitHome = rawPages.some((p: any) => p.id === homePageId || p.isHome === true);

  const normalizedPages = rawPages.map((p: any, idx: number) => {
    const isHome = p.id === homePageId || p.isHome === true || (!hasExplicitHome && p.isHome !== false && idx === 0);
    return {
      ...p,
      isHome,
      slug: p.slug !== undefined ? p.slug : (isHome ? "" : p.id),
    };
  });

  // Site context for dynamic token resolution
  const siteContext = {
    site: {
      id: websiteId,
      name: websiteData.siteSettings?.siteName || websiteData.name || "ForgeStudio Site",
      slug: websiteData.slug,
      siteSettings: websiteData.siteSettings,
    },
  };

  // 4. Compile HTML for each page
  for (const rawPage of normalizedPages) {
    const pageContext = {
      ...siteContext,
      page: {
        id: rawPage.id,
        name: rawPage.name,
        title: rawPage.title,
        slug: rawPage.slug,
        isHome: rawPage.isHome,
      },
    };

    const resolvedPage = resolveTokensInTree(rawPage, pageContext);
    const resolvedWebsiteData = {
      ...websiteData,
      id: websiteId || websiteData.id,
      websiteId: websiteId || websiteData.websiteId,
      siteParts: websiteData.siteParts ? resolveTokensInTree(websiteData.siteParts, siteContext) : undefined,
    };

    const cleanSlug = (resolvedPage.slug || resolvedPage.id || "").replace(/^\//, "");
    const fileName = resolvedPage.isHome || !cleanSlug ? "index.html" : `${cleanSlug}.html`;
    const pageHtml = generatePageHtml(resolvedPage, resolvedWebsiteData, normalizedPages, compiledCss);

    files.push({
      path: fileName,
      content: pageHtml,
      size: Buffer.byteLength(pageHtml, "utf8"),
      contentType: "text/html",
    });
  }

  // Compile Specialized Theme Parts (404, archive, search)
  const siteParts = websiteData.siteParts || {};
  const resolvedWebsiteData = {
    ...websiteData,
    id: websiteId || websiteData.id,
    websiteId: websiteId || websiteData.websiteId,
    siteParts: websiteData.siteParts ? resolveTokensInTree(websiteData.siteParts, siteContext) : undefined,
  };

  // 4a. 404 Error Page Template (F-239)
  if (
    siteParts.notFound404 &&
    Array.isArray(siteParts.notFound404.elements) &&
    siteParts.notFound404.elements.length > 0 &&
    (siteParts.notFound404.enabled ?? siteParts.notFound404.isEnabled ?? true)
  ) {
    const page404 = {
      id: "404",
      name: "404 - Page Not Found",
      title: "404 - Page Not Found",
      slug: "404",
      isHome: false,
      elements: siteParts.notFound404.elements,
    };
    const resolved404 = resolveTokensInTree(page404, siteContext);
    const html404 = generatePageHtml(resolved404, resolvedWebsiteData, normalizedPages, compiledCss);
    files.push({
      path: "404.html",
      content: html404,
      size: Buffer.byteLength(html404, "utf8"),
      contentType: "text/html",
    });
  }

  // 4b. Archive Template (F-238)
  if (
    siteParts.archive &&
    Array.isArray(siteParts.archive.elements) &&
    siteParts.archive.elements.length > 0 &&
    (siteParts.archive.enabled ?? siteParts.archive.isEnabled ?? true)
  ) {
    const pageArchive = {
      id: "archive",
      name: "Archive",
      title: "Archive",
      slug: "archive",
      isHome: false,
      elements: siteParts.archive.elements,
    };
    const resolvedArchive = resolveTokensInTree(pageArchive, siteContext);
    const htmlArchive = generatePageHtml(resolvedArchive, resolvedWebsiteData, normalizedPages, compiledCss);
    files.push({
      path: "archive.html",
      content: htmlArchive,
      size: Buffer.byteLength(htmlArchive, "utf8"),
      contentType: "text/html",
    });
  }

  // 4c. Search Results Template (F-240)
  if (
    siteParts.searchResults &&
    Array.isArray(siteParts.searchResults.elements) &&
    siteParts.searchResults.elements.length > 0 &&
    (siteParts.searchResults.enabled ?? siteParts.searchResults.isEnabled ?? true)
  ) {
    const pageSearch = {
      id: "search",
      name: "Search Results",
      title: "Search Results",
      slug: "search",
      isHome: false,
      elements: siteParts.searchResults.elements,
    };
    const resolvedSearch = resolveTokensInTree(pageSearch, siteContext);
    const htmlSearch = generatePageHtml(resolvedSearch, resolvedWebsiteData, normalizedPages, compiledCss);
    files.push({
      path: "search.html",
      content: htmlSearch,
      size: Buffer.byteLength(htmlSearch, "utf8"),
      contentType: "text/html",
    });
  }

  // 5. Compile site-manifest.json
  const manifest = {
    generator: "ForgeStudio v1.0",
    websiteId,
    version,
    generatedAt: new Date().toISOString(),
    pages: normalizedPages.map((p: any) => {
      const cleanSlug = (p.slug || p.id || "").replace(/^\//, "");
      return {
        id: p.id,
        title: p.title,
        file: p.isHome || !cleanSlug ? "index.html" : `${cleanSlug}.html`,
      };
    }),
    totalFiles: files.length + 1,
  };
  const manifestStr = JSON.stringify(manifest, null, 2);
  files.push({
    path: "site-manifest.json",
    content: manifestStr,
    size: Buffer.byteLength(manifestStr, "utf8"),
    contentType: "application/json",
  });

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  return {
    websiteId,
    version,
    files,
    totalBytes,
    pageCount: normalizedPages.length,
    assetCount: files.length - normalizedPages.length,
    generatedAt: manifest.generatedAt,
  };
}
