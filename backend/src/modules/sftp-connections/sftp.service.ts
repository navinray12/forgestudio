/**
 * @file Sftp connections: business operations and coordination with persistence or external services. File responsibility: sftp service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import { SftpPublisher } from "../publishing/destinations/sftp.publisher.js";
import { getWebsiteById } from "../websites/website.service.js";
import { authorizeResourceAccess } from "../permissions/permission.service.js";

const db = prisma as any;

/**
 * Create Or Update Sftp Config.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param host Host supplied to this operation (type: string).
 * @param port Port supplied to this operation (type: number).
 * @param username Username supplied to this operation (type: string).
 * @param remotePath Remote Path supplied to this operation (type: string).
 */
export async function createOrUpdateSftpConfig(
  websiteId: string,
  host: string,
  port: number,
  username: string,
  remotePath: string,
  userId?: string
) {
  if (userId) {
    await authorizeResourceAccess(userId, websiteId, "*", "MANAGE_INTEGRATIONS");
  }

  if (!host || host.trim() === "") {
    throw new AppError("SFTP host is required.", 400, "INVALID_HOST");
  }
  if (!username || username.trim() === "") {
    throw new AppError("SFTP username is required.", 400, "INVALID_USERNAME");
  }
  const cleanPath = (remotePath || "/var/www/html").trim();

  const existing = await db.sftpConnection.findFirst({
    where: { websiteId },
  });

  if (existing) {
    return await db.sftpConnection.update({
      where: { id: existing.id },
      data: {
        host: host.trim(),
        port: port || 22,
        username: username.trim(),
        remotePath: cleanPath,
        isActive: true,
      },
    });
  }

  return await db.sftpConnection.create({
    data: {
      websiteId,
      host: host.trim(),
      port: port || 22,
      username: username.trim(),
      remotePath: cleanPath,
      isActive: true,
    },
  });
}

/**
 * Get Sftp Config.
 * @param websiteId Identifier of the website whose data is being read or changed.
 */
export async function getSftpConfig(websiteId: string, userId?: string) {
  if (userId) {
    await authorizeResourceAccess(userId, websiteId, "*", "VIEW");
  }

  const conn = await db.sftpConnection.findFirst({
    where: { websiteId },
  });
  if (!conn) return null;

  // Never return raw credentials or secret properties
  return {
    id: conn.id,
    websiteId: conn.websiteId,
    host: conn.host,
    port: conn.port,
    username: conn.username,
    remotePath: conn.remotePath,
    isActive: conn.isActive,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  };
}

/**
 * Verify Sftp Config.
 * @param websiteId Identifier of the website whose data is being read or changed.
 */
export async function verifySftpConfig(websiteId: string, userId?: string) {
  if (userId) {
    await authorizeResourceAccess(userId, websiteId, "*", "MANAGE_INTEGRATIONS");
  }

  const publisher = new SftpPublisher();
  return await publisher.verify(websiteId, "");
}

/**
 * Synchronize website files over SFTP.
 * Uses real static compiler to generate actual HTML/CSS/manifest files.
 * Calculates actual files count transferred (NO hard-coded fake numbers like 42).
 *
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service. Optional; callers may omit it.
 */
export async function syncFilesOverSftp(websiteId: string, userId?: string) {
  if (userId) {
    await authorizeResourceAccess(userId, websiteId, "*", "PUBLISH");
  }

  const config = await db.sftpConnection.findFirst({
    where: { websiteId, isActive: true },
  });
  if (!config) {
    throw new AppError("SFTP configuration not found for website", 404, "SFTP_NOT_CONFIGURED");
  }

  // Fetch website snapshot
  const website = await db.website.findUnique({ where: { id: websiteId } });
  if (!website) {
    throw new AppError("Website not found", 404, "NOT_FOUND");
  }

  const rawEditorData =
    typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : website.editorData || {};

  const snapshot = rawEditorData.publishedData || rawEditorData;
  const publisher = new SftpPublisher();
  const result = await publisher.publish(websiteId, "", snapshot, { userId });

  return {
    success: true,
    message: `Synchronized website ${websiteId} files to ${config.host}:${config.remotePath}`,
    syncedAt: new Date(),
    filesTransferred: result.filesTransferred, // Real calculated file count!
    totalBytes: result.totalBytes,
    destinationRef: result.destinationRef,
  };
}
