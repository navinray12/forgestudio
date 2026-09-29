-- Custom-domain provisioning state. Ownership verification remains separate from hosting activation.
ALTER TABLE studio.verified_domains
  ADD COLUMN IF NOT EXISTS hosting_state varchar(24) NOT NULL DEFAULT 'NOT_PROVISIONED'
    CHECK(hosting_state IN ('NOT_PROVISIONED','PROVISIONING','ACTIVE','FAILED','REMOVING')),
  ADD COLUMN IF NOT EXISTS tls_state varchar(24) NOT NULL DEFAULT 'NOT_REQUESTED'
    CHECK(tls_state IN ('NOT_REQUESTED','PENDING','ACTIVE','FAILED')),
  ADD COLUMN IF NOT EXISTS provider_ref varchar(200),
  ADD COLUMN IF NOT EXISTS canonical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS redirect_to_canonical boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hosting_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS hosting_error varchar(120);

CREATE UNIQUE INDEX IF NOT EXISTS studio_one_canonical_domain
  ON studio.verified_domains(site_id) WHERE canonical AND hosting_state='ACTIVE';
