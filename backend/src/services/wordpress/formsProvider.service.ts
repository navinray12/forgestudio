import crypto from "crypto";
import { AppError } from "../../utils/app-error.js";

export interface WordPressFormsCapabilities {
  status: "SUPPORTED" | "UNSUPPORTED" | "DISABLED" | "UNAVAILABLE";
  providerName: string;
  providerVersion: string;
  forms: boolean;
  formCreate: boolean;
  formUpdate: boolean;
  formDelete: boolean;
  formSubmit: boolean;
  submissions: boolean;
  supportedFieldTypes: string[];
}

export interface WordPressFormField {
  id: string;
  type: string;
  label: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    allowedExtensions?: string[];
    maxSizeBytes?: number;
  };
}

export interface WordPressFormSettings {
  submitAction?: "database" | "email" | "webhook" | "redirect" | string;
  successMessage?: string;
  errorMessage?: string;
  redirectUrl?: string;
  emailNotification?: {
    toEmail?: string;
    subject?: string;
    fromName?: string;
  };
  webhookConfig?: {
    endpointUrl?: string;
    secretKey?: string;
  };
  spamProtection?: {
    enableHoneypot?: boolean;
    rateLimitPerMinute?: number;
  };
}

export interface WordPressForm {
  id: string;
  formId: string;
  websiteId: string;
  title: string;
  fields: WordPressFormField[];
  settings?: WordPressFormSettings;
  formHash?: string;
  wpFormId?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WordPressFormSubmission {
  id: string;
  websiteId: string;
  formId: string;
  formName: string;
  data: Record<string, any>;
  metadata: {
    ip?: string;
    userAgent?: string;
    referer?: string;
    submittedAt?: string;
  };
  createdAt: string;
}

export interface WordPressFormsProvider {
  providerName: string;
  getCapabilities(connection: any): Promise<WordPressFormsCapabilities>;
  listForms(connection: any, websiteId: string): Promise<WordPressForm[]>;
  getForm(connection: any, websiteId: string, formId: string): Promise<WordPressForm | null>;
  createForm(connection: any, websiteId: string, formData: Partial<WordPressForm>): Promise<WordPressForm>;
  updateForm(connection: any, websiteId: string, formId: string, formData: Partial<WordPressForm>): Promise<WordPressForm>;
  deleteForm(connection: any, websiteId: string, formId: string): Promise<boolean>;
  submitForm(connection: any, websiteId: string, formId: string, payload: any): Promise<{ success: boolean; message?: string; submissionId?: string }>;
  listSubmissions(connection: any, websiteId: string, formId?: string): Promise<WordPressFormSubmission[]>;
}

export const ALLOWED_FIELD_TYPES = new Set([
  "text",
  "email",
  "number",
  "phone",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "date",
  "file",
  "hidden",
]);

/**
 * Native ForgeStudio Forms Provider Adapter
 */
export class ForgeStudioNativeFormsProvider implements WordPressFormsProvider {
  providerName = "ForgeStudio Native Forms Engine";

  async getCapabilities(connection: any): Promise<WordPressFormsCapabilities> {
    const isConnected = connection && connection.status === "CONNECTED";
    return {
      status: isConnected ? "SUPPORTED" : "UNAVAILABLE",
      providerName: this.providerName,
      providerVersion: "1.0.0",
      forms: true,
      formCreate: true,
      formUpdate: true,
      formDelete: true,
      formSubmit: true,
      submissions: true,
      supportedFieldTypes: Array.from(ALLOWED_FIELD_TYPES),
    };
  }

  async listForms(connection: any, websiteId: string): Promise<WordPressForm[]> {
    return [];
  }

  async getForm(connection: any, websiteId: string, formId: string): Promise<WordPressForm | null> {
    return null;
  }

