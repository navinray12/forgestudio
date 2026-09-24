/**
 * WordPress Remote Cache Connector, Service & Safety Engine (F-508)
 *
 * Implements remote WordPress cache purging, clearing, warming, group inspection,
 * SSRF URL security for cache target URLs, verification semantics, and audit logging.
 */

import { AppError } from "../../utils/app-error.js";
import { getWebsiteById } from "../website.service.js";
import { recordAuditLog } from "../audit.service.js";
import { assertSafeUrl } from "../../utils/ssrf.guard.js";
import {
  WordPressCacheCapabilities,
  WordPressCacheStatus,
  CachePurgeTarget,
  CacheOperationResult,
  resolveCacheProvider,
} from "./wordpressCacheProvider.service.js";

export function validatePurgeUrl(urlStr?: string): string {
  if (!urlStr || typeof urlStr !== "string") {
    throw new AppError("Purge target URL is required", 400, "WORDPRESS_CACHE_INVALID_URL");
  }

  const trimmed = urlStr.trim();
  const lower = trimmed.toLowerCase();

  if (!lower.startsWith("https://") && !lower.startsWith("http://")) {
    throw new AppError("Purge target URL must begin with http:// or https://", 400, "WORDPRESS_CACHE_INVALID_URL");
  }

  const forbidden = ["javascript:", "data:", "file:", "vbscript:"];
  for (const f of forbidden) {
    if (lower.startsWith(f)) {
      throw new AppError(`Unsafe URL scheme detected in cache purge target: ${f}`, 400, "WORDPRESS_CACHE_INVALID_URL");
    }
  }

  try {
    assertSafeUrl(trimmed);
  } catch (err: any) {
    throw new AppError(`Cache purge target URL failed SSRF safety check: ${err.message}`, 400, "WORDPRESS_CACHE_INVALID_URL");
  }

  return trimmed;
}

export async function getWordPressCacheCapabilities(websiteId: string, userId: string): Promise<WordPressCacheCapabilities> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["cache"] };
  const provider = resolveCacheProvider(connection);
  return await provider.getCapabilities(connection);
}

export async function getWordPressCacheStatus(websiteId: string, userId: string): Promise<WordPressCacheStatus> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["cache"] };
  const provider = resolveCacheProvider(connection);

  const status = await provider.getCacheStatus(connection, websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "CACHE_STATUS_CHECKED",
    details: { providerType: status.providerType, enabled: status.enabled },
  });

  return status;
}

export async function purgeWordPressCache(websiteId: string, target: CachePurgeTarget, userId: string): Promise<CacheOperationResult> {
  if (target.scope === "URL" && target.targetUrl) {
    target.targetUrl = validatePurgeUrl(target.targetUrl);
  }

  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["cache"] };
  const provider = resolveCacheProvider(connection);

  const result = await provider.purgeCache(connection, websiteId, target);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "CACHE_PURGE_SUCCEEDED",
    details: { scope: target.scope, operationId: result.operationId, status: result.status },
  });

  return result;
}

export async function clearWordPressCache(websiteId: string, userId: string): Promise<CacheOperationResult> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["cache"] };
  const provider = resolveCacheProvider(connection);

  const result = await provider.clearCache(connection, websiteId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "CACHE_CLEAR_SUCCEEDED",
    details: { operationId: result.operationId, status: result.status },
  });

  return result;
}

export async function warmWordPressCache(websiteId: string, urls: string[] = [], userId: string): Promise<{ success: boolean; warmedUrlsCount: number }> {
  const validatedUrls = urls.map((u) => validatePurgeUrl(u));

  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["cache"] };
  const provider = resolveCacheProvider(connection);

  const res = await provider.warmCache(connection, websiteId, validatedUrls);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "CACHE_WARM_SUCCEEDED",
    details: { warmedUrlsCount: res.warmedUrlsCount },
  });

  return res;
}

export async function getWordPressCacheGroups(websiteId: string, userId: string): Promise<string[]> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["cache"] };
  const provider = resolveCacheProvider(connection);

  return await provider.getCacheGroups(connection, websiteId);
}

export async function reconcileAmbiguousCacheOperation(
  websiteId: string,
  operationId: string,
  userId: string
): Promise<{ outcome: "REMOTE_UPDATED" | "SAFE_TO_RETRY" | "RECONCILIATION_REQUIRED"; message: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["cache"] };
  const provider = resolveCacheProvider(connection);

  const status = await provider.getCacheStatus(connection, websiteId);

  if (status.lastPurgedAt) {
    return { outcome: "REMOTE_UPDATED", message: `Cache purge completed remotely at ${status.lastPurgedAt}.` };
  }

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "CACHE_RECONCILIATION_REQUIRED",
    details: { operationId },
  });

  return { outcome: "SAFE_TO_RETRY", message: `Cache status not updated; safe to retry operation '${operationId}'.` };
}
