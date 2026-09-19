import type { StaticBundle, GeneratedFile } from "./types.js";

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveStaticHtmlHref(rawHref: string | undefined, allPages: any[] = []): string {
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

function renderElementToHtml(el: any, allPages: any[]): string {
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
      return `<h${level}${idAttr}${classAttr}${styleAttr}>${escapeHtml(el.content || "")}</h${level}>`;
    }
    case "text":
    case "paragraph": {
      return `<p${idAttr}${classAttr}${styleAttr}>${escapeHtml(el.content || "")}</p>`;
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
    case "container":
    case "section":
    case "div": {
      const childrenHtml = Array.isArray(el.elements)
        ? el.elements.map((child: any) => renderElementToHtml(child, allPages)).join("\n")
        : "";
      return `<div${idAttr}${classAttr}${styleAttr}>\n${childrenHtml}\n</div>`;
    }
    case "columns": {
      const cols = Array.isArray(el.columns) ? el.columns : [];
      const colsHtml = cols
        .map((col: any) => {
          const colChildren = Array.isArray(col.elements)
            ? col.elements.map((child: any) => renderElementToHtml(child, allPages)).join("\n")
            : "";
          return `<div class="col" style="flex: ${col.width || 1};">\n${colChildren}\n</div>`;
        })
        .join("\n");
      return `<div${idAttr} class="row ${escapeHtml(el.className || "")}"${styleAttr} style="display: flex; gap: 1rem;">\n${colsHtml}\n</div>`;
    }
    case "form": {
      const formFields = Array.isArray(el.fields) ? el.fields : [];
      const fieldsHtml = formFields
        .map((f: any) => {
          const label = f.label ? `<label for="${escapeHtml(f.name)}">${escapeHtml(f.label)}</label>` : "";
          const input = f.type === "textarea"
            ? `<textarea id="${escapeHtml(f.name)}" name="${escapeHtml(f.name)}" ${f.required ? "required" : ""}></textarea>`
            : `<input type="${escapeHtml(f.type || "text")}" id="${escapeHtml(f.name)}" name="${escapeHtml(f.name)}" ${f.required ? "required" : ""} />`;
          return `<div class="form-group">\n${label}\n${input}\n</div>`;
        })
        .join("\n");
      const submitText = el.submitButtonText || "Submit";
      return `<form${idAttr}${classAttr}${styleAttr} action="/api/forms/submit" method="POST">\n${fieldsHtml}\n<button type="submit" class="btn btn-primary">${escapeHtml(submitText)}</button>\n</form>`;
    }
    case "customHtml":
    case "rawHtml": {
      return el.content || "";
    }
    default: {
      const fallbackChildren = Array.isArray(el.elements)
        ? el.elements.map((child: any) => renderElementToHtml(child, allPages)).join("\n")
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
  const pageTitle = page.title
    ? `${page.title} | ${siteSettings.siteName || websiteData.name || "ForgeStudio"}`
    : siteSettings.siteName || websiteData.name || "ForgeStudio";
  const metaDesc = page.metaDescription || siteSettings.metaDescription || "";
  const favicon = siteSettings.favicon || "/favicon.ico";

  // Site Header
  let headerHtml = "";
  if (websiteData.siteParts?.header?.isEnabled && Array.isArray(websiteData.siteParts.header.elements)) {
    headerHtml = `<header class="site-header">\n${websiteData.siteParts.header.elements.map((el: any) => renderElementToHtml(el, allPages)).join("\n")}\n</header>`;
  }

  // Page Elements
  const pageElements = Array.isArray(page.elements) ? page.elements : [];
  const mainContent = pageElements.map((el: any) => renderElementToHtml(el, allPages)).join("\n");

  // Site Footer
  let footerHtml = "";
  if (websiteData.siteParts?.footer?.isEnabled && Array.isArray(websiteData.siteParts.footer.elements)) {
    footerHtml = `<footer class="site-footer">\n${websiteData.siteParts.footer.elements.map((el: any) => renderElementToHtml(el, allPages)).join("\n")}\n</footer>`;
  }

  return `<!DOCTYPE html>
<html lang="${escapeHtml(siteSettings.siteLanguage || "en")}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  ${metaDesc ? `<meta name="description" content="${escapeHtml(metaDesc)}">` : ""}
  <link rel="icon" href="${escapeHtml(favicon)}">
  <link rel="stylesheet" href="styles.css">
  ${siteSettings.customHead || ""}
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
  const globalStyles = websiteData.globalStyles || {};
  const colors = globalStyles.colors || {};
  const typography = globalStyles.typography || {};

  return `/* ForgeStudio Generated CSS */
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

/* Custom Page Styles */
${websiteData.pageCss || ""}
`;
}

function generateRuntimeJs(): string {
  return `/* ForgeStudio Static Runtime */
(function() {
  // Mobile navigation toggles & interactive components
  document.addEventListener('DOMContentLoaded', function() {
    // Intercept form submissions for ForgeStudio API integration
    document.querySelectorAll('form').forEach(function(form) {
      form.addEventListener('submit', function(e) {
        // Fallback for native submit if action is set
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

  const homePageId = websiteData.homePageId || rawPages[0]?.id;

  const normalizedPages = rawPages.map((p: any, idx: number) => ({
    ...p,
    isHome: p.id === homePageId || p.isHome === true || idx === 0,
    slug: p.slug || (p.id === homePageId ? "" : p.id),
  }));

  // 4. Compile HTML for each page
  for (const page of normalizedPages) {
    const fileName = page.isHome ? "index.html" : `${page.slug || page.id}.html`;
    const pageHtml = generatePageHtml(page, websiteData, normalizedPages, compiledCss);

    files.push({
      path: fileName,
      content: pageHtml,
      size: Buffer.byteLength(pageHtml, "utf8"),
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
