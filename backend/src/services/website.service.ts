import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { checkWebsiteLimit } from "./subscription.service.js";
import crypto from "crypto";
import { canUserAccessResource } from "./permission.service.js";
import { recordAuditLog } from "./audit.service.js";

const db = prisma as any;

/**
 * Ensure websites table exists in PostgreSQL
 */
export async function initWebsiteTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS websites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        "editorData" JSONB NOT NULL DEFAULT '{"version":1,"elements":[]}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites("userId");
    `);
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS website_revisions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          version INTEGER NOT NULL,
          "revisionType" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
          description VARCHAR(500),
          data JSONB NOT NULL,
          "createdBy" UUID REFERENCES users(id) ON DELETE SET NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS website_revisions_websiteId_version_key ON website_revisions("websiteId", version);
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS website_revisions_websiteId_idx ON website_revisions("websiteId");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS website_revisions_websiteId_createdAt_idx ON website_revisions("websiteId", "createdAt");
      `);
    } catch (revTableErr) {
      // Table or constraint already exists
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS deployments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          version INTEGER NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
          environment VARCHAR(50) NOT NULL DEFAULT 'PRODUCTION',
          "destinationType" VARCHAR(50) NOT NULL DEFAULT 'INTERNAL',
          "destinationRef" VARCHAR(500),
          "sourceRevisionId" UUID,
          metadata JSONB DEFAULT '{}',
          error JSONB,
          "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "completedAt" TIMESTAMP WITH TIME ZONE,
          "createdBy" UUID REFERENCES users(id) ON DELETE SET NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS deployments_websiteId_idx ON deployments("websiteId");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS deployments_websiteId_createdAt_idx ON deployments("websiteId", "createdAt");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS deployments_status_idx ON deployments("status");
      `);
    } catch (depTableErr) {
      // Table or index already exists
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS wordpress_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "websiteId" UUID NOT NULL UNIQUE REFERENCES websites(id) ON DELETE CASCADE,
          "siteUrl" VARCHAR(500) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
          "wpSiteName" VARCHAR(255),
          "apiKeyHash" VARCHAR(255) NOT NULL,
          capabilities JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          "lastVerifiedAt" TIMESTAMP WITH TIME ZONE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS wordpress_connections_userId_idx ON wordpress_connections("userId");
      `);
    } catch (wpConnErr) {
      // Table already exists
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS wordpress_page_mappings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          "forgePageId" VARCHAR(100) NOT NULL,
          "wpPostId" INTEGER NOT NULL,
          "wpPostSlug" VARCHAR(255),
          "wpPostUrl" VARCHAR(500),
          "lastSyncedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT "wordpress_page_mappings_websiteId_forgePageId_key" UNIQUE ("websiteId", "forgePageId")
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS wordpress_page_mappings_websiteId_idx ON wordpress_page_mappings("websiteId");
      `);
    } catch (wpMapErr) {
      // Table already exists
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS workspaces (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
    } catch (wsErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS teams (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description VARCHAR(500),
          "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
    } catch (tmErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'teamId') THEN
            ALTER TABLE websites ADD COLUMN "teamId" UUID REFERENCES teams(id) ON DELETE SET NULL;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'workspaceId') THEN
            ALTER TABLE websites ADD COLUMN "workspaceId" UUID REFERENCES workspaces(id) ON DELETE SET NULL;
          ELSE
            ALTER TABLE websites ALTER COLUMN "workspaceId" DROP NOT NULL;
          END IF;
        END $$;
      `);
    } catch (colErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS team_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "teamId" UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL DEFAULT 'DESIGNER',
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT "team_members_teamId_userId_key" UNIQUE ("teamId", "userId")
        );
      `);
    } catch (tmmErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS team_invitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "teamId" UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'DESIGNER',
          "tokenHash" VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "invitedBy" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
    } catch (tmiErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS website_invitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'DESIGNER',
          "tokenHash" VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "invitedBy" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
    } catch (wsiErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS developer_api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          "tokenHash" VARCHAR(255) UNIQUE NOT NULL,
          scopes JSONB DEFAULT '["websites:read"]',
          "lastUsedAt" TIMESTAMP WITH TIME ZONE,
          "revokedAt" TIMESTAMP WITH TIME ZONE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS developer_api_keys_userId_idx ON developer_api_keys("userId");
      `);
    } catch (dakErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS background_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(100) NOT NULL,
          payload JSONB DEFAULT '{}',
          status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
          attempts INTEGER NOT NULL DEFAULT 0,
          "maxAttempts" INTEGER NOT NULL DEFAULT 3,
          "lastError" VARCHAR(2000),
          "runAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "startedAt" TIMESTAMP WITH TIME ZONE,
          "completedAt" TIMESTAMP WITH TIME ZONE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS background_jobs_status_runAt_idx ON background_jobs("status", "runAt");
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS background_jobs_type_idx ON background_jobs("type");
      `);
    } catch (bjErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS granular_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "resourceId" VARCHAR(100) NOT NULL DEFAULT '*',
          capability VARCHAR(100) NOT NULL,
          effect VARCHAR(20) NOT NULL DEFAULT 'ALLOW',
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT "granular_permissions_websiteId_userId_resourceId_capability_key" UNIQUE ("websiteId", "userId", "resourceId", "capability")
        );
      `);
    } catch (gpErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          settings JSONB DEFAULT '{}',
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
    } catch (orgErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'organizationId') THEN
            ALTER TABLE workspaces ADD COLUMN "organizationId" UUID REFERENCES organizations(id) ON DELETE SET NULL;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'settings') THEN
            ALTER TABLE workspaces ADD COLUMN settings JSONB DEFAULT '{}';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'organizationId') THEN
            ALTER TABLE websites ADD COLUMN "organizationId" UUID REFERENCES organizations(id) ON DELETE SET NULL;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'websites' AND column_name = 'approvalWorkflowEnabled') THEN
            ALTER TABLE websites ADD COLUMN "approvalWorkflowEnabled" BOOLEAN NOT NULL DEFAULT false;
          END IF;
        END $$;
      `);
    } catch (colErr2) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS organization_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "organizationId" UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT "organization_members_organizationId_userId_key" UNIQUE ("organizationId", "userId")
        );
      `);
    } catch (omErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS workspace_members (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "workspaceId" UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          CONSTRAINT "workspace_members_workspaceId_userId_key" UNIQUE ("workspaceId", "userId")
        );
      `);
    } catch (wmErr) {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS publish_approval_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "websiteId" UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
          "requesterId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "reviewerId" UUID REFERENCES users(id) ON DELETE SET NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          "targetVersion" INTEGER NOT NULL,
          "reviewNotes" VARCHAR(1000),
          snapshot JSONB NOT NULL,
          "reviewedAt" TIMESTAMP WITH TIME ZONE,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
    } catch (parErr) {}
  } catch (error) {
    console.error("Website table initialization log:", error);
  }
}

// Auto-run initialization
initWebsiteTable();

function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${baseSlug || "website"}-${randomSuffix}`;
}

