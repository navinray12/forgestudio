-- Complete the legacy base schema before SaaS foundation migrations.
-- This is additive for existing installations: only historically absent tables are created.
BEGIN;
-- CreateTable
CREATE TABLE "subscription_plans" (
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

-- CreateTable
CREATE TABLE "user_subscriptions" (
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

-- CreateTable
CREATE TABLE "templates" (
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

-- CreateTable
CREATE TABLE "custom_code_snippets" (
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

-- CreateTable
CREATE TABLE "custom_code_revisions" (
    "id" UUID NOT NULL,
    "snippetId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "authorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_code_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "formId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_post_types" (
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

-- CreateTable
CREATE TABLE "theme_location_rules" (
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

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "targetResource" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sftp_connections" (
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

-- CreateTable
CREATE TABLE "plugin_integrations" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "pluginSlug" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multisite_networks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "networkType" TEXT NOT NULL DEFAULT 'SUBDIRECTORY',
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "multisite_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_fields" (
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

-- CreateTable
CREATE TABLE "custom_entries" (
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

-- CreateTable
CREATE TABLE "design_notes" (
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

-- CreateTable
CREATE TABLE "plugin_compatibilities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "compatibilityStatus" TEXT NOT NULL DEFAULT 'SUPPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_compatibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developer_api_keys" (
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

-- CreateTable
CREATE TABLE "component_accesses" (
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

-- CreateTable
CREATE TABLE "website_collaborators" (
    "id" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_userId_key" ON "user_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "idx_templates_share_token" ON "templates"("shareToken");

-- CreateIndex
CREATE INDEX "idx_templates_user_id" ON "templates"("userId");

-- CreateIndex
CREATE INDEX "custom_code_snippets_websiteId_idx" ON "custom_code_snippets"("websiteId");

-- CreateIndex
CREATE INDEX "custom_code_revisions_snippetId_idx" ON "custom_code_revisions"("snippetId");

-- CreateIndex
CREATE INDEX "form_submissions_websiteId_idx" ON "form_submissions"("websiteId");

-- CreateIndex
CREATE INDEX "form_submissions_formId_idx" ON "form_submissions"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_post_types_websiteId_slug_key" ON "custom_post_types"("websiteId", "slug");

-- CreateIndex
CREATE INDEX "theme_location_rules_websiteId_locationType_idx" ON "theme_location_rules"("websiteId", "locationType");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_integrations_websiteId_pluginSlug_key" ON "plugin_integrations"("websiteId", "pluginSlug");

-- CreateIndex
CREATE UNIQUE INDEX "multisite_networks_domain_key" ON "multisite_networks"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_compatibilities_slug_key" ON "plugin_compatibilities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "developer_api_keys_tokenHash_key" ON "developer_api_keys"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "component_accesses_websiteId_componentId_key" ON "component_accesses"("websiteId", "componentId");

-- CreateIndex
CREATE UNIQUE INDEX "website_collaborators_websiteId_userId_key" ON "website_collaborators"("websiteId", "userId");

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "custom_code_snippets" ADD CONSTRAINT "custom_code_snippets_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_code_revisions" ADD CONSTRAINT "custom_code_revisions_snippetId_fkey" FOREIGN KEY ("snippetId") REFERENCES "custom_code_snippets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_code_revisions" ADD CONSTRAINT "custom_code_revisions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_post_types" ADD CONSTRAINT "custom_post_types_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theme_location_rules" ADD CONSTRAINT "theme_location_rules_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sftp_connections" ADD CONSTRAINT "sftp_connections_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_integrations" ADD CONSTRAINT "plugin_integrations_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_postTypeId_fkey" FOREIGN KEY ("postTypeId") REFERENCES "custom_post_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_entries" ADD CONSTRAINT "custom_entries_postTypeId_fkey" FOREIGN KEY ("postTypeId") REFERENCES "custom_post_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_entries" ADD CONSTRAINT "custom_entries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_notes" ADD CONSTRAINT "design_notes_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_notes" ADD CONSTRAINT "design_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "developer_api_keys" ADD CONSTRAINT "developer_api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_accesses" ADD CONSTRAINT "component_accesses_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "component_accesses" ADD CONSTRAINT "component_accesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_collaborators" ADD CONSTRAINT "website_collaborators_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_collaborators" ADD CONSTRAINT "website_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
