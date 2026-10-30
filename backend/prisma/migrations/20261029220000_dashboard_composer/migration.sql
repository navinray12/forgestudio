CREATE TABLE IF NOT EXISTS dashboard_composer_settings (
 "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 "phpSource" TEXT NOT NULL DEFAULT 'AUTO' CHECK ("phpSource" IN ('AUTO','CONFIGURED')),
 "composerSource" TEXT NOT NULL DEFAULT 'AUTO' CHECK ("composerSource" IN ('AUTO','CONFIGURED')),
 config JSONB NOT NULL DEFAULT '{"require":{}}', version INTEGER NOT NULL DEFAULT 0,
 "validatedHash" TEXT, "activeRunId" UUID, "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dashboard_composer_runs (
 id UUID PRIMARY KEY, "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL CHECK (status IN ('RUNNING','SUCCEEDED','FAILED')),
 "configHash" TEXT NOT NULL, output TEXT NOT NULL DEFAULT '', packages JSONB NOT NULL DEFAULT '[]',
 "lockData" JSONB, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "finishedAt" TIMESTAMPTZ,
 "leaseUntil" TIMESTAMPTZ NOT NULL DEFAULT now()+interval '5 minutes'
);
CREATE UNIQUE INDEX IF NOT EXISTS dashboard_composer_one_running ON dashboard_composer_runs("userId") WHERE status='RUNNING';
