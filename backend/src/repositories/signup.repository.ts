import { prisma } from "../config/database.js";
import type { VerificationMethod } from "../generated/prisma/client.js";

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
