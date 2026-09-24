import crypto from "crypto";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { getWebsiteById } from "../website.service.js";
import { canUserAccessResource } from "../permission.service.js";
import { recordAuditLog } from "../audit.service.js";
import { processFormSubmission, getWebsiteSubmissions, deleteWebsiteSubmission, sanitizeInput } from "../form/form.service.js";
import { sendSignedWordPressRequest, getWordPressConnection } from "./connector.service.js";
import {
  WordPressFormsCapabilities,
  WordPressForm,
  WordPressFormField,
  WordPressFormSubmission,
  ALLOWED_FIELD_TYPES,
  resolveFormsProvider,
  computeFormHash,
} from "./formsProvider.service.js";

const db = prisma as any;

/**
 * Validate a single form field input against field definition constraints
 */
export function validateFormFieldInput(field: WordPressFormField, value: any): { valid: boolean; error?: string } {
  const valStr = value !== undefined && value !== null ? String(value).trim() : "";

  // 1. Required Check
  if (field.required && !valStr) {
    return { valid: false, error: `Field '${field.label || field.id}' is required.` };
  }

  if (!valStr) {
    return { valid: true };
  }

  // 2. Field Type Specific Validation
  switch (field.type) {
    case "email": {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(valStr)) {
        return { valid: false, error: `Field '${field.label || field.id}' must be a valid email address.` };
      }
      break;
    }

    case "number": {
      const num = Number(valStr);
      if (isNaN(num)) {
        return { valid: false, error: `Field '${field.label || field.id}' must be a number.` };
      }
      if (field.validation?.min !== undefined && num < field.validation.min) {
        return { valid: false, error: `Field '${field.label || field.id}' must be at least ${field.validation.min}.` };
      }
      if (field.validation?.max !== undefined && num > field.validation.max) {
        return { valid: false, error: `Field '${field.label || field.id}' must be at most ${field.validation.max}.` };
      }
      break;
    }

    case "select":
    case "radio": {
      if (field.options && field.options.length > 0) {
        const validValues = field.options.map((o) => o.value);
        if (!validValues.includes(valStr)) {
          return { valid: false, error: `Invalid option '${valStr}' selected for '${field.label || field.id}'.` };
        }
      }
      break;
    }

    case "textarea":
    case "text": {
      if (field.validation?.minLength !== undefined && valStr.length < field.validation.minLength) {
        return { valid: false, error: `Field '${field.label || field.id}' must be at least ${field.validation.minLength} characters.` };
      }
      if (field.validation?.maxLength !== undefined && valStr.length > field.validation.maxLength) {
        return { valid: false, error: `Field '${field.label || field.id}' must not exceed ${field.validation.maxLength} characters.` };
      }
      break;
    }
  }

  return { valid: true };
}

/**
 * Validate file upload payloads against dangerous extensions, MIME types, and size limits
 */
export function validateFileUploadPayload(file: { filename: string; mimeType: string; sizeBytes: number; base64Content?: string }): { valid: boolean; error?: string } {
  if (!file || !file.filename) {
    return { valid: false, error: "File payload is missing filename." };
  }

  const filename = file.filename.toLowerCase();
  const dangerousExtensions = [
    ".php", ".phtml", ".php3", ".php4", ".php5", ".phps", ".exe", ".dll", ".so",
    ".bat", ".cmd", ".sh", ".py", ".pl", ".cgi", ".jar", ".vbs", ".ps1", ".js", ".html", ".htm"
  ];

  for (const ext of dangerousExtensions) {
    if (filename.endsWith(ext) || filename.includes(`${ext}.`)) {
      return { valid: false, error: `Executable file extension '${ext}' is strictly forbidden.` };
    }
  }

  // Allowed file extensions allowlist
  const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".doc", ".docx", ".txt", ".csv", ".zip"];
  const hasAllowedExt = allowedExtensions.some((ext) => filename.endsWith(ext));
  if (!hasAllowedExt) {
    return { valid: false, error: "File extension is not in the allowed upload list." };
  }

  // Size limit (max 10MB)
  const maxBytes = 10 * 1024 * 1024;
  if (file.sizeBytes > maxBytes) {
    return { valid: false, error: "File size exceeds the 10MB upload limit." };
  }

  // Magic bytes check for base64 content
  if (file.base64Content) {
    const header = file.base64Content.substring(0, 32);
    if (header.includes("PD9waHA") || header.includes("<?php")) {
      return { valid: false, error: "Malicious PHP script header detected in file upload (Magic Bytes Protection)." };
    }
  }

  return { valid: true };
}

/**
 * Capability Discovery: Get WordPress Forms Capabilities for a website
 */
