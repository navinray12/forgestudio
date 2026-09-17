-- FS-040: establish account (organization) -> workspace -> site authority before
-- tenant-facing operation storage. Adds workspace membership status/policy versioning,
-- single-use workspace invitations, time-limited support grants, and makes every
-- website's workspace scope mandatory instead of one of several optional paths.

-- 1. Workspace membership gains an explicit status and a policy-generation counter.
-- Revocation is a status change (preserves audit history), never a delete.
ALTER TABLE workspace_members ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_status_check
  CHECK ("status" IN ('ACTIVE', 'REVOKED'));
ALTER TABLE workspace_members ADD COLUMN "policyVersion" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "workspace_members_workspaceId_status_idx" ON workspace_members ("workspaceId", "status");

-- 2. Workspaces track whether they were created implicitly as a personal workspace.
ALTER TABLE workspaces ADD COLUMN "isPersonal" BOOLEAN NOT NULL DEFAULT false;

-- 3. Single-use, bound-recipient workspace invitations.
CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  "tokenHash" VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "invitedBy" UUID NOT NULL,
  "acceptedBy" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT workspace_invitations_status_check
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')),
  CONSTRAINT "workspace_invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workspace_invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workspace_invitations_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "workspace_invitations_workspaceId_idx" ON workspace_invitations ("workspaceId");
CREATE INDEX workspace_invitations_email_idx ON workspace_invitations (email);

-- 4. Time-limited, workspace-scoped support/staff elevation. Access requires an
-- unexpired, unrevoked row; there is no ambient support role that bypasses this.
CREATE TABLE support_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL,
  "granteeId" UUID NOT NULL,
  reason VARCHAR(500) NOT NULL,
  "approvedBy" UUID,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "revokedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT support_grants_expiry_after_create CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "support_grants_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES workspaces(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "support_grants_granteeId_fkey" FOREIGN KEY ("granteeId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "support_grants_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "support_grants_workspaceId_granteeId_expiresAt_idx" ON support_grants ("workspaceId", "granteeId", "expiresAt");

-- 5. Backfill: every user who owns a website without a workspace gets a personal
-- organization + workspace + OWNER membership, and their orphan websites are
-- attached to it. Expand -> backfill -> contract in one migration since only
-- disposable development/test databases are migrated by this project today.
DO $$
DECLARE
  r RECORD;
  target_ws_id UUID;
  new_org_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT w."userId" AS user_id
    FROM websites w
    WHERE w."workspaceId" IS NULL
  LOOP
    SELECT id INTO target_ws_id
    FROM workspaces
    WHERE "ownerId" = r.user_id
    ORDER BY "createdAt" ASC
    LIMIT 1;

    IF target_ws_id IS NULL THEN
      INSERT INTO organizations (id, name, slug, "ownerId", settings, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(), 'Personal', 'personal-' || replace(r.user_id::text, '-', ''),
        r.user_id, '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id INTO new_org_id;

      INSERT INTO organization_members (id, "organizationId", "userId", role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), new_org_id, r.user_id, 'OWNER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

      INSERT INTO workspaces (id, "organizationId", name, slug, "ownerId", "isPersonal", settings, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(), new_org_id, 'Personal workspace',
        'personal-ws-' || replace(r.user_id::text, '-', ''), r.user_id, true, '{}'::jsonb,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING id INTO target_ws_id;

      INSERT INTO workspace_members (id, "workspaceId", "userId", role, "status", "policyVersion", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), target_ws_id, r.user_id, 'OWNER', 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    END IF;

    UPDATE websites SET "workspaceId" = target_ws_id
    WHERE "userId" = r.user_id AND "workspaceId" IS NULL;
  END LOOP;
END $$;

-- 6. Every website now has a mandatory workspace scope. teamId/organizationId
-- remain as deprecated, read-only historical columns (not dropped: preserve
-- existing content per the migration-safety requirement, not a destructive change).
ALTER TABLE websites ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE websites DROP CONSTRAINT IF EXISTS "websites_workspaceId_fkey";
-- NO ACTION + DEFERRABLE INITIALLY DEFERRED (not RESTRICT, which Postgres cannot defer):
-- deleting a user cascades to both their websites (via userId) and their owned
-- workspaces (via workspaces.ownerId) in the same statement. Deferring this check to
-- transaction commit means it is evaluated after both cascades finish, instead of
-- racing an immediate RESTRICT check against cascade trigger firing order.
ALTER TABLE websites ADD CONSTRAINT "websites_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES workspaces(id)
  ON DELETE NO ACTION ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
