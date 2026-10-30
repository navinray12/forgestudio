import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { getWebsiteById } from "../website.service.js";
import { enqueueJob } from "../jobs/jobRunner.js";
import { assertSafeUrl, isSafeUrl, assertValidWebhookUrl } from "../../utils/ssrf.guard.js";
import { sendSiteEmail } from "../siteMailer.service.js";
import { IntegrationService } from "../integration.service.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

// In-memory rate limiting map: ip -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

/**
 * Reusable nodemailer transporter singleton
 */
let mailTransporter: any = null;
function getMailTransporter() {
  if (mailTransporter) return mailTransporter;
  if (process.env.SMTP_HOST) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    });
  }
  return mailTransporter;
}

/**
 * Ensure form_submissions, notification_settings, and webhook tables exist in PostgreSQL
 */
export async function initFormSubmissionsTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        "formId" VARCHAR(255) NOT NULL,
        "formName" VARCHAR(255) NOT NULL,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_website_id ON form_submissions("websiteId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions("formId");
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS "formName" VARCHAR(255) DEFAULT 'Contact Form';
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);

    // Ensure form_notification_settings table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS form_notification_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "websiteId" UUID NOT NULL UNIQUE REFERENCES websites(id) ON DELETE CASCADE,
        "notificationEmail" VARCHAR(255) NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "subjectTemplate" VARCHAR(500) DEFAULT 'New Lead from {{formName}}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_form_notif_website_id ON form_notification_settings("websiteId");
    `);

    // Ensure form_webhook_settings table exists (Feature 3B)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS form_webhook_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "websiteId" UUID NOT NULL UNIQUE REFERENCES websites(id) ON DELETE CASCADE,
        "endpointUrl" VARCHAR(1000) NOT NULL,
        "signingSecret" VARCHAR(255),
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "events" TEXT[] NOT NULL DEFAULT ARRAY['form.submitted'],
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_form_webhook_website_id ON form_webhook_settings("websiteId");
    `);

    // Ensure form_webhook_deliveries table exists (Feature 3B)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS form_webhook_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        "eventId" UUID NOT NULL DEFAULT gen_random_uuid(),
        "endpointUrl" VARCHAR(1000) NOT NULL,
        "event" VARCHAR(100) NOT NULL,
        "status" VARCHAR(50) NOT NULL,
        "httpStatus" INTEGER,
        "requestPayload" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "responseBody" TEXT,
        "errorMessage" TEXT,
        "attemptCount" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_form_webhook_deliv_website ON form_webhook_deliveries("websiteId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_form_webhook_deliv_created ON form_webhook_deliveries("createdAt" DESC);
    `);
  } catch (error) {
    console.error("Form submissions table initialization log:", error);
  }
}

/**
 * XSS & HTML string sanitization
 */
export function sanitizeInput(value: any): any {
  if (typeof value === "string") {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }
  if (typeof value === "object" && value !== null) {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitizedObj[sanitizeInput(key)] = sanitizeInput(val);
    }
    return sanitizedObj;
  }
  return value;
}

/**
 * Check IP rate limiting per minute
 */
export function checkRateLimit(ip: string, maxPerMin = 5): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = rateLimitMap.get(ip) || [];

  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= maxPerMin) {
    return false;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

export interface FormSubmitPayload {
  websiteId: string;
  formId: string;
  formName: string;
  fields: Record<string, any>;
  actions?: {
    activeActions?: string[];
    emailConfig?: {
      toEmail?: string;
      subject?: string;
      fromName?: string;
      includeMetadata?: boolean;
    };
    webhookConfig?: {
      endpointUrl?: string;
      secretKey?: string;
    };
    redirectConfig?: {
      url?: string;
      openInNewTab?: boolean;
    };
    popupConfig?: {
      popupId?: string;
    };
    googleSheetsConfig?: {
      webhookUrl?: string;
      fieldMapping?: Record<string, string>;
    };
    mailchimpConfig?: {
      apiKey?: string;
      listId?: string;
      serverPrefix?: string;
      fieldMapping?: Record<string, string>;
    };
    zapierConfig?: {
      webhookUrl?: string;
      secretKey?: string;
    };
    successMessage?: string;
  };
  spamProtection?: {
    enableHoneypot?: boolean;
    honeypotFieldName?: string;
    rateLimitPerMinute?: number;
  };
  honeypotValue?: string;
  conditionalLogic?: Array<{
    id: string;
    action: 'show' | 'hide' | 'require' | 'skip_to_step';
    targetFieldId: string;
    targetStepIndex?: number;
    matchType: 'all' | 'any';
    rules: Array<{
      id: string;
      fieldId: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
      value?: string | number | boolean;
    }>;
  }>;
  fieldConfigs?: Array<{
    id: string;
    name?: string;
    required?: boolean;
    label?: string;
    type?: string;
    validationRegex?: string;
    customErrorMessage?: string;
  }>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    referer?: string;
  };
}

export interface ServerFormFieldConfig {
  id: string;
  name?: string;
  required?: boolean;
  label?: string;
  type?: string;
  validationRegex?: string;
  customErrorMessage?: string;
}

/**
 * Validates form fields server-side with strict type formatting (email, tel, number, url),
 * custom regex rules, required field constraints, and conditional visibility logic.
 */
export function validateFormSubmissionData(
  fieldConfigs: ServerFormFieldConfig[] | undefined,
  conditionalLogic: any[] | undefined,
  submittedValues: Record<string, any>
): {
  isValid: boolean;
  fieldErrors: Record<string, string>;
  errorMessages: string[];
} {
  const fieldErrors: Record<string, string> = {};
  const errorMessages: string[] = [];

  // Safe handling of malformed input
  if (!submittedValues || typeof submittedValues !== "object" || Array.isArray(submittedValues)) {
    return {
      isValid: false,
      fieldErrors: { form: "Invalid form fields payload" },
      errorMessages: ["Invalid form fields payload"],
    };
  }

  // If explicit fieldConfigs are provided
  if (fieldConfigs && fieldConfigs.length > 0) {
    for (const field of fieldConfigs) {
      let isVisible = true;
      let isRequired = !!field.required;

      const targetRules = (conditionalLogic || []).filter(
        (l: any) => l.targetFieldId === field.id || (field.name && l.targetFieldId === field.name)
      );

      for (const block of targetRules) {
        if (!block.rules || block.rules.length === 0) continue;

        const matches = block.rules.map((rule: any) => {
          const triggerField = fieldConfigs.find((f) => f.id === rule.fieldId || f.name === rule.fieldId);
          const key = triggerField ? (triggerField.name || triggerField.id) : rule.fieldId;
          const rawVal =
            submittedValues[key] !== undefined
              ? submittedValues[key]
              : triggerField && submittedValues[triggerField.id] !== undefined
              ? submittedValues[triggerField.id]
              : submittedValues[rule.fieldId];
          const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
          const targetStr =
            rule.value !== undefined && rule.value !== null ? String(rule.value).trim() : "";

          switch (rule.operator) {
            case "equals":
              return valStr.toLowerCase() === targetStr.toLowerCase();
            case "not_equals":
              return valStr.toLowerCase() !== targetStr.toLowerCase();
            case "contains":
              return valStr.toLowerCase().includes(targetStr.toLowerCase());
            case "greater_than":
              return Number(rawVal) > Number(rule.value);
            case "less_than":
              return Number(rawVal) < Number(rule.value);
            case "is_empty":
              return rawVal === undefined || rawVal === null || valStr === "";
            case "is_not_empty":
              return rawVal !== undefined && rawVal !== null && valStr !== "";
            default:
              return false;
          }
        });

        const isMatch =
          block.matchType === "any" ? matches.some(Boolean) : matches.every(Boolean);

        if (block.action === "show") {
          isVisible = isMatch;
        } else if (block.action === "hide") {
          if (isMatch) isVisible = false;
        } else if (block.action === "require") {
          if (isMatch) isRequired = true;
        }
      }

      // If hidden, skip validation
      if (!isVisible) continue;

      const fieldKey = field.id || field.name || "field";
      const fieldLabel = field.label || field.name || field.id;
      const rawVal =
        submittedValues[field.id] !== undefined
          ? submittedValues[field.id]
          : field.name && submittedValues[field.name] !== undefined
          ? submittedValues[field.name]
          : undefined;

      const isBlank =
        rawVal === undefined ||
        rawVal === null ||
        String(rawVal).trim() === "" ||
        (Array.isArray(rawVal) && rawVal.length === 0);

      // 1. Required Check
      if (isRequired) {
        if (field.type === "checkbox") {
          if (!rawVal) {
            const msg = field.customErrorMessage || `${fieldLabel} is required`;
            fieldErrors[fieldKey] = msg;
            errorMessages.push(msg);
            continue;
          }
        } else if (isBlank) {
          const msg = field.customErrorMessage || `${fieldLabel} is required`;
          fieldErrors[fieldKey] = msg;
          errorMessages.push(msg);
          continue;
        }
      }

      // If not blank, validate format based on field type
      if (!isBlank) {
        const strVal = String(rawVal).trim();

        // 2. Email Validation
        if (field.type === "email") {
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
          if (!emailRegex.test(strVal)) {
            const msg = field.customErrorMessage || `Please enter a valid email address for "${fieldLabel}"`;
            fieldErrors[fieldKey] = msg;
            errorMessages.push(msg);
          }
        }

        // 3. Phone / Tel Validation
        else if (field.type === "tel") {
          const digitsOnly = strVal.replace(/\D/g, "");
          const validTelChars = /^[+]?[0-9\s()./-]+$/;
          if (digitsOnly.length < 5 || digitsOnly.length > 18 || !validTelChars.test(strVal)) {
            const msg = field.customErrorMessage || `Please enter a valid phone number for "${fieldLabel}"`;
            fieldErrors[fieldKey] = msg;
            errorMessages.push(msg);
          }
        }

        // 4. Number Validation
        else if (field.type === "number") {
          if (isNaN(Number(strVal)) || isNaN(parseFloat(strVal))) {
            const msg = field.customErrorMessage || `Please enter a valid number for "${fieldLabel}"`;
            fieldErrors[fieldKey] = msg;
            errorMessages.push(msg);
          }
        }

        // 5. URL Validation
        else if (field.type === "url") {
          let isValidUrl = false;
          try {
            const urlObj = new URL(strVal);
            isValidUrl =
              (urlObj.protocol === "http:" || urlObj.protocol === "https:") &&
              urlObj.hostname.includes(".");
          } catch {
            isValidUrl = false;
          }
          if (!isValidUrl) {
            const msg =
              field.customErrorMessage ||
              `Please enter a valid URL starting with http:// or https:// for "${fieldLabel}"`;
            fieldErrors[fieldKey] = msg;
            errorMessages.push(msg);
          }
        }

        // 6. Custom Regex Validation
        if (field.validationRegex) {
          try {
            const customReg = new RegExp(field.validationRegex);
            if (!customReg.test(strVal)) {
              const msg = field.customErrorMessage || `Invalid format for "${fieldLabel}"`;
              fieldErrors[fieldKey] = msg;
              errorMessages.push(msg);
            }
          } catch (regErr) {
            console.error("Invalid custom validation regex:", field.validationRegex, regErr);
          }
        }
      }
    }
  } else {
    // If no fieldConfigs were supplied (raw API payload), inspect fields for common type formats
    for (const [key, val] of Object.entries(submittedValues)) {
      if (val === undefined || val === null) continue;
      const strVal = String(val).trim();
      if (!strVal) continue;

      if (/email/i.test(key)) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!emailRegex.test(strVal)) {
          const msg = `Please enter a valid email address for "${key}"`;
          fieldErrors[key] = msg;
          errorMessages.push(msg);
        }
      } else if (/(^url$|website)/i.test(key)) {
        let isValidUrl = false;
        try {
          const urlObj = new URL(strVal);
          isValidUrl =
            (urlObj.protocol === "http:" || urlObj.protocol === "https:") &&
            urlObj.hostname.includes(".");
        } catch {
          isValidUrl = false;
        }
        if (!isValidUrl) {
          const msg = `Please enter a valid URL starting with http:// or https:// for "${key}"`;
          fieldErrors[key] = msg;
          errorMessages.push(msg);
        }
      }
    }
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    errorMessages,
  };
}

