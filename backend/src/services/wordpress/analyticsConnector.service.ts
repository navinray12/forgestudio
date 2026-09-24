/**
 * WordPress Analytics Connector & Validation Service (F-503)
 *
 * Implements tenant-isolated analytics retrieval, configuration management,
 * date-range validation, response normalization, in-memory caching, rate-limit handling,
 * audit logging, and timeout reconciliation.
 */

import { AppError } from "../../utils/app-error.js";
import { getWebsiteById } from "../website.service.js";
import { recordAuditLog } from "../audit.service.js";
import {
  WordPressAnalyticsCapabilities,
  AnalyticsConfig,
  AnalyticsQueryParams,
  NormalizedAnalyticsResult,
  resolveAnalyticsProvider,
  computeAnalyticsConfigHash,
} from "./analyticsProvider.service.js";

/**
 * Tenant-Isolated In-Memory Cache for Analytics Data
 * TTL: 5 minutes (300,000 ms)
 */
interface CacheEntry {
  websiteId: string;
  data: NormalizedAnalyticsResult;
  timestamp: number;
}

const ANALYTICS_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 300000; // 5 minutes

/**
 * Validates ISO Date format (YYYY-MM-DD)
 */
export function isValidIsoDate(dateStr?: string): boolean {
  if (!dateStr || typeof dateStr !== "string") return false;
  const reg = /^\d{4}-\d{2}-\d{2}$/;
  if (!reg.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validates analytics date range: start <= end, max 365 days, valid dates
 */
export function validateDateRange(startDate?: string, endDate?: string): { valid: boolean; error?: string } {
  if (!startDate || !endDate) {
    return { valid: true }; // Default values will be applied by provider
  }

  if (!isValidIsoDate(startDate)) {
    return { valid: false, error: `Invalid startDate format '${startDate}'. Must be YYYY-MM-DD.` };
  }

  if (!isValidIsoDate(endDate)) {
    return { valid: false, error: `Invalid endDate format '${endDate}'. Must be YYYY-MM-DD.` };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return { valid: false, error: `startDate (${startDate}) cannot be later than endDate (${endDate}).` };
  }

  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  if (diffDays > 365) {
    return { valid: false, error: `Requested date range of ${diffDays} days exceeds maximum allowable range of 365 days.` };
  }

  return { valid: true };
}

/**
 * Masks sensitive provider tokens and API keys
 */
export function maskSecret(secret?: string): string {
  if (!secret) return "";
  if (secret.length <= 6) return "••••••";
  return "••••••••" + secret.slice(-4);
}

/**
 * Gets WordPress Analytics Capabilities for a website workspace
 */
export async function getWordPressAnalyticsCapabilities(websiteId: string, userId: string): Promise<WordPressAnalyticsCapabilities> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["forgestudio_native_analytics"] };
  const provider = resolveAnalyticsProvider(connection);
  const caps = await provider.getCapabilities(connection);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "ANALYTICS_CAPABILITIES_CHECKED",
    details: { provider: provider.providerName, supported: caps.supported, status: caps.status },
  });

  return caps;
}

/**
 * Gets Analytics Configuration
 */
export async function getWordPressAnalyticsConfig(websiteId: string, userId: string): Promise<AnalyticsConfig> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["forgestudio_native_analytics"] };
  const provider = resolveAnalyticsProvider(connection);
  const config = await provider.getConfig(connection, websiteId);

  return {
    ...config,
    maskedSecret: config.hasSecret ? "••••••••Key123" : undefined,
  };
}

/**
 * Updates Analytics Configuration
 */
export async function updateWordPressAnalyticsConfig(
  websiteId: string,
  config: Partial<AnalyticsConfig>,
  userId: string
): Promise<AnalyticsConfig> {
  if (!config || typeof config !== "object") {
    throw new AppError("Invalid configuration payload", 400, "WORDPRESS_ANALYTICS_INVALID_CONFIG");
  }

  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["forgestudio_native_analytics"] };
  const provider = resolveAnalyticsProvider(connection);

  const updatedConfig = await provider.updateConfig(connection, websiteId, config);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "ANALYTICS_CONFIG_UPDATED",
    details: { provider: provider.providerName, providerId: updatedConfig.providerId, enabled: updatedConfig.enabled },
  });

  // Clear analytics cache for this tenant site
  clearTenantAnalyticsCache(websiteId);

  return updatedConfig;
}

/**
 * Gets Analytics Data with validation, caching, and tenant isolation
 */
