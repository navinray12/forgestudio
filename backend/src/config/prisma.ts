import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

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
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "lifecycleStatus" VARCHAR(50) DEFAULT 'ACTIVE';`);
  } catch (e: any) {
    console.log("Migration check workspaces lifecycleStatus:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "documentVersion" INTEGER DEFAULT 1;`);
  } catch (e: any) {
    console.log("Migration check websites documentVersion:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "eventId" VARCHAR(255) UNIQUE NOT NULL,
        "provider" VARCHAR(50) NOT NULL DEFAULT 'stripe',
        "eventType" VARCHAR(100) NOT NULL,
        "checkoutSessionId" VARCHAR(255),
        "userId" UUID,
        "amount" DOUBLE PRECISION,
        "currency" VARCHAR(10),
        "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS "idx_payment_webhook_events_event_id" ON "payment_webhook_events" ("eventId");
      CREATE INDEX IF NOT EXISTS "idx_payment_webhook_events_session_id" ON "payment_webhook_events" ("checkoutSessionId");
    `);
  } catch (e: any) {
    console.log("Migration check payment_webhook_events:", e?.message || e);
  }
  try {
    const colCheck: any[] = await prisma.$queryRaw`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_subscriptions' AND column_name = 'updatedAt'
      LIMIT 1;
    `;
    if (colCheck && colCheck.length > 0 && colCheck[0].data_type !== "timestamp with time zone") {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "user_subscriptions" 
        ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt" AT TIME ZONE 'UTC',
        ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt" AT TIME ZONE 'UTC';
      `);
    }
  } catch (e: any) {
    console.log("Migration check user_subscriptions timestamptz:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user_subscriptions" 
      ADD COLUMN IF NOT EXISTS "stripeCustomerId" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" VARCHAR(255);

      CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_subscriptions_stripe_sub_id" 
      ON "user_subscriptions" ("stripeSubscriptionId") 
      WHERE "stripeSubscriptionId" IS NOT NULL;

      CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_stripe_customer_id" 
      ON "user_subscriptions" ("stripeCustomerId") 
      WHERE "stripeCustomerId" IS NOT NULL;
    `);
  } catch (e: any) {
    console.log("Migration check user_subscriptions stripe IDs:", e?.message || e);
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
