-- Platform AI infrastructure routing controlled by Super Admin.
CREATE TABLE IF NOT EXISTS studio.ai_model_routes (
  feature varchar(32) PRIMARY KEY,
  provider varchar(32) NOT NULL CHECK(provider IN ('openai','anthropic')),
  model varchar(160) NOT NULL,
  fallback_models jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(fallback_models)='array'),
  enabled boolean NOT NULL DEFAULT true,
  timeout_ms integer NOT NULL DEFAULT 45000 CHECK(timeout_ms BETWEEN 1000 AND 180000),
  max_output_tokens integer NOT NULL DEFAULT 4000 CHECK(max_output_tokens BETWEEN 128 AND 64000),
  daily_budget_units bigint CHECK(daily_budget_units IS NULL OR daily_budget_units BETWEEN 1000 AND 1000000000),
  workspace_restrictions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(workspace_restrictions)='array'),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(feature IN ('PLANNER','EDITOR','COPY','CODE','REVIEWER','VISION','IMAGE','EMBEDDING'))
);

CREATE TABLE IF NOT EXISTS studio.ai_provider_health (
  provider varchar(32) PRIMARY KEY CHECK(provider IN ('openai','anthropic')),
  status varchar(24) NOT NULL CHECK(status IN ('UNKNOWN','HEALTHY','DEGRADED','UNAVAILABLE','UNCONFIGURED')),
  latency_ms integer,
  error_code varchar(80),
  checked_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);
