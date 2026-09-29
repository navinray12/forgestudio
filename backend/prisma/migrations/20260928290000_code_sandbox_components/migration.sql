-- AI generated code artifacts are references to externally isolated sandbox builds.
CREATE TABLE studio.code_component_artifacts (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  name varchar(120) NOT NULL,
  source_hash char(64) NOT NULL,
  provider varchar(80) NOT NULL,
  model varchar(160) NOT NULL,
  sandbox_provider varchar(80) NOT NULL,
  sandbox_artifact_id varchar(255) NOT NULL,
  preview_url varchar(2000) NOT NULL,
  screenshot_url varchar(2000),
  status varchar(24) NOT NULL CHECK(status IN ('VALIDATED','APPLIED','REJECTED')),
  findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_code_artifacts_site_time ON studio.code_component_artifacts(site_id,created_at DESC);
CREATE UNIQUE INDEX studio_code_artifact_provider_ref ON studio.code_component_artifacts(sandbox_provider,sandbox_artifact_id);