/**
 * Evaluates server-side conditional logic to filter out hidden fields from strict required checks
 */
export function evaluateServerConditionalLogic(
  fieldConfigs: Array<{ id: string; name?: string; required?: boolean; label?: string }>,
  conditionalLogic: any[],
  submittedValues: Record<string, any>
): { validatedFields: Record<string, any>; invalidRequiredFields: string[] } {
  const invalidRequiredFields: string[] = [];
  const validatedFields: Record<string, any> = { ...submittedValues };

  for (const field of fieldConfigs) {
    let isVisible = true;
    let isRequired = !!field.required;

    const targetRules = (conditionalLogic || []).filter(
      (l) => l.targetFieldId === field.id || (field.name && l.targetFieldId === field.name)
    );

    for (const block of targetRules) {
      if (!block.rules || block.rules.length === 0) continue;

      const matches = block.rules.map((rule: any) => {
        const triggerField = fieldConfigs.find((f) => f.id === rule.fieldId || f.name === rule.fieldId);
        const key = triggerField ? (triggerField.name || triggerField.id) : rule.fieldId;
        const rawVal =
          submittedValues[key] !== undefined
            ? submittedValues[key]
            : triggerField && submittedValues[triggerField.id] !== undefined
            ? submittedValues[triggerField.id]
            : submittedValues[rule.fieldId];
        const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
        const targetStr =
          rule.value !== undefined && rule.value !== null ? String(rule.value).trim() : "";

        switch (rule.operator) {
          case "equals":
            return valStr.toLowerCase() === targetStr.toLowerCase();
          case "not_equals":
            return valStr.toLowerCase() !== targetStr.toLowerCase();
          case "contains":
            return valStr.toLowerCase().includes(targetStr.toLowerCase());
          case "greater_than":
            return Number(rawVal) > Number(rule.value);
          case "less_than":
            return Number(rawVal) < Number(rule.value);
          case "is_empty":
            return rawVal === undefined || rawVal === null || valStr === "";
          case "is_not_empty":
            return rawVal !== undefined && rawVal !== null && valStr !== "";
          default:
            return false;
        }
      });

      const isMatch =
        block.matchType === "any" ? matches.some(Boolean) : matches.every(Boolean);

      if (block.action === "show") {
        isVisible = isMatch;
      } else if (block.action === "hide") {
        if (isMatch) isVisible = false;
      } else if (block.action === "require") {
        if (isMatch) isRequired = true;
      }
    }

    // If field is hidden, it is excluded from required validation
    if (!isVisible) {
      continue;
    }

    if (isRequired) {
      const val =
        field.name && submittedValues[field.name] !== undefined
          ? submittedValues[field.name]
          : submittedValues[field.id];
      if (val === undefined || val === null || String(val).trim() === "") {
        invalidRequiredFields.push(field.label || field.name || field.id);
      }
    }
  }

  return { validatedFields, invalidRequiredFields };
}

/**
 * Process a public form submission with security, sanitization, and action dispatchers
 */
