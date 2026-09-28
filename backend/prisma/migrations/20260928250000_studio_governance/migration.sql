-- Governed site feature switches and concurrent-safe AI usage reservations.
CREATE TABLE studio.feature_flags (
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  feature varchar(64) NOT NULL,
  enabled boolean NOT NULL,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(site_id,feature),
  CHECK(feature IN ('AI_COPY','AI_SECTION_GENERATION','AI_PAGE_GENERATION','AI_SITE_GENERATION','AI_CMS','AI_SEO','AI_IMAGES','AI_CODE_COMPONENTS','LOCALIZATION','COMMERCE','ANALYTICS','EXPERIMENTS','PERSONALIZATION','CUSTOM_CODE','MCP','WEBHOOKS'))
);

CREATE TABLE studio.ai_budgets (
  site_id uuid PRIMARY KEY REFERENCES public.websites(id) ON DELETE CASCADE,
  monthly_unit_limit bigint NOT NULL CHECK(monthly_unit_limit BETWEEN 1000 AND 1000000000),
  warning_percent integer NOT NULL DEFAULT 80 CHECK(warning_percent BETWEEN 50 AND 99),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE studio.ai_usage_reservations (
  id uuid PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  feature varchar(80) NOT NULL,
  reserved_units integer NOT NULL CHECK(reserved_units BETWEEN 1 AND 10000000),
  actual_units integer CHECK(actual_units IS NULL OR actual_units BETWEEN 0 AND 10000000),
  state varchar(20) NOT NULL DEFAULT 'RESERVED' CHECK(state IN ('RESERVED','RECONCILED','RELEASED')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reconciled_at timestamptz
);
CREATE INDEX studio_ai_reservations_active ON studio.ai_usage_reservations(site_id,state,expires_at) WHERE state='RESERVED';
