-- Forge platform foundations: organization billing, durable execution, governed files,
-- connector credential references and control-plane read models.
-- Expand-only. Apply with the migration identity after backup/drift review.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS tenant_backfill_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "resourceType" VARCHAR(80) NOT NULL,
  "resourceId" UUID NOT NULL,
  reason VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("resourceType","resourceId")
);

-- Deterministic legacy ownership backfill only. Ambiguous rows are recorded, never guessed.
WITH one_owned_org AS (
  SELECT "ownerId", (array_agg(id ORDER BY id))[1] AS id
    FROM organizations
   GROUP BY "ownerId"
  HAVING count(*) = 1
)
UPDATE workspaces w
   SET "organizationId" = o.id
  FROM one_owned_org o
 WHERE w."organizationId" IS NULL AND w."ownerId" = o."ownerId";

INSERT INTO tenant_backfill_conflicts ("resourceType","resourceId",reason)
SELECT 'workspace', id, 'organizationId cannot be derived uniquely from legacy ownership'
  FROM workspaces WHERE "organizationId" IS NULL
ON CONFLICT DO NOTHING;

UPDATE websites s
   SET "organizationId" = w."organizationId"
  FROM workspaces w
 WHERE s."organizationId" IS NULL
   AND s."workspaceId" = w.id
   AND w."organizationId" IS NOT NULL;

INSERT INTO tenant_backfill_conflicts ("resourceType","resourceId",reason)
SELECT 'website', id, 'organizationId is unresolved; assign explicitly before forced RLS migration'
  FROM websites WHERE "organizationId" IS NULL
ON CONFLICT DO NOTHING;

-- Add explicit scope and immutable-object state to legacy media records.
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "organizationId" UUID;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "workspaceId" UUID;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "objectKey" VARCHAR(1024);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "objectVersion" VARCHAR(255);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "sha256" CHAR(64);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "storageState" VARCHAR(32) NOT NULL DEFAULT 'LEGACY';
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "scanStatus" VARCHAR(32) NOT NULL DEFAULT 'NOT_SCANNED';
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ;

UPDATE media_assets m
   SET "organizationId" = w."organizationId",
       "workspaceId" = w."workspaceId"
  FROM websites w
 WHERE m."websiteId" = w.id
   AND m."organizationId" IS NULL
   AND w."organizationId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS media_assets_org_idx ON media_assets ("organizationId","createdAt");
CREATE INDEX IF NOT EXISTS media_assets_workspace_idx ON media_assets ("workspaceId","createdAt");

INSERT INTO tenant_backfill_conflicts ("resourceType","resourceId",reason)
SELECT 'media_asset', id, 'organizationId unresolved for legacy media'
  FROM media_assets WHERE "organizationId" IS NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS organization_billing_accounts (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE RESTRICT,
  provider VARCHAR(40) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "providerCustomerId" VARCHAR(255),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_subscriptions_v2 (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE RESTRICT,
  "planKey" VARCHAR(100) NOT NULL,
  provider VARCHAR(40) NOT NULL,
  "providerSubscriptionId" VARCHAR(255),
  status VARCHAR(40) NOT NULL,
  "seatLimit" INTEGER NOT NULL DEFAULT 1 CHECK ("seatLimit" > 0),
  quotas JSONB NOT NULL DEFAULT '{}'::jsonb,
  "currentPeriodStart" TIMESTAMPTZ,
  "currentPeriodEnd" TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_seat_assignments (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RELEASED')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organizationId","userId")
);

CREATE TABLE IF NOT EXISTS billing_checkout_intents (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  "actorId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "planKey" VARCHAR(100) NOT NULL,
  status VARCHAR(32) NOT NULL,
  "providerCheckoutId" VARCHAR(255),
  "checkoutUrl" VARCHAR(2048),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organizationId","actorId","idempotencyKey")
);

CREATE TABLE IF NOT EXISTS billing_event_inbox (
  id UUID PRIMARY KEY,
  provider VARCHAR(40) NOT NULL,
  "providerEventId" VARCHAR(255) NOT NULL,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  "eventType" VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL,
  "lastError" VARCHAR(2000),
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider,"providerEventId")
);

CREATE TABLE IF NOT EXISTS organization_invoices (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  provider VARCHAR(40) NOT NULL,
  "providerInvoiceId" VARCHAR(255) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(40) NOT NULL,
  "issuedAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider,"providerInvoiceId")
);

CREATE TABLE IF NOT EXISTS usage_reservations (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  "actorId" UUID REFERENCES users(id) ON DELETE SET NULL,
  resource VARCHAR(100) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  state VARCHAR(20) NOT NULL CHECK (state IN ('RESERVED','CONSUMED','RELEASED','EXPIRED')),
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "settledAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organizationId","idempotencyKey")
);
CREATE INDEX IF NOT EXISTS usage_reservations_active_idx ON usage_reservations ("organizationId",resource,state);

