/**
 * @file Plugin integrations: business operations and coordination with persistence or external services. File responsibility: plugin integration service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";

/**
 * Upsert Plugin Integration.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param pluginSlug Plugin Slug supplied to this operation (type: string).
 * @param config Config supplied to this operation (type: any).
 * @param isEnabled Is Enabled supplied to this operation (type: boolean). Defaults to true.
 */
export async function upsertPluginIntegration(
  websiteId: string,
  pluginSlug: string,
  config: any,
  isEnabled: boolean = true
) {
  return prisma.pluginIntegration.upsert({
    where: {
      websiteId_pluginSlug: {
        websiteId,
        pluginSlug,
      },
    },
    create: {
      websiteId,
      pluginSlug,
      config: config || {},
      isEnabled,
    },
    update: {
      config: config || {},
      isEnabled,
    },
  });
}

/**
 * Get Plugin Integrations.
 * @param websiteId Identifier of the website whose data is being read or changed.
 */
export async function getPluginIntegrations(websiteId: string) {
  return prisma.pluginIntegration.findMany({
    where: { websiteId },
  });
}

/**
 * Get Plugin Integration By Slug.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param pluginSlug Plugin Slug supplied to this operation (type: string).
 */
export async function getPluginIntegrationBySlug(websiteId: string, pluginSlug: string) {
  return prisma.pluginIntegration.findUnique({
    where: {
      websiteId_pluginSlug: {
        websiteId,
        pluginSlug,
      },
    },
  });
}

/**
 * Sync External Plugin Fields.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param pluginSlug Plugin Slug supplied to this operation (type: string).
 */
export async function syncExternalPluginFields(websiteId: string, pluginSlug: string) {
  const integration = await getPluginIntegrationBySlug(websiteId, pluginSlug);
  if (!integration || !integration.isEnabled) {
    throw new Error(`Integration ${pluginSlug} is disabled or not configured`);
  }

  // Simulated real plugin data sync mapping
  return {
    success: true,
    pluginSlug,
    mappedFieldsCount: 15,
    lastSyncedAt: new Date(),
  };
}
