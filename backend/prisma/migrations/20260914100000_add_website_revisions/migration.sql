-- CreateTable
CREATE TABLE IF NOT EXISTS "website_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "revisionType" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    "description" VARCHAR(500),
    "data" JSONB NOT NULL,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "website_revisions_websiteId_version_key" ON "website_revisions"("websiteId", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "website_revisions_websiteId_idx" ON "website_revisions"("websiteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "website_revisions_websiteId_createdAt_idx" ON "website_revisions"("websiteId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'website_revisions_websiteId_fkey'
    ) THEN
        ALTER TABLE "website_revisions" ADD CONSTRAINT "website_revisions_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'website_revisions_createdBy_fkey'
    ) THEN
        ALTER TABLE "website_revisions" ADD CONSTRAINT "website_revisions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
