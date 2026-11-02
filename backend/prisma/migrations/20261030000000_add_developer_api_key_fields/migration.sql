-- AlterTable DeveloperApiKey: add maskedKey and expiresAt
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "maskedKey" VARCHAR(100);
ALTER TABLE "developer_api_keys" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE;

-- CreateTable api_rate_limits for shared atomic distributed rate limiting across backend instances
CREATE TABLE IF NOT EXISTS "api_rate_limits" (
  "key" VARCHAR(255) PRIMARY KEY,
  "count" INT NOT NULL DEFAULT 1,
  "reset_at" TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_api_rate_limits_reset" ON "api_rate_limits" ("reset_at");