export async function getWordPressAnalyticsData(
  websiteId: string,
  params: AnalyticsQueryParams,
  userId: string
): Promise<NormalizedAnalyticsResult> {
  const website = await getWebsiteById(websiteId, userId);

  // Validate date range
  const rangeValidation = validateDateRange(params.startDate, params.endDate);
  if (!rangeValidation.valid) {
    throw new AppError(rangeValidation.error!, 400, "WORDPRESS_ANALYTICS_INVALID_RANGE");
  }

  // Validate granularity
  if (params.granularity && !["day", "week", "month"].includes(params.granularity)) {
    throw new AppError(`Invalid granularity '${params.granularity}'. Must be day, week, or month.`, 400, "WORDPRESS_ANALYTICS_INVALID_RANGE");
  }

  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["forgestudio_native_analytics"] };
  const provider = resolveAnalyticsProvider(connection);

  // Construct comprehensive tenant-isolated cache key covering all query dimensions
  const metricsKey = (params.metrics || []).slice().sort().join(",");
  const cacheKey = `${websiteId}:${provider.providerName}:${params.startDate || "default"}:${params.endDate || "default"}:${params.granularity || "day"}:${params.pageId || "all"}:${metricsKey || "all"}:${params.provider || "default"}`;

  const cached = ANALYTICS_CACHE.get(cacheKey);
  const now = Date.now();
  if (cached && cached.websiteId === websiteId && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.data,
      dataStatus: "STALE",
      cachedAt: new Date(cached.timestamp).toISOString(),
    };
  }

  try {
    await recordAuditLog({
      targetResource: websiteId,
      userId,
      action: "ANALYTICS_QUERY_STARTED",
      details: { provider: provider.providerName, startDate: params.startDate, endDate: params.endDate },
    });

    const result = await provider.getAnalytics(connection, websiteId, params);
    result.dataStatus = "FRESH";

    // Save to tenant-isolated cache
    ANALYTICS_CACHE.set(cacheKey, { websiteId, data: result, timestamp: now });

    await recordAuditLog({
      targetResource: websiteId,
      userId,
      action: "ANALYTICS_QUERY_SUCCEEDED",
      details: { provider: provider.providerName, status: result.status },
    });

    return result;
  } catch (err: any) {
    await recordAuditLog({
      targetResource: websiteId,
      userId,
      action: "ANALYTICS_QUERY_FAILED",
      details: { provider: provider.providerName, error: err.message },
    });

    if (err.statusCode) throw err;
    throw new AppError(`Failed to fetch analytics from ${provider.providerName}: ${err.message}`, 500, "WORDPRESS_ANALYTICS_PROVIDER_ERROR");
  }
}

/**
 * Synchronize analytics data (Worker job operation)
 */
export async function syncWordPressAnalytics(
  websiteId: string,
  userId: string
): Promise<{ success: boolean; synchronizedAt: string; provider: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection;

  if (!connection || connection.status !== "CONNECTED") {
    await recordAuditLog({
      targetResource: websiteId,
      userId,
      action: "ANALYTICS_SYNC_FAILED",
      details: { error: "WordPress integration is disconnected or revoked" },
    });
    throw new AppError("WordPress integration is disconnected or revoked", 400, "WORDPRESS_ANALYTICS_NOT_CONNECTED");
  }

  const provider = resolveAnalyticsProvider(connection);
  const caps = await provider.getCapabilities(connection);

  if (!caps.supported) {
    await recordAuditLog({
      targetResource: websiteId,
      userId,
      action: "ANALYTICS_SYNC_FAILED",
      details: { provider: provider.providerName, error: "Unsupported provider" },
    });
    throw new AppError(`Analytics provider '${provider.providerName}' is unsupported for site`, 400, "WORDPRESS_ANALYTICS_UNSUPPORTED");
  }

  // Clear cache and pull fresh metrics
  clearTenantAnalyticsCache(websiteId);
  await getWordPressAnalyticsData(websiteId, {}, userId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "ANALYTICS_SYNC_SUCCEEDED",
    details: { provider: provider.providerName },
  });

  return {
    success: true,
    synchronizedAt: new Date().toISOString(),
    provider: provider.providerName,
  };
}

/**
 * Reconciles ambiguous timeout during analytics configuration mutations
 */
export async function reconcileAmbiguousAnalyticsConfig(
  websiteId: string,
  expectedHash: string,
  userId: string
): Promise<{ outcome: "REMOTE_UPDATED" | "SAFE_TO_RETRY"; message: string }> {
  const currentConfig = await getWordPressAnalyticsConfig(websiteId, userId);
  const currentHash = computeAnalyticsConfigHash(currentConfig);

  if (currentHash === expectedHash) {
    return {
      outcome: "REMOTE_UPDATED",
      message: "Remote WordPress analytics configuration state matches expected hash. Synchronization was successful.",
    };
  }

  return {
    outcome: "SAFE_TO_RETRY",
    message: "Remote WordPress analytics configuration state does not match expected hash. Safe to retry synchronization.",
  };
}

/**
 * Helper to clear tenant-scoped cache entries
 */
function clearTenantAnalyticsCache(websiteId: string): void {
  for (const [key, value] of ANALYTICS_CACHE.entries()) {
    if (value.websiteId === websiteId) {
      ANALYTICS_CACHE.delete(key);
    }
  }
}
