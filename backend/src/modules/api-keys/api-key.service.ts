/**
 * @file Api keys: business operations and coordination with persistence or external services. File responsibility: api key service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "crypto";
import { prisma } from "../../platform/database/prisma.js";

/**
 * Hash Api Key.
 * @param token Token supplied to this operation; do not include secret tokens in logs.
 */
export function hashApiKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Create Api Key.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 * @param name Name supplied to this operation (type: string). Defaults to "Developer Key".
 * @param scopes Scopes supplied to this operation (type: string[]). Defaults to ["websites:read"].
 */
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

/**
 * Verify Api Key.
 * @param token Token supplied to this operation; do not include secret tokens in logs.
 */
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

/**
 * List Api Keys.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
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

/**
 * Revoke Api Key.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 * @param keyId Key Id supplied to this operation (type: string).
 */
export async function revokeApiKey(userId: string, keyId: string) {
  const res = await prisma.developerApiKey.updateMany({
    where: { id: keyId, userId },
    data: { revokedAt: new Date() },
  });
  return res.count > 0;
}
