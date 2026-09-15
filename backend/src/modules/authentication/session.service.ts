/**
 * @file Authentication: business operations and coordination with persistence or external services. File responsibility: session service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";
import {
  generateSessionToken,
  hashSessionToken,
} from "./session.js";

import {
  createSession,
} from "./session.repository.js";

const SESSION_DURATION_DAYS = 30;

/**
 * Create User Session.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
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

/**
 * Create Support Session.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 * @param durationMinutes Duration Minutes supplied to this operation (type: number). Defaults to 120.
 */
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

/**
 * Revoke Support Sessions.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
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