export async function processFormSubmission(payload: FormSubmitPayload) {
  const {
    websiteId,
    formId,
    formName: clientFormName,
    fields,
    actions: clientActions,
    spamProtection: clientSpamProtection,
    honeypotValue,
    conditionalLogic: clientConditionalLogic,
    fieldConfigs: clientFieldConfigs,
    metadata,
  } = payload;

  if (!websiteId || !formId) {
    throw new AppError("Website ID and Form ID are required", 400, "INVALID_FORM_SUBMISSION");
  }

  // 1. Verify that website exists and is actively PUBLISHED
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(websiteId);
  const website = await prisma.website.findFirst({
    where: isUuid ? { id: websiteId } : { slug: websiteId },
    select: { id: true, status: true, editorData: true },
  });

  const rawEditorData = typeof website?.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website?.editorData || {});

  const isPublished = website && (website.status === "PUBLISHED" || rawEditorData.publishing?.status === "PUBLISHED");
  if (!website || !isPublished) {
    throw new AppError("Form submissions are only accepted for active, published websites.", 404, "WEBSITE_NOT_PUBLISHED");
  }

  const publishedSnapshot = rawEditorData.publishedData || (
    rawEditorData.currentReleaseId && Array.isArray(rawEditorData.releases)
      ? rawEditorData.releases.find((r: any) => r.releaseId === rawEditorData.currentReleaseId)?.snapshotData
      : null
  ) || rawEditorData;

  // 2. Locate form in published snapshot
  const allCandidateElements = [
    ...(Array.isArray(publishedSnapshot.elements) ? publishedSnapshot.elements : []),
    ...(Array.isArray(publishedSnapshot.pages) ? publishedSnapshot.pages.flatMap((p: any) => Array.isArray(p.elements) ? p.elements : []) : []),
    ...(Array.isArray(publishedSnapshot.siteParts?.header?.elements) ? publishedSnapshot.siteParts.header.elements : []),
    ...(Array.isArray(publishedSnapshot.siteParts?.footer?.elements) ? publishedSnapshot.siteParts.footer.elements : []),
  ];

  function findFormInList(elements: any[]): any {
    for (const el of elements) {
      if (!el) continue;
      if (
        el.id === formId ||
        el.settings?.formId === formId ||
        el.formId === formId ||
        (el.type === "form" && (el.id === formId || el.settings?.id === formId))
      ) {
        return el;
      }
      if (Array.isArray(el.children)) {
        const found = findFormInList(el.children);
        if (found) return found;
      }
    }
    return null;
  }

  const publishedForm = findFormInList(allCandidateElements);
  if (!publishedForm) {
    throw new AppError("The specified form was not found on this published website.", 400, "FORM_NOT_FOUND");
  }

  // Authoritative server-side configurations:
  // SECURITY REQUIREMENT: Client-supplied actions, destinations, spam rules and field configuration
  // are treated as UNTRUSTED and NEVER executed. All behavior is derived EXCLUSIVELY from the published form.
  const formSettings = publishedForm.settings || {};
  const formName = formSettings.formName || formSettings.name || publishedForm.name || "Contact Form";
  const spamProtection = formSettings.spamProtection || {};
  const conditionalLogic = formSettings.conditionalLogic || [];
  const fieldConfigs = formSettings.fieldConfigs || publishedForm.fieldConfigs || [];

  // Derive executable actions and destinations EXCLUSIVELY from verified published form configuration
  const serverActions = formSettings.actions || formSettings.submitActions || {};
  const rawActiveActions = Array.isArray(serverActions.activeActions)
    ? serverActions.activeActions
    : Array.isArray(serverActions.submitActions)
    ? serverActions.submitActions
    : ["database"];

  // Filter to valid recognized actions configured on the server
  const activeActions = rawActiveActions.filter((a: any) =>
    typeof a === "string" && ["database", "email", "webhook", "redirect", "popup", "google_sheets", "mailchimp", "zapier"].includes(a)
  );
  if (activeActions.length === 0) {
    activeActions.push("database");
  }

  // Webhook and Email destinations MUST come strictly from server configuration
  const webhookEndpoint = typeof serverActions.webhookConfig?.endpointUrl === "string" ? serverActions.webhookConfig.endpointUrl.trim() : "";
  const webhookSecret = typeof serverActions.webhookConfig?.secretKey === "string" ? serverActions.webhookConfig.secretKey : "";

  const emailTo = typeof serverActions.emailConfig?.toEmail === "string" ? serverActions.emailConfig.toEmail.trim() : "";
  const emailSubject = typeof serverActions.emailConfig?.subject === "string" ? serverActions.emailConfig.subject : "New Lead Received";
  const emailFromName = typeof serverActions.emailConfig?.fromName === "string" ? serverActions.emailConfig.fromName : "ForgeStudio Forms";

  const actions: any = {
    activeActions,
    successMessage: formSettings.successMessage || serverActions.successMessage || "Thank you! Your submission has been received.",
    webhookConfig: {
      endpointUrl: webhookEndpoint,
      secretKey: webhookSecret,
    },
    emailConfig: {
      toEmail: emailTo,
      subject: emailSubject,
      fromName: emailFromName,
    },
    googleSheetsConfig: serverActions.googleSheetsConfig,
    mailchimpConfig: serverActions.mailchimpConfig,
    zapierConfig: serverActions.zapierConfig,
    redirectConfig: serverActions.redirectConfig,
    popupConfig: serverActions.popupConfig,
  };

  // 1. Honeypot Spam Check
  if (spamProtection?.enableHoneypot !== false && honeypotValue && honeypotValue.trim().length > 0) {
    // Silently drop spam submissions without giving bots feedback
    return {
      success: true,
      message: actions?.successMessage || "Thank you for your submission!",
    };
  }

  // 2. IP Rate Limiter Check
  const clientIp = metadata?.ip || "unknown";
  const rateLimit = spamProtection?.rateLimitPerMinute ?? 5;
  if (!checkRateLimit(clientIp, rateLimit)) {
    throw new AppError(
      "Too many form submissions from your IP. Please wait a minute and try again.",
      429,
      "RATE_LIMIT_EXCEEDED"
    );
  }

  // 2b. Evaluate Server-side Validation & Conditional Logic
  const rawFields = fields || (payload as any)?.data || {};
  const validationResult = validateFormSubmissionData(
    fieldConfigs,
    conditionalLogic || [],
    rawFields
  );
  if (!validationResult.isValid) {
    throw new AppError(
      validationResult.errorMessages.join("; "),
      400,
      "VALIDATION_ERROR",
      { fieldErrors: validationResult.fieldErrors }
    );
  }

  // 3. Sanitize fields
  const sanitizedFields = sanitizeInput(rawFields);
  const sanitizedMetadata = {
    ip: clientIp,
    userAgent: metadata?.userAgent ? sanitizeInput(metadata.userAgent) : "unknown",
    referer: metadata?.referer ? sanitizeInput(metadata.referer) : "",
    submittedAt: new Date().toISOString(),
  };

  const executionResults: Record<string, boolean> = {};

  // 4. Action: Database Persistence
  if (activeActions.includes("database")) {
    try {
      const dataJsonStr = JSON.stringify(sanitizedFields);
      const metaJsonStr = JSON.stringify(sanitizedMetadata);

      await prisma.$queryRaw`
        INSERT INTO form_submissions (id, "websiteId", "formId", "formName", data, metadata, "createdAt")
        VALUES (gen_random_uuid(), ${websiteId}::uuid, ${formId}, ${formName || "Contact Form"}, ${dataJsonStr}::jsonb, ${metaJsonStr}::jsonb, NOW())
      `;
      executionResults.database = true;
    } catch (dbErr) {
      console.error("Error saving form submission to database:", dbErr);
      executionResults.database = false;
    }
  }

  // 5. Action: Persistent & Widget Webhook Dispatcher (Feature 3B)
  const webhookEventId = crypto.randomUUID();
  const webhookTimestamp = new Date().toISOString();
  const webhookDocumentedPayload = {
    event: "form.submitted",
    eventId: webhookEventId,
    timestamp: webhookTimestamp,
    websiteId,
    formId,
    formName: formName || "Contact Form",
    data: sanitizedFields,
    fields: sanitizedFields,
    metadata: sanitizedMetadata,
  };

  // Check persistent settings for this website
  let persistentWebhookSettings: any = null;
  try {
    const pRows: any[] = await prisma.$queryRaw`
      SELECT "endpointUrl", "signingSecret", enabled, events
      FROM form_webhook_settings
      WHERE "websiteId" = ${websiteId}::uuid
      LIMIT 1
    `;
    if (pRows && pRows.length > 0 && pRows[0].enabled && pRows[0].endpointUrl) {
      const events: string[] = pRows[0].events || ["form.submitted"];
      if (events.includes("form.submitted")) {
        persistentWebhookSettings = pRows[0];
      }
    }
  } catch (err) {
    console.warn("[Form Submission] Could not check form_webhook_settings:", err);
  }

  // If persistent webhook is configured, or widget explicitly requested webhook
  const shouldDispatchPersistent = Boolean(persistentWebhookSettings?.endpointUrl);
  const shouldDispatchWidget = Boolean(activeActions.includes("webhook") && actions?.webhookConfig?.endpointUrl);

  const targetsToDispatch: Array<{ endpointUrl: string; secret?: string | null }> = [];
  if (shouldDispatchPersistent) {
    targetsToDispatch.push({
      endpointUrl: persistentWebhookSettings.endpointUrl.trim(),
      secret: persistentWebhookSettings.signingSecret,
    });
  }
  if (shouldDispatchWidget && actions?.webhookConfig?.endpointUrl) {
    const widgetUrl = actions.webhookConfig.endpointUrl.trim();
    // Avoid duplicate dispatch if same endpoint as persistent settings
    if (!targetsToDispatch.some((t) => t.endpointUrl === widgetUrl)) {
      targetsToDispatch.push({
        endpointUrl: widgetUrl,
        secret: actions.webhookConfig.secretKey,
      });
    }
  }

  if (activeActions.includes("webhook")) {
    const hasSafeTarget = targetsToDispatch.length > 0 && targetsToDispatch.some((t) => isSafeUrl(t.endpointUrl).safe);
    executionResults.webhook = hasSafeTarget;
  }

  if (targetsToDispatch.length > 0) {
    // Dispatch asynchronously without blocking response
    (async () => {
      for (const target of targetsToDispatch) {
        try {
          const outcome = await dispatchWebhookRequest(target.endpointUrl, webhookDocumentedPayload, {
            signingSecret: target.secret,
            timeoutMs: 8000,
          });

          // Record delivery attempt
          const deliveryRecord = await recordWebhookDelivery({
            websiteId,
            eventId: webhookEventId,
            endpointUrl: target.endpointUrl,
            event: "form.submitted",
            status: outcome.success ? "SUCCESS" : "FAILED",
            httpStatus: outcome.httpStatus,
            requestPayload: webhookDocumentedPayload,
            responseBody: outcome.responseBody,
            errorMessage: outcome.errorMessage,
            attemptCount: 1,
          });

          // If failed and retryable, enqueue background retry job
          const isSsrfBlock =
            Boolean(outcome.errorMessage?.includes("SSRF")) ||
            Boolean(outcome.errorMessage?.includes("blocked by SSRF"));
          const isRetryable =
            !isSsrfBlock &&
            (!outcome.httpStatus ||
              outcome.httpStatus >= 500 ||
              outcome.httpStatus === 429 ||
              outcome.httpStatus === 408);

          if (!outcome.success && isRetryable) {
            console.warn(`[Form Webhook] Endpoint returned retryable failure (${outcome.errorMessage}), enqueuing WEBHOOK_RETRY`);
            try {
              await enqueueJob(
                "WEBHOOK_RETRY",
                {
                  deliveryId: deliveryRecord?.id,
                  websiteId,
                  url: target.endpointUrl,
                  event: "form.submitted",
                  signingSecret: target.secret,
                  body: webhookDocumentedPayload,
                },
                { maxAttempts: 5, runAt: new Date(Date.now() + 15000) }
              );
            } catch (jobErr) {
              console.error("Failed to enqueue WEBHOOK_RETRY job:", jobErr);
            }
          }
        } catch (dispatchErr) {
          console.error("[Form Webhook] Dispatch error:", dispatchErr);
        }
      }
    })();
  }

  // 5b. Action: Google Sheets Connector
  if (activeActions.includes("google_sheets") && actions?.googleSheetsConfig?.webhookUrl) {
    const gsUrl = actions.googleSheetsConfig.webhookUrl.trim();
    const rowData = {
      websiteId,
      formId,
      formName,
      ...sanitizedFields,
    };
    IntegrationService.syncToGoogleSheets({ webhookUrl: gsUrl }, rowData)
      .catch(async (err) => {
        console.warn("[Form Google Sheets] Sync failed, enqueuing retry job:", err);
        try {
          await enqueueJob(
            "WEBHOOK_RETRY",
            {
              url: gsUrl,
              event: "form.google_sheets_sync",
              headers: { "Content-Type": "application/json" },
              body: rowData,
            },
            { maxAttempts: 5, runAt: new Date(Date.now() + 15000) }
          );
        } catch {}
      });
    executionResults.google_sheets = true;
  }

  // 5c. Action: Mailchimp Audience Sync
  if (activeActions.includes("mailchimp") && actions?.mailchimpConfig?.apiKey && actions?.mailchimpConfig?.listId) {
    const mcEmail = sanitizedFields.email || sanitizedFields.user_email || Object.values(sanitizedFields).find((v) => typeof v === "string" && /^\S+@\S+\.\S+$/.test(v));
    if (mcEmail) {
      const contact = {
        email: String(mcEmail),
        firstName: String(sanitizedFields.firstName || sanitizedFields.first_name || sanitizedFields.name || sanitizedFields.fullName || ""),
        lastName: String(sanitizedFields.lastName || sanitizedFields.last_name || ""),
        mergeFields: sanitizedFields,
      };
      IntegrationService.syncToMailchimp(
        {
          apiKey: actions.mailchimpConfig.apiKey,
          listId: actions.mailchimpConfig.listId,
          serverPrefix: actions.mailchimpConfig.serverPrefix,
        },
        contact
      ).catch((err) => {
        console.warn("[Form Mailchimp] Sync failed:", err);
      });
      executionResults.mailchimp = true;
    }
  }

  // 5d. Action: Zapier Catch Hook
  if (activeActions.includes("zapier") && actions?.zapierConfig?.webhookUrl) {
    const zapUrl = actions.zapierConfig.webhookUrl.trim();
    const zapPayload = {
      websiteId,
      formId,
      formName,
      fields: sanitizedFields,
      metadata: sanitizedMetadata,
    };
    IntegrationService.dispatchToZapier(zapUrl, zapPayload, actions.zapierConfig.secretKey)
      .catch(async (err) => {
        console.warn("[Form Zapier] Dispatch failed, enqueuing retry job:", err);
        try {
          await enqueueJob(
            "WEBHOOK_RETRY",
            {
              url: zapUrl,
              event: "form.zapier_catch_hook",
              headers: { "Content-Type": "application/json" },
              body: zapPayload,
            },
            { maxAttempts: 5, runAt: new Date(Date.now() + 15000) }
          );
        } catch {}
      });
    executionResults.zapier = true;
  }

  // 6. Action: Email Notification Dispatcher (F-435 / F-436 / Feature 2)
  let notificationTargetEmail: string | undefined;
  let notificationSubject: string | undefined;
  let notificationsEnabled = true;

  // Check persistent form_notification_settings for this website
  try {
    const notifRows: any[] = await prisma.$queryRaw`
      SELECT "notificationEmail", enabled, "subjectTemplate"
      FROM form_notification_settings
      WHERE "websiteId" = ${websiteId}::uuid
      LIMIT 1
    `;
    if (notifRows && notifRows.length > 0) {
      const persistent = notifRows[0];
      if (persistent.enabled === false) {
        // Notifications are explicitly disabled for this website
        notificationsEnabled = false;
      } else {
        if (persistent.notificationEmail && persistent.notificationEmail.trim()) {
          notificationTargetEmail = persistent.notificationEmail.trim();
        }
        if (persistent.subjectTemplate && persistent.subjectTemplate.trim()) {
          notificationSubject = persistent.subjectTemplate.replace(/\{\{formName\}\}/g, formName || "Contact Form");
        }
      }
    }
  } catch (fetchSettingsErr) {
    console.warn("[Form Submission] Could not check form_notification_settings:", fetchSettingsErr);
  }

  // Fallback to widget emailConfig only if notifications are enabled and recipient not yet resolved
  if (notificationsEnabled) {
    if (!notificationTargetEmail && actions?.emailConfig?.toEmail?.trim()) {
      notificationTargetEmail = actions.emailConfig.toEmail.trim();
    }
    if (!notificationSubject && actions?.emailConfig?.subject?.trim()) {
      notificationSubject = actions.emailConfig.subject.trim();
    }
  }

  if (notificationsEnabled && notificationTargetEmail && isValidEmail(notificationTargetEmail)) {
    const toEmail = notificationTargetEmail;
    const subject = notificationSubject || `New Lead from ${formName || "Website Form"}`;
    const fromName = actions?.emailConfig?.fromName || "ForgeStudio Forms";

    // Map field keys (e.g. field_1, field_2 or custom IDs) to readable labels
    const labelMap = new Map<string, string>();
    if (Array.isArray(fieldConfigs)) {
      for (const fc of fieldConfigs) {
        if (fc.id && fc.label) labelMap.set(String(fc.id), String(fc.label));
        if (fc.name && fc.label) labelMap.set(String(fc.name), String(fc.label));
      }
    }

    const standardKeyMap: Record<string, string> = {
      fullName: "Full Name",
      name: "Full Name",
      email: "Visitor Email Address",
      phone: "Phone Number",
      subject: "Subject / Service",
      message: "Your Message",
      field_1: "Full Name",
      field_2: "Visitor Email Address",
      field_3: "Phone Number",
      field_4: "Subject / Service",
      field_5: "Your Message",
    };

    const escapeEmailHtml = (val: any): string => {
      if (val === null || val === undefined) return "";
      return String(val)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    // Build styled HTML summary of form fields with safe escaping
    const rowsHtml = Object.entries(sanitizedFields)
      .map(([k, v]) => {
        const displayLabel = escapeEmailHtml(labelMap.get(k) || standardKeyMap[k] || k);
        const displayValue = escapeEmailHtml(typeof v === "object" ? JSON.stringify(v) : String(v));
        return `<tr>
          <td style="padding:10px 14px;font-weight:600;border-bottom:1px solid #e2e8f0;background-color:#f8fafc;color:#475569;width:35%;">${displayLabel}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;word-break:break-word;">${displayValue}</td>
        </tr>`;
      })
      .join("");

    const escapedFormName = escapeEmailHtml(formName || "Contact Form");
    const submittedTime = escapeEmailHtml(new Date().toUTCString());

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background-color:#ffffff;">
        <div style="border-bottom:2px solid #3b82f6;padding-bottom:14px;margin-bottom:20px;">
          <h2 style="color:#0f172a;margin:0;font-size:20px;">New Form Submission: ${escapedFormName}</h2>
          <p style="color:#64748b;font-size:13px;margin:4px 0 0 0;">Received on ${submittedTime}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0;">
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div style="background-color:#f8fafc;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;margin-top:20px;font-size:12px;color:#64748b;">
          <div><strong>IP Address:</strong> ${escapeEmailHtml(sanitizedMetadata.ip)}</div>
          <div><strong>User Agent:</strong> ${escapeEmailHtml(sanitizedMetadata.userAgent)}</div>
          <div><strong>Referer:</strong> ${escapeEmailHtml(sanitizedMetadata.referer || "Direct")}</div>
        </div>
      </div>
    `;

    try {
      // Dispatches via per-site SMTP (or platform fallback) and records in email_delivery_logs
      const emailResult = await sendSiteEmail(websiteId, {
        to: toEmail,
        subject,
        html: htmlBody,
        fromName,
      });

      executionResults.email = emailResult.status === "DELIVERED" || emailResult.status === "SIMULATED";
    } catch (mailErr: any) {
      console.error("[Form Email Dispatch] Delivery error, enqueuing retry job:", mailErr?.message || mailErr);
      executionResults.email = false;
      try {
        await enqueueJob(
          "FORM_EMAIL_NOTIFICATION_RETRY",
          {
            websiteId,
            to: toEmail,
            subject,
            html: htmlBody,
            fromName,
          },
          { maxAttempts: 3, runAt: new Date(Date.now() + 15000) }
        );
      } catch (enqueueErr) {
        console.error("Failed to enqueue FORM_EMAIL_NOTIFICATION_RETRY job:", enqueueErr);
      }
    }
  } else if (!notificationsEnabled) {
    executionResults.email = false;
  }

  return {
    success: true,
    message: actions?.successMessage || "Thank you! Your submission has been received.",
    actionsExecuted: executionResults,
    redirectUrl: actions?.redirectConfig?.url || undefined,
    openInNewTab: actions?.redirectConfig?.openInNewTab || false,
    popupId: actions?.popupConfig?.popupId || undefined,
  };
}

/**
 * Fetch all form submissions for a website (authenticated owner)
 */
export async function getWebsiteSubmissions(websiteId: string, userId: string) {
  // Check ownership
  await getWebsiteById(websiteId, userId);

  try {
    const submissions: any[] = await prisma.$queryRaw`
      SELECT id, "websiteId", "formId", "formName", data, metadata, "createdAt"
      FROM form_submissions
      WHERE "websiteId" = ${websiteId}::uuid
      ORDER BY "createdAt" DESC
    `;
    return submissions || [];
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    return [];
  }
}

/**
 * Format and escape a single cell value for RFC 4180 compliance with Formula Injection (CWE-1236) defense.
 */
export function formatCsvCell(val: any): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = typeof val === "object" ? JSON.stringify(val) : String(val);

  // Prevent CSV Formula Injection / DDE attack by escaping formula triggers (=, +, -, @, \t, \r, %)
  if (/^[=+\-@\t\r%]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180 escaping: double up internal quotes and wrap in double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generate sanitized, formula-injection-protected RFC 4180 CSV export of form leads.
 */
export async function exportSubmissionsCsv(
  websiteId: string,
  userId: string,
  options?: { formId?: string }
): Promise<{ csvContent: string; filename: string; totalRecords: number }> {
  // 0. Input validation
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!websiteId || typeof websiteId !== "string" || !UUID_REGEX.test(websiteId.trim())) {
    throw new AppError("Invalid website ID format.", 400, "BAD_REQUEST");
  }
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
  }

  // 1. Ownership & access check
  const website = await getWebsiteById(websiteId, userId);

  // 2. Prevent cross-workspace data leakage if website is tied to a workspace
  if (website.workspaceId) {
    const isOwner = website.userId === userId;
    if (!isOwner) {
      const membership = await (prisma as any).workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: website.workspaceId,
            userId,
          },
        },
      });
      if (!membership) {
        throw new AppError("Access denied: You are not a member of this workspace.", 403, "FORBIDDEN");
      }
    }
  }

  // 3. User capability check
  const userPermission = website.userPermission || "REVIEWER";
  if (userPermission === "NONE") {
    throw new AppError("You do not have permission to export leads for this website.", 403, "FORBIDDEN");
  }

  // 4. Query submissions
  let query = `
    SELECT id, "websiteId", "formId", "formName", data, metadata, "createdAt"
    FROM form_submissions
    WHERE "websiteId" = $1::uuid
  `;
  const params: any[] = [websiteId];

  if (options?.formId) {
    query += ` AND "formId" = $2`;
    params.push(options.formId);
  }

  query += ` ORDER BY "createdAt" DESC`;

  const submissions: any[] = await prisma.$queryRawUnsafe(query, ...params);
  const totalRecords = submissions?.length || 0;

  // Standard fixed columns
  const baseHeaders = ["Submission ID", "Form ID", "Form Name", "Submitted At (UTC)"];
  const metaHeaders = ["IP Address", "User Agent", "Referer"];

  // 5. Handle empty submissions
  if (totalRecords === 0) {
    const emptyHeaderRow = [...baseHeaders, ...metaHeaders].map(formatCsvCell).join(",");
    const safeSlug = (website.slug || website.name || "leads")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-|-$/g, "");
    const dateStr = new Date().toISOString().slice(0, 10);
    return {
      csvContent: `${emptyHeaderRow}\r\n`,
      filename: `leads-${safeSlug}-${dateStr}.csv`,
      totalRecords: 0,
    };
  }

  // 6. Gather all dynamic field keys from data JSONB across all submissions
  const dynamicKeySet = new Set<string>();
  for (const s of submissions) {
    if (s.data && typeof s.data === "object") {
      for (const k of Object.keys(s.data)) {
        if (k) dynamicKeySet.add(k);
      }
    }
  }
  const dynamicKeys = Array.from(dynamicKeySet).sort();

  // 7. Build header row
  const fullHeaders = [...baseHeaders, ...dynamicKeys, ...metaHeaders];
  const headerRow = fullHeaders.map(formatCsvCell).join(",");

  // 8. Build data rows
  const dataRows = submissions.map((s) => {
    const meta = s.metadata && typeof s.metadata === "object" ? s.metadata : {};
    const dataObj = s.data && typeof s.data === "object" ? s.data : {};

    const baseValues = [
      s.id,
      s.formId,
      s.formName || "",
      s.createdAt ? new Date(s.createdAt).toISOString() : "",
    ];

    const dynamicValues = dynamicKeys.map((key) => {
      const v = dataObj[key];
      return v !== undefined && v !== null ? v : "";
    });

    const metaValues = [
      meta.ip || "",
      meta.userAgent || "",
      meta.referer || "",
    ];

    return [...baseValues, ...dynamicValues, ...metaValues].map(formatCsvCell).join(",");
  });

  const csvContent = [headerRow, ...dataRows].join("\r\n") + "\r\n";
  const safeSlug = (website.slug || website.name || "leads")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "");
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `leads-${safeSlug}-${dateStr}.csv`;

  return {
    csvContent,
    filename,
    totalRecords,
  };
}

/**
 * Delete a specific form submission
 */
export async function deleteWebsiteSubmission(
  websiteId: string,
  submissionId: string,
  userId: string
) {
  // Check ownership
  await getWebsiteById(websiteId, userId);

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM form_submissions WHERE id = $1::uuid AND "websiteId" = $2::uuid`,
      submissionId,
      websiteId
    );
    return { success: true };
  } catch (error) {
    console.error("Error deleting form submission:", error);
    throw new AppError("Failed to delete form submission", 500, "DELETE_SUBMISSION_FAILED");
  }
}