CREATE TABLE IF NOT EXISTS platform_outbox (
  id UUID PRIMARY KEY,
  "organizationId" UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  "actorId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "eventType" VARCHAR(160) NOT NULL,
  "aggregateType" VARCHAR(100) NOT NULL,
  "aggregateId" VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  "jobType" VARCHAR(120),
  attempts INTEGER NOT NULL DEFAULT 0,
  "dispatchedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS platform_outbox_pending_idx ON platform_outbox ("createdAt") WHERE "dispatchedAt" IS NULL;

CREATE TABLE IF NOT EXISTS platform_jobs (
  id UUID PRIMARY KEY,
  "organizationId" UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  "outboxId" UUID UNIQUE REFERENCES platform_outbox(id) ON DELETE SET NULL,
  "jobType" VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(24) NOT NULL CHECK (status IN ('PENDING','RUNNING','RETRYING','SUCCEEDED','FAILED','DEAD_LETTERED','CANCELLED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5 CHECK ("maxAttempts" BETWEEN 1 AND 25),
  "availableAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" VARCHAR(255),
  "leaseExpiresAt" TIMESTAMPTZ,
  "lastError" VARCHAR(4000),
  "completedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS platform_jobs_ready_idx ON platform_jobs (status,"availableAt");
CREATE INDEX IF NOT EXISTS platform_jobs_tenant_idx ON platform_jobs ("organizationId","createdAt");

CREATE TABLE IF NOT EXISTS platform_dead_letters (
  id UUID PRIMARY KEY,
  "organizationId" UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  "jobId" UUID NOT NULL UNIQUE REFERENCES platform_jobs(id) ON DELETE RESTRICT,
  "jobType" VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL,
  error VARCHAR(4000) NOT NULL,
  attempts INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "replayedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS file_objects (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  "workspaceId" UUID REFERENCES workspaces(id) ON DELETE RESTRICT,
  "websiteId" UUID REFERENCES websites(id) ON DELETE RESTRICT,
  "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider VARCHAR(40) NOT NULL,
  bucket VARCHAR(255) NOT NULL,
  "objectKey" VARCHAR(1024) NOT NULL,
  "objectVersion" VARCHAR(255),
  "originalName" VARCHAR(255) NOT NULL,
  "declaredMimeType" VARCHAR(120),
  "detectedMimeType" VARCHAR(120),
  "sizeBytes" BIGINT,
  sha256 CHAR(64),
  state VARCHAR(32) NOT NULL CHECK (state IN ('AUTHORIZED','UPLOADED','SCANNING','APPROVED','REJECTED','DELETED')),
  "scanStatus" VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK ("scanStatus" IN ('PENDING','CLEAN','INFECTED','ERROR','NOT_REQUIRED')),
  "scanDetail" VARCHAR(1000),
  "approvedAt" TIMESTAMPTZ,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider,bucket,"objectKey")
);
CREATE INDEX IF NOT EXISTS file_objects_scope_idx ON file_objects ("organizationId","workspaceId","createdAt");

CREATE TABLE IF NOT EXISTS connector_credentials (
  id UUID PRIMARY KEY,
  "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  "workspaceId" UUID REFERENCES workspaces(id) ON DELETE RESTRICT,
  "websiteId" UUID REFERENCES websites(id) ON DELETE RESTRICT,
  provider VARCHAR(80) NOT NULL,
  "secretRef" VARCHAR(500) NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DEGRADED','REVOKED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  "lastVerifiedAt" TIMESTAMPTZ,
  "revokedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS connector_credentials_scope_idx ON connector_credentials ("organizationId","workspaceId","websiteId");

CREATE TABLE IF NOT EXISTS platform_capabilities (
  id VARCHAR(120) PRIMARY KEY,
  owner VARCHAR(120) NOT NULL,
  criticality VARCHAR(24) NOT NULL CHECK (criticality IN ('LOCKED','REQUIRED','OPTIONAL')),
  "changeClass" CHAR(1) NOT NULL CHECK ("changeClass" IN ('A','B','C','D','E','L')),
  "minTier" VARCHAR(4) NOT NULL,
  provider VARCHAR(80),
  "desiredState" VARCHAR(32) NOT NULL,
  "observedState" VARCHAR(32) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_config_snapshots (
  version BIGSERIAL PRIMARY KEY,
  environment VARCHAR(40) NOT NULL,
  digest CHAR(64) NOT NULL UNIQUE,
  body JSONB NOT NULL,
  "createdBy" UUID REFERENCES users(id) ON DELETE SET NULL,
  "activatedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_change_requests (
  id UUID PRIMARY KEY,
  class CHAR(1) NOT NULL CHECK (class IN ('A','B','C','D','E')),
  scope JSONB NOT NULL,
  "oldState" JSONB,
  "desiredState" JSONB NOT NULL,
  status VARCHAR(40) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  "planDigest" CHAR(64),
  requester UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approver UUID REFERENCES users(id) ON DELETE RESTRICT,
  "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (approver IS NULL OR approver <> requester)
);

-- Tenant tables use FORCE RLS immediately. Service workers require an explicit service role context.
DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organization_billing_accounts','organization_subscriptions_v2','organization_seat_assignments',
    'billing_checkout_intents','organization_invoices','usage_reservations','file_objects','connector_credentials'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS forge_tenant_boundary ON %I', t);
    EXECUTE format(
      'CREATE POLICY forge_tenant_boundary ON %I USING ("organizationId" = nullif(current_setting(''app.tenant_id'',true),'''')::uuid) WITH CHECK ("organizationId" = nullif(current_setting(''app.tenant_id'',true),'''')::uuid)', t
    );
  END LOOP;
END $$;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['platform_outbox','platform_jobs','platform_dead_letters'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS forge_job_boundary ON %I', t);
    EXECUTE format(
      'CREATE POLICY forge_job_boundary ON %I USING (current_setting(''app.service_role'',true) IN (''dispatcher'',''worker'',''billing-webhook'',''file-scanner'') OR "organizationId" = nullif(current_setting(''app.tenant_id'',true),'''')::uuid) WITH CHECK (current_setting(''app.service_role'',true) IN (''dispatcher'',''worker'',''billing-webhook'',''file-scanner'') OR "organizationId" = nullif(current_setting(''app.tenant_id'',true),'''')::uuid)', t
    );
  END LOOP;
END $$;

COMMIT;
