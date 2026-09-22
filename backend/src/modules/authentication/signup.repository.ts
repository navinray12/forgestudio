/**
 * @file Authentication: database reads and writes. File responsibility: signup repository.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/database.js";
import type { VerificationMethod } from "../../generated/prisma/index.js";


/**
 * Find User By Email Or Phone.
 * @param email Email address used by this operation. Optional; callers may omit it.
 * @param phone Phone supplied to this operation (type: string). Optional; callers may omit it.
 */
export async function findUserByEmailOrPhone(
  email?: string,
  phone?: string
) {
  const conditions = [];
  if (email) conditions.push({ email });
  if (phone) conditions.push({ phone });

  if (conditions.length === 0) return null;

  return prisma.user.findFirst({
    where: {
      OR: conditions,
    },
  });
}

/**
 * Create New User.
 * @param data Data supplied to this operation (type: { fullName: string; email?: string; phone?: string; passwordHash: string; verificationMethod: VerificationMethod; }).
 */
export async function createNewUser(data: {
  fullName: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  verificationMethod: VerificationMethod;
}) {
  return prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email || null,
      phone: data.phone || null,
      passwordHash: data.passwordHash,
      verificationMethod: data.verificationMethod,
      emailVerified: false,
      phoneVerified: false,
      status: "ACTIVE",
      role: "USER",
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: true,
    },
  });
}
