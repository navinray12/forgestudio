import "dotenv/config";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Resolves the exact connection string Prisma and pgPool will use.
 * In test mode (NODE_ENV === 'test') or when TEST_DATABASE_URL is set,
 * TEST_DATABASE_URL is strictly prioritized.
 */
export function resolveActiveDatabaseUrl(): string {
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.TEST_DATABASE_URL);
  const selected = (isTest && process.env.TEST_DATABASE_URL)
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

  if (!selected) {
    throw new Error("DATABASE_URL or TEST_DATABASE_URL environment variable is required.");
  }
  return selected;
}

const connectionString = resolveActiveDatabaseUrl();
// Synchronize environment so child processes or external drivers use identical connection
process.env.DATABASE_URL = connectionString;

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

/**
 * Validates that required database schema tables and columns are present.
 * Production fails safely by throwing if migrations have not been applied.
 */
export async function validateDatabaseSchema(): Promise<void> {
  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT (
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AND
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'websites') AND
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'otp_verifications') AND
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'otp_verifications' AND column_name = 'channel')
    ) AS "exists";
  `;

  if (!result || !result[0]?.exists) {
    throw new Error(
      "Database schema validation failed: core tables or columns are missing. Please run 'prisma migrate deploy'."
    );
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
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedBy" UUID;
    `);
  } catch (e: any) {
    console.log("Migration check users suspension columns:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderationStatus" VARCHAR(50) DEFAULT 'ACTIVE';
      ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
      ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMPTZ(6);
      ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderatedBy" UUID;
      ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "version" INTEGER DEFAULT 1;
    `);
  } catch (e: any) {
    console.log("Migration check websites moderation columns:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actorRole" VARCHAR(50);
      ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "result" VARCHAR(20) DEFAULT 'SUCCESS';
      ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "reason" TEXT;
      ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "correlationId" VARCHAR(100);
    `);
  } catch (e: any) {
    console.log("Migration check audit_logs columns:", e?.message || e);
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "maskedKey" TEXT;
      ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ(6);
    `);
  } catch (e: any) {
    console.log("Migration check developer_api_keys columns:", e?.message || e);
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

export async function initializeDatabaseBootstrap(): Promise<void> {
  await validateDatabaseSchema();
}

export default prisma;