export async function getWordPressFormsCapabilities(websiteId: string, userId: string): Promise<WordPressFormsCapabilities> {
  const website = await getWebsiteById(websiteId, userId);
  const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
  if (!canView) {
    throw new AppError("Forbidden: Insufficient permissions to view WordPress forms capabilities.", 403, "WORDPRESS_FORM_PERMISSION_DENIED");
  }

  const connection = await getWordPressConnection(websiteId, userId).catch(() => null);
  const provider = resolveFormsProvider(connection);
  const caps = await provider.getCapabilities(connection);

  try {
    await recordAuditLog(userId, "WORDPRESS_FORMS_CAPABILITIES_CHECKED", websiteId, {
      status: caps.status,
      providerName: caps.providerName,
    });
  } catch (e) {}

  return caps;
}

/**
 * List all forms for a website
 */
export async function listWordPressForms(websiteId: string, userId: string): Promise<WordPressForm[]> {
  const website = await getWebsiteById(websiteId, userId);
  const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
  if (!canView) {
    throw new AppError("Forbidden: Insufficient permissions to list WordPress forms.", 403, "WORDPRESS_FORM_PERMISSION_DENIED");
  }

  let editorData = website.editorData;
  if (typeof editorData === "string") {
    try { editorData = JSON.parse(editorData); } catch { editorData = {}; }
  }

  const formsList: WordPressForm[] = [];

  // Extract form elements from website pages
  const pages = Array.isArray(editorData?.pages) ? editorData.pages : [];
  for (const page of pages) {
    const elements = Array.isArray(page.elements) ? page.elements : [];
    for (const el of elements) {
      if (el && el.type === "form") {
        const formId = el.formId || el.id || `form_${page.id}`;
        formsList.push({
          id: formId,
          formId,
          websiteId,
          title: el.title || el.name || `Form on ${page.name || "Page"}`,
          fields: Array.isArray(el.fields) ? el.fields : [],
          settings: el.settings || {},
          formHash: computeFormHash({ title: el.title || "Form", fields: el.fields || [], settings: el.settings }),
        });
      }
    }
  }

  return formsList;
}

/**
 * Get a specific form definition
 */
export async function getWordPressForm(websiteId: string, formId: string, userId: string): Promise<WordPressForm> {
  const forms = await listWordPressForms(websiteId, userId);
  const found = forms.find((f) => f.id === formId || f.formId === formId);
  if (!found) {
    throw new AppError(`Form '${formId}' not found for website '${websiteId}'.`, 404, "WORDPRESS_FORM_NOT_FOUND");
  }
  return found;
}

/**
 * Create or register a new form definition
 */
export async function createWordPressForm(websiteId: string, formData: Partial<WordPressForm>, userId: string): Promise<WordPressForm> {
  await getWebsiteById(websiteId, userId);
  const canEdit = await canUserAccessResource(userId, websiteId, "*", "EDIT");
  if (!canEdit) {
    throw new AppError("Forbidden: Insufficient permissions to create WordPress form.", 403, "WORDPRESS_FORM_PERMISSION_DENIED");
  }

  const connection = await getWordPressConnection(websiteId, userId).catch(() => null);
  const provider = resolveFormsProvider(connection);
  const createdForm = await provider.createForm(connection, websiteId, formData);

  try {
    await recordAuditLog(userId, "WORDPRESS_FORM_CREATED", websiteId, {
      formId: createdForm.id,
      title: createdForm.title,
    });
  } catch (e) {}

  return createdForm;
}

/**
 * Update an existing form definition
 */
export async function updateWordPressForm(websiteId: string, formId: string, formData: Partial<WordPressForm>, userId: string): Promise<WordPressForm> {
  await getWebsiteById(websiteId, userId);
  const canEdit = await canUserAccessResource(userId, websiteId, "*", "EDIT");
  if (!canEdit) {
    throw new AppError("Forbidden: Insufficient permissions to update WordPress form.", 403, "WORDPRESS_FORM_PERMISSION_DENIED");
  }

  const connection = await getWordPressConnection(websiteId, userId).catch(() => null);
  const provider = resolveFormsProvider(connection);
  const updatedForm = await provider.updateForm(connection, websiteId, formId, formData);

  try {
    await recordAuditLog(userId, "WORDPRESS_FORM_UPDATED", websiteId, {
      formId: updatedForm.id,
      title: updatedForm.title,
    });
  } catch (e) {}

  return updatedForm;
}

/**
 * Delete a form definition
 */
export async function deleteWordPressForm(websiteId: string, formId: string, userId: string): Promise<{ success: boolean }> {
  await getWebsiteById(websiteId, userId);
  const canDelete = await canUserAccessResource(userId, websiteId, "*", "DELETE");
  if (!canDelete) {
    throw new AppError("Forbidden: Insufficient permissions to delete WordPress form.", 403, "WORDPRESS_FORM_PERMISSION_DENIED");
  }

  const connection = await getWordPressConnection(websiteId, userId).catch(() => null);
  const provider = resolveFormsProvider(connection);
  await provider.deleteForm(connection, websiteId, formId);

  try {
    await recordAuditLog(userId, "WORDPRESS_FORM_DELETED", websiteId, {
      formId,
    });
  } catch (e) {}

  return { success: true };
}

