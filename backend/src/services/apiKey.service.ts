import crypto from "crypto";
import { prisma } from "../config/prisma.js";

export const CANONICAL_SCOPES = [
  "websites:read",
  "websites:write",
  "publish:write",
] as const;

export type CanonicalScope = (typeof CANONICAL_SCOPES)[number];

export function hashApiKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function maskApiKey(rawSecret: string): string {
  if (!rawSecret || rawSecret.length < 12) {
    return "fsk_****";
  }
  const prefix = rawSecret.slice(0, 8); // e.g. "fsk_1234"
  const suffix = rawSecret.slice(-4);   // e.g. "abcd"
  return `${prefix}...${suffix}`;
}

export function validateScopes(scopes: string[]): string[] {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return ["websites:read"];
  }

  // Filter against canonical registry
  const valid = scopes.filter((s) => (CANONICAL_SCOPES as readonly string[]).includes(s));
  return valid.length > 0 ? Array.from(new Set(valid)) : ["websites:read"];
}

export async function createApiKey(
  userId: string,
  name: string = "Developer Key",
  scopes: string[] = ["websites:read"],
  expiresInDays?: number | null
) {
  // Enforce canonical validated scopes
  const validatedScopes = validateScopes(scopes);

  // Generate random token with standard fsk_ prefix (cryptographically secure)
  const rawBytes = crypto.randomBytes(24).toString("hex");
  const rawSecret = `fsk_${rawBytes}`;
  const tokenHash = hashApiKey(rawSecret);
  const maskedKey = maskApiKey(rawSecret);

  let expiresAt: Date | null = null;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  const apiKey = await prisma.developerApiKey.create({
    data: {
      userId,
      name: name?.trim() || "Developer Key",
      tokenHash,
      maskedKey,
      scopes: validatedScopes,
      expiresAt,
    },
    include: {
      user: true,
    },
  });

  // Persist Audit Record for API Key Generation
  await prisma.auditLog.create({
    data: {
      userId,
      action: "API_KEY_CREATE",
      targetResource: `developer_api_key:${apiKey.id}`,
      details: {
        name: apiKey.name,
        scopes: apiKey.scopes,
        maskedKey,
        expiresAt,
      },
      result: "SUCCESS",
    },
  }).catch(() => {});

  return {
    rawSecret,
    apiKey,
  };
}

export async function verifyApiKey(token: string) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const tokenHash = hashApiKey(token.trim());

  const apiKeyRecord = await prisma.developerApiKey.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!apiKeyRecord) {
    return null;
  }

  // 1. Check if revoked
  if (apiKeyRecord.revokedAt) {
    return { error: "REVOKED", apiKey: apiKeyRecord };
  }

  // 2. Check if expired
  if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) <= new Date()) {
    return { error: "EXPIRED", apiKey: apiKeyRecord };
  }

  // 3. Check if owner user is suspended
  if (apiKeyRecord.user && apiKeyRecord.user.status === "SUSPENDED") {
    return { error: "SUSPENDED", apiKey: apiKeyRecord, user: apiKeyRecord.user };
  }

  // Update lastUsedAt asynchronously without blocking request execution
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

  const now = new Date();

  return keys.map((k) => {
    const isRevoked = Boolean(k.revokedAt);
    const isExpired = Boolean(k.expiresAt && new Date(k.expiresAt) <= now);
    const masked = k.maskedKey || "fsk_****";

    return {
      id: k.id,
      name: k.name,
      maskedKey: masked,
      scopes: k.scopes,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      revokedAt: k.revokedAt,
      isRevoked,
      isExpired,
      status: isRevoked ? "REVOKED" : isExpired ? "EXPIRED" : "ACTIVE",
    };
  });
}

export async function revokeApiKey(userId: string, keyId: string) {
  const existing = await prisma.developerApiKey.findFirst({
    where: { id: keyId, userId },
  });

  if (!existing || existing.revokedAt) {
    return false;
  }

  await prisma.developerApiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  // Persist Audit Record for API Key Revocation
  await prisma.auditLog.create({
    data: {
      userId,
      action: "API_KEY_REVOKE",
      targetResource: `developer_api_key:${keyId}`,
      details: {
        name: existing.name,
        maskedKey: existing.maskedKey,
      },
      result: "SUCCESS",
    },
  }).catch(() => {});

  return true;
}

export async function rotateApiKey(
  userId: string,
  keyId: string,
  expiresInDays?: number | null
) {
  const existing = await prisma.developerApiKey.findFirst({
    where: { id: keyId, userId },
  });

  if (!existing) {
    return null;
  }

  // 1. Revoke the existing key immediately
  if (!existing.revokedAt) {
    await prisma.developerApiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
  }

  // 2. Generate new key retaining previous name and scopes
  const rawBytes = crypto.randomBytes(24).toString("hex");
  const rawSecret = `fsk_${rawBytes}`;
  const tokenHash = hashApiKey(rawSecret);
  const maskedKey = maskApiKey(rawSecret);

  let expiresAt: Date | null = null;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  } else if (existing.expiresAt && !expiresInDays) {
    // Preserve remaining duration if not specified
    expiresAt = existing.expiresAt;
  }

  const newKey = await prisma.developerApiKey.create({
    data: {
      userId,
      name: `${existing.name} (Rotated)`,
      tokenHash,
      maskedKey,
      scopes: existing.scopes as any,
      expiresAt,
    },
    include: {
      user: true,
    },
  });

  // Persist Audit Record for API Key Rotation
  await prisma.auditLog.create({
    data: {
      userId,
      action: "API_KEY_ROTATE",
      targetResource: `developer_api_key:${newKey.id}`,
      details: {
        oldKeyId: keyId,
        newKeyId: newKey.id,
        name: newKey.name,
        maskedKey,
      },
      result: "SUCCESS",
    },
  }).catch(() => {});

  return {
    rawSecret,
    newKey,
    oldKeyId: keyId,
  };
}
