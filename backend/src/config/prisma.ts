import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ||
  (process.env.NODE_ENV === "test" ? process.env.TEST_DATABASE_URL : undefined);

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required.");
}

export const pgPool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pgPool);

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

// Ensure PostgreSQL enum types and columns are updated for Email & WhatsApp OTP if needed
export async function ensureDbSchema() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_SIGNUP';`);
  } catch {
    // Value may already exist
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_LOGIN';`);
  } catch {
    // Value may already exist
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "otp_verifications" ADD COLUMN IF NOT EXISTS "email" TEXT;`);
  } catch {
    // Column may already exist
  }
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OtpChannel') THEN
          CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'WHATSAPP');
        END IF;
      END $$;
    `);
  } catch {
    // Type may already exist
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "otp_verifications" ADD COLUMN IF NOT EXISTS "channel" "OtpChannel" DEFAULT 'EMAIL';`);
  } catch {
    // Column may already exist
  }
}

export async function initializeDatabaseBootstrap() {
  await ensureDbSchema();
}

export default prisma;
