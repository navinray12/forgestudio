/**
 * @file Authentication: database reads and writes. File responsibility: session repository.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/database.js";

interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Create Session.
 * @param input Input supplied to this operation (type: CreateSessionInput).
 */
export async function createSession(
  input: CreateSessionInput
) {
  return prisma.session.create({
    data: {
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    },
  });
}