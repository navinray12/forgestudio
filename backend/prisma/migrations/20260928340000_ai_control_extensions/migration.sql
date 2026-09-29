-- Extend the existing AI control plane without changing its authoritative route table.
ALTER TABLE studio.ai_model_routes
  ADD COLUMN IF NOT EXISTS daily_budget_units bigint CHECK(daily_budget_units IS NULL OR daily_budget_units BETWEEN 1000 AND 1000000000),
  ADD COLUMN IF NOT EXISTS workspace_restrictions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(workspace_restrictions)='array');

CREATE TABLE IF NOT EXISTS studio.ai_provider_health (
  provider varchar(32) PRIMARY KEY CHECK(provider IN ('openai','anthropic')),
  status varchar(24) NOT NULL CHECK(status IN ('UNKNOWN','HEALTHY','DEGRADED','UNAVAILABLE','UNCONFIGURED')),
  latency_ms integer,
  error_code varchar(80),
  checked_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);
