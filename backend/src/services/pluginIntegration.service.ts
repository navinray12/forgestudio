import { prisma } from "../config/prisma.js";

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

export async function getPluginIntegrations(websiteId: string) {
  return prisma.pluginIntegration.findMany({
    where: { websiteId },
  });
}

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
