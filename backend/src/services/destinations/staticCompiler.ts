import type { StaticBundle, GeneratedFile } from "./types.js";
import { matchesThemeCondition, resolveTokensInTree } from "../website.service.js";
import {
  compileDesignSystemCss,
  validateVariables,
  validateClasses,
} from "../tokens/designToken.service.js";
import { escapeJsonLd, generateStructuredData } from "../seo/seoAnalyzer.service.js";

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
    case "media-carousel":
    case "testimonial-carousel":
    case "nested-carousel":
    case "loop-carousel":
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
      return `<div class="fs-wc-add-to-cart"${idAttr}${classAttr}${styleAttr}><button type="button" class="btn btn-cart">${escapeHtml(el.content || el.buttonText || "Add to Cart")}</button></div>`;
    }
    case "wc-product-rating": {
      return `<div class="fs-wc-rating"${idAttr}${classAttr}${styleAttr}><span class="fs-stars">★★★★★</span></div>`;
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
      const posts = Array.isArray(el.posts) && el.posts.length > 0 ? el.posts : defaultPosts;
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
    default: {
      const children = Array.isArray(el.elements) ? el.elements : (Array.isArray(el.children) ? el.children : []);
      const fallbackChildren = children.length > 0
        ? children.map((child: any) => renderElementToHtml(child, allPages, websiteId)).join("\n")
        : escapeHtml(el.content || "");
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

/* Custom Page Styles */
${safeData.pageCss || safeData.editorData?.pageCss || ""}
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

    const fileName = resolvedPage.isHome ? "index.html" : `${resolvedPage.slug || resolvedPage.id}.html`;
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
    pages: normalizedPages.map((p: any) => ({
      id: p.id,
      title: p.title,
      file: p.isHome ? "index.html" : `${p.slug || p.id}.html`,
    })),
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
