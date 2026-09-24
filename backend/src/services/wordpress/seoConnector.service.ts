/**
 * WordPress SEO API Connector & Validation Service (F-502)
 *
 * Enforces input validation (XSS, HTML injection, javascript/file/data URL blocking, SSRF defenses),
 * handles capability discovery, page SEO metadata read/write, page-level synchronization,
 * and timeout reconciliation.
 */

import { AppError } from "../../utils/app-error.js";
import { getWebsiteById, updateWebsiteEditorData } from "../website.service.js";
import {
  WordPressSeoCapabilities,
  NormalizedSeoMetadata,
  RobotsDirectives,
  resolveSeoProvider,
  computeSeoHash,
} from "./seoProvider.service.js";

/**
 * Validates SEO Title: Must be plain text, max 150 chars, no HTML tags/scripts/javascript:
 */
export function validateSeoTitle(title?: string): { valid: boolean; error?: string; sanitized?: string } {
  if (title === undefined || title === null) {
    return { valid: true, sanitized: "" };
  }
  if (typeof title !== "string") {
    return { valid: false, error: "SEO title must be a string" };
  }

  // Check dangerous script / HTML / scheme injections
  if (/<script\b/i.test(title) || /javascript:/i.test(title) || /<[^>]+>/i.test(title)) {
    return { valid: false, error: "SEO title must be plain text and cannot contain HTML or script tags" };
  }

  const trimmed = title.trim();
  if (trimmed.length > 150) {
    return { valid: false, error: `SEO title exceeds maximum allowable length of 150 characters (got ${trimmed.length})` };
  }

  // Strip control characters
  const sanitized = trimmed.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  return { valid: true, sanitized };
}

/**
 * Validates Meta Description: Must be plain text, no HTML tags/scripts
 */
export function validateMetaDescription(description?: string): { valid: boolean; error?: string; sanitized?: string } {
  if (description === undefined || description === null) {
    return { valid: true, sanitized: "" };
  }
  if (typeof description !== "string") {
    return { valid: false, error: "Meta description must be a string" };
  }

  if (/<script\b/i.test(description) || /javascript:/i.test(description) || /<[^>]+>/i.test(description)) {
    return { valid: false, error: "Meta description must be plain text and cannot contain HTML or script tags" };
  }

  const trimmed = description.trim();
  if (trimmed.length > 500) {
    return { valid: false, error: `Meta description exceeds maximum allowable length of 500 characters (got ${trimmed.length})` };
  }

  const sanitized = trimmed.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  return { valid: true, sanitized };
}

/**
 * Validates Canonical URL: Valid http/https URL, blocks javascript/file/data schemes and private/local network SSRF targets
 */
export function validateCanonicalUrl(url?: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!url || !url.trim()) {
    return { valid: true, sanitized: "" };
  }

  const trimmed = url.trim();

  // Block dangerous pseudo-schemes
  if (/^(javascript|vbscript|file|data|blob):/i.test(trimmed)) {
    return { valid: false, error: "Canonical URL contains forbidden pseudo-scheme" };
  }

  try {
    const parsed = new URL(trimmed);

    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Canonical URL must use http or https protocol" };
    }

    // SSRF Guard: Block private/local network targets
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^192\.168\./.test(hostname)
    ) {
      return { valid: false, error: "Canonical URL targets a forbidden private/local IP address" };
    }

    return { valid: true, sanitized: parsed.toString() };
  } catch {
    return { valid: false, error: "Canonical URL must be a valid absolute HTTP/HTTPS URL" };
  }
}

/**
 * Validates structured robots directives
 */
export function validateRobotsDirectives(robots?: any): { valid: boolean; error?: string; sanitized?: RobotsDirectives } {
  if (!robots) {
    return { valid: true, sanitized: { index: true, follow: true } };
  }

  if (typeof robots !== "object") {
    return { valid: false, error: "Robots directives must be an object" };
  }

  return {
    valid: true,
    sanitized: {
      index: Boolean(robots.index ?? true),
      follow: Boolean(robots.follow ?? true),
      archive: robots.archive !== undefined ? Boolean(robots.archive) : undefined,
      snippet: robots.snippet !== undefined ? Boolean(robots.snippet) : undefined,
      imageIndex: robots.imageIndex !== undefined ? Boolean(robots.imageIndex) : undefined,
    },
  };
}

/**
 * Validates complete NormalizedSeoMetadata object
 */
export function validateNormalizedSeo(metadata: NormalizedSeoMetadata): { valid: boolean; errors: string[]; sanitized: NormalizedSeoMetadata } {
  const errors: string[] = [];

  const titleRes = validateSeoTitle(metadata.title);
  if (!titleRes.valid) errors.push(titleRes.error!);

  const descRes = validateMetaDescription(metadata.description);
  if (!descRes.valid) errors.push(descRes.error!);

  const canonRes = validateCanonicalUrl(metadata.canonicalUrl);
  if (!canonRes.valid) errors.push(canonRes.error!);

  const robotsRes = validateRobotsDirectives(metadata.robots);
  if (!robotsRes.valid) errors.push(robotsRes.error!);

  const sanitized: NormalizedSeoMetadata = {
    ...metadata,
    title: titleRes.sanitized,
    description: descRes.sanitized,
    canonicalUrl: canonRes.sanitized,
    robots: robotsRes.sanitized,
  };

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Get WordPress SEO Capabilities for a site workspace
 */
export async function getWordPressSeoCapabilities(websiteId: string, userId: string): Promise<WordPressSeoCapabilities> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["wp_core_seo"] };
  const provider = resolveSeoProvider(connection);
  return provider.getCapabilities(connection);
}

