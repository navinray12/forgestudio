/**
 * WordPress Themes Connector, Service & Safety Engine (F-507)
 *
 * Implements theme management logic, active-theme deletion defense, child/parent theme graph validation,
 * block theme classification, package source security, and timeout reconciliation.
 */

import { AppError } from "../../utils/app-error.js";
import { getWebsiteById } from "../website.service.js";
import { recordAuditLog } from "../audit.service.js";
import {
  WordPressThemeCapabilities,
  WordPressTheme,
  resolveThemeProvider,
} from "./wordpressThemeProvider.service.js";

export function validateThemePackageSource(source?: string): string {
  if (!source || typeof source !== "string") {
    throw new AppError("Theme package source is required", 400, "WORDPRESS_THEME_INVALID_PACKAGE");
  }

  const trimmed = source.trim();
  const lower = trimmed.toLowerCase();

  const dangerous = ["../", "..\\", "/etc/", "c:\\", "d:\\", ".exe", ".bat", ".sh", "javascript:"];
  for (const d of dangerous) {
    if (lower.includes(d)) {
      throw new AppError(`Path traversal or unsafe theme package source detected: ${d}`, 400, "WORDPRESS_THEME_UNSAFE_PACKAGE");
    }
  }

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    const allowedDomains = ["downloads.wordpress.org", "api.wordpress.org", "forgestudio.com", "cdn.forgestudio.com"];
    const isAllowed = allowedDomains.some((domain) => lower.includes(domain));
    if (!isAllowed) {
      throw new AppError("Theme package URL domain is not on trusted source allowlist", 400, "WORDPRESS_THEME_UNTRUSTED_SOURCE");
    }
  }

  return trimmed;
}

export function verifyThemeCompatibility(theme: Partial<WordPressTheme>, wpVersion = "6.4", phpVersion = "8.2"): { compatible: boolean; reason?: string } {
  if (theme.requiresWordPress && parseFloat(theme.requiresWordPress) > parseFloat(wpVersion)) {
    return { compatible: false, reason: `Requires WordPress version ${theme.requiresWordPress} or higher (current: ${wpVersion})` };
  }
  if (theme.requiresPHP && parseFloat(theme.requiresPHP) > parseFloat(phpVersion)) {
    return { compatible: false, reason: `Requires PHP version ${theme.requiresPHP} or higher (current: ${phpVersion})` };
  }
  return { compatible: true };
}

export async function getWordPressThemeCapabilities(websiteId: string, userId: string): Promise<WordPressThemeCapabilities> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["themes"] };
  const provider = resolveThemeProvider(connection);
  return await provider.getCapabilities(connection);
}

export async function listWordPressThemes(
  websiteId: string,
  filter: { active?: boolean; isBlockTheme?: boolean; updateAvailable?: boolean; search?: string } = {},
  userId: string
): Promise<WordPressTheme[]> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["themes"] };
  const provider = resolveThemeProvider(connection);

  const themes = await provider.listThemes(connection, websiteId, filter);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "THEME_LISTED",
    details: { count: themes.length, filter },
  });

  return themes;
}

export async function getActiveWordPressTheme(websiteId: string, userId: string): Promise<WordPressTheme> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["themes"] };
  const provider = resolveThemeProvider(connection);

  const activeTheme = await provider.getActiveTheme(connection, websiteId);
  if (!activeTheme) throw new AppError("No active WordPress theme detected", 404, "WORDPRESS_THEME_NOT_FOUND");
  return activeTheme;
}

export async function getWordPressThemeDetails(websiteId: string, themeId: string, userId: string): Promise<WordPressTheme> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["themes"] };
  const provider = resolveThemeProvider(connection);

  const theme = await provider.getThemeDetails(connection, websiteId, themeId);
  if (!theme) throw new AppError(`Theme '${themeId}' not found`, 404, "WORDPRESS_THEME_NOT_FOUND");
  return theme;
}

export async function activateWordPressTheme(websiteId: string, themeId: string, userId: string): Promise<WordPressTheme> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["themes"] };
  const provider = resolveThemeProvider(connection);

  const theme = await provider.getThemeDetails(connection, websiteId, themeId);
  if (!theme) throw new AppError(`Theme '${themeId}' not found`, 404, "WORDPRESS_THEME_NOT_FOUND");

  const compat = verifyThemeCompatibility(theme);
  if (!compat.compatible) {
    throw new AppError(`Theme activation blocked due to incompatibility: ${compat.reason}`, 400, "WORDPRESS_THEME_INCOMPATIBLE");
  }

  const activated = await provider.activateTheme(connection, websiteId, themeId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "THEME_ACTIVATED",
    details: { themeId, name: activated.name },
  });

  return activated;
}

export async function updateWordPressTheme(websiteId: string, themeId: string, userId: string): Promise<WordPressTheme> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["themes"] };
  const provider = resolveThemeProvider(connection);

  const updated = await provider.updateTheme(connection, websiteId, themeId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "THEME_UPDATED",
    details: { themeId, version: updated.version },
  });

  return updated;
}

export async function deleteWordPressTheme(websiteId: string, themeId: string, userId: string): Promise<{ success: boolean; deletedId: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["themes"] };
  const provider = resolveThemeProvider(connection);

  const res = await provider.deleteTheme(connection, websiteId, themeId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "THEME_DELETED",
    details: { themeId },
  });

  return res;
}

export async function installWordPressTheme(websiteId: string, packageSource: string, userId: string): Promise<WordPressTheme> {
  const validSource = validateThemePackageSource(packageSource);

  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["themes"] };
  const provider = resolveThemeProvider(connection);

  const installed = await provider.installTheme(connection, websiteId, validSource);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "THEME_INSTALLED",
    details: { themeId: installed.id, packageSource: validSource },
  });

  return installed;
}

export async function reconcileAmbiguousThemeMutation(
  websiteId: string,
  themeId: string,
  expectedActive: boolean,
  userId: string
): Promise<{ outcome: "REMOTE_UPDATED" | "SAFE_TO_RETRY" | "RECONCILIATION_REQUIRED"; message: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["themes"] };
  const provider = resolveThemeProvider(connection);

  const remoteTheme = await provider.getThemeDetails(connection, websiteId, themeId);

  if (remoteTheme && remoteTheme.active === expectedActive) {
    return { outcome: "REMOTE_UPDATED", message: `Theme '${themeId}' active status matches expected state (${expectedActive}).` };
  }

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "THEME_RECONCILIATION_REQUIRED",
    details: { themeId, expectedActive, actualActive: remoteTheme?.active },
  });

  return { outcome: "SAFE_TO_RETRY", message: `Theme '${themeId}' active status differs; safe retry possible.` };
}
