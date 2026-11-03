-- Expand only. Apply with the migration identity after drift/backup review.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE workspaces ADD COLUMN "lifecycleStatus" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE workspaces ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workspaces ADD COLUMN "archivedAt" TIMESTAMPTZ;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_lifecycle_check CHECK ("lifecycleStatus" IN ('ACTIVE','ARCHIVED'));
ALTER TABLE workspaces ADD CONSTRAINT workspaces_version_check CHECK (version > 0);
ALTER TABLE workspaces ADD CONSTRAINT workspaces_archive_check CHECK (("lifecycleStatus"='ARCHIVED') = ("archivedAt" IS NOT NULL));
CREATE UNIQUE INDEX workspaces_tenant_identity ON workspaces ("organizationId", id);

CREATE TABLE workspace_invitations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 "organizationId" UUID NOT NULL,
 "workspaceId" UUID NOT NULL,
 "recipientUserId" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 "invitedBy" UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN','MEMBER')),
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REVOKED')),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
 "expiresAt" TIMESTAMPTZ NOT NULL,
 "acceptedAt" TIMESTAMPTZ,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("organizationId","workspaceId") REFERENCES workspaces("organizationId",id) ON DELETE RESTRICT,
 CHECK ((status = 'ACCEPTED') = ("acceptedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX workspace_invitation_pending ON workspace_invitations("workspaceId","recipientUserId") WHERE status='PENDING';
CREATE INDEX "workspace_invitations_organizationId_recipientUserId_status_idx" ON workspace_invitations("organizationId","recipientUserId",status);
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_invitations_tenant ON workspace_invitations
 USING ("organizationId" = nullif(current_setting('app.tenant_id',true),'')::uuid)
 WITH CHECK ("organizationId" = nullif(current_setting('app.tenant_id',true),'')::uuid);

CREATE FUNCTION forge_workspace_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.version := OLD.version + 1; NEW."updatedAt" := CURRENT_TIMESTAMP; RETURN NEW; END $$;
CREATE TRIGGER forge_workspace_version BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION forge_workspace_version();

-- Even legacy writers cannot silently modify a website in an archived workspace.
-- Taking a share lock serializes this admission against the archive row update.
CREATE FUNCTION forge_workspace_write_admission() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE scope UUID; current_state TEXT; parent_organization UUID;
BEGIN
 IF TG_OP = 'DELETE' THEN scope := OLD."workspaceId"; ELSE scope := NEW."workspaceId"; END IF;
 IF scope IS NOT NULL THEN
   SELECT "lifecycleStatus","organizationId" INTO current_state,parent_organization FROM workspaces WHERE id=scope FOR SHARE;
   IF TG_OP<>'DELETE' AND NEW."organizationId" IS DISTINCT FROM parent_organization THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='TENANT_SCOPE_MISMATCH'; END IF;
   IF current_state IS DISTINCT FROM 'ACTIVE' THEN
     RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='WORKSPACE_READ_ONLY';
   END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD."workspaceId" IS DISTINCT FROM NEW."workspaceId" AND OLD."workspaceId" IS NOT NULL THEN
   SELECT "lifecycleStatus" INTO current_state FROM workspaces WHERE id=OLD."workspaceId" FOR SHARE;
   IF current_state IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='WORKSPACE_READ_ONLY'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER forge_website_workspace_admission BEFORE INSERT OR UPDATE OR DELETE ON websites
 FOR EACH ROW EXECUTE FUNCTION forge_workspace_write_admission();

CREATE FUNCTION forge_workspace_child_admission() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id UUID; scope UUID; current_state TEXT;
BEGIN
 IF TG_OP='DELETE' THEN parent_id:=OLD."websiteId"; ELSE parent_id:=NEW."websiteId"; END IF;
 IF parent_id IS NOT NULL THEN
   SELECT "workspaceId" INTO scope FROM websites WHERE id=parent_id;
   IF scope IS NOT NULL THEN
     SELECT "lifecycleStatus" INTO current_state FROM workspaces WHERE id=scope FOR SHARE;
     IF current_state IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='WORKSPACE_READ_ONLY'; END IF;
   END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD."websiteId" IS DISTINCT FROM NEW."websiteId" THEN
   RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='RESOURCE_PARENT_IMMUTABLE';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DO $$ DECLARE target RECORD; BEGIN
 FOR target IN SELECT table_name FROM information_schema.columns
 WHERE table_schema='public' AND column_name='websiteId'
   AND table_name NOT IN ('email_delivery_logs','site_performance_metrics','optimization_credit_ledgers')
 LOOP
   EXECUTE format('CREATE TRIGGER forge_workspace_child_admission BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION forge_workspace_child_admission()',target.table_name);
 END LOOP;
END $$;

CREATE FUNCTION forge_workspace_owner_invariant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE scope UUID; expected_owner UUID; owner_count INTEGER; owner_matches INTEGER;
BEGIN
 IF TG_TABLE_NAME='workspaces' THEN
   scope := NEW.id;
 ELSE
   IF TG_OP='DELETE' THEN scope := OLD."workspaceId"; ELSE scope := NEW."workspaceId"; END IF;
 END IF;
 SELECT "ownerId" INTO expected_owner FROM workspaces WHERE id=scope;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT count(*) FILTER(WHERE role='OWNER'),count(*) FILTER(WHERE role='OWNER' AND "userId"=expected_owner)
   INTO owner_count,owner_matches FROM workspace_members WHERE "workspaceId"=scope;
 IF owner_count<>1 OR owner_matches<>1 THEN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='WORKSPACE_OWNER_REQUIRED'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER forge_workspace_owner_row AFTER INSERT OR UPDATE ON workspaces
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION forge_workspace_owner_invariant();
CREATE CONSTRAINT TRIGGER forge_workspace_owner_members AFTER INSERT OR UPDATE OR DELETE ON workspace_members
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION forge_workspace_owner_invariant();
COMMIT;
