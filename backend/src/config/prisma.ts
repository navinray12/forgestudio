export * from "../platform/database/prisma.js";
import { prisma } from "../platform/database/prisma.js";
import argon2 from "argon2";

async function ensureAdminAccounts() {
  try {
    const adminPassHash = await argon2.hash("Admin123!", { type: argon2.argon2id });
    const superAdminPassHash = await argon2.hash("SuperAdmin123!", { type: argon2.argon2id });

    // 1. Admin
    await prisma.user.upsert({
      where: { email: "admin@forgestudio.com" },
      update: {
        passwordHash: adminPassHash,
        role: "ADMIN",
        emailVerified: true,
        status: "ACTIVE",
      },
      create: {
        fullName: "ForgeStudio Admin",
        email: "admin@forgestudio.com",
        passwordHash: adminPassHash,
        role: "ADMIN",
        emailVerified: true,
        status: "ACTIVE",
        verificationMethod: "EMAIL",
      },
    });

    // 2. SuperAdmin
    await prisma.user.upsert({
      where: { email: "superadmin@forgestudio.com" },
      update: {
        passwordHash: superAdminPassHash,
        role: "SUPER_ADMIN",
        emailVerified: true,
        status: "ACTIVE",
      },
      create: {
        fullName: "ForgeStudio Super Admin",
        email: "superadmin@forgestudio.com",
        passwordHash: superAdminPassHash,
        role: "SUPER_ADMIN",
        emailVerified: true,
        status: "ACTIVE",
        verificationMethod: "EMAIL",
      },
    });
  } catch (err: any) {
    console.log("[ForgeStudio] Admin seeding check:", err?.message || err);
  }
}

ensureAdminAccounts().catch((err) => {
  console.error("Admin seeding check failed:", err);
});

export default prisma;
