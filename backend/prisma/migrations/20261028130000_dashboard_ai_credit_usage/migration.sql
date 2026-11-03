-- Additive AI activity ledger. Existing credits, subscriptions and site content are untouched.
CREATE TABLE IF NOT EXISTS dashboard_ai_credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "actorId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "websiteId" UUID REFERENCES websites(id) ON DELETE SET NULL,
  "workspaceId" UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  feature VARCHAR(100) NOT NULL,
  "requestKey" VARCHAR(128) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT dashboard_ai_credit_usage_account_request_key UNIQUE ("accountId", "requestKey")
);
CREATE INDEX IF NOT EXISTS dashboard_ai_credit_usage_account_date_idx ON dashboard_ai_credit_usage ("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS dashboard_ai_credit_usage_workspace_date_idx ON dashboard_ai_credit_usage ("workspaceId", "createdAt");
