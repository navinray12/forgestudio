import type { CreateTemplatePayload, TemplateCategory, TemplateType } from "../types/template.types";
import { TEMPLATE_CATEGORIES } from "../types/template.types";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  payload?: CreateTemplatePayload;
  summary?: {
    name: string;
    type: TemplateType;
    category: string;
    elementCount: number;
  };
}

/**
 * Regenerates element IDs recursively to guarantee ID safety and prevent conflicts
 * with existing canvas elements.
 */
export const sanitizeAndRegenerateElementIds = (elements: any[]): EditorElement[] => {
  if (!Array.isArray(elements)) return [];

  return elements.map((elem) => {
    const newId = `elem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const cloned = { ...elem, id: newId };

    if (Array.isArray(cloned.children) && cloned.children.length > 0) {
      cloned.children = sanitizeAndRegenerateElementIds(cloned.children);
    }

    return cloned as EditorElement;
  });
};

/**
 * Validates untrusted imported JSON template file content and returns a safe payload.
 */
export const validateAndSanitizeTemplateFile = (
  fileContent: string,
  existingTemplateNames: string[] = []
): ValidationResult => {
  if (!fileContent || !fileContent.trim()) {
    return {
      isValid: false,
      error: "Invalid template file.",
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fileContent);
  } catch (e) {
    return {
      isValid: false,
      error: "Invalid template file. Please provide a valid JSON format.",
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      isValid: false,
      error: "This template file is not supported.",
    };
  }

  // Locate elements array
  const rawElements = parsed.templateData?.elements || parsed.elements;
  if (!Array.isArray(rawElements) || rawElements.length === 0) {
    return {
      isValid: false,
      error: "This template file is not supported.",
    };
  }

  // Validate elements structure
  const isValidElementTree = rawElements.every(
    (item) => typeof item === "object" && item !== null && typeof item.type === "string"
  );

  if (!isValidElementTree) {
    return {
      isValid: false,
      error: "This template file is not supported.",
    };
  }

  // Extract template metadata
  let rawName = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "Imported Template";
  
  // Handle duplicate template name safely (Requirement 12 & 13)
  const lowerExistingNames = existingTemplateNames.map((n) => n.toLowerCase());
  if (lowerExistingNames.includes(rawName.toLowerCase())) {
    let candidateName = `${rawName} (Imported)`;
    let counter = 2;
    while (lowerExistingNames.includes(candidateName.toLowerCase())) {
      candidateName = `${rawName} (Imported ${counter})`;
      counter++;
    }
    rawName = candidateName;
  }

  const rawDescription = typeof parsed.description === "string" ? parsed.description.trim() : "";
  
  const rawType: TemplateType = ["PAGE", "SECTION", "WEBSITE"].includes(parsed.type)
    ? (parsed.type as TemplateType)
    : "PAGE";

  const rawCategory: TemplateCategory | string = TEMPLATE_CATEGORIES.includes(parsed.category as TemplateCategory)
    ? parsed.category
    : "Other";

  const rawPageSettings = parsed.templateData?.pageSettings || parsed.pageSettings || {};

  // Sanitize and generate safe IDs for all elements recursively (Requirement 10)
  const safeElements = sanitizeAndRegenerateElementIds(rawElements);

  const payload: CreateTemplatePayload = {
    name: rawName,
    description: rawDescription,
    type: rawType,
    category: rawCategory,
    templateData: {
      elements: safeElements,
      pageSettings: rawPageSettings,
    },
  };

  return {
    isValid: true,
    payload,
    summary: {
      name: rawName,
      type: rawType,
      category: rawCategory,
      elementCount: safeElements.length,
    },
  };
};