/**
 * Get all websites belonging to a specific user
 */
export async function getUserWebsites(userId: string) {
  try {
    if (db?.website?.findMany) {
      const websites = await db.website.findMany({
        where: { userId },
        include: {
          wpConnection: {
            select: {
              id: true,
              siteUrl: true,
              wpSiteName: true,
              status: true,
              lastVerifiedAt: true,
              createdAt: true,
            },
          },
          mailerConfig: {
            select: {
              id: true,
              host: true,
              port: true,
              username: true,
              fromName: true,
              fromEmail: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      if (websites) return websites;
    }

    const rawWebsites: any[] = await prisma.$queryRaw`
      SELECT w.id, w."userId", w.name, w.slug, w.status, w."editorData", w."createdAt", w."updatedAt",
        (SELECT row_to_json(wp) FROM (
          SELECT id, "siteUrl", "wpSiteName", status, "lastVerifiedAt", "createdAt"
          FROM wordpress_connections WHERE "websiteId" = w.id
        ) wp) as "wpConnection",
        (SELECT row_to_json(mc) FROM (
          SELECT id, host, port, username, "fromName", "fromEmail", "isVerified"
          FROM site_mailer_configs WHERE "websiteId" = w.id
        ) mc) as "mailerConfig"
      FROM websites w
      WHERE w."userId" = ${userId}::uuid
      ORDER BY w."createdAt" DESC
    `;
    return rawWebsites || [];
  } catch (error) {
    console.error("Error fetching user websites:", error);
    return [];
  }
}

/**
 * Aggregated details for Managed Site View (F-427)
 */
export async function getManagedWebsiteDetails(websiteId: string, userId: string) {
  const website = await getWebsiteById(websiteId, userId);

  let wpConnection: any = null;
  let wpPageMappings: any[] = [];
  let mailerConfig: any = null;
  let recentDeployments: any[] = [];
  let recentLogs: any[] = [];

  try {
    if (db?.wordPressConnection?.findUnique) {
      wpConnection = await db.wordPressConnection.findUnique({ where: { websiteId } });
    }
  } catch {}

  try {
    if (db?.wordPressPageMapping?.findMany) {
      wpPageMappings = await db.wordPressPageMapping.findMany({
        where: { websiteId },
        orderBy: { lastSyncedAt: "desc" },
        take: 20,
      });
    }
  } catch {}

  try {
    const { getMailerConfig } = await import("./siteMailer.service.js");
    mailerConfig = await getMailerConfig(websiteId);
  } catch {}

  try {
    if (db?.deployment?.findMany) {
      recentDeployments = await db.deployment.findMany({
        where: { websiteId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    }
  } catch {}

  try {
    const { getDeliveryLogs } = await import("./siteMailer.service.js");
    const logRes = await getDeliveryLogs(websiteId, { page: 1, limit: 5 });
    recentLogs = logRes.logs || [];
  } catch {}

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const cookieConsent = editorData?.siteSettings?.cookieConsent || editorData?.cookieConsent || {
    enabled: false,
    message: "We use cookies to improve your experience on our website.",
    buttonText: "Accept All",
    policyUrl: "",
    theme: "dark",
  };

  let performanceStats: any = null;
  let optimizationStats: any = null;

  try {
    const { getPerformanceSummary } = await import("./sitePerformance.service.js");
    performanceStats = await getPerformanceSummary(websiteId, userId);
  } catch {}

  try {
    const { getOptimizationStats } = await import("./imageOptimization.service.js");
    optimizationStats = await getOptimizationStats(websiteId, userId);
  } catch {}

  let staging: any = null;
  try {
    const { getStagingEnvironment } = await import("./staging.service.js");
    staging = await getStagingEnvironment(websiteId, userId);
  } catch {}

  const backups = Array.isArray(editorData.backups)
    ? editorData.backups.map((b: any) => {
        const { snapshot: _omit, ...meta } = b;
        return meta;
      })
    : [];
  const backupPolicy = editorData.backupPolicy || null;
  const customDomains = Array.isArray(editorData.customDomains) ? editorData.customDomains : [];
  const hostingConfig = editorData?.hostingConfig || {};
  const serverConfig = hostingConfig.serverConfig || {
    phpMemoryLimit: "256M",
    phpMaxExecutionTime: 60,
  };

  return {
    website: {
      id: website.id,
      name: website.name,
      slug: website.slug,
      status: website.status,
      createdAt: website.createdAt,
      updatedAt: website.updatedAt,
      pagesCount: Array.isArray(editorData.pages) ? editorData.pages.length : 1,
    },
    wpConnection: wpConnection
      ? {
          id: wpConnection.id,
          siteUrl: wpConnection.siteUrl,
          wpSiteName: wpConnection.wpSiteName,
          status: wpConnection.status,
          capabilities: wpConnection.capabilities,
          lastVerifiedAt: wpConnection.lastVerifiedAt,
        }
      : null,
    wpPageMappings,
    mailerConfig,
    cookieConsent,
    recentDeployments,
    recentLogs,
    performanceStats,
    optimizationStats,
    staging,
    backups,
    backupPolicy,
    customDomains,
    serverConfig,
    hostingConfig: {
      siteLock: hostingConfig.siteLock ? {
        enabled: !!hostingConfig.siteLock.enabled,
        hint: hostingConfig.siteLock.hint || "",
        hasPassword: !!hostingConfig.siteLock.passwordHash,
      } : { enabled: false, hint: "", hasPassword: false },
      privacy: hostingConfig.privacy || { noIndex: false, maintenanceMode: false },
      ipFirewall: hostingConfig.ipFirewall || { mode: "deny", ips: [] },
      cdn: hostingConfig.cdn || { cloudflareEnabled: false },
      cache: hostingConfig.cache || { lastPurgedAt: null },
      lastSecurityAudit: hostingConfig.lastSecurityAudit || null,
    },
  };
}

/**
 * F-438: Update cookie consent configuration for a website
 */
export async function updateCookieConsentConfig(websiteId: string, userId: string, config: any) {
  const website = await getWebsiteById(websiteId, userId);
  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  if (!editorData.siteSettings) {
    editorData.siteSettings = {};
  }

  editorData.siteSettings.cookieConsent = {
    enabled: Boolean(config.enabled),
    message: String(config.message || "We use cookies to enhance your experience."),
    buttonText: String(config.buttonText || "Accept All"),
    policyUrl: String(config.policyUrl || ""),
    theme: config.theme === "light" ? "light" : "dark",
  };

  await updateWebsiteEditorData(websiteId, userId, editorData);
  return editorData.siteSettings.cookieConsent;
}


/**
 * Get a single website by ID with ownership check
 */
export async function getWebsiteById(websiteId: string, userId: string) {
  try {
    let website: any = null;
    let permission = "NONE";

    if (db?.website?.findUnique) {
      website = await db.website.findUnique({
        where: { id: websiteId },
        include: {
          customCodeSnippets: true
        }
      });

      if (website) {
        if (website.userId === userId) {
          permission = "OWNER";
        } else {
          // Check WebsiteCollaborator explicitly
          const collab = await db.websiteCollaborator.findUnique({
            where: {
              websiteId_userId: { websiteId, userId }
            }
          });
          if (collab) {
            permission = collab.permission;
          } else {
            website = null; // Purge access
          }
        }
      }
    }

    if (!website) {
      // Raw Fallback mapped exactly to original flow logic but integrating permissions
      const rawWebsites: any[] = await prisma.$queryRaw`
        SELECT w.id, w."userId", w.name, w.slug, w.status, w."editorData", w."createdAt", w."updatedAt",
               CASE WHEN w."userId" = ${userId}::uuid THEN 'OWNER' ELSE c.permission END as "userPermission"
        FROM websites w
        LEFT JOIN website_collaborators c ON c."websiteId" = w.id AND c."userId" = ${userId}::uuid
        WHERE w.id = ${websiteId}::uuid AND (w."userId" = ${userId}::uuid OR c.id IS NOT NULL)
        LIMIT 1
      `;
      if (rawWebsites && rawWebsites.length > 0) {
        website = rawWebsites[0];
        permission = website.userPermission || "REVIEWER";
        delete website.userPermission;
      }
    }

    if (!website) {
      throw new AppError(
        "Website not found or access denied",
        404,
        "WEBSITE_NOT_FOUND"
      );
    }

    // Embed current user's explicit authorization
    return { ...website, userPermission: permission };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch website", 500, "WEBSITE_FETCH_FAILED");
  }
}

/**
 * Create a new website with subscription limit check
 */
export async function createWebsite(
  userIdOrOptions: string | { userId: string; name: string; slug?: string; editorData?: any; templateId?: string },
  nameArg?: string
) {
  let userId: string;
  let rawName: string;
  let customSlug: string | undefined;
  let customEditorData: any | undefined;

  if (typeof userIdOrOptions === "object" && userIdOrOptions !== null) {
    userId = userIdOrOptions.userId;
    rawName = userIdOrOptions.name;
    customSlug = userIdOrOptions.slug;
    customEditorData = userIdOrOptions.editorData;
  } else {
    userId = userIdOrOptions;
    rawName = nameArg || "";
  }

  const trimmedName = rawName?.trim();
  if (!trimmedName) {
    throw new AppError("Website name is required", 400, "INVALID_NAME");
  }

  // 1. Get current website count for user
  const currentWebsites = await getUserWebsites(userId);
  const currentCount = currentWebsites.length;

  // 2. Check subscription website limit
  const limitCheck = await checkWebsiteLimit(userId, currentCount);

  if (!limitCheck.allowed) {
    const limit = limitCheck.limit || 1;
    throw new AppError(
      `Your current plan allows up to ${limit} website${limit === 1 ? "" : "s"}. Please upgrade your plan to create another website.`,
      403,
      "WEBSITE_LIMIT_EXCEEDED"
    );
  }

  const slug = customSlug || generateSlug(trimmedName);
  const initialEditorData = customEditorData || {
    version: 1,
    elements: [],
  };

  try {
    if (db?.website?.create) {
      const newWebsite = await db.website.create({
        data: {
          userId,
          name: trimmedName,
          slug,
          status: "DRAFT",
          editorData: initialEditorData,
        },
      });
      return newWebsite;
    }

    // Raw SQL Fallback
    const initialJsonStr = JSON.stringify(initialEditorData);
    const created: any[] = await prisma.$queryRaw`
      INSERT INTO websites (id, "userId", name, slug, status, "editorData", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${userId}::uuid, ${trimmedName}, ${slug}, 'DRAFT', ${initialJsonStr}::jsonb, NOW(), NOW())
      RETURNING id, "userId", name, slug, status, "editorData", "createdAt", "updatedAt"
    `;

    return created[0];
  } catch (error) {
    console.error("Error creating website:", error);
    throw new AppError("Failed to create website", 500, "CREATE_FAILED");
  }
}

/**
 * Validates the canonical editorData structure and guards against malformed input or prototype pollution.
 */
export function validateCanonicalEditorData(data: any): void {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("Invalid editorData: must be a valid JSON object", 400, "INVALID_CANONICAL_DATA");
  }

  // Prototype pollution guard
  if ("__proto__" in data || "constructor" in data || "prototype" in data) {
    delete (data as any).__proto__;
    delete (data as any).constructor;
    delete (data as any).prototype;
  }

  // Check elements array
  if (data.elements !== undefined && !Array.isArray(data.elements)) {
    throw new AppError("Invalid editorData: elements must be an array", 400, "INVALID_CANONICAL_DATA");
  }

  // Check pages array
  if (data.pages !== undefined) {
    if (!Array.isArray(data.pages)) {
      throw new AppError("Invalid editorData: pages must be an array", 400, "INVALID_CANONICAL_DATA");
    }
    for (const page of data.pages) {
      if (!page || typeof page !== "object") {
        throw new AppError("Invalid editorData: each page entry must be an object", 400, "INVALID_CANONICAL_DATA");
      }
      if (!page.id || typeof page.id !== "string") {
        throw new AppError("Invalid editorData: page missing valid string id", 400, "INVALID_CANONICAL_DATA");
      }
      if (page.elements !== undefined && !Array.isArray(page.elements)) {
        throw new AppError(`Invalid editorData: page "${page.id}" elements must be an array`, 400, "INVALID_CANONICAL_DATA");
      }
    }
  }

  // Check siteParts if present
  if (data.siteParts !== undefined && data.siteParts !== null) {
    if (typeof data.siteParts !== "object" || Array.isArray(data.siteParts)) {
      throw new AppError("Invalid editorData: siteParts must be an object", 400, "INVALID_CANONICAL_DATA");
    }
    if (data.siteParts.header && data.siteParts.header.elements && !Array.isArray(data.siteParts.header.elements)) {
      throw new AppError("Invalid editorData: siteParts.header.elements must be an array", 400, "INVALID_CANONICAL_DATA");
    }
    if (data.siteParts.footer && data.siteParts.footer.elements && !Array.isArray(data.siteParts.footer.elements)) {
      throw new AppError("Invalid editorData: siteParts.footer.elements must be an array", 400, "INVALID_CANONICAL_DATA");
    }
  }
}

/**
 * Update general website metadata and attributes
 */
export async function updateWebsite(
  websiteId: string,
  data: { name?: string; slug?: string; editorData?: any; status?: string },
  userId: string
) {
  // Implicit ownership / permission check via getWebsiteById
  await getWebsiteById(websiteId, userId);

  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.slug !== undefined) updatePayload.slug = data.slug;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.editorData !== undefined) {
    validateCanonicalEditorData(data.editorData);
    updatePayload.editorData = data.editorData;
  }

  const updated = await prisma.website.update({
    where: { id: websiteId },
    data: updatePayload,
  });

  return updated;
}

/**
 * Update editor JSON structure for a website
 */
export async function updateWebsiteEditorData(
  websiteId: string,
  userId: string,
  editorData: any,
  performanceSettings?: any
) {
  validateCanonicalEditorData(editorData);

  // Ensure website exists and fetch permission boundaries
  const website = await getWebsiteById(websiteId, userId);

  const canEditDesign = await canUserAccessResource(userId, websiteId, "*", "EDIT_DESIGN");
  const canEditContent = await canUserAccessResource(userId, websiteId, "*", "EDIT_CONTENT");

  if (!canEditDesign && !canEditContent) {
    throw new AppError("You do not have permission to edit this component.", 403, "FORBIDDEN");
  }

  // Safe Component / Content Editing Mode
  const isWebsiteOwner = website.userId === userId;
  const isCollaboratorAdmin = (website as unknown as any).userPermission === "ADMIN";
  const isAdmin = isWebsiteOwner || isCollaboratorAdmin;

  // Retrieve explicitly granted component accesses
  const explicitAccesses = await prisma.componentAccess.findMany({ where: { websiteId, userId } });
  const allowedComponentIds = new Set(explicitAccesses.map(a => a.componentId));

  const currentEditorData = typeof website.editorData === "string" ? JSON.parse(website.editorData) : website.editorData;

  const safeMerge = (currentEls: any[], newEls: any[]): any[] => {
    // 1. We must retain ALL protected components from currentEls, even if newEls omitted them (prevent unauthorized deletion).
    const mergedEls = [];

    // To handle reordering, we iterate through newEls, but we MUST inject missing protected ones.
    const allIds = new Set([...currentEls.map(c => c.id), ...newEls.map(n => n.id)]);

    // Actually, preserving order while mixing deleted/kept is tricky.
    // Let's iterate currentEls. If it's protected, keep it unchanged. If it's not protected, find incoming.
    for (const cEl of currentEls) {
      const isProtectedNode = cEl.isProtected === true;
      const userCanEdit = isAdmin || allowedComponentIds.has(cEl.id);

      // If protected and no rights, strictly preserve untouched.
      if (isProtectedNode && !userCanEdit) {
        mergedEls.push(cEl);
        continue;
      }

      const incoming = newEls.find(n => n.id === cEl.id);

      // If deleted by user
      if (!incoming) {
        // It's allowed to be deleted because they have rights.
        continue;
      }

      // If !canEditDesign && canEditContent
      if (!canEditDesign && canEditContent) {
        if (incoming.content !== undefined) cEl.content = incoming.content;
        if (incoming.src !== undefined) cEl.src = incoming.src;
        if (incoming.alt !== undefined) cEl.alt = incoming.alt;
        if (incoming.href !== undefined) cEl.href = incoming.href;
      } else {
        // Full design rights! Merge everything (classes, styles, etc).
        Object.assign(cEl, incoming);
      }

      // Recurse children
      if (cEl.children) {
        cEl.children = safeMerge(cEl.children, incoming.children || []);
      }

      mergedEls.push(cEl);
    }

    // Now append any newly created elements that didn't exist in currentEls
    for (const nEl of newEls) {
      if (!currentEls.find(c => c.id === nEl.id)) {
        mergedEls.push(nEl);
      }
    }

    return mergedEls;
  };

  const safeElements = safeMerge(currentEditorData.elements || [], editorData.elements || []);
  const safePopups = (currentEditorData.popups || []).map((p: any) => {
    const incomingP = (editorData.popups || []).find((ip: any) => ip.id === p.id);
    if (incomingP && p.elements && incomingP.elements) {
      p.elements = safeMerge(p.elements, incomingP.elements);
    }
    return p;
  });

  // Preserve multi-page pages and site parts safely without data loss
  let safePages = editorData.pages;
  if (Array.isArray(editorData.pages) && editorData.pages.length > 0) {
    const currentPages = Array.isArray(currentEditorData.pages) ? currentEditorData.pages : [];
    safePages = editorData.pages.map((p: any) => {
      const currentP = currentPages.find((cp: any) => cp.id === p.id);
      if (currentP && Array.isArray(currentP.elements) && Array.isArray(p.elements)) {
        return {
          ...p,
          elements: safeMerge(currentP.elements, p.elements),
        };
      }
      return p;
    });
  } else if (currentEditorData.pages) {
    safePages = currentEditorData.pages;
  }

  // Preserve siteParts (header and footer)
  let safeSiteParts = editorData.siteParts || currentEditorData.siteParts;
  if (safeSiteParts) {
    safeSiteParts = {
      ...(currentEditorData.siteParts || {}),
      ...(editorData.siteParts || {}),
    };
    if (editorData.siteParts?.header && currentEditorData.siteParts?.header?.elements && editorData.siteParts.header.elements) {
      safeSiteParts.header = {
        ...editorData.siteParts.header,
        elements: safeMerge(currentEditorData.siteParts.header.elements, editorData.siteParts.header.elements),
      };
    }
    if (editorData.siteParts?.footer && currentEditorData.siteParts?.footer?.elements && editorData.siteParts.footer.elements) {
      safeSiteParts.footer = {
        ...editorData.siteParts.footer,
        elements: safeMerge(currentEditorData.siteParts.footer.elements, editorData.siteParts.footer.elements),
      };
    }
  }

  editorData = {
    ...currentEditorData,
    ...editorData,
    elements: safeElements,
    popups: safePopups,
    ...(safePages !== undefined ? { pages: safePages } : {}),
    ...(safeSiteParts !== undefined ? { siteParts: safeSiteParts } : {}),
  };

  try {
    const isPublishing = editorData.publishing?.status === "PUBLISHED";
    if (db?.website?.update) {
      const updateData: any = {
        editorData,
        updatedAt: new Date(),
        ...(isPublishing ? { status: "PUBLISHED" } : {}),
      };
      if (performanceSettings !== undefined) {
        updateData.performanceSettings = performanceSettings;
      }
      const updated = await db.website.update({
        where: { id: websiteId },
        data: updateData,
      });
      return updated;
    }

    const jsonStr = JSON.stringify(editorData);
    let updated: any[];

    if (performanceSettings !== undefined) {
      const perfStr = JSON.stringify(performanceSettings);
      if (isPublishing) {
        updated = await prisma.$queryRaw`
           UPDATE websites
           SET "editorData" = ${jsonStr}::jsonb, "performanceSettings" = ${perfStr}::jsonb, status = 'PUBLISHED', "updatedAt" = NOW()
           WHERE id = ${websiteId}::uuid
           RETURNING id, "userId", name, slug, status, "editorData", "performanceSettings", "createdAt", "updatedAt"
         `;
      } else {
        updated = await prisma.$queryRaw`
           UPDATE websites
           SET "editorData" = ${jsonStr}::jsonb, "performanceSettings" = ${perfStr}::jsonb, "updatedAt" = NOW()
           WHERE id = ${websiteId}::uuid
           RETURNING id, "userId", name, slug, status, "editorData", "performanceSettings", "createdAt", "updatedAt"
         `;
      }
    } else {
      if (isPublishing) {
        updated = await prisma.$queryRaw`
           UPDATE websites
           SET "editorData" = ${jsonStr}::jsonb, status = 'PUBLISHED', "updatedAt" = NOW()
           WHERE id = ${websiteId}::uuid
           RETURNING id, "userId", name, slug, status, "editorData", "performanceSettings", "createdAt", "updatedAt"
         `;
      } else {
        updated = await prisma.$queryRaw`
           UPDATE websites
           SET "editorData" = ${jsonStr}::jsonb, "updatedAt" = NOW()
           WHERE id = ${websiteId}::uuid
           RETURNING id, "userId", name, slug, status, "editorData", "performanceSettings", "createdAt", "updatedAt"
         `;
      }
    }

    return updated[0];
  } catch (error) {
    console.error("Error updating website editor data:", error);
    throw new AppError("Failed to save website changes", 500, "SAVE_FAILED");
  }
}

/**
 * Delete a website with ownership check
 */
export async function deleteWebsite(websiteId: string, userId: string) {
  // Extract permission boundaries
  const website = await getWebsiteById(websiteId, userId);

  if (website.userPermission !== "OWNER") {
    throw new AppError("Only the owner can delete this project.", 403, "FORBIDDEN");
  }

  try {
    if (db?.website?.delete) {
      await db.website.delete({
        where: { id: websiteId },
      });
      return { success: true };
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM websites WHERE id = $1::uuid`,
      websiteId
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting website:", error);
    throw new AppError("Failed to delete website", 500, "DELETE_FAILED");
  }
}

export async function getWebsiteRoles(websiteId: string, userId: string) {
  const website = await getWebsiteById(websiteId, userId);

  const ownerData = await db.user.findUnique({ where: { id: website.userId } });
  const members = [{
    id: ownerData.id,
    name: ownerData.fullName || ownerData.email,
    email: ownerData.email,
    role: "OWNER"
  }];

  const collabs = await db.websiteCollaborator.findMany({
    where: { websiteId },
    include: { user: true }
  });

  for (const c of collabs) {
    if (c.user) {
      members.push({
        id: c.userId,
        name: c.user.fullName || c.user.email,
        email: c.user.email,
        role: c.permission
      });
    }
  }
  const invitationsList = await db.websiteInvitation.findMany({
    where: { websiteId, status: "PENDING" }
  });

  return { members, invitations: invitationsList };
}

export async function updateWebsiteRole(websiteId: string, requesterUserId: string, targetUserId: string, newRole: string) {
  const validRoles = ["ADMIN", "DESIGNER", "CONTENT_EDITOR", "REVIEWER"];
  if (!validRoles.includes(newRole)) {
    throw new AppError("Invalid role specified.", 400, "INVALID_ROLE");
  }

  const requesterSite = await getWebsiteById(websiteId, requesterUserId);
  const requesterRole = requesterSite.userPermission;

  if (requesterRole !== "OWNER" && requesterRole !== "ADMIN") {
    throw new AppError("You do not have permission to manage roles.", 403, "FORBIDDEN");
  }
  if (requesterUserId === targetUserId) {
    throw new AppError("You cannot change your own role.", 403, "FORBIDDEN");
  }

  const website = await db.website.findUnique({ where: { id: websiteId } });
  if (website.userId === targetUserId) {
    throw new AppError("Cannot change the role of the project owner.", 403, "FORBIDDEN");
  }

  const existing = await db.websiteCollaborator.findUnique({
    where: { websiteId_userId: { websiteId, userId: targetUserId } }
  });

  if (!existing) {
    throw new AppError("Collaborator not found.", 404, "NOT_FOUND");
  }

  await db.websiteCollaborator.update({
    where: { id: existing.id },
    data: { permission: newRole }
  });

  try {
    await prisma.auditLog.create({
      data: {
        userId: requesterUserId,
        action: "ROLE_UPDATED",
        targetResource: `website:${websiteId}`,
        details: { targetUserId, newRole, previousRole: existing.permission },
      },
    });
  } catch (e) {}

  return { success: true };
}

export async function inviteWebsiteMember(websiteId: string, inviterId: string, email: string, role: string = "DESIGNER") {
  const website = await getWebsiteById(websiteId, inviterId);
  if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN") {
    throw new AppError("You do not have permission to invite members.", 403, "FORBIDDEN");
  }

  const validRoles = ["ADMIN", "DESIGNER", "CONTENT_EDITOR", "REVIEWER"];
  if (!validRoles.includes(role)) {
    throw new AppError("Invalid role specified.", 400, "BAD_REQUEST");
  }

  const existingMember = await db.user.findUnique({
    where: { email },
    include: { collaborations: { where: { websiteId } } }
  });

  if (existingMember && (existingMember.collaborations.length > 0 || existingMember.id === website.userId)) {
    throw new AppError("User is already a member of this project.", 400, "BAD_REQUEST");
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  const invite = await db.websiteInvitation.create({
    data: {
      websiteId,
      email,
      role,
      tokenHash,
      status: "PENDING",
      expiresAt: expiry,
      invitedBy: inviterId
    }
  });

  try {
    await prisma.auditLog.create({
      data: {
        userId: inviterId,
        action: "COLLABORATOR_INVITED",
        targetResource: `website:${websiteId}`,
        details: { email, role, inviteId: invite.id },
      },
    });
  } catch (e) {}

  return { inviteId: invite.id, token };
}

export async function acceptWebsiteInvitation(token: string, userId: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invite = await db.websiteInvitation.findUnique({ where: { tokenHash } });
  if (!invite) throw new AppError("Invalid invitation", 400, "BAD_REQUEST");
  if (invite.status !== "PENDING") throw new AppError("Invitation is already processed.", 400, "BAD_REQUEST");
  if (invite.expiresAt < new Date()) throw new AppError("Invitation expired.", 400, "BAD_REQUEST");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.email !== invite.email) throw new AppError("This invitation was sent to a different email address.", 400, "BAD_REQUEST");

  const existing = await db.websiteCollaborator.findUnique({
    where: { websiteId_userId: { websiteId: invite.websiteId, userId } }
  });

  if (existing) {
    await db.websiteInvitation.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });
    return { success: true, websiteId: invite.websiteId };
  }

  await db.$transaction([
    db.websiteCollaborator.create({
      data: {
        websiteId: invite.websiteId,
        userId,
        permission: invite.role
      }
    }),
    db.websiteInvitation.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" }
    })
  ]);

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "INVITATION_ACCEPTED",
        targetResource: `website:${invite.websiteId}`,
        details: { inviteId: invite.id, role: invite.role },
      },
    });
  } catch (e) {}

  return { success: true, websiteId: invite.websiteId };
}

export async function removeWebsiteMember(websiteId: string, requesterId: string, targetUserId: string) {
  const website = await getWebsiteById(websiteId, requesterId);

  if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN") {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  const project = await db.website.findUnique({ where: { id: websiteId } });
  if (project?.userId === targetUserId) {
    throw new AppError("Cannot remove the project owner.", 403, "FORBIDDEN");
  }

  await db.websiteCollaborator.delete({
    where: { websiteId_userId: { websiteId, userId: targetUserId } }
  });

  try {
    await prisma.auditLog.create({
      data: {
        userId: requesterId,
        action: "COLLABORATOR_REMOVED",
        targetResource: `website:${websiteId}`,
        details: { targetUserId },
      },
    });
  } catch (e) {}

  return { success: true };
}

export async function revokeWebsiteInvitation(inviteId: string, requesterUserId: string) {
  const invite = await db.websiteInvitation.findUnique({ where: { id: inviteId } });
  if (!invite) throw new AppError("Invitation not found", 404, "NOT_FOUND");

  const website = await getWebsiteById(invite.websiteId, requesterUserId);
  if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN") {
    throw new AppError("You do not have permission to manage invitations.", 403, "FORBIDDEN");
  }

  const updated = await db.websiteInvitation.update({
    where: { id: inviteId },
    data: { status: "REVOKED" }
  });

  try {
    await prisma.auditLog.create({
      data: {
        userId: requesterUserId,
        action: "INVITATION_REVOKED",
        targetResource: `website:${invite.websiteId}`,
        details: { inviteId, email: invite.email, role: invite.role },
      },
    });
  } catch (e) {}

  return { success: true, invite: { id: updated.id, status: updated.status } };
}

export async function resendWebsiteInvitation(inviteId: string, requesterUserId: string) {
  const invite = await db.websiteInvitation.findUnique({ where: { id: inviteId } });
  if (!invite) throw new AppError("Invitation not found", 404, "NOT_FOUND");

  const website = await getWebsiteById(invite.websiteId, requesterUserId);
  if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN") {
    throw new AppError("You do not have permission to manage invitations.", 403, "FORBIDDEN");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  await db.websiteInvitation.update({
    where: { id: inviteId },
    data: {
      tokenHash,
      status: "PENDING",
      expiresAt: expiry,
    }
  });

  try {
    await prisma.auditLog.create({
      data: {
        userId: requesterUserId,
        action: "INVITATION_RESENT",
        targetResource: `website:${invite.websiteId}`,
        details: { inviteId, email: invite.email, role: invite.role },
      },
    });
  } catch (e) {}

  return { success: true, inviteId: invite.id, token };
}

/**
 * Public Website DTO Projection (Comment 8)
 * Strictly unauthenticated read endpoint for published websites.
 * Strips all user IDs, collaborator data, session info, credentials, and internal configs.
 */
export interface PublicWebsiteDTO {
  id: string;
  name: string;
  slug: string;
  status: string;
  editorData: {
    version: number;
    homePageId?: string;
    pages: any[];
    elements: any[];
    siteParts?: any;
    globalStyles?: any;
    breakpoints?: any[];
    popups?: any[];
    pageCss?: string;
    globalSettings?: any;
    siteSettings?: {
      siteName?: string;
      siteLogo?: string;
      favicon?: string;
      siteLanguage?: string;
      customHead?: string;
    };
    publishing?: {
      status: string;
      publishedAt?: string;
      version?: number;
    };
  };
  customCodeSnippets?: Array<{
    id: string;
    title: string | null;
    placement: string;
    code: string;
    priority?: number;
    language?: string;
  }>;
}

export interface DynamicContext {
  site?: {
    id?: string;
    name?: string;
    slug?: string;
    siteSettings?: {
      siteName?: string;
      siteLanguage?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  page?: {
    id?: string;
    name?: string;
    title?: string;
    slug?: string;
    isHome?: boolean;
    [key: string]: any;
  };
  entry?: {
    id?: string;
    title?: string;
    slug?: string;
    data?: Record<string, any>;
    [key: string]: any;
  };
  custom?: Record<string, string>;
}

/**
 * Evaluates theme builder display conditions (include:all, include:singular:home, include:page:id, exclude:page:id, etc.)
 */
export function matchesThemeCondition(
  conditions: string[] | undefined,
  pageContext: { pageId?: string; isHome?: boolean; slug?: string }
): boolean {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return true; // Default: include everywhere
  }

  // 1. Check exclusions first (exclusion takes priority)
  for (const cond of conditions) {
    if (cond === "exclude:all") return false;
    if (cond === "exclude:singular:home" && pageContext.isHome) return false;
    if (cond.startsWith("exclude:page:")) {
      const target = cond.replace("exclude:page:", "").trim();
      if (target === pageContext.pageId || target === pageContext.slug) return false;
    }
  }

  // 2. Check inclusions
  let explicitlyIncluded = false;
  let hasInclusionRule = false;

  for (const cond of conditions) {
    if (cond.startsWith("include:")) {
      hasInclusionRule = true;
      if (cond === "include:all") explicitlyIncluded = true;
      if (cond === "include:singular:home" && pageContext.isHome) explicitlyIncluded = true;
      if (cond.startsWith("include:page:")) {
        const target = cond.replace("include:page:", "").trim();
        if (target === pageContext.pageId || target === pageContext.slug) explicitlyIncluded = true;
      }
    }
  }

  return hasInclusionRule ? explicitlyIncluded : true;
}

/**
 * Replaces {{site.name}}, {{page.title}}, {{current.year}}, {{entry.field}}, etc. tokens inside a string.
 */
export function resolveDynamicTokens(content: string, context: DynamicContext = {}): string {
  if (typeof content !== "string" || !content.includes("{{")) {
    return content;
  }

  const site = context.site || {};
  const siteSettings = site.siteSettings || {};
  const page = context.page || {};
  const entry = context.entry || {};
  const custom = context.custom || {};

  return content.replace(/\{\{([^{}]+)\}\}/g, (match, rawKey) => {
    const key = rawKey.trim();

    // Site level tokens
    if (key === "site.name" || key === "site.title") {
      return siteSettings.siteName || site.name || "";
    }
    if (key === "site.slug") {
      return site.slug || "";
    }
    if (key === "site.language" || key === "site.lang") {
      return siteSettings.siteLanguage || "en";
    }

    // System tokens
    if (key === "current.year") {
      return new Date().getFullYear().toString();
    }
    if (key === "current.date") {
      return new Date().toISOString().split("T")[0];
    }

    // Page level tokens
    if (key === "page.title") {
      return page.title || page.name || "";
    }
    if (key === "page.name") {
      return page.name || page.title || "";
    }
    if (key === "page.slug") {
      return page.slug || "";
    }

    // CPT / Dynamic Entry tokens: {{entry.fieldName}}, {{cpt.fieldName}}
    if (key.startsWith("entry.") || key.startsWith("cpt.")) {
      const field = key.replace(/^(entry|cpt)\./, "");
      if (field === "title" || field === "name") return entry.title || "";
      if (field === "slug") return entry.slug || "";
      if (entry.data && entry.data[field] !== undefined) {
        return String(entry.data[field]);
      }
      if (entry[field] !== undefined) {
        return String(entry[field]);
      }
      return "";
    }

    // Custom dictionary fallback
    if (custom[key] !== undefined) {
      return custom[key];
    }

    return match;
  });
}

/**
 * Recursively resolves dynamic tag tokens across an object tree or array.
 */
export function resolveTokensInTree(obj: any, context: DynamicContext): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return resolveDynamicTokens(obj, context);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveTokensInTree(item, context));
  }
  if (typeof obj === "object") {
    const resolved: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      resolved[k] = resolveTokensInTree(v, context);
    }
    return resolved;
  }
  return obj;
}

export async function getPublicWebsiteById(websiteId: string): Promise<PublicWebsiteDTO> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(websiteId);

  const website = await prisma.website.findFirst({
    where: isUuid ? { id: websiteId } : { slug: websiteId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      editorData: true,
      customCodeSnippets: {
        where: {
          status: "PUBLISHED",
        },
        select: {
          id: true,
          title: true,
          placement: true,
          code: true,
          priority: true,
          language: true,
        },
      },
    },
  });

  if (!website) {
    throw new AppError("This website is unavailable.", 404, "NOT_FOUND");
  }

  const rawEditorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  // Check authoritative publishing state (Comment 9)
  const isPublished =
    website.status === "PUBLISHED" ||
    rawEditorData?.publishing?.status === "PUBLISHED";

  if (!isPublished) {
    throw new AppError("This website is unavailable.", 404, "NOT_FOUND");
  }

  // Authoritative data: use published snapshot if present, otherwise working editorData (Comment 12)
  const sourceData = rawEditorData.publishedData || rawEditorData;

  // Build site context for dynamic token resolution
  const siteContext: DynamicContext = {
    site: {
      id: website.id,
      name: website.name,
      slug: website.slug,
      siteSettings: sourceData.siteSettings,
    },
  };

  // Resolve dynamic tokens across pages
  const rawPages = Array.isArray(sourceData.pages) ? sourceData.pages : [];
  const resolvedPages = rawPages.map((page: any) => {
    const pageContext: DynamicContext = {
      ...siteContext,
      page: {
        id: page.id,
        name: page.name,
        title: page.title,
        slug: page.slug,
        isHome: page.isHome,
      },
    };
    return resolveTokensInTree(page, pageContext);
  });

  // Resolve dynamic tokens across siteParts
  const resolvedSiteParts = sourceData.siteParts
    ? resolveTokensInTree(sourceData.siteParts, siteContext)
    : undefined;

  // Resolve dynamic tokens across root elements
  const resolvedElements = Array.isArray(sourceData.elements)
    ? resolveTokensInTree(sourceData.elements, siteContext)
    : [];

  // Build explicit sanitized public DTO projection (Comment 8)
  const publicEditorData = {
    version: sourceData.version || 1,
    homePageId: sourceData.homePageId,
    pages: resolvedPages,
    elements: resolvedElements,
    siteParts: resolvedSiteParts,
    globalStyles: sourceData.globalStyles || undefined,
    breakpoints: sourceData.breakpoints || undefined,
    popups: sourceData.popups || undefined,
    pageCss: sourceData.pageCss || undefined,
    globalSettings: sourceData.globalSettings || undefined,
    siteSettings: sourceData.siteSettings ? {
      siteName: resolveDynamicTokens(sourceData.siteSettings.siteName || "", siteContext) || sourceData.siteSettings.siteName,
      siteLogo: sourceData.siteSettings.siteLogo,
      favicon: sourceData.siteSettings.favicon,
      siteLanguage: sourceData.siteSettings.siteLanguage,
      customHead: sourceData.siteSettings.customHead,
    } : undefined,
    publishing: {
      status: "PUBLISHED",
      publishedAt: sourceData.publishing?.publishedAt,
      version: sourceData.publishing?.version || sourceData.publishing?.publishedVersion,
    },
  };

  return {
    id: website.id,
    name: website.name,
    slug: website.slug,
    status: "PUBLISHED",
    editorData: publicEditorData,
    customCodeSnippets: website.customCodeSnippets,
  };
}

/**
 * Transfer Website Ownership to another registered user by email.
 */
export async function transferWebsiteOwnership(
  websiteId: string,
  currentUserId: string,
  targetEmail: string
) {
  if (!targetEmail || typeof targetEmail !== "string" || !targetEmail.includes("@")) {
    throw new AppError("Valid recipient email is required", 400, "INVALID_EMAIL");
  }

  const website = await db.website.findUnique({ where: { id: websiteId } });
  if (!website) {
    throw new AppError("Website not found", 404, "NOT_FOUND");
  }

  if (website.userId !== currentUserId) {
    throw new AppError("Only the site owner can transfer website ownership", 403, "FORBIDDEN");
  }

  const normalizedEmail = targetEmail.trim().toLowerCase();
  const targetUser = await db.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!targetUser) {
    throw new AppError(`Target user with email "${targetEmail}" was not found`, 404, "USER_NOT_FOUND");
  }

  if (targetUser.id === currentUserId) {
    throw new AppError("Cannot transfer ownership to yourself", 400, "INVALID_TARGET");
  }

  const updated = await db.website.update({
    where: { id: websiteId },
    data: { userId: targetUser.id },
  });

  await recordAuditLog({
    userId: currentUserId,
    action: "WEBSITE_OWNERSHIP_TRANSFERRED",
    targetResource: `website:${websiteId}`,
    details: {
      previousOwnerId: currentUserId,
      newOwnerId: targetUser.id,
      newOwnerEmail: targetUser.email,
      websiteName: website.name,
    },
  });

  return {
    success: true,
    websiteId: updated.id,
    newOwnerEmail: targetUser.email,
    newOwnerName: targetUser.fullName || targetUser.name,
    transferredAt: new Date().toISOString(),
  };
}

