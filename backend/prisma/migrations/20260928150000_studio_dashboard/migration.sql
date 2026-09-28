-- Studio owns its own PostgreSQL schema. Legacy Prisma models remain in public.
-- This migration is additive; it does not reset, move, publish or delete existing sites.
CREATE SCHEMA IF NOT EXISTS studio;

CREATE TABLE studio.folders (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL CHECK (length(btrim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX studio_folder_personal_name ON studio.folders(owner_id, lower(name)) WHERE workspace_id IS NULL;
CREATE UNIQUE INDEX studio_folder_workspace_name ON studio.folders(workspace_id, lower(name)) WHERE workspace_id IS NOT NULL;

CREATE TABLE studio.site_state (
  site_id uuid PRIMARY KEY REFERENCES public.websites(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES studio.folders(id) ON DELETE SET NULL,
  archived_at timestamptz,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_site_folder ON studio.site_state(folder_id);

CREATE TABLE studio.bookmarks (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, site_id)
);

CREATE TABLE studio.events (
  id uuid PRIMARY KEY,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.websites(id) ON DELETE SET NULL,
  action varchar(80) NOT NULL,
  label varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_event_workspace_time ON studio.events(workspace_id, created_at DESC);
CREATE INDEX studio_event_actor_time ON studio.events(actor_id, created_at DESC);

-- Store successful create outcomes in the same transaction as the resource.
CREATE TABLE studio.operations (
  actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  request_hash char(64) NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, operation_id)
);
CREATE INDEX studio_operation_age ON studio.operations(created_at);

-- Enforce scope consistency even when SQL is issued outside the HTTP module.
CREATE FUNCTION studio.check_folder_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.folder_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM studio.folders f JOIN public.websites w ON w.id = NEW.site_id
    WHERE f.id = NEW.folder_id AND (
      (w."workspaceId" IS NOT NULL AND f.workspace_id = w."workspaceId") OR
      (w."workspaceId" IS NULL AND f.workspace_id IS NULL AND f.owner_id = w."userId")
    )
  ) THEN
    RAISE EXCEPTION 'Folder and site must belong to the same scope' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.revision := OLD.revision + 1;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER studio_check_folder_scope BEFORE INSERT OR UPDATE ON studio.site_state
  FOR EACH ROW EXECUTE FUNCTION studio.check_folder_scope();

-- A legacy workspace transfer must not leave a cross-workspace folder reference.
CREATE FUNCTION studio.detach_transferred_site() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId" OR NEW."userId" IS DISTINCT FROM OLD."userId" THEN
    UPDATE studio.site_state SET folder_id = NULL WHERE site_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER studio_detach_transferred_site AFTER UPDATE OF "workspaceId", "userId" ON public.websites
  FOR EACH ROW EXECUTE FUNCTION studio.detach_transferred_site();
