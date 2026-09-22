import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";
import { canUserAccessResource } from "./permission.service.js";
import { publishWebsite, promoteDeployment } from "./publishing.service.js";
import { recordAuditLog } from "./audit.service.js";

const db = prisma as any;

export interface StagingEnvironmentInfo {
  enabled: boolean;
  status: "ACTIVE" | "SYNCED" | "DELETED" | "IDLE";
  stagingSlug: string;
  stagingUrl: string;
  deploymentId?: string;
  version?: number;
  createdAt?: string;
  lastSyncedAt?: string;
}

/**
 * Fetch current staging environment information for a website.
 */
export async function getStagingEnvironment(
  websiteId: string,
  userId: string
): Promise<StagingEnvironmentInfo> {
  const website = await getWebsiteById(websiteId, userId);
  const editorData =
    typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : website.editorData || {};

  const staging = editorData?.hostingConfig?.staging;
  if (!staging || !staging.enabled) {
    return {
      enabled: false,
      status: "IDLE",
      stagingSlug: `staging-${website.slug}`,
      stagingUrl: `/site/${websiteId}?env=staging`,
    };
  }

  return staging;
}

/**
 * Creates an isolated staging environment sandbox for a website.
 * Deploys an isolated STAGING snapshot and registers staging metadata in editorData.
 */
export async function createStagingEnvironment(
  websiteId: string,
  userId: string
): Promise<StagingEnvironmentInfo> {
  const canEdit = await canUserAccessResource(userId, websiteId, "*", "EDIT");
  if (!canEdit) {
    throw new AppError("You do not have permission to create a staging environment.", 403, "FORBIDDEN");
  }

  const website = await getWebsiteById(websiteId, userId);
  const editorData =
    typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : website.editorData || {};

  // Publish staging deployment
  const publishResult = await publishWebsite(websiteId, userId, {
    environment: "STAGING",
    destinationType: "INTERNAL",
    editorData: editorData.publishedData || editorData,
    metadata: {
      isStagingSandbox: true,
      createdAt: new Date().toISOString(),
    },
  });

  const now = new Date().toISOString();
  const stagingInfo: StagingEnvironmentInfo = {
    enabled: true,
    status: "ACTIVE",
    stagingSlug: `staging-${website.slug}`,
    stagingUrl: `/site/${websiteId}?env=staging`,
    deploymentId: publishResult.deploymentId,
    version: publishResult.version,
    createdAt: now,
    lastSyncedAt: now,
  };

  if (!editorData.hostingConfig) {
    editorData.hostingConfig = {};
  }
  editorData.hostingConfig.staging = stagingInfo;

  await db.website.update({
    where: { id: websiteId },
    data: { editorData },
  });

  await recordAuditLog({
    userId,
    action: "STAGING_CREATED",
    targetResource: `website:${websiteId}`,
    details: {
      stagingSlug: stagingInfo.stagingSlug,
      deploymentId: stagingInfo.deploymentId,
      version: stagingInfo.version,
    },
  });

  return stagingInfo;
}

/**
 * Promotes the current verified staging environment to live production.
 */
export async function promoteStagingEnvironment(
  websiteId: string,
  userId: string
) {
  const canPublish = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canPublish) {
    throw new AppError("You do not have permission to promote staging to production.", 403, "FORBIDDEN");
  }

  const website = await getWebsiteById(websiteId, userId);
  const editorData =
    typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : website.editorData || {};

  const staging = editorData?.hostingConfig?.staging;
  if (!staging || !staging.enabled || !staging.deploymentId) {
    throw new AppError("No active staging environment found to promote.", 404, "STAGING_NOT_FOUND");
  }

  const promoteResult = await promoteDeployment(websiteId, staging.deploymentId, userId);

  staging.lastSyncedAt = new Date().toISOString();
  staging.status = "SYNCED";
  editorData.hostingConfig.staging = staging;

  await db.website.update({
    where: { id: websiteId },
    data: { editorData },
  });

  return {
    success: true,
    message: "Staging environment successfully promoted to production",
    promoteResult,
    staging,
  };
}

/**
 * Deletes and resets the staging sandbox for a website.
 */
export async function deleteStagingEnvironment(
  websiteId: string,
  userId: string
) {
  const canDelete = await canUserAccessResource(userId, websiteId, "*", "EDIT");
  if (!canDelete) {
    throw new AppError("You do not have permission to delete the staging environment.", 403, "FORBIDDEN");
  }

  const website = await getWebsiteById(websiteId, userId);
  const editorData =
    typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : website.editorData || {};

  if (editorData.hostingConfig?.staging) {
    editorData.hostingConfig.staging = {
      enabled: false,
      status: "DELETED",
      stagingSlug: `staging-${website.slug}`,
      stagingUrl: `/site/${websiteId}?env=staging`,
      lastSyncedAt: new Date().toISOString(),
    };

    await db.website.update({
      where: { id: websiteId },
      data: { editorData },
    });
  }

  await recordAuditLog({
    userId,
    action: "STAGING_DELETED",
    targetResource: `website:${websiteId}`,
    details: { websiteId },
  });

  return {
    success: true,
    message: "Staging environment has been deleted",
  };
}
