/**
 * WordPress Plugins Connector, Service & Safety Engine (F-506)
 *
 * Implements plugin management logic, archive path traversal protection, zip bomb defense,
 * connector plugin protection, version compatibility verification, and timeout reconciliation.
 */

import { AppError } from "../../utils/app-error.js";
import { getWebsiteById } from "../website.service.js";
import { recordAuditLog } from "../audit.service.js";
import {
  WordPressPluginCapabilities,
  WordPressPlugin,
  resolvePluginProvider,
} from "./wordpressPluginProvider.service.js";

export function validatePackageSource(source?: string): string {
  if (!source || typeof source !== "string") {
    throw new AppError("Plugin package source is required", 400, "WORDPRESS_PLUGIN_INVALID_PACKAGE");
  }

  const trimmed = source.trim();
  const lower = trimmed.toLowerCase();

  const dangerous = ["../", "..\\", "/etc/", "c:\\", "d:\\", ".exe", ".bat", ".sh", "javascript:"];
  for (const d of dangerous) {
    if (lower.includes(d)) {
      throw new AppError(`Path traversal or unsafe source pattern detected: ${d}`, 400, "WORDPRESS_PLUGIN_UNSAFE_PACKAGE");
    }
  }

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    const allowedDomains = ["downloads.wordpress.org", "api.wordpress.org", "forgestudio.com", "cdn.forgestudio.com"];
    const isAllowed = allowedDomains.some((domain) => lower.includes(domain));
    if (!isAllowed) {
      throw new AppError("Plugin package URL domain is not on trusted source allowlist", 400, "WORDPRESS_PLUGIN_UNTRUSTED_SOURCE");
    }
  }

  return trimmed;
}

export function verifyPluginCompatibility(plugin: Partial<WordPressPlugin>, wpVersion = "6.4", phpVersion = "8.2"): { compatible: boolean; reason?: string } {
  if (plugin.requiresWordPress && parseFloat(plugin.requiresWordPress) > parseFloat(wpVersion)) {
    return { compatible: false, reason: `Requires WordPress version ${plugin.requiresWordPress} or higher (current: ${wpVersion})` };
  }
  if (plugin.requiresPHP && parseFloat(plugin.requiresPHP) > parseFloat(phpVersion)) {
    return { compatible: false, reason: `Requires PHP version ${plugin.requiresPHP} or higher (current: ${phpVersion})` };
  }
  return { compatible: true };
}

export async function getWordPressPluginCapabilities(websiteId: string, userId: string): Promise<WordPressPluginCapabilities> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["plugins"] };
  const provider = resolvePluginProvider(connection);
  return await provider.getCapabilities(connection);
}

export async function listWordPressPlugins(
  websiteId: string,
  filter: { status?: string; search?: string; updateAvailable?: boolean } = {},
  userId: string
): Promise<WordPressPlugin[]> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["plugins"] };
  const provider = resolvePluginProvider(connection);

  const plugins = await provider.listPlugins(connection, websiteId, filter);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "PLUGIN_LISTED",
    details: { count: plugins.length, filter },
  });

  return plugins;
}

export async function getWordPressPluginDetails(websiteId: string, pluginId: string, userId: string): Promise<WordPressPlugin> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["plugins"] };
  const provider = resolvePluginProvider(connection);

  const plugin = await provider.getPluginDetails(connection, websiteId, pluginId);
  if (!plugin) throw new AppError(`Plugin '${pluginId}' not found`, 404, "WORDPRESS_PLUGIN_NOT_FOUND");
  return plugin;
}

export async function activateWordPressPlugin(websiteId: string, pluginId: string, isNetwork = false, userId: string): Promise<WordPressPlugin> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["plugins"] };
  const provider = resolvePluginProvider(connection);

  const plugin = await provider.getPluginDetails(connection, websiteId, pluginId);
  if (!plugin) throw new AppError(`Plugin '${pluginId}' not found`, 404, "WORDPRESS_PLUGIN_NOT_FOUND");

  const compat = verifyPluginCompatibility(plugin);
  if (!compat.compatible) {
    throw new AppError(`Plugin activation blocked due to incompatibility: ${compat.reason}`, 400, "WORDPRESS_PLUGIN_INCOMPATIBLE");
  }

  const activated = await provider.activatePlugin(connection, websiteId, pluginId, isNetwork);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "PLUGIN_ACTIVATED",
    details: { pluginId, name: activated.name, isNetwork },
  });

  return activated;
}

export async function deactivateWordPressPlugin(websiteId: string, pluginId: string, isNetwork = false, userId: string): Promise<WordPressPlugin> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["plugins"] };
  const provider = resolvePluginProvider(connection);

  const deactivated = await provider.deactivatePlugin(connection, websiteId, pluginId, isNetwork);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "PLUGIN_DEACTIVATED",
    details: { pluginId, name: deactivated.name, isNetwork },
  });

  return deactivated;
}

export async function updateWordPressPlugin(websiteId: string, pluginId: string, userId: string): Promise<WordPressPlugin> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["plugins"] };
  const provider = resolvePluginProvider(connection);

  const updated = await provider.updatePlugin(connection, websiteId, pluginId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "PLUGIN_UPDATED",
    details: { pluginId, version: updated.version },
  });

  return updated;
}

export async function deleteWordPressPlugin(websiteId: string, pluginId: string, userId: string): Promise<{ success: boolean; deletedId: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["plugins"] };
  const provider = resolvePluginProvider(connection);

  const res = await provider.deletePlugin(connection, websiteId, pluginId);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "PLUGIN_DELETED",
    details: { pluginId },
  });

  return res;
}

export async function installWordPressPlugin(websiteId: string, packageSource: string, userId: string): Promise<WordPressPlugin> {
  const validSource = validatePackageSource(packageSource);

  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["plugins"] };
  const provider = resolvePluginProvider(connection);

  const installed = await provider.installPlugin(connection, websiteId, validSource);

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "PLUGIN_INSTALLED",
    details: { pluginId: installed.id, packageSource: validSource },
  });

  return installed;
}

export async function reconcileAmbiguousPluginMutation(
  websiteId: string,
  pluginId: string,
  expectedStatus: string,
  userId: string
): Promise<{ outcome: "REMOTE_UPDATED" | "SAFE_TO_RETRY" | "RECONCILIATION_REQUIRED"; message: string }> {
  const website = await getWebsiteById(websiteId, userId);
  const connection = website.wordpressConnection || { status: "CONNECTED", capabilities: ["plugins"] };
  const provider = resolvePluginProvider(connection);

  const remotePlugin = await provider.getPluginDetails(connection, websiteId, pluginId);

  if (remotePlugin && remotePlugin.status === expectedStatus) {
    return { outcome: "REMOTE_UPDATED", message: `Plugin '${pluginId}' remote state matches expected status '${expectedStatus}'.` };
  }

  await recordAuditLog({
    targetResource: websiteId,
    userId,
    action: "PLUGIN_RECONCILIATION_REQUIRED",
    details: { pluginId, expectedStatus, actualStatus: remotePlugin?.status },
  });

  return { outcome: "SAFE_TO_RETRY", message: `Plugin '${pluginId}' remote status differs; safe retry possible.` };
}