/**
 * X-800: Generate and retrieve a binary PDF report for a specific form submission
 */
export async function getSubmissionPdf(websiteId: string, submissionId: string, userId: string) {
  const website = await getWebsiteById(websiteId, userId);

  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, "websiteId", "formId", "formName", data, metadata, "createdAt"
      FROM form_submissions
      WHERE id = ${submissionId}::uuid AND "websiteId" = ${websiteId}::uuid
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      throw new AppError("Form submission not found", 404, "SUBMISSION_NOT_FOUND");
    }

    const { generateSubmissionPdf } = await import("./pdf.service.js");
    const submission = rows[0];
    const pdfBuffer = generateSubmissionPdf(submission, website?.name);

    return {
      pdfBuffer,
      filename: `lead-${submission.formName ? submission.formName.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "form"}-${submission.id.slice(0, 8)}.pdf`,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error("Error generating submission PDF:", err);
    throw new AppError("Failed to generate submission PDF", 500, "PDF_GENERATION_FAILED");
  }
}

/**
 * Reusable helper to assert website ownership and workspace authorization
 */
export async function assertWebsiteAccess(websiteId: string, userId: string) {
  const website = await getWebsiteById(websiteId, userId);
  if (!website) {
    throw new AppError("Website not found", 404, "NOT_FOUND");
  }
  if (website.workspaceId) {
    const membership = await (prisma as any).workspaceMember.findFirst({
      where: {
        workspaceId: website.workspaceId,
        userId,
      },
    });
    if (!membership && website.userId !== userId) {
      throw new AppError("You do not have access to this workspace website", 403, "FORBIDDEN");
    }
  }
  return website;
}

