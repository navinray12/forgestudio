/**
 * @file Authentication: database reads and writes. File responsibility: login repository.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/database.js";

/**
 * Find User By Identifier.
 * @param identifier Identifier supplied to this operation (type: string).
 */
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