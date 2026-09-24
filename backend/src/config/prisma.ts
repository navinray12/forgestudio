import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
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

// Ensure PostgreSQL enum types and columns are updated for Email & WhatsApp OTP
async function ensureDbSchema() {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260819115056_init_auth' AND "finished_at" IS NULL;`);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260819115056_init_auth') THEN
          UPDATE "_prisma_migrations"
          SET "finished_at" = NOW(), "logs" = NULL, "rolled_back_at" = NULL, "applied_steps_count" = 1
          WHERE "migration_name" = '20260819115056_init_auth';
        ELSE
          INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
          VALUES (gen_random_uuid()::text, 'cef7f6b47c1bfe7274946baf9420e6e99d227a53b936fcba030b307c111156a0', NOW(), '20260819115056_init_auth', NULL, NULL, NOW(), 1);
        END IF;
      END $$;
    `);
  } catch (e: any) {
    console.log("Migration recovery check error:", e?.message || e);
  }

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

ensureDbSchema().catch((err) => {
  console.error("Failed to run schema auto-migration:", err);
});