/**
 * Validate RFC-compatible email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length > 255) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Retrieve persistent lead notification settings for a website
 */
export async function getFormNotificationSettings(websiteId: string, userId: string) {
  await assertWebsiteAccess(websiteId, userId);

  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, "websiteId", "notificationEmail", enabled, "subjectTemplate", "createdAt", "updatedAt"
      FROM form_notification_settings
      WHERE "websiteId" = ${websiteId}::uuid
      LIMIT 1
    `;
    if (rows && rows.length > 0) {
      return rows[0];
    }
    return {
      websiteId,
      notificationEmail: "",
      enabled: false,
      subjectTemplate: "New Lead from {{formName}}",
    };
  } catch (error) {
    console.error("Error fetching form notification settings:", error);
    return {
      websiteId,
      notificationEmail: "",
      enabled: false,
      subjectTemplate: "New Lead from {{formName}}",
    };
  }
}

/**
 * Persistently save or update lead notification settings for a website
 */
export async function saveFormNotificationSettings(
  websiteId: string,
  userId: string,
  data: {
    notificationEmail: string;
    enabled?: boolean;
    subjectTemplate?: string;
  }
) {
  await assertWebsiteAccess(websiteId, userId);

  const { notificationEmail, enabled = true, subjectTemplate = "New Lead from {{formName}}" } = data;

  if (enabled && (!notificationEmail || !isValidEmail(notificationEmail))) {
    throw new AppError("A valid notification recipient email address is required.", 400, "INVALID_EMAIL");
  }

  const cleanEmail = (notificationEmail || "").trim().toLowerCase();
  const cleanSubject = (subjectTemplate || "New Lead from {{formName}}").trim();

  const rows: any[] = await prisma.$queryRawUnsafe(
    `
    INSERT INTO form_notification_settings (id, "websiteId", "notificationEmail", enabled, "subjectTemplate", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, NOW(), NOW())
    ON CONFLICT ("websiteId") DO UPDATE SET
      "notificationEmail" = EXCLUDED."notificationEmail",
      enabled = EXCLUDED.enabled,
      "subjectTemplate" = EXCLUDED."subjectTemplate",
      "updatedAt" = NOW()
    RETURNING id, "websiteId", "notificationEmail", enabled, "subjectTemplate", "createdAt", "updatedAt"
    `,
    websiteId,
    cleanEmail,
    enabled,
    cleanSubject
  );

  if (rows && rows.length > 0) {
    return rows[0];
  }

  return {
    websiteId,
    notificationEmail: cleanEmail,
    enabled,
    subjectTemplate: cleanSubject,
  };
}

/**
 * Send a live test notification email to verify SMTP configuration
 */
export async function testFormNotification(
  websiteId: string,
  userId: string,
  targetEmail?: string
) {
  const website = await assertWebsiteAccess(websiteId, userId);

  let recipient = targetEmail?.trim();
  if (!recipient) {
    const settings = await getFormNotificationSettings(websiteId, userId);
    recipient = settings.notificationEmail;
  }

  if (!recipient || !isValidEmail(recipient)) {
    throw new AppError("A valid recipient email address is required to test notifications.", 400, "INVALID_EMAIL");
  }

  const testSubject = `[Test Notification] Lead Dispatch Verification for ${website.name}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin: 0; font-size: 20px;">✓ Test Lead Notification</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">ForgeStudio Website Builder — Forms & Leads Engine</p>
      </div>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        This test email confirms that form submission notifications are correctly configured and actively delivering for website <strong>${website.name}</strong>.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px;">Website Name:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${website.name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Website Slug:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">/${website.slug}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Configured Recipient:</td>
            <td style="padding: 6px 0; color: #2563eb; font-weight: 600;">${recipient}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Dispatched At:</td>
            <td style="padding: 6px 0; color: #0f172a;">${new Date().toUTCString()}</td>
          </tr>
        </table>
      </div>
      <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        When visitors submit forms on this website, inquiries will be automatically routed to this address.
      </p>
    </div>
  `;

  try {
    const result = await sendSiteEmail(websiteId, {
      to: recipient,
      subject: testSubject,
      html: htmlBody,
      fromName: `${website.name} via ForgeStudio`,
    });

    return {
      success: true,
      status: result.status,
      recipient,
      messageId: result.messageId,
      message: `Test email successfully delivered to ${recipient}`,
    };
  } catch (err: any) {
    console.error("[TestNotification] Email dispatch error:", err);
    throw new AppError(
      `Email delivery failed: ${err.message || "Could not connect to SMTP server"}`,
      502,
      "EMAIL_DELIVERY_FAILED"
    );
  }
}

/**
 * Sign payload with HMAC-SHA256 for secure webhook delivery verification
 */
export function signWebhookPayload(secret: string, payload: any, timestamp: number): string {
  const data = `${timestamp}.${typeof payload === "string" ? payload : JSON.stringify(payload)}`;
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

/**
 * Perform safe HTTP POST delivery of a webhook with SSRF defense, timeouts, and redirect validation
 */
export async function dispatchWebhookRequest(
  endpointUrl: string,
  payload: any,
  options?: {
    signingSecret?: string | null;
    timeoutMs?: number;
    maxRedirects?: number;
  }
): Promise<{
  success: boolean;
  httpStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  headersSent?: Record<string, string>;
}> {
  const timeoutMs = options?.timeoutMs || 8000;
  const maxRedirects = options?.maxRedirects ?? 3;
  let currentUrl = endpointUrl;
  let hops = 0;

  // SSRF validation on the initial URL
  try {
    assertSafeUrl(currentUrl, "Webhook endpoint URL");
  } catch (urlErr: any) {
    return {
      success: false,
      errorMessage: urlErr.message || "SSRF validation failed",
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "ForgeStudio-Webhook/1.0",
    "X-ForgeStudio-Event": payload.event || "form.submitted",
    "X-ForgeStudio-Delivery": payload.eventId || crypto.randomUUID(),
    "X-Webhook-Timestamp": String(timestamp),
  };

  if (options?.signingSecret) {
    const signature = signWebhookPayload(options.signingSecret, payload, timestamp);
    headers["X-Webhook-Signature"] = `t=${timestamp},v1=${signature}`;
    headers["X-ForgeStudio-Signature"] = signature;
  }

  while (hops <= maxRedirects) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: "POST",
        headers,
        body: payloadString,
        redirect: "manual",
        signal: controller.signal,
      });
      clearTimeout(timeoutHandle);

      // Handle redirects securely by checking destination URL with assertSafeUrl
      if (response.status >= 300 && response.status < 400) {
        hops++;
        if (hops > maxRedirects) {
          return {
            success: false,
            httpStatus: response.status,
            errorMessage: `Too many redirects (exceeded limit of ${maxRedirects})`,
            headersSent: headers,
          };
        }

        const locationHeader = response.headers.get("location");
        if (!locationHeader) {
          return {
            success: false,
            httpStatus: response.status,
            errorMessage: "Redirect status received without Location header",
            headersSent: headers,
          };
        }

        const resolvedUrl = new URL(locationHeader, currentUrl).toString();
        // Re-assert SSRF safety on redirect destination!
        try {
          assertSafeUrl(resolvedUrl, "Redirected webhook URL");
        } catch (redirErr: any) {
          return {
            success: false,
            httpStatus: response.status,
            errorMessage: redirErr.message || "Redirect destination blocked by SSRF",
            headersSent: headers,
          };
        }
        currentUrl = resolvedUrl;
        continue;
      }

      let responseText = "";
      try {
        responseText = (await response.text()).slice(0, 2000);
      } catch {}

      if (response.ok) {
        return {
          success: true,
          httpStatus: response.status,
          responseBody: responseText,
          headersSent: headers,
        };
      } else {
        return {
          success: false,
          httpStatus: response.status,
          responseBody: responseText,
          errorMessage: `HTTP ${response.status} ${response.statusText || "Error"}`,
          headersSent: headers,
        };
      }
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      const isTimeout = err.name === "AbortError" || err.message?.includes("aborted");
      return {
        success: false,
        httpStatus: isTimeout ? 408 : undefined,
        errorMessage: isTimeout ? `Request timed out after ${timeoutMs}ms` : (err.message || "Network error"),
        headersSent: headers,
      };
    }
  }

  return {
    success: false,
    errorMessage: "Exceeded max redirects",
    headersSent: headers,
  };
}

/**
 * Record a webhook delivery attempt in form_webhook_deliveries
 */
export async function recordWebhookDelivery(data: {
  websiteId: string;
  eventId: string;
  endpointUrl: string;
  event: string;
  status: "SUCCESS" | "FAILED";
  httpStatus?: number;
  requestPayload: any;
  responseBody?: string;
  errorMessage?: string;
  attemptCount?: number;
}) {
  try {
    const payloadStr = JSON.stringify(data.requestPayload || {});
    const respStr = data.responseBody || null;
    const errStr = data.errorMessage || null;
    const httpStatus = data.httpStatus || null;
    const attemptCount = data.attemptCount || 1;

    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO form_webhook_deliveries (
        id, "websiteId", "eventId", "endpointUrl", "event", "status",
        "httpStatus", "requestPayload", "responseBody", "errorMessage",
        "attemptCount", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(), ${data.websiteId}::uuid, ${data.eventId}::uuid,
        ${data.endpointUrl}, ${data.event}, ${data.status},
        ${httpStatus}, ${payloadStr}::jsonb, ${respStr}, ${errStr},
        ${attemptCount}, NOW(), NOW()
      )
      RETURNING id, "websiteId", "eventId", "endpointUrl", "event", "status", "httpStatus", "errorMessage", "attemptCount", "createdAt"
    `;
    return rows[0];
  } catch (err) {
    console.error("[Webhook Delivery] Failed to record delivery outcome:", err);
    return null;
  }
}