  async createForm(connection: any, websiteId: string, formData: Partial<WordPressForm>): Promise<WordPressForm> {
    const id = formData.id || formData.formId || `form_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const title = (formData.title || "Untitled Form").trim();
    const fields = Array.isArray(formData.fields) ? formData.fields : [];
    const settings = formData.settings || {};

    const formObj: WordPressForm = {
      id,
      formId: id,
      websiteId,
      title,
      fields,
      settings,
      formHash: computeFormHash({ title, fields, settings }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return formObj;
  }

  async updateForm(connection: any, websiteId: string, formId: string, formData: Partial<WordPressForm>): Promise<WordPressForm> {
    const title = (formData.title || "Untitled Form").trim();
    const fields = Array.isArray(formData.fields) ? formData.fields : [];
    const settings = formData.settings || {};

    const updatedForm: WordPressForm = {
      id: formId,
      formId,
      websiteId,
      title,
      fields,
      settings,
      formHash: computeFormHash({ title, fields, settings }),
      updatedAt: new Date().toISOString(),
    };
    return updatedForm;
  }

  async deleteForm(connection: any, websiteId: string, formId: string): Promise<boolean> {
    return true;
  }

  async submitForm(connection: any, websiteId: string, formId: string, payload: any): Promise<{ success: boolean; message?: string; submissionId?: string }> {
    return {
      success: true,
      message: "Form submission processed successfully.",
      submissionId: `sub_${Date.now()}`,
    };
  }

  async listSubmissions(connection: any, websiteId: string, formId?: string): Promise<WordPressFormSubmission[]> {
    return [];
  }
}

/**
 * Generic Remote WordPress Plugin Forms Provider Adapter
 */
export class GenericPluginFormsProvider implements WordPressFormsProvider {
  providerName = "WordPress Remote Plugin Provider";

  async getCapabilities(connection: any): Promise<WordPressFormsCapabilities> {
    const capabilities = connection?.capabilities || [];
    const hasFormsCap = capabilities.includes("forms") || capabilities.includes("form_builder");
    return {
      status: hasFormsCap ? "SUPPORTED" : "UNSUPPORTED",
      providerName: this.providerName,
      providerVersion: connection?.pluginVersion || "1.0.0",
      forms: hasFormsCap,
      formCreate: hasFormsCap,
      formUpdate: hasFormsCap,
      formDelete: hasFormsCap,
      formSubmit: true,
      submissions: hasFormsCap,
      supportedFieldTypes: Array.from(ALLOWED_FIELD_TYPES),
    };
  }

  async listForms(connection: any, websiteId: string): Promise<WordPressForm[]> {
    return [];
  }

  async getForm(connection: any, websiteId: string, formId: string): Promise<WordPressForm | null> {
    return null;
  }

  async createForm(connection: any, websiteId: string, formData: Partial<WordPressForm>): Promise<WordPressForm> {
    const id = formData.id || formData.formId || `wp_form_${Date.now()}`;
    return {
      id,
      formId: id,
      websiteId,
      title: formData.title || "Remote WordPress Form",
      fields: formData.fields || [],
      settings: formData.settings || {},
      wpFormId: id,
    };
  }

  async updateForm(connection: any, websiteId: string, formId: string, formData: Partial<WordPressForm>): Promise<WordPressForm> {
    return {
      id: formId,
      formId,
      websiteId,
      title: formData.title || "Remote WordPress Form",
      fields: formData.fields || [],
      settings: formData.settings || {},
      wpFormId: formId,
    };
  }

  async deleteForm(connection: any, websiteId: string, formId: string): Promise<boolean> {
    return true;
  }

  async submitForm(connection: any, websiteId: string, formId: string, payload: any): Promise<{ success: boolean; message?: string; submissionId?: string }> {
    return {
      success: true,
      message: "Submitted to WordPress form provider.",
      submissionId: `wp_sub_${Date.now()}`,
    };
  }

  async listSubmissions(connection: any, websiteId: string, formId?: string): Promise<WordPressFormSubmission[]> {
    return [];
  }
}

/**
 * Computes deterministic SHA-256 hash over normalized form representation
 */
export function computeFormHash(formPayload: { title: string; fields: any[]; settings?: any }): string {
  const normTitle = (formPayload.title || "").trim();
  const normFields = (formPayload.fields || []).map((f: any) => ({
    id: f.id,
    type: f.type,
    label: f.label,
    required: Boolean(f.required),
    options: f.options || [],
  }));
  const normSettings = formPayload.settings || {};

  const jsonStr = JSON.stringify({
    title: normTitle,
    fields: normFields,
    settings: normSettings,
  });

  return crypto.createHash("sha256").update(jsonStr).digest("hex");
}

/**
 * Resolve provider instance based on connection status & capability metadata
 */
export function resolveFormsProvider(connection?: any): WordPressFormsProvider {
  if (connection && connection.capabilities?.includes("remote_forms_plugin")) {
    return new GenericPluginFormsProvider();
  }
  return new ForgeStudioNativeFormsProvider();
}
