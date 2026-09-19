import type { Template } from "../types/template.types";

/**
 * Generates a clean, safe filename from a template name for download.
 * E.g., "My SaaS Landing Page!" -> "my-saas-landing-page.json"
 */
export const generateSafeFilename = (templateName: string): string => {
  if (!templateName || !templateName.trim()) {
    return "template-export.json";
  }

  const cleanName = templateName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen

  const finalSlug = cleanName.replace(/^-+|-+$/g, "");

  return finalSlug ? `${finalSlug}.json` : "template-export.json";
};

/**
 * Serializes supported template data (stripping private auth/session/user data)
 * and triggers a client-side browser JSON download.
 */
export const exportTemplateAsJson = (template: Template): void => {
  if (!template || !template.templateData) {
    throw new Error("Unable to export template. Missing template data.");
  }

  // Deep clone elements and page settings to guarantee original template non-mutation
  const clonedElements = JSON.parse(JSON.stringify(template.templateData.elements || []));
  const clonedPageSettings = JSON.parse(JSON.stringify(template.templateData.pageSettings || {}));

  // Construct standardized, safe export structure compatible with F-328 Template Import
  const exportPayload = {
    version: "1.0",
    name: template.name,
    description: template.description || "",
    type: template.type || "PAGE",
    category: template.category || "Other",
    templateData: {
      elements: clonedElements,
      pageSettings: clonedPageSettings,
    },
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  const filename = generateSafeFilename(template.name);

  // Trigger browser download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
