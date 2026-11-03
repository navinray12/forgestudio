-- Additive repair for installations whose platform migration history exists
-- without the corresponding billing tables. Never fabricates subscriptions or invoices.
BEGIN;
SET LOCAL lock_timeout = '5s';
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


DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organization_billing_accounts','organization_subscriptions_v2','organization_seat_assignments',
    'billing_checkout_intents','organization_invoices','usage_reservations'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS forge_tenant_boundary ON %I', t);
    EXECUTE format(
      'CREATE POLICY forge_tenant_boundary ON %I USING ("organizationId" = nullif(current_setting(''app.tenant_id'',true),'''')::uuid) WITH CHECK ("organizationId" = nullif(current_setting(''app.tenant_id'',true),'''')::uuid)', t
    );
  END LOOP;
END $$;
COMMIT;
