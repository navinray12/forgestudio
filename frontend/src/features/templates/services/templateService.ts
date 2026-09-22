/**
 * @file Templates feature: template Service. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { CreateTemplatePayload, Template } from "../types/template.types";

/**
 * Creates a reusable template from current editor design

 * @param apiUrl Api Url supplied to this operation (type: string).
 * @param payload Payload supplied to this operation (type: CreateTemplatePayload).
 */
export async function saveAsTemplate(
  apiUrl: string,
  payload: CreateTemplatePayload
): Promise<Template> {
  const trimmedName = payload.name?.trim();
  if (!trimmedName) {
    throw new Error("Template name is required.");
  }

  // Deep copy design data to guarantee complete reference isolation
  const clonedElements = JSON.parse(JSON.stringify(payload.templateData?.elements || []));
  const clonedPageSettings = JSON.parse(JSON.stringify(payload.templateData?.pageSettings || {}));

  const cleanPayload = {
    name: trimmedName,
    description: payload.description?.trim() || "",
    type: payload.type || "PAGE",
    category: payload.category || "Other",
    isFavorite: payload.isFavorite || false,
    isShared: payload.isShared || false,
    shareToken: payload.shareToken || null,
    templateData: {
      elements: clonedElements,
      pageSettings: clonedPageSettings,
    },
  };

  const res = await fetch(`${apiUrl}/api/templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(cleanPayload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || "Failed to save template.");
  }

  return data.template;
}

/**
 * Imports a validated template payload into user's Template Library

 * @param apiUrl Api Url supplied to this operation (type: string).
 * @param payload Payload supplied to this operation (type: CreateTemplatePayload).
 */
export async function importTemplate(
  apiUrl: string,
  payload: CreateTemplatePayload
): Promise<Template> {
  return saveAsTemplate(apiUrl, payload);
}

/**
 * Creates an independent duplicate copy of an existing template

 * @param apiUrl Api Url supplied to this operation (type: string).
 * @param sourceTemplate Source Template supplied to this operation (type: Template).
 */
export async function duplicateTemplate(
  apiUrl: string,
  sourceTemplate: Template
): Promise<Template> {
  const clonedElements = JSON.parse(JSON.stringify(sourceTemplate.templateData?.elements || []));
  const clonedPageSettings = JSON.parse(JSON.stringify(sourceTemplate.templateData?.pageSettings || {}));

  const payload: CreateTemplatePayload = {
    name: `${sourceTemplate.name} Copy`,
    description: sourceTemplate.description || "",
    type: sourceTemplate.type || "PAGE",
    category: sourceTemplate.category || "Other",
    isFavorite: false,
    isShared: false,
    templateData: {
      elements: clonedElements,
      pageSettings: clonedPageSettings,
    },
  };

  return saveAsTemplate(apiUrl, payload);
}


/**
 * Fetches all saved design templates for the authenticated user

 * @param apiUrl Api Url supplied to this operation (type: string).
 */
export async function getUserTemplates(apiUrl: string): Promise<Template[]> {
  const res = await fetch(`${apiUrl}/api/templates`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || "Unable to load templates.");
  }

  return data.templates || [];
}

/**
 * Fetches a public shared template safely without authentication

 * @param apiUrl Api Url supplied to this operation (type: string).
 * @param shareToken Share Token supplied to this operation (type: string).
 */
export async function getPublicTemplate(apiUrl: string, shareToken: string): Promise<Template> {
  const res = await fetch(`${apiUrl}/api/templates/public/${shareToken}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || "This template is no longer available.");
  }

  return data.template;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  category?: string;
  isFavorite?: boolean;
  isShared?: boolean;
  shareToken?: string | null;
  templateData?: {
    elements: any[];
    pageSettings: any;
  };
}

/**
 * Updates metadata (name, description, category, isFavorite, isShared) for an existing template

 * @param apiUrl Api Url supplied to this operation (type: string).
 * @param templateId Template Id supplied to this operation (type: string).
 * @param payload Payload supplied to this operation (type: UpdateTemplatePayload).
 */
export async function updateTemplate(
  apiUrl: string,
  templateId: string,
  payload: UpdateTemplatePayload
): Promise<Template> {
  let res = await fetch(`${apiUrl}/api/v1/templates/${templateId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status === 404) {
    res = await fetch(`${apiUrl}/api/templates/${templateId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || "Unable to update template.");
  }

  return data.template || data.data?.template;
}

/**
 * Toggles template sharing state (enabled / disabled)

 * @param apiUrl Api Url supplied to this operation (type: string).
 * @param templateId Template Id supplied to this operation (type: string).
 * @param isShared Is Shared supplied to this operation (type: boolean).
 */
export async function toggleTemplateSharing(
  apiUrl: string,
  templateId: string,
  isShared: boolean
): Promise<Template> {
  const res = await fetch(`${apiUrl}/api/templates/${templateId}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ isShared }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || "Unable to update sharing settings.");
  }

  return data.template;
}

/**
 * Convenience helper to toggle a template's favorite state

 * @param apiUrl Api Url supplied to this operation (type: string).
 * @param templateId Template Id supplied to this operation (type: string).
 * @param isFavorite Is Favorite supplied to this operation (type: boolean).
 */
export async function toggleFavorite(
  apiUrl: string,
  templateId: string,
  isFavorite: boolean
): Promise<Template> {
  return updateTemplate(apiUrl, templateId, { isFavorite });
}

/**
 * Deletes a saved template owned by the authenticated user

 * @param apiUrl Api Url supplied to this operation (type: string).
 * @param templateId Template Id supplied to this operation (type: string).
 */
export async function deleteTemplate(apiUrl: string, templateId: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/templates/${templateId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || "Unable to delete template.");
  }
}
