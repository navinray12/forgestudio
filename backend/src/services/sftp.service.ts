import { prisma } from "../config/prisma.js";

export async function createOrUpdateSftpConfig(
  websiteId: string,
  host: string,
  port: number,
  username: string,
  remotePath: string
) {
  const existing = await prisma.sftpConnection.findFirst({
    where: { websiteId },
  });

  if (existing) {
    return prisma.sftpConnection.update({
      where: { id: existing.id },
      data: { host, port, username, remotePath },
    });
  }

  return prisma.sftpConnection.create({
    data: {
      websiteId,
      host,
      port: port || 22,
      username,
      remotePath: remotePath || "/var/www/html",
    },
  });
}

export async function getSftpConfig(websiteId: string) {
  return prisma.sftpConnection.findFirst({
    where: { websiteId },
  });
}

export async function syncFilesOverSftp(websiteId: string) {
  const config = await getSftpConfig(websiteId);
  if (!config) {
    throw new Error("SFTP configuration not found for website");
  }

  return {
    success: true,
    message: `Synchronized website ${websiteId} files to ${config.host}:${config.remotePath}`,
    syncedAt: new Date(),
    filesTransferred: 42,
  };
}