/**
 * Get page SEO metadata
 */
export async function getWordPressPageSeo(websiteId: string, pageId: string, userId: string): Promise<NormalizedSeoMetadata> {
  const website = await getWebsiteById(websiteId, userId);
  const pages = website.editorData?.pages || [];
  const page = pages.find((p: any) => p.id === pageId);

  if (!page) {
    throw new AppError(`Page not found with ID ${pageId}`, 404, "PAGE_NOT_FOUND");
  }

  const pSettings = page.pageSettings || {};

  const connection = website.wordpressConnection || { status: "CONNECTED" };
  const provider = resolveSeoProvider(connection);

  const remoteSeo = await provider.getPageSeo(connection, websiteId, pageId);

  // Return normalized SEO combining local pageSettings with remote provider info
  return {
    title: pSettings.seoTitle || pSettings.title || page.title || page.name || remoteSeo?.title || "",
    description: pSettings.seoDescription || pSettings.description || page.metaDescription || remoteSeo?.description || "",
    canonicalUrl: pSettings.canonicalUrl || remoteSeo?.canonicalUrl || "",
    robots: {
      index: !(pSettings.noindex ?? false),
      follow: !(pSettings.nofollow ?? false),
    },
    openGraph: {
      title: pSettings.ogTitle || pSettings.seoTitle || page.title || "",
      description: pSettings.ogDescription || pSettings.seoDescription || "",
      image: pSettings.ogImage || "",
    },
    twitter: {
      card: pSettings.twitterCard || "summary_large_image",
      title: pSettings.twitterTitle || pSettings.seoTitle || page.title || "",
      description: pSettings.twitterDescription || pSettings.seoDescription || "",
      image: pSettings.twitterImage || "",
    },
    focusKeyword: pSettings.focusKeyword || remoteSeo?.focusKeyword || "",
    provider: provider.providerName,
    providerScore: remoteSeo?.providerScore || { score: null, status: "UNSUPPORTED" },
    sitemapStatus: remoteSeo?.sitemapStatus || { enabled: true },
  };
}

/**
 * Update local page SEO settings in website editorData
 */
export async function updateWordPressPageSeo(
  websiteId: string,
  pageId: string,
  metadata: NormalizedSeoMetadata,
  userId: string
): Promise<NormalizedSeoMetadata> {
  const validation = validateNormalizedSeo(metadata);
  if (!validation.valid) {
    throw new AppError(`SEO metadata validation failed: ${validation.errors.join("; ")}`, 400, "INVALID_SEO_METADATA");
  }

  const website = await getWebsiteById(websiteId, userId);
  const editorData = website.editorData || { pages: [] };

  let targetPageFound = false;
  const updatedPages = (editorData.pages || []).map((p: any) => {
    if (p.id === pageId) {
      targetPageFound = true;
      return {
        ...p,
        pageSettings: {
          ...(p.pageSettings || {}),
          seoTitle: validation.sanitized.title,
          seoDescription: validation.sanitized.description,
          canonicalUrl: validation.sanitized.canonicalUrl,
          noindex: !(validation.sanitized.robots?.index ?? true),
          nofollow: !(validation.sanitized.robots?.follow ?? true),
          ogTitle: validation.sanitized.openGraph?.title,
          ogDescription: validation.sanitized.openGraph?.description,
          ogImage: validation.sanitized.openGraph?.image,
          twitterTitle: validation.sanitized.twitter?.title,
          twitterDescription: validation.sanitized.twitter?.description,
          twitterImage: validation.sanitized.twitter?.image,
          focusKeyword: validation.sanitized.focusKeyword,
        },
      };
    }
    return p;
  });

  if (!targetPageFound) {
    throw new AppError(`Page not found with ID ${pageId}`, 404, "PAGE_NOT_FOUND");
  }

  editorData.pages = updatedPages;
  await updateWebsiteEditorData(websiteId, userId, editorData);

  return validation.sanitized;
}

/**
 * Synchronize page SEO metadata to connected WordPress site
 */
export async function syncWordPressPageSeo(
  websiteId: string,
  pageId: string,
  userId: string
): Promise<{ success: boolean; synchronizedAt: string; hash: string; provider: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection;

  if (!connection || connection.status !== "CONNECTED") {
    throw new AppError("WordPress integration is disconnected or revoked", 400, "DISCONNECTED");
  }

  const currentSeo = await getWordPressPageSeo(websiteId, pageId, userId);
  const seoHash = computeSeoHash(currentSeo);

  const provider = resolveSeoProvider(connection);
  await provider.updatePageSeo(connection, websiteId, pageId, currentSeo);

  return {
    success: true,
    synchronizedAt: new Date().toISOString(),
    hash: seoHash,
    provider: provider.providerName,
  };
}

/**
 * Reconcile ambiguous network timeout for SEO synchronization (F-500 pattern safety)
 */
export async function reconcileAmbiguousSeoSync(
  websiteId: string,
  pageId: string,
  expectedHash: string,
  userId: string
): Promise<{ outcome: "REMOTE_UPDATED" | "SAFE_TO_RETRY" | "UNKNOWN"; message: string }> {
  const currentSeo = await getWordPressPageSeo(websiteId, pageId, userId);
  const currentHash = computeSeoHash(currentSeo);

  if (currentHash === expectedHash) {
    return {
      outcome: "REMOTE_UPDATED",
      message: "Remote WordPress page SEO state matches expected hash. Synchronization was successful.",
    };
  }

  return {
    outcome: "SAFE_TO_RETRY",
    message: "Remote WordPress page SEO state does not match expected hash. Safe to retry synchronization.",
  };
}
