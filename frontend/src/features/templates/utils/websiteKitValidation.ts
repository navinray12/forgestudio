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
    }>;
    templates: any[];
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

    return {
      id: page.id || `page-${index + 1}`,
      title: page.title || `Page ${index + 1}`,
      path: page.path || `/${index === 0 ? "" : page.title?.toLowerCase().replace(/\s+/g, "-")}`,
      elements: safeElements,
      pageSettings: page.pageSettings || {},
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
    },
    summary: {
      websiteName,
      pageCount: sanitizedPages.length,
      elementCount: totalElementsCount,
    },
  };
}
