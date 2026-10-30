-- CreateTable
CREATE TABLE IF NOT EXISTS "deployments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    "environment" VARCHAR(50) NOT NULL DEFAULT 'PRODUCTION',
    "destinationType" VARCHAR(50) NOT NULL DEFAULT 'INTERNAL',
    "destinationRef" VARCHAR(500),
    "sourceRevisionId" UUID,
    "metadata" JSONB DEFAULT '{}',
    "error" JSONB,
    "startedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6) WITH TIME ZONE,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "deployments_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "deployments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deployments_websiteId_idx" ON "deployments"("websiteId");
CREATE INDEX IF NOT EXISTS "deployments_websiteId_createdAt_idx" ON "deployments"("websiteId", "createdAt");
CREATE INDEX IF NOT EXISTS "deployments_status_idx" ON "deployments"("status");
