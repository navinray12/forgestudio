-- AlterTable users (add optimizationCredits)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'optimizationCredits') THEN
        ALTER TABLE "users" ADD COLUMN "optimizationCredits" INTEGER NOT NULL DEFAULT 250;
    END IF;
END $$;

-- CreateTable background_jobs
CREATE TABLE IF NOT EXISTS "background_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" VARCHAR(2000),
    "runAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP WITH TIME ZONE,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "background_jobs_status_runAt_idx" ON "background_jobs"("status", "runAt");
CREATE INDEX IF NOT EXISTS "background_jobs_type_idx" ON "background_jobs"("type");

-- CreateTable media_assets
CREATE TABLE IF NOT EXISTS "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "websiteId" UUID,
    "filename" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "url" VARCHAR(1000) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" VARCHAR(500),
    "format" VARCHAR(50) NOT NULL DEFAULT 'ORIGINAL',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "media_assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "media_assets_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "media_assets_userId_idx" ON "media_assets"("userId");
CREATE INDEX IF NOT EXISTS "media_assets_websiteId_idx" ON "media_assets"("websiteId");

-- CreateTable site_mailer_configs
CREATE TABLE IF NOT EXISTS "site_mailer_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "host" VARCHAR(255) NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR(500) NOT NULL,
    "fromName" VARCHAR(255) NOT NULL,
    "fromEmail" VARCHAR(255) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_mailer_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_mailer_configs_websiteId_key" UNIQUE ("websiteId"),
    CONSTRAINT "site_mailer_configs_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable email_delivery_logs
CREATE TABLE IF NOT EXISTS "email_delivery_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'SENT',
    "error" VARCHAR(2000),
    "sentAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "email_delivery_logs_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "email_delivery_logs_websiteId_sentAt_idx" ON "email_delivery_logs"("websiteId", "sentAt");

-- CreateTable site_performance_metrics
CREATE TABLE IF NOT EXISTS "site_performance_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "ttfbMs" INTEGER NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 200,
    "score" INTEGER NOT NULL DEFAULT 95,
    "checkedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_performance_metrics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_performance_metrics_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "site_performance_metrics_websiteId_checkedAt_idx" ON "site_performance_metrics"("websiteId", "checkedAt");

-- CreateTable media_optimization_assets
CREATE TABLE IF NOT EXISTS "media_optimization_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "originalUrl" VARCHAR(1000) NOT NULL,
    "optimizedUrl" VARCHAR(1000) NOT NULL,
    "originalBytes" INTEGER NOT NULL,
    "optimizedBytes" INTEGER NOT NULL,
    "format" VARCHAR(50) NOT NULL DEFAULT 'webp',
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPTIMIZED',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_optimization_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "media_optimization_assets_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "media_optimization_assets_websiteId_createdAt_idx" ON "media_optimization_assets"("websiteId", "createdAt");

-- CreateTable optimization_credit_ledgers
CREATE TABLE IF NOT EXISTS "optimization_credit_ledgers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "websiteId" UUID,
    "creditsUsed" INTEGER NOT NULL,
    "actionType" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimization_credit_ledgers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "optimization_credit_ledgers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "optimization_credit_ledgers_userId_createdAt_idx" ON "optimization_credit_ledgers"("userId", "createdAt");

-- CreateTable licenses
CREATE TABLE IF NOT EXISTS "licenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "userId" UUID NOT NULL,
    "planSlug" VARCHAR(50) NOT NULL,
    "maxSites" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "licenses_key_key" UNIQUE ("key"),
    CONSTRAINT "licenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "licenses_userId_idx" ON "licenses"("userId");
CREATE INDEX IF NOT EXISTS "licenses_key_idx" ON "licenses"("key");

-- CreateTable license_activations
CREATE TABLE IF NOT EXISTS "license_activations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "licenseId" UUID NOT NULL,
    "siteUrl" VARCHAR(500) NOT NULL,
    "siteDomain" VARCHAR(255) NOT NULL,
    "ipAddress" VARCHAR(100),
    "isLocalhost" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPingAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_activations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "license_activations_licenseId_siteDomain_key" UNIQUE ("licenseId", "siteDomain"),
    CONSTRAINT "license_activations_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "license_activations_licenseId_idx" ON "license_activations"("licenseId");
CREATE INDEX IF NOT EXISTS "license_activations_siteDomain_idx" ON "license_activations"("siteDomain");

-- CreateTable white_label_configs
CREATE TABLE IF NOT EXISTS "white_label_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "agencyName" VARCHAR(255),
    "logoUrl" VARCHAR(1000),
    "faviconUrl" VARCHAR(1000),
    "hideForgeBranding" BOOLEAN NOT NULL DEFAULT false,
    "customCss" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "white_label_configs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "white_label_configs_userId_key" UNIQUE ("userId"),
    CONSTRAINT "white_label_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable billing_invoices
CREATE TABLE IF NOT EXISTS "billing_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "planId" VARCHAR(100) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(50) NOT NULL DEFAULT 'PAID',
    "invoiceNumber" VARCHAR(100) NOT NULL,
    "billingPeriodStart" TIMESTAMP WITH TIME ZONE NOT NULL,
    "billingPeriodEnd" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "billing_invoices_invoiceNumber_key" UNIQUE ("invoiceNumber"),
    CONSTRAINT "billing_invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "billing_invoices_userId_idx" ON "billing_invoices"("userId");
CREATE INDEX IF NOT EXISTS "billing_invoices_invoiceNumber_idx" ON "billing_invoices"("invoiceNumber");