/**
 * Retrieve persistent webhook configuration for a website
 */
export async function getFormWebhookSettings(websiteId: string, userId: string) {
  await assertWebsiteAccess(websiteId, userId);

  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, "websiteId", "endpointUrl", "signingSecret", enabled, events, "createdAt", "updatedAt"
      FROM form_webhook_settings
      WHERE "websiteId" = ${websiteId}::uuid
      LIMIT 1
    `;

    if (rows && rows.length > 0) {
      const s = rows[0];
      const hasSecret = Boolean(s.signingSecret && s.signingSecret.length > 0);
      return {
        id: s.id,
        websiteId: s.websiteId,
        endpointUrl: s.endpointUrl,
        enabled: Boolean(s.enabled),
        events: s.events || ["form.submitted"],
        hasSecret,
        signingSecret: hasSecret ? `••••••••${s.signingSecret.slice(-4)}` : "",
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    }

    return {
      websiteId,
      endpointUrl: "",
      enabled: false,
      events: ["form.submitted"],
      hasSecret: false,
      signingSecret: "",
    };
  } catch (error) {
    console.error("Error fetching form webhook settings:", error);
    return {
      websiteId,
      endpointUrl: "",
      enabled: false,
      events: ["form.submitted"],
      hasSecret: false,
      signingSecret: "",
    };
  }
}

/**
 * Persistently save or update webhook configuration for a website
 */
export async function saveFormWebhookSettings(
  websiteId: string,
  userId: string,
  data: {
    endpointUrl: string;
    enabled?: boolean;
    events?: string[];
    signingSecret?: string;
    clearSecret?: boolean;
  }
) {
  await assertWebsiteAccess(websiteId, userId);

  const { endpointUrl, enabled = true, events = ["form.submitted"], signingSecret, clearSecret } = data;

  const cleanUrl = (endpointUrl || "").trim();

  if (enabled && !cleanUrl) {
    throw new AppError("Webhook URL is required", 400, "INVALID_WEBHOOK_URL");
  }

  if (cleanUrl) {
    assertValidWebhookUrl(cleanUrl);
    assertSafeUrl(cleanUrl, "Webhook endpoint URL");
  }

  // Check existing settings to handle signing secret preserving or clearing
  const existingRows: any[] = await prisma.$queryRaw`
    SELECT "signingSecret"
    FROM form_webhook_settings
    WHERE "websiteId" = ${websiteId}::uuid
    LIMIT 1
  `;
  const existingSecret = existingRows?.[0]?.signingSecret || null;

  let finalSecret = existingSecret;
  if (clearSecret) {
    finalSecret = null;
  } else if (signingSecret !== undefined) {
    const trimmed = signingSecret.trim();
    if (trimmed && !trimmed.startsWith("••••")) {
      finalSecret = trimmed;
    } else if (trimmed === "") {
      finalSecret = null;
    }
  }

  const cleanEvents = Array.isArray(events) && events.length > 0 ? events : ["form.submitted"];

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO form_webhook_settings (id, "websiteId", "endpointUrl", "signingSecret", enabled, events, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT ("websiteId") DO UPDATE SET
      "endpointUrl" = EXCLUDED."endpointUrl",
      "signingSecret" = EXCLUDED."signingSecret",
      enabled = EXCLUDED.enabled,
      events = EXCLUDED.events,
      "updatedAt" = NOW()
    `,
    websiteId,
    cleanUrl,
    finalSecret,
    enabled,
    cleanEvents
  );

  const hasSecret = Boolean(finalSecret && finalSecret.length > 0);
  return {
    websiteId,
    endpointUrl: cleanUrl,
    enabled,
    events: cleanEvents,
    hasSecret,
    signingSecret: hasSecret ? `••••••••${finalSecret!.slice(-4)}` : "",
  };
}

