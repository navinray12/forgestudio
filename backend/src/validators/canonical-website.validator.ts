import { AppError } from "../utils/app-error.js";

export interface CanonicalPage {
  id: string;
  name: string;
  slug: string;
  isHome?: boolean;
  elements: any[];
  pageSettings?: Record<string, any>;
  [key: string]: any;
}

export interface CanonicalWebsiteData {
  version: number;
  elements: any[];
  pages: CanonicalPage[];
  homePageId: string;
  siteParts?: {
    header?: { enabled?: boolean; isEnabled?: boolean; elements?: any[] };
    footer?: { enabled?: boolean; isEnabled?: boolean; elements?: any[] };
    single?: { enabled?: boolean; isEnabled?: boolean; elements?: any[] };
    archive?: { enabled?: boolean; isEnabled?: boolean; elements?: any[] };
    notFound404?: { enabled?: boolean; isEnabled?: boolean; elements?: any[] };
    searchResults?: { enabled?: boolean; isEnabled?: boolean; elements?: any[] };
    [key: string]: any;
  };
  globalSettings?: Record<string, any>;
  globalStyles?: Record<string, any>;
  globalVariables?: any[];
  globalClasses?: any[];
  publishing?: Record<string, any>;
  deployment?: Record<string, any>;
  breakpoints?: any[];
  popups?: any[];
  pageCss?: string;
  pageSettings?: Record<string, any>;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedData?: CanonicalWebsiteData;
}

const MAX_NESTING_DEPTH = 50;

/**
 * Traverses an element tree and detects cycles, duplicate IDs, and excessive nesting depth.
 */
