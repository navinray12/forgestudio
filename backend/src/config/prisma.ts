import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Ensure PostgreSQL enum types and columns are updated for Email & WhatsApp OTP
async function ensureDbSchema() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_SIGNUP';`);
  } catch (e: any) {
    console.log("Migration check EMAIL_SIGNUP:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_LOGIN';`);
  } catch (e: any) {
    console.log("Migration check EMAIL_LOGIN:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "otp_verifications" ADD COLUMN IF NOT EXISTS "email" TEXT;`);
  } catch (e: any) {
    console.log("Migration check email column:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OtpChannel') THEN
          CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'WHATSAPP');
        END IF;
      END $$;
    `);
  } catch (e: any) {
    console.log("Migration check OtpChannel enum:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "otp_verifications" ADD COLUMN IF NOT EXISTS "channel" "OtpChannel" DEFAULT 'EMAIL';`);
  } catch (e: any) {
    console.log("Migration check channel column:", e?.message || e);
  }
}

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

ensureDbSchema().catch((err) => {
  console.error("Failed to run schema auto-migration:", err);
});

ensureAdminAccounts().catch((err) => {
  console.error("Admin seeding check failed:", err);
});

export default prisma;
