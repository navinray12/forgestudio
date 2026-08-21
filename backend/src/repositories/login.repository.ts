import { prisma } from "../config/database.js";

export async function findUserByIdentifier(
  identifier: string
) {
  return prisma.user.findFirst({
    where: {
      OR: [
        {
          email: identifier,
        },
        {
          phone: identifier,
        },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      passwordHash: true,
      role: true,
      status: true,
      emailVerified: true,
      phoneVerified: true,
      verificationMethod: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}