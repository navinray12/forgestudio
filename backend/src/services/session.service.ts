import {dashboardSecurity} from './dashboard-security.js';
import {AppError} from '../utils/app-error.js';
import { prisma } from "../config/prisma.js";
import {
  generateSessionToken,
  hashSessionToken,
} from "../utils/session.js";

import {
  createSession,
} from "../repositories/session.repository.js";

export async function createUserSession(
  userId: string, userAgent = ''
) {
  return dashboardSecurity.issueSession(userId, userAgent);
}

export async function createSupportSession(
  userId: string,
  durationMinutes: number = 120
) {
  if(await dashboardSecurity.needsFactor(userId))throw new AppError('Temporary support access is unavailable while authenticator 2FA is enabled.',403,'TWO_FACTOR_REQUIRED');
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