/**
 * WordPress Webhooks Connector, Service & Safety Engine (F-505)
 *
 * Provides Webhook CRUD, HMAC-SHA256 timing-safe verification, replay window validation,
 * delivery deduplication, tenant isolation, audit logging, and SSRF endpoint safety.
 */

import crypto from "crypto";
import { AppError } from "../../utils/app-error.js";
import { getWebsiteById } from "../website.service.js";
import { recordAuditLog } from "../audit.service.js";
import { assertSafeUrl } from "../../utils/ssrf.guard.js";
import {
  WordPressWebhookCapabilities,
  WordPressWebhook,
  WebhookDelivery,
  resolveWebhookProvider,
} from "./wordpressWebhookProvider.service.js";

const PROCESSED_DELIVERY_IDS = new Map<string, number>();
const REPLAY_WINDOW_SECONDS = 300; // 5 minutes

export function validateEndpointUrl(urlStr?: string): string {
  if (!urlStr || typeof urlStr !== "string") {
    throw new AppError("Webhook endpoint URL is required", 400, "WORDPRESS_WEBHOOK_INVALID_ENDPOINT");
  }

  const trimmed = urlStr.trim();
  const lower = trimmed.toLowerCase();

  if (!lower.startsWith("https://") && !lower.startsWith("http://")) {
    throw new AppError("Webhook endpoint URL must begin with http:// or https://", 400, "WORDPRESS_WEBHOOK_INVALID_ENDPOINT");
  }

  const forbidden = ["javascript:", "data:", "file:", "vbscript:"];
  for (const f of forbidden) {
    if (lower.startsWith(f)) {
      throw new AppError(`Unsafe URL scheme detected in webhook endpoint: ${f}`, 400, "WORDPRESS_WEBHOOK_INVALID_ENDPOINT");
    }
  }

  try {
    assertSafeUrl(trimmed);
  } catch (err: any) {
    throw new AppError(`Webhook endpoint failed SSRF safety check: ${err.message}`, 400, "WORDPRESS_WEBHOOK_INVALID_ENDPOINT");
  }

  return trimmed;
}

export function verifyHmacSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function getWordPressWebhookCapabilities(websiteId: string, userId: string): Promise<WordPressWebhookCapabilities> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["webhooks"] };
  const provider = resolveWebhookProvider(connection);
  return await provider.getCapabilities(connection);
}

export async function listWordPressWebhooks(websiteId: string, userId: string): Promise<WordPressWebhook[]> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["webhooks"] };
  const provider = resolveWebhookProvider(connection);

  const hooks = await provider.listWebhooks(connection, websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "WEBHOOK_LISTED",
    details: { count: hooks.length },
  });

  return hooks;
}

export async function getWordPressWebhook(websiteId: string, webhookId: string, userId: string): Promise<WordPressWebhook> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["webhooks"] };
  const provider = resolveWebhookProvider(connection);

  const hook = await provider.getWebhook(connection, websiteId, webhookId);
  if (!hook) throw new AppError(`Webhook '${webhookId}' not found`, 404, "WORDPRESS_WEBHOOK_NOT_FOUND");
  return hook;
}

export async function createWordPressWebhook(websiteId: string, payload: Partial<WordPressWebhook>, userId: string): Promise<WordPressWebhook> {
  if (payload.endpoint) {
    payload.endpoint = validateEndpointUrl(payload.endpoint);
  }

  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["webhooks"] };
  const provider = resolveWebhookProvider(connection);

  const created = await provider.createWebhook(connection, websiteId, payload);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "WEBHOOK_CREATED",
    details: { webhookId: created.id, name: created.name, endpoint: created.endpoint },
  });

  return created;
}

export async function updateWordPressWebhook(websiteId: string, webhookId: string, payload: Partial<WordPressWebhook>, userId: string): Promise<WordPressWebhook> {
  if (payload.endpoint) {
    payload.endpoint = validateEndpointUrl(payload.endpoint);
  }

  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["webhooks"] };
  const provider = resolveWebhookProvider(connection);

  const updated = await provider.updateWebhook(connection, websiteId, webhookId, payload);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "WEBHOOK_UPDATED",
    details: { webhookId, name: updated.name },
  });

  return updated;
}

export async function deleteWordPressWebhook(websiteId: string, webhookId: string, userId: string): Promise<{ success: boolean; deletedId: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["webhooks"] };
  const provider = resolveWebhookProvider(connection);

  const res = await provider.deleteWebhook(connection, websiteId, webhookId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "WEBHOOK_DELETED",
    details: { webhookId },
  });

  return res;
}

export async function enableWordPressWebhook(websiteId: string, webhookId: string, userId: string): Promise<WordPressWebhook> {
  const updated = await updateWordPressWebhook(websiteId, webhookId, { status: "ACTIVE", active: true }, userId);
  await recordAuditLog({ targetResource: websiteId, userId, action: "WEBHOOK_ENABLED", details: { webhookId } });
  return updated;
}

export async function disableWordPressWebhook(websiteId: string, webhookId: string, userId: string): Promise<WordPressWebhook> {
  const updated = await updateWordPressWebhook(websiteId, webhookId, { status: "INACTIVE", active: false }, userId);
  await recordAuditLog({ targetResource: websiteId, userId, action: "WEBHOOK_DISABLED", details: { webhookId } });
  return updated;
}

export async function listWordPressWebhookDeliveries(websiteId: string, webhookId: string, userId: string): Promise<WebhookDelivery[]> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["webhooks"] };
  const provider = resolveWebhookProvider(connection);

  return await provider.listDeliveries(connection, websiteId, webhookId);
}

export async function processIncomingWebhookDelivery(
  websiteId: string,
  deliveryId: string,
  signature: string,
  timestamp: number,
  rawBody: string,
  event: string,
  payload: any
): Promise<{ status: "PROCESSED" | "REPLAY_REJECTED"; deliveryId: string }> {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > REPLAY_WINDOW_SECONDS) {
    await recordAuditLog({
      targetResource: websiteId,
      userId: "system",
      action: "WEBHOOK_REPLAY_REJECTED",
      details: { deliveryId, reason: "Timestamp expired outside 300s window" },
    });
    throw new AppError("Webhook timestamp outside acceptable 300s window", 400, "WORDPRESS_WEBHOOK_EXPIRED");
  }

  if (PROCESSED_DELIVERY_IDS.has(deliveryId)) {
    await recordAuditLog({
      targetResource: websiteId,
      userId: "system",
      action: "WEBHOOK_REPLAY_REJECTED",
      details: { deliveryId, reason: "Duplicate delivery ID detected" },
    });
    return { status: "REPLAY_REJECTED", deliveryId };
  }

  PROCESSED_DELIVERY_IDS.set(deliveryId, Date.now());

  await recordAuditLog({
    targetResource: websiteId,
    userId: "system",
    action: "WEBHOOK_DELIVERY_RECEIVED",
    details: { deliveryId, event },
  });

  return { status: "PROCESSED", deliveryId };
}
