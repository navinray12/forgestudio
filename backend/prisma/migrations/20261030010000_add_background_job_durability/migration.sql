-- AlterTable: Add worker lease, fencing, idempotency, and tenancy fields to background_jobs
ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "workerId" VARCHAR(100);
ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "heartbeatAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "fencingToken" INT NOT NULL DEFAULT 0;
ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(255);
ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "correlationId" VARCHAR(100);
ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "tenantId" UUID;
ALTER TABLE "background_jobs" ADD COLUMN IF NOT EXISTS "websiteId" UUID;

-- Indexes for high-performance atomic queue claiming, lease expiry, and idempotency
CREATE UNIQUE INDEX IF NOT EXISTS "idx_background_jobs_idempotency" ON "background_jobs" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_background_jobs_claim" ON "background_jobs" ("status", "runAt", "leaseExpiresAt");
CREATE INDEX IF NOT EXISTS "idx_background_jobs_worker" ON "background_jobs" ("workerId");
CREATE INDEX IF NOT EXISTS "idx_background_jobs_website" ON "background_jobs" ("websiteId");
