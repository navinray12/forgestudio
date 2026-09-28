-- Shared human/AI command receipts, reviewable AI changesets and AI audit records.
CREATE TABLE studio.command_receipts (
  id uuid PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  command varchar(80) NOT NULL,
  source varchar(20) NOT NULL CHECK (source IN ('HUMAN','AI','SYSTEM')),
  idempotency_key uuid NOT NULL,
  correlation_id uuid NOT NULL,
  payload_hash char(64) NOT NULL,
  result jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_id,idempotency_key)
);
CREATE INDEX studio_command_site_time ON studio.command_receipts(site_id,created_at DESC);

CREATE TABLE studio.change_sets (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  source varchar(20) NOT NULL CHECK (source IN ('HUMAN','AI')),
  name varchar(160) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','APPLIED','REJECTED','FAILED')),
  base_hash char(64) NOT NULL,
  commands jsonb NOT NULL CHECK (jsonb_typeof(commands)='array'),
  result_hash char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);
CREATE INDEX studio_changesets_site_time ON studio.change_sets(site_id,created_at DESC);

CREATE TABLE studio.ai_runs (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  feature varchar(80) NOT NULL,
  provider varchar(40) NOT NULL,
  model_requested varchar(160) NOT NULL,
  model_resolved varchar(160) NOT NULL,
  prompt_version varchar(40) NOT NULL,
  context_hash char(64) NOT NULL,
  input_units integer,
  output_units integer,
  latency_ms integer NOT NULL CHECK(latency_ms >= 0),
  status varchar(20) NOT NULL CHECK(status IN ('SUCCEEDED','FAILED')),
  changeset_id uuid REFERENCES studio.change_sets(id) ON DELETE SET NULL,
  error_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_ai_runs_site_time ON studio.ai_runs(site_id,created_at DESC);

CREATE TABLE studio.ai_tool_calls (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES studio.ai_runs(id) ON DELETE CASCADE,
  tool varchar(120) NOT NULL,
  arguments_hash char(64) NOT NULL,
  duration_ms integer NOT NULL CHECK(duration_ms >= 0),
  status varchar(20) NOT NULL CHECK(status IN ('SUCCEEDED','FAILED')),
  result_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_ai_tool_calls_run ON studio.ai_tool_calls(run_id,created_at);
