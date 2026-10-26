-- Phase 1 core schema. This migration intentionally precedes revisions/deployments,
-- which reference the websites table in later migrations.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PLATFORM_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DEVELOPER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AI_CONTENT_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TEAM_MEMBER';
ALTER TYPE "IdentityProvider" ADD VALUE IF NOT EXISTS 'GOOGLE';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_SIGNUP';
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'EMAIL_LOGIN';

DO $$ BEGIN
  CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "otp_verifications" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "otp_verifications" ADD COLUMN IF NOT EXISTS "channel" "OtpChannel" DEFAULT 'EMAIL';

CREATE TABLE "subscription_plans" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE, "price" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR',
  "billingInterval" TEXT NOT NULL DEFAULT 'monthly', "websiteLimit" INTEGER NOT NULL,
  "storageLimitMb" INTEGER NOT NULL DEFAULT 100, "aiCreditLimit" INTEGER NOT NULL DEFAULT 0,
  "features" JSONB NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "user_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID NOT NULL UNIQUE,
  "planId" UUID NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id")
);

CREATE TABLE "websites" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL, "slug" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "editorData" JSONB NOT NULL DEFAULT '{"version":1,"elements":[]}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "websites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "idx_websites_user_id" ON "websites"("userId");

CREATE TABLE "templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL, "description" TEXT, "type" VARCHAR(50) NOT NULL DEFAULT 'PAGE',
  "templateData" JSONB NOT NULL DEFAULT '{"elements":[],"pageSettings":{}}'::jsonb,
  "category" VARCHAR(100) NOT NULL DEFAULT 'Other', "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "isShared" BOOLEAN NOT NULL DEFAULT false, "shareToken" VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "idx_templates_user_id" ON "templates"("userId");
CREATE INDEX "idx_templates_share_token" ON "templates"("shareToken");

CREATE TABLE "custom_code_snippets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "websiteId" UUID NOT NULL,
  "name" TEXT, "title" TEXT, "language" TEXT NOT NULL DEFAULT 'JS', "codeType" TEXT NOT NULL DEFAULT 'JS',
  "code" TEXT NOT NULL, "placement" TEXT NOT NULL DEFAULT 'HEAD', "location" TEXT NOT NULL DEFAULT 'HEAD',
  "scope" TEXT NOT NULL DEFAULT 'GLOBAL', "pageId" TEXT, "conditions" JSONB DEFAULT '[]'::jsonb,
  "priority" INTEGER NOT NULL DEFAULT 10, "status" TEXT NOT NULL DEFAULT 'PUBLISHED', "scheduledFor" TIMESTAMP(3),
  "isEnabled" BOOLEAN NOT NULL DEFAULT true, "isActive" BOOLEAN NOT NULL DEFAULT true, "isDraft" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_code_snippets_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE
);
CREATE INDEX "custom_code_snippets_websiteId_idx" ON "custom_code_snippets"("websiteId");

CREATE TABLE "custom_code_revisions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "snippetId" UUID NOT NULL, "code" TEXT NOT NULL,
  "authorId" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_code_revisions_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "custom_code_snippets"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_code_revisions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "custom_code_revisions_snippetId_idx" ON "custom_code_revisions"("snippetId");

CREATE TABLE "form_submissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "websiteId" UUID NOT NULL,
  "formId" VARCHAR(255) NOT NULL, "formName" VARCHAR(255) NOT NULL DEFAULT 'Contact Form',
  "data" JSONB NOT NULL DEFAULT '{}'::jsonb, "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ipAddress" TEXT, "status" TEXT NOT NULL DEFAULT 'NEW', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "form_submissions_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE
);
CREATE INDEX "form_submissions_websiteId_idx" ON "form_submissions"("websiteId");
CREATE INDEX "form_submissions_formId_idx" ON "form_submissions"("formId");

CREATE TABLE "custom_post_types" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "websiteId" UUID NOT NULL,
  "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT,
  "supports" JSONB NOT NULL DEFAULT '["title","editor","thumbnail"]'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_post_types_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_post_types_websiteId_slug_key" UNIQUE ("websiteId", "slug")
);

CREATE TABLE "custom_fields" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "postTypeId" UUID NOT NULL,
  "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'text', "order" INTEGER NOT NULL DEFAULT 0,
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_fields_postTypeId_fkey" FOREIGN KEY ("postTypeId") REFERENCES "custom_post_types"("id") ON DELETE CASCADE
);

CREATE TABLE "custom_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "postTypeId" UUID NOT NULL,
  "title" TEXT NOT NULL, "slug" TEXT, "data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED', "authorId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_entries_postTypeId_fkey" FOREIGN KEY ("postTypeId") REFERENCES "custom_post_types"("id") ON DELETE CASCADE,
  CONSTRAINT "custom_entries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE "theme_location_rules" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "websiteId" UUID NOT NULL,
  "locationType" TEXT NOT NULL, "templateId" TEXT NOT NULL, "conditions" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "theme_location_rules_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE
);
CREATE INDEX "theme_location_rules_websiteId_locationType_idx" ON "theme_location_rules"("websiteId", "locationType");

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID, "action" TEXT NOT NULL,
  "targetResource" TEXT NOT NULL, "details" JSONB, "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

CREATE TABLE "sftp_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "websiteId" UUID NOT NULL,
  "host" TEXT NOT NULL, "port" INTEGER NOT NULL DEFAULT 22, "username" TEXT NOT NULL,
  "remotePath" TEXT NOT NULL DEFAULT '/var/www/html', "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sftp_connections_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE
);

CREATE TABLE "plugin_integrations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "websiteId" UUID NOT NULL, "pluginSlug" TEXT NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb, "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plugin_integrations_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE,
  CONSTRAINT "plugin_integrations_websiteId_pluginSlug_key" UNIQUE ("websiteId", "pluginSlug")
);

CREATE TABLE "multisite_networks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "name" TEXT NOT NULL, "domain" TEXT NOT NULL UNIQUE,
  "networkType" TEXT NOT NULL DEFAULT 'SUBDIRECTORY', "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "design_notes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "websiteId" UUID NOT NULL, "elementId" TEXT,
  "authorId" UUID NOT NULL, "content" TEXT NOT NULL, "resolved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "design_notes_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE,
  CONSTRAINT "design_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE "plugin_compatibilities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "name" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE,
  "category" TEXT, "compatibilityStatus" TEXT NOT NULL DEFAULT 'SUPPORTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "component_accesses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "websiteId" UUID NOT NULL,
  "componentId" TEXT NOT NULL, "elementId" TEXT NOT NULL DEFAULT '', "userId" UUID,
  "permission" TEXT NOT NULL DEFAULT 'VIEW', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "component_accesses_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE,
  CONSTRAINT "component_accesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "component_accesses_websiteId_componentId_key" UNIQUE ("websiteId", "componentId")
);

CREATE TABLE "website_collaborators" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "websiteId" UUID NOT NULL, "userId" UUID NOT NULL,
  "permission" TEXT NOT NULL DEFAULT 'EDITOR', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "website_collaborators_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE,
  CONSTRAINT "website_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "website_collaborators_websiteId_userId_key" UNIQUE ("websiteId", "userId")
);
