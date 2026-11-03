-- AlterTable: wordpress_connections (add missing columns)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wordpress_connections' AND column_name = 'pluginVersion') THEN
        ALTER TABLE "wordpress_connections" ADD COLUMN "pluginVersion" VARCHAR(50) DEFAULT '1.0.0';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wordpress_connections' AND column_name = 'apiVersion') THEN
        ALTER TABLE "wordpress_connections" ADD COLUMN "apiVersion" VARCHAR(50) DEFAULT 'v1';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wordpress_connections' AND column_name = 'failureReason') THEN
        ALTER TABLE "wordpress_connections" ADD COLUMN "failureReason" VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wordpress_connections' AND column_name = 'revokedAt') THEN
        ALTER TABLE "wordpress_connections" ADD COLUMN "revokedAt" TIMESTAMP(6) WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wordpress_connections' AND column_name = 'lastSyncedAt') THEN
        ALTER TABLE "wordpress_connections" ADD COLUMN "lastSyncedAt" TIMESTAMP(6) WITH TIME ZONE;
    END IF;
END $$;

-- CreateTable: block_templates
CREATE TABLE IF NOT EXISTS "block_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500),
    "type" VARCHAR(50) NOT NULL DEFAULT 'custom',
    "content" JSONB NOT NULL,
    "templateLock" VARCHAR(50),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "assignedPageIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workspaceId" UUID,
    "organizationId" UUID,
    "userId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "block_templates_slug_workspaceId_key" UNIQUE ("slug", "workspaceId"),
    CONSTRAINT "block_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "block_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "block_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "block_templates_workspaceId_idx" ON "block_templates"("workspaceId");
CREATE INDEX IF NOT EXISTS "block_templates_organizationId_idx" ON "block_templates"("organizationId");
CREATE INDEX IF NOT EXISTS "block_templates_userId_idx" ON "block_templates"("userId");
CREATE INDEX IF NOT EXISTS "block_templates_type_idx" ON "block_templates"("type");

-- CreateTable: template_parts
CREATE TABLE IF NOT EXISTS "template_parts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "area" VARCHAR(50) NOT NULL DEFAULT 'uncategorized',
    "content" JSONB NOT NULL,
    "workspaceId" UUID,
    "organizationId" UUID,
    "userId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_parts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "template_parts_slug_workspaceId_key" UNIQUE ("slug", "workspaceId"),
    CONSTRAINT "template_parts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "template_parts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "template_parts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "template_parts_workspaceId_idx" ON "template_parts"("workspaceId");
CREATE INDEX IF NOT EXISTS "template_parts_organizationId_idx" ON "template_parts"("organizationId");
CREATE INDEX IF NOT EXISTS "template_parts_userId_idx" ON "template_parts"("userId");
CREATE INDEX IF NOT EXISTS "template_parts_area_idx" ON "template_parts"("area");

-- CreateTable: global_style_configs
CREATE TABLE IF NOT EXISTS "global_style_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL DEFAULT 'Default Global Styles',
    "styles" JSONB NOT NULL,
    "workspaceId" UUID,
    "organizationId" UUID,
    "userId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_style_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "global_style_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "global_style_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "global_style_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "global_style_configs_workspaceId_idx" ON "global_style_configs"("workspaceId");
CREATE INDEX IF NOT EXISTS "global_style_configs_organizationId_idx" ON "global_style_configs"("organizationId");
CREATE INDEX IF NOT EXISTS "global_style_configs_userId_idx" ON "global_style_configs"("userId");