/**
 * Synchronize a form definition to WordPress
 */
export async function syncWordPressForm(websiteId: string, formId: string, userId: string): Promise<{ success: boolean; formHash: string; remoteWpFormId?: string | number }> {
  await getWebsiteById(websiteId, userId);
  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("Forbidden: Insufficient permissions to publish/sync WordPress form.", 403, "WORDPRESS_FORM_PERMISSION_DENIED");
  }

  const form = await getWordPressForm(websiteId, formId, userId).catch(() => null);
  const formHash = form?.formHash || computeFormHash({ title: form?.title || "Form", fields: form?.fields || [] });

  const connection = await getWordPressConnection(websiteId, userId).catch(() => null);

  let remoteWpFormId: string | number | undefined = formId;

  if (connection && connection.status === "CONNECTED") {
    try {
      const syncRes = await sendSignedWordPressRequest(
        connection.siteUrl,
        "/forms/sync",
        "POST",
        connection.apiKeyHash,
        {
          websiteId,
          formId,
          title: form?.title || "Form",
          fields: form?.fields || [],
          formHash,
        }
      ).catch(() => null);

      if (syncRes && (syncRes.wpFormId || syncRes.id)) {
        remoteWpFormId = syncRes.wpFormId || syncRes.id;
      }
    } catch (e) {}
  }

  try {
    await recordAuditLog(userId, "WORDPRESS_FORM_SYNCED", websiteId, {
      formId,
      formHash,
      remoteWpFormId,
    });
  } catch (e) {}

  return {
    success: true,
    formHash,
    remoteWpFormId,
  };
}

/**
 * Submit form payload with full server-side validation and security checks
 */
export async function submitWordPressForm(
  websiteId: string,
  formId: string,
  payload: { fields: Record<string, any>; formName?: string; honeypotValue?: string; file?: any },
  reqMetadata?: { ip?: string; userAgent?: string; referer?: string }
): Promise<{ success: boolean; message: string; submissionId?: string }> {
  if (!websiteId || !formId) {
    throw new AppError("Website ID and Form ID are required.", 400, "WORDPRESS_FORM_SUBMISSION_INVALID");
  }

  // 1. File Upload Security Validation (if file is attached)
  if (payload.file) {
    const fileVal = validateFileUploadPayload(payload.file);
    if (!fileVal.valid) {
      throw new AppError(fileVal.error || "Invalid file payload.", 400, "WORDPRESS_FORM_SUBMISSION_INVALID");
    }
  }

  // 2. Process submission via native form service engine
  const res = await processFormSubmission({
    websiteId,
    formId,
    formName: payload.formName || "WordPress Contact Form",
    fields: payload.fields,
    honeypotValue: payload.honeypotValue,
    metadata: reqMetadata,
  });

  // 3. Log privacy-preserving audit event (no sensitive field values logged)
  try {
    await recordAuditLog("SYSTEM", "WORDPRESS_FORM_SUBMISSION_RECEIVED", websiteId, {
      formId,
      success: res.success,
    });
  } catch (e) {}

  return {
    success: res.success,
    message: res.message,
    submissionId: `sub_${Date.now()}`,
  };
}

/**
 * Fetch submissions for a specific form (requires VIEW access)
 */
export async function getWordPressFormSubmissions(websiteId: string, formId: string, userId: string): Promise<WordPressFormSubmission[]> {
  await getWebsiteById(websiteId, userId);
  const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
  if (!canView) {
    throw new AppError("Forbidden: Insufficient permissions to view form submissions.", 403, "WORDPRESS_FORM_PERMISSION_DENIED");
  }

  const allSubmissions = await getWebsiteSubmissions(websiteId, userId);
  const filtered = allSubmissions.filter((s: any) => s.formId === formId);
  return filtered as WordPressFormSubmission[];
}

/**
 * Delete a specific form submission (requires DELETE access)
 */
export async function deleteWordPressFormSubmission(websiteId: string, formId: string, submissionId: string, userId: string): Promise<{ success: boolean }> {
  await getWebsiteById(websiteId, userId);
  const canDelete = await canUserAccessResource(userId, websiteId, "*", "DELETE");
  if (!canDelete) {
    throw new AppError("Forbidden: Insufficient permissions to delete form submission.", 403, "WORDPRESS_FORM_PERMISSION_DENIED");
  }

  await deleteWebsiteSubmission(websiteId, submissionId, userId);

  try {
    await recordAuditLog(userId, "WORDPRESS_FORM_SUBMISSION_DELETED", websiteId, {
      formId,
      submissionId,
    });
  } catch (e) {}

  return { success: true };
}
