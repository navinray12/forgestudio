-- CreateTable: wordpress_connections
CREATE TABLE IF NOT EXISTS "wordpress_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "websiteId" UUID NOT NULL,
    "siteUrl" VARCHAR(500) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
    "wpSiteName" VARCHAR(255),
    "apiKeyHash" VARCHAR(255) NOT NULL,
    "capabilities" JSONB DEFAULT '[]',
    "metadata" JSONB DEFAULT '{}',
    "lastVerifiedAt" TIMESTAMP(6) WITH TIME ZONE,
    "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wordpress_connections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wordpress_connections_websiteId_key" UNIQUE ("websiteId"),
    CONSTRAINT "wordpress_connections_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "wordpress_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wordpress_connections_userId_idx" ON "wordpress_connections"("userId");

-- CreateTable: wordpress_page_mappings
CREATE TABLE IF NOT EXISTS "wordpress_page_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "forgePageId" VARCHAR(100) NOT NULL,
    "wpPostId" INTEGER NOT NULL,
    "wpPostSlug" VARCHAR(255),
    "wpPostUrl" VARCHAR(500),
    "lastSyncedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wordpress_page_mappings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wordpress_page_mappings_websiteId_forgePageId_key" UNIQUE ("websiteId", "forgePageId"),
    CONSTRAINT "wordpress_page_mappings_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "wordpress_page_mappings_websiteId_idx" ON "wordpress_page_mappings"("websiteId");