export function validateElementTree(
  elements: any[],
  seenIds: Set<string> = new Set(),
  ancestorIds: Set<string> = new Set(),
  depth: number = 0
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (depth > MAX_NESTING_DEPTH) {
    errors.push(`Maximum element nesting depth (${MAX_NESTING_DEPTH}) exceeded.`);
    return { isValid: false, errors };
  }

  if (!Array.isArray(elements)) {
    errors.push("Element container children must be an array.");
    return { isValid: false, errors };
  }

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!el || typeof el !== "object") {
      errors.push(`Element at index ${i} is not a valid object.`);
      continue;
    }

    // Prototype pollution check
    if ("__proto__" in el || "constructor" in el || "prototype" in el) {
      delete el.__proto__;
      delete el.constructor;
      delete el.prototype;
    }

    if (!el.id || typeof el.id !== "string" || el.id.trim() === "") {
      errors.push(`Element at index ${i} is missing a valid string ID.`);
      continue;
    }

    // Cycle detection
    if (ancestorIds.has(el.id)) {
      errors.push(`Cyclic hierarchy detected: Element "${el.id}" is an ancestor of itself.`);
      return { isValid: false, errors };
    }

    // Duplicate ID check
    if (seenIds.has(el.id)) {
      errors.push(`Duplicate element ID detected: "${el.id}".`);
    } else {
      seenIds.add(el.id);
    }

    // Recursively validate children
    if (el.children && Array.isArray(el.children)) {
      const nextAncestors = new Set(ancestorIds);
      nextAncestors.add(el.id);
      const childRes = validateElementTree(el.children, seenIds, nextAncestors, depth + 1);
      if (!childRes.isValid) {
        errors.push(...childRes.errors);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates and normalizes canonical website data on the backend save boundary.
 */
export function validateAndNormalizeCanonicalWebsite(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { isValid: false, errors: ["Canonical website data must be a valid JSON object."] };
  }

  // Remove prototype pollution keys
  if ("__proto__" in data || "constructor" in data || "prototype" in data) {
    delete data.__proto__;
    delete data.constructor;
    delete data.prototype;
  }

  // 1. Version Check & Upgrade
  const version = typeof data.version === "number" && data.version > 0 ? data.version : 1;

  // 2. Elements validation
  const rootElements = Array.isArray(data.elements) ? data.elements : [];
  const rootTreeValidation = validateElementTree(rootElements, new Set());
  if (!rootTreeValidation.isValid) {
    errors.push(...rootTreeValidation.errors);
  }

  // 3. Pages Array & Normalization
  let pages: CanonicalPage[] = [];
  if (Array.isArray(data.pages) && data.pages.length > 0) {
    const pageSlugs = new Set<string>();
    const pageIds = new Set<string>();

    for (const p of data.pages) {
      if (!p || typeof p !== "object") {
        errors.push("Encountered invalid non-object page item.");
        continue;
      }

      const pId = typeof p.id === "string" && p.id.trim() ? p.id.trim() : `page_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      if (pageIds.has(pId)) {
        errors.push(`Duplicate page ID: "${pId}".`);
      } else {
        pageIds.add(pId);
      }

      let pSlug = typeof p.slug === "string" ? p.slug.trim() : "";
      if (!pSlug.startsWith("/")) {
        pSlug = `/${pSlug}`;
      }
      pSlug = pSlug.toLowerCase();

      if (pageSlugs.has(pSlug)) {
        errors.push(`Duplicate page slug detected: "${pSlug}".`);
      } else {
        pageSlugs.add(pSlug);
      }

      const pElements = Array.isArray(p.elements) ? p.elements : [];
      const pageTreeRes = validateElementTree(pElements, new Set());
      if (!pageTreeRes.isValid) {
        errors.push(...pageTreeRes.errors.map((e) => `[Page ${pId}] ${e}`));
      }

      pages.push({
        ...p,
        id: pId,
        name: typeof p.name === "string" && p.name.trim() ? p.name.trim() : "Untitled Page",
        slug: pSlug,
        elements: pElements,
        pageSettings: p.pageSettings && typeof p.pageSettings === "object" ? p.pageSettings : {},
      });
    }
  } else {
    // Legacy document backward compatibility
    pages = [
      {
        id: "home",
        name: "Home",
        slug: "/",
        isHome: true,
        elements: rootElements,
        pageSettings: data.pageSettings || { title: "Home", path: "/" },
      },
    ];
  }

  // 4. Home Page Resolution
  let homePageId = typeof data.homePageId === "string" && data.homePageId ? data.homePageId : "";
  const homeExists = pages.some((p) => p.id === homePageId);
  if (!homeExists) {
    const designatedHome = pages.find((p) => p.isHome || p.slug === "/") || pages[0];
    homePageId = designatedHome ? designatedHome.id : "home";
  }

  pages = pages.map((p) => ({
    ...p,
    isHome: p.id === homePageId,
    ...(p.id === homePageId ? { slug: "/" } : {}),
  }));

  // 5. SiteParts validation
  const siteParts = data.siteParts && typeof data.siteParts === "object" ? { ...data.siteParts } : undefined;
  if (siteParts) {
    for (const partKey of ["header", "footer", "single", "archive", "notFound404", "searchResults"]) {
      if (siteParts[partKey] && typeof siteParts[partKey] === "object") {
        const partElements = Array.isArray(siteParts[partKey].elements) ? siteParts[partKey].elements : [];
        const partTreeRes = validateElementTree(partElements, new Set());
        if (!partTreeRes.isValid) {
          errors.push(...partTreeRes.errors.map((e) => `[SitePart ${partKey}] ${e}`));
        }
      }
    }
  }

  const normalizedData: CanonicalWebsiteData = {
    ...data,
    version,
    elements: rootElements,
    pages,
    homePageId,
    ...(siteParts ? { siteParts } : {}),
    globalSettings: data.globalSettings || {},
    globalStyles: data.globalStyles || data.globalSettings?.globalStyles || {},
    breakpoints: Array.isArray(data.breakpoints) ? data.breakpoints : undefined,
    popups: Array.isArray(data.popups) ? data.popups : [],
    pageCss: typeof data.pageCss === "string" ? data.pageCss : "",
  };

  return {
    isValid: errors.length === 0,
    errors,
    normalizedData,
  };
}

/**
 * Enforces canonical website schema on incoming editorData payload.
 * Throws AppError(400, "INVALID_CANONICAL_DATA") if validation fails.
 */
export function assertCanonicalEditorData(data: any): CanonicalWebsiteData {
  const result = validateAndNormalizeCanonicalWebsite(data);
  if (!result.isValid || !result.normalizedData) {
    throw new AppError(
      `Invalid canonical editorData: ${result.errors.join("; ")}`,
      400,
      "INVALID_CANONICAL_DATA"
    );
  }
  return result.normalizedData;
}
