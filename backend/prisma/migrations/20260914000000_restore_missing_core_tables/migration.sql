-- Restore core tables omitted from the original history before dependent migrations.
-- Existing schema-push installations retain their data; inspect drift before deployment.

CREATE TABLE IF NOT EXISTS "websites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "editorData" JSONB NOT NULL DEFAULT '{"version": 1, "elements": []}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
    "websiteLimit" INTEGER NOT NULL,
    "storageLimitMb" INTEGER NOT NULL DEFAULT 100,
    "aiCreditLimit" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_subscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) NOT NULL DEFAULT 'PAGE',
    "templateData" JSONB NOT NULL DEFAULT '{"elements": [], "pageSettings": {}}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" VARCHAR(100) NOT NULL DEFAULT 'Other',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" VARCHAR(255),

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "custom_code_snippets" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "name" TEXT,
    "title" TEXT,
    "language" TEXT NOT NULL DEFAULT 'JS',
    "codeType" TEXT NOT NULL DEFAULT 'JS',
    "code" TEXT NOT NULL,
    "placement" TEXT NOT NULL DEFAULT 'HEAD',
    "location" TEXT NOT NULL DEFAULT 'HEAD',
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "pageId" TEXT,
    "conditions" JSONB DEFAULT '[]',
    "priority" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "scheduledFor" TIMESTAMP(3),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_code_snippets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "custom_code_revisions" (
    "id" UUID NOT NULL,
    "snippetId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "authorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_code_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "form_submissions" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "custom_post_types" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "supports" JSONB NOT NULL DEFAULT '["title", "editor", "thumbnail"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_post_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "theme_location_rules" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "locationType" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_location_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "targetResource" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sftp_connections" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 22,
    "username" TEXT NOT NULL,
    "remotePath" TEXT NOT NULL DEFAULT '/var/www/html',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sftp_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plugin_integrations" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "pluginSlug" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "multisite_networks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "networkType" TEXT NOT NULL DEFAULT 'SUBDIRECTORY',
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "multisite_networks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "custom_fields" (
    "id" UUID NOT NULL,
    "postTypeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "custom_entries" (
    "id" UUID NOT NULL,
    "postTypeId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "authorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "design_notes" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "elementId" TEXT,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "plugin_compatibilities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "compatibilityStatus" TEXT NOT NULL DEFAULT 'SUPPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_compatibilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "developer_api_keys" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '["websites:read"]',
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "component_accesses" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "componentId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL DEFAULT '',
    "userId" UUID,
    "permission" TEXT NOT NULL DEFAULT 'VIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_accesses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "website_collaborators" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_collaborators_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "background_jobs" (
    "id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" VARCHAR(2000),
    "runAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_websites_user_id" ON "websites"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_slug_key" ON "subscription_plans"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "user_subscriptions_userId_key" ON "user_subscriptions"("userId");

CREATE INDEX IF NOT EXISTS "idx_templates_share_token" ON "templates"("shareToken");

CREATE INDEX IF NOT EXISTS "idx_templates_user_id" ON "templates"("userId");

CREATE INDEX IF NOT EXISTS "custom_code_snippets_websiteId_idx" ON "custom_code_snippets"("websiteId");

CREATE INDEX IF NOT EXISTS "custom_code_revisions_snippetId_idx" ON "custom_code_revisions"("snippetId");

CREATE INDEX IF NOT EXISTS "form_submissions_websiteId_idx" ON "form_submissions"("websiteId");

CREATE INDEX IF NOT EXISTS "form_submissions_formId_idx" ON "form_submissions"("formId");

CREATE UNIQUE INDEX IF NOT EXISTS "custom_post_types_websiteId_slug_key" ON "custom_post_types"("websiteId", "slug");

CREATE INDEX IF NOT EXISTS "theme_location_rules_websiteId_locationType_idx" ON "theme_location_rules"("websiteId", "locationType");

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");

CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

CREATE UNIQUE INDEX IF NOT EXISTS "plugin_integrations_websiteId_pluginSlug_key" ON "plugin_integrations"("websiteId", "pluginSlug");

CREATE UNIQUE INDEX IF NOT EXISTS "multisite_networks_domain_key" ON "multisite_networks"("domain");

CREATE UNIQUE INDEX IF NOT EXISTS "plugin_compatibilities_slug_key" ON "plugin_compatibilities"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "developer_api_keys_tokenHash_key" ON "developer_api_keys"("tokenHash");

CREATE UNIQUE INDEX IF NOT EXISTS "component_accesses_websiteId_componentId_key" ON "component_accesses"("websiteId", "componentId");

CREATE UNIQUE INDEX IF NOT EXISTS "website_collaborators_websiteId_userId_key" ON "website_collaborators"("websiteId", "userId");

CREATE INDEX IF NOT EXISTS "background_jobs_status_runAt_idx" ON "background_jobs"("status", "runAt");

CREATE INDEX IF NOT EXISTS "background_jobs_type_idx" ON "background_jobs"("type");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'websites_userId_fkey' AND conrelid = 'websites'::regclass) THEN
    ALTER TABLE "websites" ADD CONSTRAINT "websites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_planId_fkey' AND conrelid = 'user_subscriptions'::regclass) THEN
    ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_userId_fkey' AND conrelid = 'user_subscriptions'::regclass) THEN
    ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'templates_userId_fkey' AND conrelid = 'templates'::regclass) THEN
    ALTER TABLE "templates" ADD CONSTRAINT "templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_code_snippets_websiteId_fkey' AND conrelid = 'custom_code_snippets'::regclass) THEN
    ALTER TABLE "custom_code_snippets" ADD CONSTRAINT "custom_code_snippets_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_code_revisions_snippetId_fkey' AND conrelid = 'custom_code_revisions'::regclass) THEN
    ALTER TABLE "custom_code_revisions" ADD CONSTRAINT "custom_code_revisions_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "custom_code_snippets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_code_revisions_authorId_fkey' AND conrelid = 'custom_code_revisions'::regclass) THEN
    ALTER TABLE "custom_code_revisions" ADD CONSTRAINT "custom_code_revisions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'form_submissions_websiteId_fkey' AND conrelid = 'form_submissions'::regclass) THEN
    ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_post_types_websiteId_fkey' AND conrelid = 'custom_post_types'::regclass) THEN
    ALTER TABLE "custom_post_types" ADD CONSTRAINT "custom_post_types_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'theme_location_rules_websiteId_fkey' AND conrelid = 'theme_location_rules'::regclass) THEN
    ALTER TABLE "theme_location_rules" ADD CONSTRAINT "theme_location_rules_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_userId_fkey' AND conrelid = 'audit_logs'::regclass) THEN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sftp_connections_websiteId_fkey' AND conrelid = 'sftp_connections'::regclass) THEN
    ALTER TABLE "sftp_connections" ADD CONSTRAINT "sftp_connections_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plugin_integrations_websiteId_fkey' AND conrelid = 'plugin_integrations'::regclass) THEN
    ALTER TABLE "plugin_integrations" ADD CONSTRAINT "plugin_integrations_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_fields_postTypeId_fkey' AND conrelid = 'custom_fields'::regclass) THEN
    ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_postTypeId_fkey" FOREIGN KEY ("postTypeId") REFERENCES "custom_post_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_entries_postTypeId_fkey' AND conrelid = 'custom_entries'::regclass) THEN
    ALTER TABLE "custom_entries" ADD CONSTRAINT "custom_entries_postTypeId_fkey" FOREIGN KEY ("postTypeId") REFERENCES "custom_post_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_entries_authorId_fkey' AND conrelid = 'custom_entries'::regclass) THEN
    ALTER TABLE "custom_entries" ADD CONSTRAINT "custom_entries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'design_notes_websiteId_fkey' AND conrelid = 'design_notes'::regclass) THEN
    ALTER TABLE "design_notes" ADD CONSTRAINT "design_notes_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'design_notes_authorId_fkey' AND conrelid = 'design_notes'::regclass) THEN
    ALTER TABLE "design_notes" ADD CONSTRAINT "design_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_api_keys_userId_fkey' AND conrelid = 'developer_api_keys'::regclass) THEN
    ALTER TABLE "developer_api_keys" ADD CONSTRAINT "developer_api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'component_accesses_websiteId_fkey' AND conrelid = 'component_accesses'::regclass) THEN
    ALTER TABLE "component_accesses" ADD CONSTRAINT "component_accesses_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'component_accesses_userId_fkey' AND conrelid = 'component_accesses'::regclass) THEN
    ALTER TABLE "component_accesses" ADD CONSTRAINT "component_accesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'website_collaborators_websiteId_fkey' AND conrelid = 'website_collaborators'::regclass) THEN
    ALTER TABLE "website_collaborators" ADD CONSTRAINT "website_collaborators_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'website_collaborators_userId_fkey' AND conrelid = 'website_collaborators'::regclass) THEN
    ALTER TABLE "website_collaborators" ADD CONSTRAINT "website_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
