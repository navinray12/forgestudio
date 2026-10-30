import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

async function main() {
  console.log("Applying forward-only additive schema alterations for Phase 14 (Background Job Durability & Worker Claims)...");

  // 1. Additive columns for background_jobs
  await prisma.$executeRawUnsafe(`ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "workerId" VARCHAR(100);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP WITH TIME ZONE;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP WITH TIME ZONE;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "heartbeatAt" TIMESTAMP WITH TIME ZONE;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "fencingToken" INT NOT NULL DEFAULT 0;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(255);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "correlationId" VARCHAR(100);`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "tenantId" UUID;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "websiteId" UUID;`);

  // 2. Indexes for worker claiming and lease expiry
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_background_jobs_idempotency" ON "background_jobs" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_background_jobs_claim" ON "background_jobs" ("status", "runAt", "leaseExpiresAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_background_jobs_worker" ON "background_jobs" ("workerId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_background_jobs_website" ON "background_jobs" ("websiteId");`);

  console.log("Phase 14 background job durability migration applied successfully!");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
