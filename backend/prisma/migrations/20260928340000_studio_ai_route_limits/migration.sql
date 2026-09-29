-- Extend the existing authoritative AI control-plane route table.
ALTER TABLE studio.ai_model_routes
  ADD COLUMN IF NOT EXISTS daily_budget_units bigint CHECK(daily_budget_units IS NULL OR daily_budget_units BETWEEN 1000 AND 1000000000),
  ADD COLUMN IF NOT EXISTS workspace_restrictions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(workspace_restrictions)='array');