/**
 * Remove webhook configuration for a website
 */
export async function deleteFormWebhookSettings(websiteId: string, userId: string) {
  await assertWebsiteAccess(websiteId, userId);
  await prisma.$executeRawUnsafe(
    `DELETE FROM form_webhook_settings WHERE "websiteId" = $1::uuid`,
    websiteId
  );
  return { success: true, message: "Webhook settings deleted successfully" };
}

/**
 * Send a live test webhook event to verify receiver delivery and HMAC signature
 */
export async function testFormWebhook(
  websiteId: string,
  userId: string,
  targetUrl?: string,
  customSecret?: string
) {
  const website = await assertWebsiteAccess(websiteId, userId);

  let endpointUrl = targetUrl?.trim();
  let secret = customSecret?.trim();

  // If not provided in body, load from saved settings
  const existing: any[] = await prisma.$queryRaw`
    SELECT "endpointUrl", "signingSecret"
    FROM form_webhook_settings
    WHERE "websiteId" = ${websiteId}::uuid
    LIMIT 1
  `;
  if (!endpointUrl && existing && existing.length > 0) {
    endpointUrl = existing[0].endpointUrl;
  }
  if (!secret && existing && existing.length > 0) {
    secret = existing[0].signingSecret;
  }

  if (!endpointUrl) {
    throw new AppError("No webhook endpoint URL configured to test.", 400, "MISSING_ENDPOINT_URL");
  }

  assertValidWebhookUrl(endpointUrl);
  assertSafeUrl(endpointUrl, "Webhook endpoint URL");

  const eventId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const testPayload = {
    event: "form.test",
    eventId,
    timestamp,
    websiteId,
    formId: "test-verification-form",
    formName: "Test Verification Form",
    data: {
      message: "This is a test webhook event from ForgeStudio to verify receiver delivery.",
      tester: "ForgeStudio Webhook Engine",
      websiteName: website.name,
      verified: true,
    },
    metadata: {
      isTest: true,
      environment: process.env.NODE_ENV || "development",
      dispatchedAt: timestamp,
    },
  };

  const dispatchResult = await dispatchWebhookRequest(endpointUrl, testPayload, {
    signingSecret: secret,
    timeoutMs: 8000,
  });

  // Record test delivery in deliveries log
  await recordWebhookDelivery({
    websiteId,
    eventId,
    endpointUrl,
    event: "form.test",
    status: dispatchResult.success ? "SUCCESS" : "FAILED",
    httpStatus: dispatchResult.httpStatus,
    requestPayload: testPayload,
    responseBody: dispatchResult.responseBody,
    errorMessage: dispatchResult.errorMessage,
    attemptCount: 1,
  });

  return {
    success: dispatchResult.success,
    eventId,
    httpStatus: dispatchResult.httpStatus,
    responseBody: dispatchResult.responseBody,
    errorMessage: dispatchResult.errorMessage,
    message: dispatchResult.success
      ? `✓ Webhook delivered successfully! Receiver responded with HTTP ${dispatchResult.httpStatus || 200}.`
      : `Webhook delivery failed: ${dispatchResult.errorMessage || "Receiver did not respond successfully"}`,
  };
}

