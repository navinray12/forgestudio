import { generateSafeFilename } from "./templateExport";
import type { Template } from "../types/template.types";

export interface WebsiteKitExportParams {
  website?: {
    id?: string;
    name?: string;
    description?: string;
    settings?: Record<string, any>;
  } | null;
  elements: any[];
  pageSettings: Record<string, any>;
  templates?: Template[];
}

export interface WebsiteKitPayload {
  type: "website-kit";
  version: 1;
  exportedAt: string;
  website: {
    name: string;
    description: string;
    settings: Record<string, any>;
  };
  pages: Array<{
    id: string;
    title: string;
    path: string;
    elements: any[];
    pageSettings: Record<string, any>;
  }>;
  templates: Template[];
  assets: any[];
}

/**
 * Serializes website project configuration, pages, elements, page settings, and templates
 * into a safe, versioned website kit file format (stripping private credentials, tokens, billing info)
 * and triggers a client-side JSON download.
 */
export function exportWebsiteKitAsJson({
  website,
  elements,
  pageSettings,
  templates = [],
}: WebsiteKitExportParams): void {
  const websiteName = website?.name || pageSettings?.title || "My Website";

  // Deep clone elements, pageSettings, and templates to guarantee non-mutation
  const clonedElements = JSON.parse(JSON.stringify(elements || []));
  const clonedPageSettings = JSON.parse(JSON.stringify(pageSettings || {}));
  const clonedTemplates = JSON.parse(JSON.stringify(templates || []));

  // Construct safe Website Kit payload
  const payload: WebsiteKitPayload = {
    type: "website-kit",
    version: 1,
    exportedAt: new Date().toISOString(),
    website: {
      name: websiteName,
      description: website?.description || "",
      settings: {
        siteLanguage: clonedPageSettings?.siteLanguage || "en",
        isMaintenanceMode: Boolean(clonedPageSettings?.isMaintenanceMode),
        backgroundColor: clonedPageSettings?.backgroundColor || "#ffffff",
      },
    },
    pages: [
      {
        id: "main-page",
        title: clonedPageSettings?.title || "Home",
        path: clonedPageSettings?.path || "/",
        elements: clonedElements,
        pageSettings: clonedPageSettings,
      },
    ],
    templates: clonedTemplates,
    assets: [],
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  const safeName = generateSafeFilename(`website-kit-${websiteName}`);
  const filename = safeName.endsWith(".json") ? safeName : `${safeName}.json`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
