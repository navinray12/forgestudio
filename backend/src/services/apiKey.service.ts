import crypto from "crypto";
import { prisma } from "../config/prisma.js";

export function hashApiKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createApiKey(
  userId: string,
  name: string = "Developer Key",
  scopes: string[] = ["websites:read"]
) {
  // Generate random token with standard fsk_ prefix
  const rawBytes = crypto.randomBytes(24).toString("hex");
  const rawSecret = `fsk_${rawBytes}`;
  const tokenHash = hashApiKey(rawSecret);

  const apiKey = await prisma.developerApiKey.create({
    data: {
      userId,
      name,
      tokenHash,
      scopes,
    },
    include: {
      user: true,
    },
  });

  return {
    rawSecret,
    apiKey,
  };
}

export async function verifyApiKey(token: string) {
  const tokenHash = hashApiKey(token);

  const apiKeyRecord = await prisma.developerApiKey.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!apiKeyRecord) {
    return null;
  }

  if (apiKeyRecord.revokedAt) {
    return { error: "REVOKED", apiKey: apiKeyRecord };
  }

  // Update lastUsedAt asynchronously
  prisma.developerApiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { apiKey: apiKeyRecord, user: apiKeyRecord.user };
}

export async function listApiKeys(userId: string) {
  const keys = await prisma.developerApiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    scopes: k.scopes,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    revokedAt: k.revokedAt,
    isRevoked: Boolean(k.revokedAt),
  }));
}

export async function revokeApiKey(userId: string, keyId: string) {
  const res = await prisma.developerApiKey.updateMany({
    where: { id: keyId, userId },
    data: { revokedAt: new Date() },
  });
  return res.count > 0;
}
