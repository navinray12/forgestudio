import crypto from "crypto";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";

const db = prisma as any;
const processedWebhookNonces = new Set<string>();

export interface WebhookPayload {
  event: "page_updated" | "form_submitted" | "site_health" | "test_ping";
  timestamp: number;
  data: Record<string, any>;
}

/**
 * Validate HMAC-SHA256 signature of incoming WordPress webhook.
 */
export function verifyWebhookSignature(
  payloadString: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret || !payloadString) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (e) {
    return false;
  }
}

/**
 * Process verified incoming webhook from WordPress.
 */
export async function processWordPressWebhook(
  websiteId: string,
  signature: string,
  rawBody: string,
  parsedPayload: WebhookPayload
) {
  // Retrieve connection to obtain secret
  let connection: any = null;
  if (db?.wordPressConnection?.findUnique) {
    connection = await db.wordPressConnection.findUnique({ where: { websiteId } });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM wordpress_connections WHERE "websiteId" = ${websiteId}::uuid
    `;
    connection = rows[0];
  }

  if (!connection || connection.status !== "CONNECTED") {
    throw new AppError("No active WordPress connection for this website.", 404, "NOT_FOUND");
  }

  // Validate replay window (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (parsedPayload.timestamp && Math.abs(now - parsedPayload.timestamp) > 300) {
    throw new AppError("Webhook timestamp expired or outside acceptable window.", 400, "TIMESTAMP_EXPIRED");
  }

  // Validate HMAC signature using connection's apiKeyHash as secret
  const isValid = verifyWebhookSignature(rawBody, signature, connection.apiKeyHash);
  if (!isValid) {
    throw new AppError("Invalid webhook signature.", 401, "INVALID_SIGNATURE");
  }

  // Replay Protection: Prevent identical request replay within the time window
  const nonceKey = `wh_nonce:${websiteId}:${signature}`;
  if (processedWebhookNonces.has(nonceKey)) {
    throw new AppError("Replayed webhook request rejected.", 400, "REPLAY_REJECTED");
  }
  processedWebhookNonces.add(nonceKey);
  // Auto-expire nonce after 10 minutes
  setTimeout(() => processedWebhookNonces.delete(nonceKey), 600000);

  // Handle events
  switch (parsedPayload.event) {
    case "form_submitted": {
      const { formId, formData, clientIp } = parsedPayload.data || {};
      if (formId && formData) {
        try {
          if (db?.formSubmission?.create) {
            await db.formSubmission.create({
              data: {
                websiteId,
                formId: String(formId),
                data: formData,
                ipAddress: clientIp || null,
              },
            });
          }
        } catch (e) {
          console.error("Failed to persist WordPress form submission:", e);
        }
      }
      break;
    }

    case "site_health":
    case "test_ping": {
      // Update lastVerifiedAt
      try {
        if (db?.wordPressConnection?.update) {
          await db.wordPressConnection.update({
            where: { id: connection.id },
            data: { lastVerifiedAt: new Date() },
          });
        }
      } catch (e) {}
      break;
    }

    default:
      break;
  }

  // Record Audit Log
  try {
    if (db?.auditLog?.create) {
      await db.auditLog.create({
        data: {
          action: "WORDPRESS_WEBHOOK_RECEIVED",
          targetResource: `website:${websiteId}`,
          details: { event: parsedPayload.event, timestamp: parsedPayload.timestamp },
        },
      });
    }
  } catch (e) {}

  return { success: true, processedEvent: parsedPayload.event };
}
