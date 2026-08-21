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