-- Additive only. Does not alter unmanaged workspace_invitations or migration history.
-- Apply only after reconciling the deployment database with this checkout's baseline.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- IF NOT EXISTS must not hide an incompatible pre-existing lifecycle column.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'workspaces' AND column_name = 'lifecycleStatus'
      AND (udt_name <> 'varchar' OR character_maximum_length IS DISTINCT FROM 20 OR is_nullable <> 'NO')) THEN
    RAISE EXCEPTION 'Incompatible workspaces.lifecycleStatus; review schema before applying Phase 2';
  END IF;
END $$;
ALTER TABLE "workspaces" ADD COLUMN "membersVersion" INTEGER NOT NULL DEFAULT 1;
-- Honor existing archived workspaces; preserve the column and values if already present.
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "lifecycleStatus" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
CREATE TABLE "workspace_email_invitations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "invitedBy" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "recipientUserId" UUID REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "invitedEmail" VARCHAR(254) NOT NULL,
  "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('ADMIN','MEMBER')),
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','ACCEPTED','REVOKED')),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "tokenHash" CHAR(64) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "acceptedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createRequestKey" UUID NOT NULL,
  "lastCommandKey" UUID,
  "lastCommandAction" VARCHAR(20),
  "emailStatus" VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK ("emailStatus" IN ('QUEUED','SENT','FAILED')),
  "emailQueuedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "emailSentAt" TIMESTAMPTZ,
  "emailAttempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "leaseUntil" TIMESTAMPTZ,
  "leaseToken" UUID,
  CONSTRAINT "workspace_email_invitations_workspaceId_createRequestKey_key" UNIQUE ("workspaceId","createRequestKey")
);
CREATE UNIQUE INDEX "workspace_email_invitation_pending_email" ON "workspace_email_invitations" ("workspaceId", "invitedEmail") WHERE "status"='PENDING';
CREATE INDEX "workspace_email_invitations_workspaceId_status_idx" ON "workspace_email_invitations" ("workspaceId","status");
CREATE INDEX "workspace_email_invitations_emailStatus_nextAttemptAt_idx" ON "workspace_email_invitations" ("emailStatus","nextAttemptAt");

COMMIT;
