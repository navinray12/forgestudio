/**
 * @file Wordpress connections: module implementation. File responsibility: webhook envelope.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "node:crypto";
import { z } from "zod";
import { AppError } from "../../platform/http/app-error.js";

const envelopeSchema = z.object({
  eventId: z.string().min(1).max(128),
  event: z.enum(["page_updated", "form_submitted", "site_health", "test_ping"]),
  timestamp: z.number().int().positive(),
  data: z.record(z.string(), z.json()),
});

export type WebhookPayload = z.infer<typeof envelopeSchema>;

/**
 * Parse Webhook Envelope.
 * @param rawBody Raw Body supplied to this operation (type: Buffer | string).
 * @param now Now supplied to this operation. Defaults to Date.now().
 */
export function parseWebhookEnvelope(
  rawBody: Buffer | string,
  now = Date.now(),
): WebhookPayload {
  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString());
  } catch {
    throw new AppError("Invalid webhook JSON.", 400, "INVALID_WEBHOOK_PAYLOAD");
  }
  const parsed = envelopeSchema.safeParse(json);
  if (!parsed.success)
    throw new AppError(
      "Webhook requires eventId, event, timestamp and data.",
      400,
      "INVALID_WEBHOOK_PAYLOAD",
    );
  if (Math.abs(Math.floor(now / 1000) - parsed.data.timestamp) > 300) {
    throw new AppError(
      "Webhook timestamp is outside the five-minute window.",
      400,
      "TIMESTAMP_EXPIRED",
    );
  }
  if (parsed.data.event === "form_submitted") {
    const form = z.object({
      formId: z.string().min(1).max(128),
      formData: z.record(z.string(), z.json()),
      clientIp: z.string().max(64).optional(),
    });
    if (!form.safeParse(parsed.data.data).success)
      throw new AppError(
        "Invalid form submission.",
        400,
        "INVALID_WEBHOOK_PAYLOAD",
      );
  }
  return parsed.data;
}

/**
 * Verify Webhook Signature.
 * @param rawBody Raw Body supplied to this operation (type: string | Buffer).
 * @param signature Signature supplied to this operation (type: string).
 * @param secret Secret supplied to this operation (type: string).
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  const hex = signature.replace(/^sha256=/, "");
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(hex)) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  return crypto.timingSafeEqual(Buffer.from(hex, "hex"), expected);
}

/** Separate inbound keys; never reuse the stored outbound API-key hash.
 * @param connectionId Connection Id supplied to this operation (type: string).
 */
export function getWebhookSecret(connectionId: string): string {
  try {
    const keys: unknown = JSON.parse(
      process.env.WORDPRESS_WEBHOOK_SECRETS || "{}",
    );
    if (keys && typeof keys === "object" && Object.hasOwn(keys, connectionId)) {
      const value = (keys as Record<string, unknown>)[connectionId];
      if (typeof value === "string" && value.length >= 32) return value;
    }
  } catch {
    /* Report a configuration error without exposing key material. */
  }
  throw new AppError(
    "Webhook signing key is not configured.",
    503,
    "WEBHOOK_KEY_UNAVAILABLE",
  );
}
