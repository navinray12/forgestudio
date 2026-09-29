-- Platform-level AI model routing policy. Credentials remain in deployment secrets.
CREATE TABLE studio.ai_model_routes (
  feature varchar(32) PRIMARY KEY,
  provider varchar(32) NOT NULL CHECK(provider IN ('openai','anthropic')),
  model varchar(160) NOT NULL,
  fallback_models jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(fallback_models)='array'),
  timeout_ms integer NOT NULL DEFAULT 30000 CHECK(timeout_ms BETWEEN 1000 AND 180000),
  max_output_tokens integer NOT NULL DEFAULT 2000 CHECK(max_output_tokens BETWEEN 64 AND 100000),
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(feature IN ('PLANNER','EDITOR','COPY','CODE','REVIEWER','VISION','IMAGE','EMBEDDING'))
);

CREATE TABLE studio.ai_control_audit (
  id uuid PRIMARY KEY,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action varchar(80) NOT NULL,
  target varchar(200) NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_ai_control_audit_time ON studio.ai_control_audit(created_at DESC);
