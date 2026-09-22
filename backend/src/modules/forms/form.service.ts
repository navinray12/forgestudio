/**
 * @file Forms: business operations and coordination with persistence or external services. File responsibility: form service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import { getWebsiteById } from "../websites/website.service.js";

// In-memory rate limiting map: ip -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

/**
 * Ensure form_submissions table exists in PostgreSQL
 */
export async function initFormSubmissionsTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
        "formId" VARCHAR(255) NOT NULL,
        "formName" VARCHAR(255) NOT NULL DEFAULT 'Contact Form',
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS "formName" VARCHAR(255) DEFAULT 'Contact Form';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_website_id ON form_submissions("websiteId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions("formId");
    `);
  } catch (error) {
    console.error("Form submissions table initialization log:", error);
  }
}


// Auto-run table initialization

/**
 * XSS & HTML string sanitization

 * @param value Value supplied to this operation (type: any).
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

 * @param ip Ip supplied to this operation (type: string).
 * @param maxPerMin Max Per Min supplied to this operation. Defaults to 5.
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
    successMessage?: string;
  };
  spamProtection?: {
    enableHoneypot?: boolean;
    honeypotFieldName?: string;
    rateLimitPerMinute?: number;
  };
  honeypotValue?: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    referer?: string;
  };
}

/**
 * Process a public form submission with security, sanitization, and action dispatchers

 * @param payload Payload supplied to this operation (type: FormSubmitPayload).
 */
export async function processFormSubmission(payload: FormSubmitPayload) {
  const {
    websiteId,
    formId,
    formName,
    fields,
    actions,
    spamProtection,
    honeypotValue,
    metadata,
  } = payload;

  if (!websiteId || !formId) {
    throw new AppError("Website ID and Form ID are required", 400, "INVALID_FORM_SUBMISSION");
  }

  // Validate websiteId UUID format
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(websiteId)) {
    throw new AppError("Invalid website ID format", 400, "INVALID_WEBSITE_ID");
  }

  // Validate required submission fields (must be a valid non-null object)
  if (fields === undefined || fields === null || typeof fields !== "object" || Array.isArray(fields)) {
    throw new AppError("Form fields data is required and must be an object", 400, "INVALID_FORM_SUBMISSION");
  }

  // Validate website existence in database
  let websiteExists;
  try {
    websiteExists = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true },
    });
  } catch (err: any) {
    console.error("Database query error checking website existence:", err);
    throw new AppError("Failed to verify website existence", 500, "DATABASE_ERROR");
  }

  if (!websiteExists) {
    throw new AppError("Website not found", 404, "WEBSITE_NOT_FOUND");
  }

  // 1. Honeypot Spam Check (F-277)
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

  // 3. Sanitize fields
  const sanitizedFields = sanitizeInput(fields || {});
  const sanitizedMetadata = {
    ip: clientIp,
    userAgent: metadata?.userAgent ? sanitizeInput(metadata.userAgent) : "unknown",
    referer: metadata?.referer ? sanitizeInput(metadata.referer) : "",
    submittedAt: new Date().toISOString(),
  };

  const activeActions = actions?.activeActions || ["database"];
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
    } catch (dbErr: any) {
      console.error("Error saving form submission to database:", dbErr);
      executionResults.database = false;
      throw new AppError("Failed to persist form submission", 500, "DATABASE_ERROR");
    }
  }

  // 5. Action: Webhook Dispatcher
  if (activeActions.includes("webhook") && actions?.webhookConfig?.endpointUrl) {
    const endpoint = actions.webhookConfig.endpointUrl.trim();
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      try {
        const webhookPayload = {
          event: "form.submitted",
          websiteId,
          formId,
          formName,
          fields: sanitizedFields,
          metadata: sanitizedMetadata,
        };

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "ForgeStudio-Form-Webhook/1.0",
        };

        if (actions.webhookConfig.secretKey) {
          headers["X-Webhook-Secret"] = actions.webhookConfig.secretKey;
        }

        // Dispatch async without blocking response
        fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(webhookPayload),
        }).catch((webhookErr) => {
          console.error("External webhook dispatch error:", webhookErr);
        });

        executionResults.webhook = true;
      } catch (err) {
        console.error("Webhook trigger error:", err);
        executionResults.webhook = false;
      }
    }
  }

  // 6. Action: Email Notification Dispatcher
  if (activeActions.includes("email") && actions?.emailConfig?.toEmail) {
    // Log formatted email notification dispatch (production integrates nodemailer/SES)
    console.log(
      `[Form Email Dispatch] Sending lead email to: ${actions.emailConfig.toEmail} | Subject: ${actions.emailConfig.subject || "New Lead Received"
      }`,
      sanitizedFields
    );
    executionResults.email = true;
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

 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
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
 * Delete a specific form submission

 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param submissionId Submission Id supplied to this operation (type: string).
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
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
