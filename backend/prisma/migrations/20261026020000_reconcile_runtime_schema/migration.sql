-- Runtime DDL has been removed. Persist the remaining schema that was formerly
-- created or extended opportunistically by application requests.
CREATE TABLE IF NOT EXISTS "developer_api_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "scopes" JSONB NOT NULL DEFAULT '["websites:read"]'::jsonb,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "developer_api_keys_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "developer_api_keys_tokenHash_key"
  ON "developer_api_keys"("tokenHash");

ALTER TABLE "wordpress_connections"
  ADD COLUMN IF NOT EXISTS "pluginVersion" VARCHAR(50) DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS "apiVersion" VARCHAR(50) DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS "failureReason" VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMPTZ;

ALTER TABLE "wordpress_connections"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';
