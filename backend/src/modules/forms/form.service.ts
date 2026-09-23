import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import { getWebsiteById } from "../websites/website.service.js";
import { enqueueJob } from "../../services/jobs/jobRunner.js";
import { assertSafeUrl, isSafeUrl } from "../../utils/ssrf.guard.js";
import { sendSiteEmail } from "../publishing/siteMailer.service.js";
import nodemailer from "nodemailer";

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
    await prisma.$executeRawUnsafe(`
      ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS "formName" VARCHAR(255) DEFAULT 'Contact Form';
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
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

  const activeActions = actions?.activeActions || (actions as any)?.submitActions || ["database"];
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
    const ssrfCheck = isSafeUrl(endpoint);

    if (!ssrfCheck.safe) {
      console.warn(`[Form Webhook] Blocked unsafe endpoint URL "${endpoint}": ${ssrfCheck.reason}`);
      executionResults.webhook = false;
    } else {
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

        // Dispatch async without blocking response; enqueue retry on failure
        fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(webhookPayload),
        })
          .then(async (res) => {
            if (!res.ok) {
              console.warn(`[Form Webhook] Endpoint returned HTTP ${res.status}, enqueuing retry job`);
              await enqueueJob(
                "WEBHOOK_RETRY",
                {
                  url: endpoint,
                  event: "form.submitted",
                  headers,
                  body: webhookPayload,
                },
                { maxAttempts: 5, runAt: new Date(Date.now() + 15000) }
              );
            }
          })
          .catch(async (webhookErr) => {
            console.error("[Form Webhook] Dispatch network error, enqueuing retry job:", webhookErr);
            try {
              await enqueueJob(
                "WEBHOOK_RETRY",
                {
                  url: endpoint,
                  event: "form.submitted",
                  headers,
                  body: webhookPayload,
                },
                { maxAttempts: 5, runAt: new Date(Date.now() + 15000) }
              );
            } catch (jobErr) {
              console.error("Failed to enqueue WEBHOOK_RETRY job:", jobErr);
            }
          });

        executionResults.webhook = true;
      } catch (err) {
        console.error("Webhook trigger error:", err);
        executionResults.webhook = false;
      }
    }
  }

  // 6. Action: Email Notification Dispatcher (F-435 / F-436)
  if (activeActions.includes("email") && actions?.emailConfig?.toEmail) {
    const toEmail = actions.emailConfig.toEmail.trim();
    const subject = actions.emailConfig.subject || "New Lead Received";
    const fromName = actions.emailConfig.fromName || "ForgeStudio Forms";

    // Build HTML summary of form fields
    const rowsHtml = Object.entries(sanitizedFields)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px;font-weight:bold;border:1px solid #ddd">${k}</td><td style="padding:6px;border:1px solid #ddd">${String(
            v
          )}</td></tr>`
      )
      .join("");

    const htmlBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#333;margin-top:0;">New Lead from ${formName || "Website Form"}</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          ${rowsHtml}
        </table>
        <p style="font-size:12px;color:#777;">Website ID: ${websiteId} | Form ID: ${formId} | Submitted: ${sanitizedMetadata.submittedAt}</p>
      </div>
    `;

    try {
      // Dispatches via per-site SMTP (or platform fallback) and records in email_delivery_logs
      sendSiteEmail(websiteId, {
        to: toEmail,
        subject,
        html: htmlBody,
        fromName,
      }).catch((mailErr: any) => {
        console.error("[Form Email Dispatch] Delivery error:", mailErr);
      });
      executionResults.email = true;
    } catch (sendErr) {
      console.error("[Form Email Dispatch] Failed to invoke sendSiteEmail:", sendErr);
      executionResults.email = false;
    }
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
