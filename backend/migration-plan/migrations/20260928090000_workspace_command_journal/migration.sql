-- Additive command journal for the organization-scoped workspace API.
-- No legacy data, ownership, or migration-history record is rewritten here.
CREATE TABLE "workspace_command_journal" (
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "actorId" UUID NOT NULL,
  "operation" VARCHAR(100) NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("organizationId", "actorId", "operation", "idempotencyKey")
);
CREATE INDEX "workspace_command_journal_created_idx" ON "workspace_command_journal" ("createdAt");
ALTER TABLE "workspace_command_journal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_command_journal" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_command_tenant_boundary" ON "workspace_command_journal"
  USING ("organizationId" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = nullif(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE "workspace_outbox" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "actorId" UUID NOT NULL,
  "operation" VARCHAR(100) NOT NULL,
  "resourceId" UUID NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1 CHECK ("schemaVersion" = 1),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchedAt" TIMESTAMPTZ
);
CREATE INDEX "workspace_outbox_pending_idx" ON "workspace_outbox" ("createdAt") WHERE "dispatchedAt" IS NULL;
ALTER TABLE "workspace_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_outbox" FORCE ROW LEVEL SECURITY;
CREATE POLICY "workspace_outbox_tenant_boundary" ON "workspace_outbox"
  USING ("organizationId" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("organizationId" = nullif(current_setting('app.tenant_id', true), '')::uuid);
