/**
 * @file Wordpress connections: business operations and coordination with persistence or external services. File responsibility: webhook service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "node:crypto";
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import {
  getWebhookSecret,
  parseWebhookEnvelope,
  verifyWebhookSignature,
} from "./webhook-envelope.js";

export { verifyWebhookSignature } from "./webhook-envelope.js";
export type { WebhookPayload } from "./webhook-envelope.js";

/** Acknowledge only a committed receipt, not completion of its business effects.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param signature Signature supplied to this operation (type: string).
 * @param rawBody Raw Body supplied to this operation (type: string | Buffer).
 * @param _legacyParsedPayload Legacy Parsed Payload supplied to this operation (type: unknown). Optional; callers may omit it.
 */
export async function processWordPressWebhook(
  websiteId: string,
  signature: string,
  rawBody: string | Buffer,
  _legacyParsedPayload?: unknown,
) {
  const connection = await prisma.wordPressConnection.findUnique({
    where: { websiteId },
  });
  if (!connection || connection.status !== "CONNECTED") {
    throw new AppError("No active WordPress connection.", 404, "NOT_FOUND");
  }
  const secret = getWebhookSecret(connection.id);
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    throw new AppError("Invalid webhook signature.", 401, "INVALID_SIGNATURE");
  }
  const payload = parseWebhookEnvelope(rawBody);
  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const where = {
    connectionId_eventId: {
      connectionId: connection.id,
      eventId: payload.eventId,
    },
  };
  let receipt;
  try {
    receipt = await prisma.wordPressWebhookReceipt.create({
      data: {
        connectionId: connection.id,
        websiteId,
        eventId: payload.eventId,
        event: payload.event,
        payload,
        payloadHash,
      },
    });
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "P2002"
    )
      throw error;
    receipt = await prisma.wordPressWebhookReceipt.findUniqueOrThrow({ where });
    if (receipt.payloadHash !== payloadHash) {
      throw new AppError(
        "Event ID already belongs to another payload.",
        409,
        "WEBHOOK_EVENT_CONFLICT",
      );
    }
  }
  return {
    success: true,
    accepted: true,
    receiptId: receipt.id,
    status: receipt.status,
  };
}
