-- AlterTable User: add suspension tracking fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedBy" UUID;

-- AlterTable Website: add moderation tracking fields
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderationStatus" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMPTZ(6);
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "moderatedBy" UUID;

-- AlterTable AuditLog: add actor role, result, reason, and correlationId
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actorRole" VARCHAR(50);
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "result" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "correlationId" VARCHAR(100);
