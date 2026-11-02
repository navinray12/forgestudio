import { sanitizeAndRegenerateElementIds } from "./templateValidation";

export interface WebsiteKitValidationResult {
  isValid: boolean;
  error?: string;
  websiteKit?: {
    website: {
      name: string;
      description?: string;
      settings?: Record<string, any>;
    };
    pages: Array<{
      id: string;
      title: string;
      path: string;
      elements: any[];
      pageSettings: Record<string, any>;
      isHome?: boolean;
      customCss?: string;
      [key: string]: any;
    }>;
    templates: any[];
    homePageId?: string;
    globalSettings?: Record<string, any>;
    globalStyles?: Record<string, any>;
    siteSettings?: Record<string, any>;
    siteParts?: Record<string, any>;
    globalVariables?: any[];
    globalClasses?: any[];
    [key: string]: any;
  };
  summary?: {
    websiteName: string;
    pageCount: number;
    elementCount: number;
  };
}

/**
 * Validates untrusted Website Kit JSON file input, checks type/version integrity,
 * and recursively regenerates element IDs to prevent canvas collisions.
 */
export function validateAndSanitizeWebsiteKitFile(fileContent: string): WebsiteKitValidationResult {
  if (!fileContent || !fileContent.trim()) {
    return {
      isValid: false,
      error: "Unable to import Website Kit. The selected file is empty.",
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fileContent);
  } catch (e) {
    return {
      isValid: false,
      error: "The selected file is not a valid Website Kit JSON file.",
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      isValid: false,
      error: "The selected file is not a valid Website Kit.",
    };
  }

  if (parsed.type !== "website-kit") {
    return {
      isValid: false,
      error: "The selected file is not a valid Website Kit.",
    };
  }

  if (!parsed.version || parsed.version > 1) {
    return {
      isValid: false,
      error: "This Website Kit version is not supported.",
    };
  }

  const websiteName = parsed.website?.name || "Imported Website";
  const pagesRaw = Array.isArray(parsed.pages) ? parsed.pages : [];

  if (pagesRaw.length === 0 && Array.isArray(parsed.elements)) {
    // Single page fallback structure
    pagesRaw.push({
      id: "main-page",
      title: parsed.pageSettings?.title || "Home",
      path: parsed.pageSettings?.path || "/",
      elements: parsed.elements,
      pageSettings: parsed.pageSettings || {},
    });
  }

  let totalElementsCount = 0;

  const sanitizedPages = pagesRaw.map((page: any, index: number) => {
    const rawElements = Array.isArray(page.elements) ? page.elements : [];
    const safeElements = sanitizeAndRegenerateElementIds(rawElements);
    totalElementsCount += safeElements.length;

    const pageTitle = page.title || page.name || `Page ${index + 1}`;
    const pageSlug = page.slug || (page.path ? page.path.replace(/^\//, "") : (index === 0 ? "" : pageTitle.toLowerCase().replace(/\s+/g, "-")));
    const pagePath = page.path || `/${pageSlug}`;

    return {
      ...page,
      id: page.id || `page-${index + 1}`,
      title: pageTitle,
      name: page.name || pageTitle,
      path: pagePath,
      slug: pageSlug,
      isHome: typeof page.isHome === "boolean" ? page.isHome : (page.pageSettings?.isHome === true ? true : undefined),
      customCss: typeof page.customCss === "string" ? page.customCss : undefined,
      elements: safeElements,
      pageSettings: page.pageSettings && typeof page.pageSettings === "object" ? page.pageSettings : {},
    };
  });

  return {
    isValid: true,
    websiteKit: {
      website: {
        name: websiteName,
        description: parsed.website?.description || "",
        settings: parsed.website?.settings || {},
      },
      pages: sanitizedPages,
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
      homePageId: parsed.homePageId || parsed.website?.homePageId,
      globalSettings: parsed.globalSettings || parsed.website?.globalSettings,
      globalStyles: parsed.globalStyles || parsed.website?.globalStyles,
      siteSettings: parsed.siteSettings || parsed.website?.settings,
      siteParts: parsed.siteParts,
      globalVariables: Array.isArray(parsed.globalVariables) ? parsed.globalVariables : undefined,
      globalClasses: Array.isArray(parsed.globalClasses) ? parsed.globalClasses : undefined,
    },
    summary: {
      websiteName,
      pageCount: sanitizedPages.length,
      elementCount: totalElementsCount,
    },
  };
}

/**
 * Transforms validated Website Kit data into the complete canonical editorData schema,
 * preserving all pages, element trees, page settings, homePageId, and global settings.
 */
export function buildCanonicalEditorDataFromKit(
  kitData: {
    website?: { name?: string; description?: string; settings?: Record<string, any> };
    pages?: Array<{
      id?: string;
      title?: string;
      name?: string;
      path?: string;
      slug?: string;
      elements?: any[];
      pageSettings?: Record<string, any>;
      isHome?: boolean;
      customCss?: string;
      [key: string]: any;
    }>;
    templates?: any[];
    elements?: any[];
    pageSettings?: Record<string, any>;
    globalSettings?: Record<string, any>;
    globalStyles?: Record<string, any>;
    siteSettings?: Record<string, any>;
    siteParts?: Record<string, any>;
    globalVariables?: any[];
    globalClasses?: any[];
    [key: string]: any;
  },
  defaultSiteName: string = "Imported Kit Website"
): any {
  const siteName = kitData.website?.name?.trim() || defaultSiteName;

  const rawPages = Array.isArray(kitData.pages) && kitData.pages.length > 0
    ? kitData.pages
    : [
        {
          id: "home",
          title: siteName,
          path: "/",
          elements: Array.isArray(kitData.elements) ? kitData.elements : [],
          pageSettings: kitData.pageSettings || { title: siteName, path: "/" },
          isHome: true,
        },
      ];

  const normalizeSlug = (rawPath?: string, fallbackTitle?: string): string => {
    let slug = (rawPath || "").trim();
    if (!slug && fallbackTitle) {
      slug = fallbackTitle
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
    }
    if (!slug || slug === "/") return "/";
    if (!slug.startsWith("/")) slug = `/${slug}`;
    return slug.toLowerCase().replace(/\/+/g, "/");
  };

  // Identify home page:
  // 1. Check if kitData.homePageId explicitly matches a page ID
  let homeIndex = -1;
  if (kitData.homePageId) {
    homeIndex = rawPages.findIndex((p: any) => p.id === kitData.homePageId);
  }
  // 2. Check if a page has explicit isHome === true or pageSettings?.isHome === true
  if (homeIndex === -1) {
    homeIndex = rawPages.findIndex(
      (p: any) => p.isHome === true || p.pageSettings?.isHome === true
    );
  }
  // 3. Check if path === "/" or slug === "/"
  if (homeIndex === -1) {
    homeIndex = rawPages.findIndex((p: any) => p.path === "/" || p.slug === "/");
  }
  // 4. Check if title/name is "home" (case-insensitive)
  if (homeIndex === -1) {
    homeIndex = rawPages.findIndex(
      (p: any) => (p.title || p.name || "").trim().toLowerCase() === "home"
    );
  }
  // 5. Fallback to index 0
  if (homeIndex === -1) {
    homeIndex = 0;
  }

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  const canonicalPages = rawPages.map((page: any, idx: number) => {
    const isThisHome = idx === homeIndex;
    const pageTitle = page.title || page.name || (isThisHome ? "Home" : `Page ${idx + 1}`);

    // ID resolution with deduplication
    let pageId = typeof page.id === "string" && page.id.trim() ? page.id.trim() : `page_${Date.now()}_${idx + 1}`;
    if (seenIds.has(pageId)) {
      pageId = `${pageId}_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`;
    }
    seenIds.add(pageId);

    // Slug resolution with deduplication
    let pageSlug = isThisHome ? "/" : normalizeSlug(page.path || page.slug, pageTitle);
    if (!isThisHome && pageSlug === "/") {
      const safeSlug = pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      pageSlug = `/${safeSlug || `page-${idx + 1}`}`;
    }
    if (seenSlugs.has(pageSlug)) {
      let counter = 2;
      let candidate = `${pageSlug}-${counter}`;
      while (seenSlugs.has(candidate)) {
        counter++;
        candidate = `${pageSlug}-${counter}`;
      }
      pageSlug = candidate;
    }
    seenSlugs.add(pageSlug);

    // Deep clone elements & settings to preserve all nested properties
    const elements = Array.isArray(page.elements) ? JSON.parse(JSON.stringify(page.elements)) : [];
    const pageSettings = page.pageSettings && typeof page.pageSettings === "object"
      ? {
          ...JSON.parse(JSON.stringify(page.pageSettings)),
          title: pageTitle,
          path: pageSlug,
        }
      : { title: pageTitle, path: pageSlug };

    return {
      ...JSON.parse(JSON.stringify(page)),
      id: pageId,
      name: pageTitle,
      slug: pageSlug,
      isHome: isThisHome,
      elements,
      pageSettings,
      ...(page.customCss ? { customCss: page.customCss } : {}),
    };
  });

  const homePage = canonicalPages[homeIndex];
  const homePageId = homePage.id;

  // Extract and preserve global settings, styles, and templates
  const siteSettings = kitData.website?.settings || kitData.siteSettings || {};
  const globalSettings = {
    siteIdentity: { name: siteName, ...(siteSettings.siteIdentity || {}) },
    siteLanguage: siteSettings.siteLanguage || "en",
    isMaintenanceMode: Boolean(siteSettings.isMaintenanceMode),
    backgroundColor: siteSettings.backgroundColor || "#ffffff",
    ...siteSettings,
    ...(kitData.globalSettings || {}),
  };

  return {
    version: 1,
    homePageId,
    pages: canonicalPages,
    elements: homePage.elements,
    pageSettings: homePage.pageSettings,
    globalSettings,
    templates: Array.isArray(kitData.templates) ? JSON.parse(JSON.stringify(kitData.templates)) : [],
    ...(kitData.globalStyles ? { globalStyles: JSON.parse(JSON.stringify(kitData.globalStyles)) } : {}),
    ...(kitData.siteParts ? { siteParts: JSON.parse(JSON.stringify(kitData.siteParts)) } : {}),
    ...(kitData.globalVariables ? { globalVariables: JSON.parse(JSON.stringify(kitData.globalVariables)) } : {}),
    ...(kitData.globalClasses ? { globalClasses: JSON.parse(JSON.stringify(kitData.globalClasses)) } : {}),
  };
}
