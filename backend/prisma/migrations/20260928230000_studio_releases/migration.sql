-- Immutable Studio release artifacts and active release pointer.
CREATE TABLE studio.releases (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  source_hash char(64) NOT NULL,
  artifact_checksum char(64) NOT NULL,
  artifact jsonb NOT NULL CHECK (jsonb_typeof(artifact)='object'),
  provider varchar(40) NOT NULL,
  provider_ref text,
  status varchar(24) NOT NULL CHECK(status IN ('PREPARED','DEPLOYING','ACTIVE','SUPERSEDED','FAILED')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  error_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  CHECK ((status='ACTIVE') = (activated_at IS NOT NULL))
);
CREATE INDEX studio_releases_site_time ON studio.releases(site_id,created_at DESC);
CREATE UNIQUE INDEX studio_one_active_release ON studio.releases(site_id) WHERE status='ACTIVE';

CREATE TABLE studio.release_pointer (
  site_id uuid PRIMARY KEY REFERENCES public.websites(id) ON DELETE CASCADE,
  release_id uuid NOT NULL REFERENCES studio.releases(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);
