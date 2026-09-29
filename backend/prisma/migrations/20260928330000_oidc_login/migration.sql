-- Replay-protected OIDC authorization-code/PKCE login states.
CREATE TABLE studio.oidc_login_states (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  verifier_hash char(64) NOT NULL,
  nonce varchar(120) NOT NULL,
  return_to varchar(500) NOT NULL DEFAULT '/dashboard',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_oidc_login_expiry ON studio.oidc_login_states(expires_at) WHERE used_at IS NULL;