/**
 * Fetch recent webhook delivery logs for a website
 */
export async function getFormWebhookDeliveries(websiteId: string, userId: string, limit = 30) {
  await assertWebsiteAccess(websiteId, userId);

  const deliveries: any[] = await prisma.$queryRaw`
    SELECT id, "websiteId", "eventId", "endpointUrl", "event", "status",
           "httpStatus", "requestPayload", "responseBody", "errorMessage",
           "attemptCount", "createdAt", "updatedAt"
    FROM form_webhook_deliveries
    WHERE "websiteId" = ${websiteId}::uuid
    ORDER BY "createdAt" DESC
    LIMIT ${Number(limit) || 30}
  `;

  return deliveries || [];
}

/**
 * Retry an eligible failed or previous webhook delivery
 */
export async function retryFormWebhookDelivery(websiteId: string, deliveryId: string, userId: string) {
  await assertWebsiteAccess(websiteId, userId);

  const rows: any[] = await prisma.$queryRaw`
    SELECT id, "websiteId", "eventId", "endpointUrl", "event", "status",
           "httpStatus", "requestPayload", "attemptCount"
    FROM form_webhook_deliveries
    WHERE id = ${deliveryId}::uuid AND "websiteId" = ${websiteId}::uuid
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    throw new AppError("Webhook delivery record not found", 404, "NOT_FOUND");
  }

  const delivery = rows[0];

  // Retrieve current signing secret if any
  const settingsRows: any[] = await prisma.$queryRaw`
    SELECT "signingSecret"
    FROM form_webhook_settings
    WHERE "websiteId" = ${websiteId}::uuid
    LIMIT 1
  `;
  const signingSecret = settingsRows?.[0]?.signingSecret || null;

  const dispatchResult = await dispatchWebhookRequest(delivery.endpointUrl, delivery.requestPayload, {
    signingSecret,
    timeoutMs: 8000,
  });

  const newStatus = dispatchResult.success ? "SUCCESS" : "FAILED";
  const newAttemptCount = (delivery.attemptCount || 1) + 1;
  const newHttpStatus = dispatchResult.httpStatus || null;
  const newResponseBody = dispatchResult.responseBody || null;
  const newErrorMessage = dispatchResult.errorMessage || null;

  await prisma.$executeRawUnsafe(
    `
    UPDATE form_webhook_deliveries
    SET status = $1, "httpStatus" = $2, "responseBody" = $3, "errorMessage" = $4, "attemptCount" = $5, "updatedAt" = NOW()
    WHERE id = $6::uuid
    `,
    newStatus,
    newHttpStatus,
    newResponseBody,
    newErrorMessage,
    newAttemptCount,
    deliveryId
  );

  return {
    id: deliveryId,
    status: newStatus,
    httpStatus: newHttpStatus,
    responseBody: newResponseBody,
    errorMessage: newErrorMessage,
    attemptCount: newAttemptCount,
    success: dispatchResult.success,
  };
}

