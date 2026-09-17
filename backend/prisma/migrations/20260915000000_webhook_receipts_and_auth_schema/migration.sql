-- Previously executed on application import; now a controlled migration.
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_SIGNUP';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_LOGIN';
DO $$ BEGIN
  CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE otp_verifications ADD COLUMN IF NOT EXISTS channel "OtpChannel" DEFAULT 'EMAIL';

CREATE TABLE "wordpress_webhook_receipts" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "eventId" VARCHAR(128) NOT NULL,
    "event" VARCHAR(40) NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "wordpress_webhook_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wordpress_connections_id_websiteId_key" ON "wordpress_connections"("id", "websiteId");

CREATE INDEX "wordpress_webhook_receipts_status_nextAttemptAt_idx" ON "wordpress_webhook_receipts"("status", "nextAttemptAt");

CREATE UNIQUE INDEX "wordpress_webhook_receipts_connectionId_eventId_key" ON "wordpress_webhook_receipts"("connectionId", "eventId");

ALTER TABLE "wordpress_webhook_receipts" ADD CONSTRAINT "wordpress_webhook_receipts_connectionId_websiteId_fkey" FOREIGN KEY ("connectionId", "websiteId") REFERENCES "wordpress_connections"("id", "websiteId") ON DELETE CASCADE ON UPDATE CASCADE;
