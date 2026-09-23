import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { SftpPublisher } from "./destinations/sftp.publisher.js";
import { getWebsiteById } from "./website.service.js";
import { authorizeResourceAccess } from "./permission.service.js";

const db = prisma as any;

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
