-- Enterprise identity configuration and SCIM directory mappings.
CREATE TABLE studio.enterprise_identity_configs (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  oidc_enabled boolean NOT NULL DEFAULT false,
  oidc_issuer text,
  oidc_client_id varchar(240),
  oidc_client_secret_ref varchar(500),
  allowed_email_domain varchar(255),
  scim_token_hash char(64),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT oidc_enabled OR (oidc_issuer IS NOT NULL AND oidc_client_id IS NOT NULL AND oidc_client_secret_ref IS NOT NULL))
);

CREATE TABLE studio.scim_users (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  external_id varchar(255) NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  attributes jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,external_id),
  UNIQUE(workspace_id,user_id),
  CHECK(jsonb_typeof(attributes)='object')
);
CREATE INDEX studio_scim_users_workspace_active ON studio.scim_users(workspace_id,active);
