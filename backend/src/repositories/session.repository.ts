import { prisma } from "../config/database.js";

interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

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