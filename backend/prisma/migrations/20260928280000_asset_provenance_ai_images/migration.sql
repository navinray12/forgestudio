-- Asset provenance and AI image accounting. Additive to the existing media_assets table.
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS provenance varchar(20) NOT NULL DEFAULT 'UPLOADED',
  ADD COLUMN IF NOT EXISTS "providerName" varchar(80),
  ADD COLUMN IF NOT EXISTS "modelId" varchar(160),
  ADD COLUMN IF NOT EXISTS "promptHash" char(64),
  ADD COLUMN IF NOT EXISTS "generatedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_provenance_check CHECK (provenance IN ('UPLOADED','GENERATED','IMPORTED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE studio.ai_runs
  ADD COLUMN IF NOT EXISTS image_count integer NOT NULL DEFAULT 0 CHECK(image_count BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS estimated_cost_microusd bigint CHECK(estimated_cost_microusd IS NULL OR estimated_cost_microusd >= 0);

CREATE INDEX IF NOT EXISTS media_assets_provenance_idx ON public.media_assets("websiteId",provenance,"createdAt" DESC);
