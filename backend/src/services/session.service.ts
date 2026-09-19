import { prisma } from "../config/prisma.js";
import {
  generateSessionToken,
  hashSessionToken,
} from "../utils/session.js";

import {
  createSession,
} from "../repositories/session.repository.js";

const SESSION_DURATION_DAYS = 30;

export async function createUserSession(
  userId: string
) {
  const rawToken = generateSessionToken();

  const tokenHash = hashSessionToken(rawToken);

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + SESSION_DURATION_DAYS
  );

  await createSession({
    userId,
    tokenHash,
    expiresAt,
  });

  return {
    token: rawToken,
    expiresAt,
  };
}

export async function createSupportSession(
  userId: string,
  durationMinutes: number = 120
) {
  const rawToken = `supp_${generateSessionToken()}`;
  const tokenHash = hashSessionToken(rawToken);

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  await createSession({
    userId,
    tokenHash,
    expiresAt,
  });

  return {
    supportToken: rawToken,
    expiresAt,
  };
}

export async function revokeSupportSessions(userId: string) {
  return prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}