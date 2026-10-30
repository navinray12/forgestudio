-- Expand existing in-app invitations; no membership is created by this migration.
-- Apply with the migration identity before deploying API/worker; never use db push.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE workspace_invitations
  ALTER COLUMN "recipientUserId" DROP NOT NULL,
  ADD COLUMN "invitedEmail" VARCHAR(254),
  ADD COLUMN "tokenHash" CHAR(64),
  ADD COLUMN "emailStatus" VARCHAR(20) NOT NULL DEFAULT 'NONE',
  ADD COLUMN "emailQueuedAt" TIMESTAMPTZ,
  ADD COLUMN "emailSentAt" TIMESTAMPTZ;
UPDATE workspace_invitations i SET "invitedEmail" = lower(btrim(u.email))
FROM users u WHERE u.id = i."recipientUserId" AND u.email IS NOT NULL;
-- Stop rather than silently revoke invitations if historical case variants collide.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM workspace_invitations WHERE status='PENDING' AND "invitedEmail" IS NOT NULL
    GROUP BY "workspaceId", "invitedEmail" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Resolve duplicate pending workspace invitation emails before migration';
  END IF;
END $$;
ALTER TABLE workspace_invitations
  ADD CONSTRAINT workspace_invitation_recipient_check CHECK ("recipientUserId" IS NOT NULL OR "invitedEmail" IS NOT NULL),
  ADD CONSTRAINT workspace_invitation_email_check CHECK ("invitedEmail" IS NULL OR
    ("invitedEmail"=lower(btrim("invitedEmail")) AND length("invitedEmail") BETWEEN 3 AND 254)),
  ADD CONSTRAINT workspace_invitation_token_check CHECK ("tokenHash" IS NULL OR
    ("invitedEmail" IS NOT NULL AND "tokenHash" ~ '^[a-f0-9]{64}$')),
  ADD CONSTRAINT workspace_invitation_delivery_check CHECK ("emailStatus" IN ('NONE','QUEUED','SENT','FAILED'));
CREATE UNIQUE INDEX "workspace_invitations_tokenHash_key" ON workspace_invitations("tokenHash");
CREATE UNIQUE INDEX workspace_invitation_pending_email ON workspace_invitations("workspaceId","invitedEmail")
  WHERE status='PENDING' AND "invitedEmail" IS NOT NULL;
CREATE INDEX workspace_invitation_email_inbox ON workspace_invitations("invitedEmail", "expiresAt") WHERE status='PENDING';

-- Recipients may read their invitation and its workspace before joining. These
-- SELECT-only policies grant neither organization nor workspace membership.
-- Legacy local databases may have workspace lifecycle without the later SaaS
-- foundations migration. Supply only this pure transaction-context helper when
-- absent; retain any existing definition and avoid replaying unrelated migrations.
DO $$ BEGIN
  IF to_regprocedure('public.forge_actor_uuid()') IS NULL THEN
    EXECUTE $ddl$CREATE FUNCTION public.forge_actor_uuid() RETURNS uuid
      LANGUAGE sql STABLE AS $fn$
        SELECT nullif(current_setting('app.actor_id', true), '')::uuid
      $fn$ $ddl$;
  END IF;
END $$;
CREATE POLICY workspace_invitation_email_recipient ON workspace_invitations FOR SELECT
  USING ("invitedEmail" = (SELECT lower(btrim(email)) FROM users
    WHERE id=forge_actor_uuid() AND "emailVerified"=true AND status='ACTIVE'));
CREATE POLICY workspace_invitation_recipient_workspace ON workspaces FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_invitations i WHERE i."workspaceId"=workspaces.id
    AND i.status='PENDING' AND i."expiresAt">now()
    AND (i."recipientUserId"=forge_actor_uuid() OR i."invitedEmail"=(SELECT lower(btrim(email)) FROM users
      WHERE id=forge_actor_uuid() AND "emailVerified"=true AND status='ACTIVE'))));

ALTER TABLE workspace_outbox
  ADD COLUMN payload JSONB,
  ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  ADD COLUMN "availableAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "lockedUntil" TIMESTAMPTZ,
  ADD COLUMN "lockToken" UUID,
  ADD COLUMN "lastError" VARCHAR(100);
CREATE INDEX workspace_outbox_email_ready ON workspace_outbox("availableAt")
  WHERE operation='WORKSPACE_INVITATION_EMAIL' AND "dispatchedAt" IS NULL;
COMMIT;
