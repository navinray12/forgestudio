import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { checkWebsiteLimit } from "./subscription.service.js";
import crypto from "crypto";
import {
  canUserAccessResource,
  CANONICAL_PROJECT_ROLES,
  normalizeProjectRole,
  canAssignProjectRole,
} from "./permission.service.js";
import { recordAuditLog } from "./audit.service.js";
import { assertCanonicalEditorData } from "../validators/canonical-website.validator.js";

const db = prisma as any;

/**
 * Ensure websites table exists in PostgreSQL (Managed via Prisma migrations)
 */
export async function initWebsiteTable() {
  // Database schema and tables are strictly managed via versioned Prisma migrations
  return;
}

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
 * Get all websites belonging to a specific user or workspace
 */
export async function getUserWebsites(userId: string, workspaceId?: string | null) {
  try {
    let whereCondition: any;
    let isRawSqlWorkspace = false;
    let isRawSqlPersonal = false;

    if (workspaceId !== undefined) {
      if (workspaceId && workspaceId !== "personal" && workspaceId !== "null" && workspaceId !== "all") {
        // Shared Workspace view
        if (db?.workspace?.findUnique) {
          const ws = await db.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true, ownerId: true },
          });
          if (!ws) {
            throw new AppError("Workspace not found", 404, "NOT_FOUND");
          }
          const membership = await db.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
          });
          if (!membership && ws.ownerId !== userId) {
            throw new AppError("You are not authorized to access this workspace", 403, "FORBIDDEN");
          }
        }
        whereCondition = { workspaceId };
        isRawSqlWorkspace = true;
      } else if (workspaceId === "all") {
        // All Workspaces view: all websites belonging to user across all workspaces + collaborations
        whereCondition = {
          OR: [
            { userId },
            { collaborators: { some: { userId } } },
          ],
        };
      } else {
        // Personal Workspace view: websites created by user with NO workspace
        whereCondition = { userId, workspaceId: null };
        isRawSqlPersonal = true;
      }
    } else {
      // General view: all websites where user is owner or collaborator
      whereCondition = {
        OR: [
          { userId },
          { collaborators: { some: { userId } } },
        ],
      };
    }

    if (db?.website?.findMany) {
      const websites = await db.website.findMany({
        where: whereCondition,
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

    let rawWebsites: any[] = [];
    if (isRawSqlWorkspace) {
      rawWebsites = await prisma.$queryRaw`
        SELECT w.id, w."userId", w.name, w.slug, w.status, w."editorData", w."workspaceId", w."createdAt", w."updatedAt",
          (SELECT row_to_json(wp) FROM (
            SELECT id, "siteUrl", "wpSiteName", status, "lastVerifiedAt", "createdAt"
            FROM wordpress_connections WHERE "websiteId" = w.id
          ) wp) as "wpConnection",
          (SELECT row_to_json(mc) FROM (
            SELECT id, host, port, username, "fromName", "fromEmail", "isVerified"
            FROM site_mailer_configs WHERE "websiteId" = w.id
          ) mc) as "mailerConfig"
        FROM websites w
        WHERE w."workspaceId" = ${workspaceId}::uuid
        ORDER BY w."createdAt" DESC
      `;
    } else if (isRawSqlPersonal) {
      rawWebsites = await prisma.$queryRaw`
        SELECT w.id, w."userId", w.name, w.slug, w.status, w."editorData", w."workspaceId", w."createdAt", w."updatedAt",
          (SELECT row_to_json(wp) FROM (
            SELECT id, "siteUrl", "wpSiteName", status, "lastVerifiedAt", "createdAt"
            FROM wordpress_connections WHERE "websiteId" = w.id
          ) wp) as "wpConnection",
          (SELECT row_to_json(mc) FROM (
            SELECT id, host, port, username, "fromName", "fromEmail", "isVerified"
            FROM site_mailer_configs WHERE "websiteId" = w.id
          ) mc) as "mailerConfig"
        FROM websites w
        WHERE w."userId" = ${userId}::uuid AND w."workspaceId" IS NULL
        ORDER BY w."createdAt" DESC
      `;
    } else {
      rawWebsites = await prisma.$queryRaw`
        SELECT w.id, w."userId", w.name, w.slug, w.status, w."editorData", w."workspaceId", w."createdAt", w."updatedAt",
          (SELECT row_to_json(wp) FROM (
            SELECT id, "siteUrl", "wpSiteName", status, "lastVerifiedAt", "createdAt"
            FROM wordpress_connections WHERE "websiteId" = w.id
          ) wp) as "wpConnection",
          (SELECT row_to_json(mc) FROM (
            SELECT id, host, port, username, "fromName", "fromEmail", "isVerified"
            FROM site_mailer_configs WHERE "websiteId" = w.id
          ) mc) as "mailerConfig"
        FROM websites w
        LEFT JOIN website_collaborators c ON c."websiteId" = w.id AND c."userId" = ${userId}::uuid
        WHERE w."userId" = ${userId}::uuid OR c.id IS NOT NULL
        ORDER BY w."createdAt" DESC
      `;
    }
    return rawWebsites || [];
  } catch (error) {
    if (error instanceof AppError) throw error;
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
      version: website.version ?? 1,
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

  await updateWebsiteEditorData(websiteId, userId, editorData, undefined, undefined, website.version);
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
          } else if (website.workspaceId && db?.workspaceMember?.findUnique) {
            try {
              const wsMember = await db.workspaceMember.findUnique({
                where: {
                  workspaceId_userId: { workspaceId: website.workspaceId, userId },
                },
              });
              if (wsMember) {
                permission = wsMember.role === "OWNER" || wsMember.role === "ADMIN" ? "ADMIN" : "REVIEWER";
              } else if (db?.workspace?.findUnique) {
                const ws = await db.workspace.findUnique({ where: { id: website.workspaceId } });
                if (ws && ws.ownerId === userId) {
                  permission = "OWNER";
                } else {
                  website = null;
                }
              } else {
                website = null;
              }
            } catch {
              website = null;
            }
          } else if ((website as any).organizationId && db?.organizationMember?.findUnique) {
            try {
              const orgMember = await db.organizationMember.findUnique({
                where: { organizationId_userId: { organizationId: (website as any).organizationId, userId } }
              });
              if (orgMember) {
                permission = orgMember.role === "OWNER" || orgMember.role === "ADMIN" ? "ADMIN" : "VIEWER";
              } else {
                website = null;
              }
            } catch {
              website = null;
            }
          } else {
            website = null; // Purge access
          }
        }
      }
    }

    if (!website) {
      // Raw Fallback mapped exactly to original flow logic but integrating permissions
      const rawWebsites: any[] = await prisma.$queryRaw`
        SELECT w.id, w."userId", w.name, w.slug, w.status, w.version, w."editorData", w."createdAt", w."updatedAt",
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
 * Create a new website with subscription limit check and optional workspace association
 */
export async function createWebsite(
  userIdOrOptions: string | { userId: string; name: string; slug?: string; editorData?: any; templateId?: string; workspaceId?: string },
  nameArg?: string
) {
  let userId: string;
  let rawName: string;
  let customSlug: string | undefined;
  let customEditorData: any | undefined;
  let targetWorkspaceId: string | undefined;

  if (typeof userIdOrOptions === "object" && userIdOrOptions !== null) {
    userId = userIdOrOptions.userId;
    rawName = userIdOrOptions.name;
    customSlug = userIdOrOptions.slug;
    customEditorData = userIdOrOptions.editorData;
    targetWorkspaceId = userIdOrOptions.workspaceId;
  } else {
    userId = userIdOrOptions;
    rawName = nameArg || "";
  }

  const trimmedName = rawName?.trim();
  if (!trimmedName) {
    throw new AppError("Website name is required", 400, "INVALID_NAME");
  }

  // Validate workspace authorization if workspaceId is provided
  let validatedWorkspaceId: string | null = null;
  if (targetWorkspaceId && targetWorkspaceId !== "personal" && targetWorkspaceId !== "null") {
    if (db?.workspace?.findUnique) {
      const ws = await db.workspace.findUnique({
        where: { id: targetWorkspaceId },
        select: { id: true, ownerId: true },
      });
      if (!ws) {
        throw new AppError("Workspace not found", 404, "NOT_FOUND");
      }
      const membership = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: targetWorkspaceId, userId } },
      });
      if (!membership && ws.ownerId !== userId) {
        throw new AppError("You are not authorized to add websites to this workspace", 403, "FORBIDDEN");
      }
    }
    validatedWorkspaceId = targetWorkspaceId;
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
    pages: [
      {
        id: "home",
        name: "Home",
        slug: "/",
        isHome: true,
        elements: [],
        pageSettings: {
          title: trimmedName,
          path: "/",
          description: "",
        },
      },
    ],
    homePageId: "home",
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
          workspaceId: validatedWorkspaceId,
        },
      });
      return newWebsite;
    }

    // Raw SQL Fallback
    const initialJsonStr = JSON.stringify(initialEditorData);
    const created: any[] = await prisma.$queryRaw`
      INSERT INTO websites (id, "userId", name, slug, status, "editorData", "workspaceId", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${userId}::uuid, ${trimmedName}, ${slug}, 'DRAFT', ${initialJsonStr}::jsonb, ${validatedWorkspaceId ? validatedWorkspaceId : null}::uuid, NOW(), NOW())
      RETURNING id, "userId", name, slug, status, "editorData", "workspaceId", "createdAt", "updatedAt"
    `;

    return created[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Error creating website:", error);
    throw new AppError("Failed to create website", 500, "CREATE_FAILED");
  }
}


/**
 * Validates the canonical editorData structure and guards against malformed input, cycles, or prototype pollution.
 */
export function validateCanonicalEditorData(data: any): any {
  return assertCanonicalEditorData(data);
}

/**
 * Update general website metadata and attributes
 */
export async function updateWebsite(
  websiteId: string,
  data: { name?: string; slug?: string; editorData?: any; status?: string },
  userId: string
) {
  const currentWebsite = await getWebsiteById(websiteId, userId);

  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.slug !== undefined) updatePayload.slug = data.slug;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.editorData !== undefined) {
    validateCanonicalEditorData(data.editorData);
    const currentEd =
      typeof currentWebsite.editorData === "string"
        ? JSON.parse(currentWebsite.editorData)
        : currentWebsite.editorData || {};

    // Preserve published state, immutable snapshots, and releases from being overwritten by draft updates
    updatePayload.editorData = {
      ...currentEd,
      ...data.editorData,
      ...(currentEd.publishedData !== undefined && data.editorData.publishedData === undefined
        ? { publishedData: currentEd.publishedData }
        : {}),
      ...(currentEd.releases !== undefined && data.editorData.releases === undefined
        ? { releases: currentEd.releases }
        : {}),
      ...(currentEd.currentReleaseId !== undefined && data.editorData.currentReleaseId === undefined
        ? { currentReleaseId: currentEd.currentReleaseId }
        : {}),
      ...(currentEd.publishing !== undefined && data.editorData.publishing === undefined
        ? { publishing: currentEd.publishing }
        : {}),
    };
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
  performanceSettings?: any,
  lastKnownUpdatedAt?: string | number | Date,
  expectedVersion?: number,
  force?: boolean
) {
  validateCanonicalEditorData(editorData);

  // Ensure website exists and fetch permission boundaries
  const website = await getWebsiteById(websiteId, userId);

  // Multi-tab stale version conflict is enforced atomically at the database level (CAS)

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
        // If restricted role (!canEditDesign && canEditContent), deletion is forbidden - preserve element
        if (!canEditDesign && canEditContent) {
          mergedEls.push(cEl);
          continue;
        }
        // It's allowed to be deleted because they have rights.
        continue;
      }

      // If !canEditDesign && canEditContent (Content-Only Sandbox / Client Mode)
      if (!canEditDesign && canEditContent) {
        if (incoming.content !== undefined) cEl.content = incoming.content;
        if (incoming.text !== undefined) cEl.text = incoming.text;
        if (incoming.src !== undefined) cEl.src = incoming.src;
        if (incoming.image_asset_id !== undefined) cEl.image_asset_id = incoming.image_asset_id;
        if (incoming.alt !== undefined) cEl.alt = incoming.alt;
        if (incoming.href !== undefined) cEl.href = incoming.href;
        if (incoming.settings?.href !== undefined) {
          cEl.settings = { ...(cEl.settings || {}), href: incoming.settings.href };
        }
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

    // Now append any newly created elements that didn't exist in currentEls (only if user has design rights)
    if (canEditDesign) {
      for (const nEl of newEls) {
        if (!currentEls.find(c => c.id === nEl.id)) {
          mergedEls.push(nEl);
        }
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
    // CRITICAL DRAFT ISOLATION: Draft saves never overwrite published release data
    ...(currentEditorData.publishedData ? { publishedData: currentEditorData.publishedData } : {}),
    ...(currentEditorData.releases ? { releases: currentEditorData.releases } : {}),
    ...(currentEditorData.currentReleaseId ? { currentReleaseId: currentEditorData.currentReleaseId } : {}),
    ...(currentEditorData.publishing ? { publishing: currentEditorData.publishing } : {}),
  };

  try {
    const jsonStr = JSON.stringify(editorData);
    const isPublished = website.status === "PUBLISHED";
    const statusVal = isPublished ? "PUBLISHED" : "DRAFT";
    const perfStr = performanceSettings !== undefined ? JSON.stringify(performanceSettings) : null;

    let updated: any[];

    if (expectedVersion !== undefined && expectedVersion !== null) {
      const expVer = Number(expectedVersion);
      if (isNaN(expVer) || expVer < 1) {
        throw new AppError("Invalid expectedVersion revision", 400, "INVALID_REVISION");
      }

      // MONOTONIC INTEGER VERSION ATOMIC COMPARE-AND-SWAP
      // Explicit version increment: version = version + 1
      if (perfStr !== null) {
        updated = await prisma.$queryRaw`
          UPDATE websites
          SET "editorData" = ${jsonStr}::jsonb,
              "performanceSettings" = ${perfStr}::jsonb,
              status = ${statusVal},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE id = ${websiteId}::uuid
            AND "version" = ${expVer}
          RETURNING id, "userId", name, slug, status, "version", "editorData", "performanceSettings", "createdAt", "updatedAt"
        `;
      } else {
        updated = await prisma.$queryRaw`
          UPDATE websites
          SET "editorData" = ${jsonStr}::jsonb,
              status = ${statusVal},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE id = ${websiteId}::uuid
            AND "version" = ${expVer}
          RETURNING id, "userId", name, slug, status, "version", "editorData", "performanceSettings", "createdAt", "updatedAt"
        `;
      }

      if (!updated || updated.length === 0) {
        const currentDb = await prisma.website.findUnique({
          where: { id: websiteId },
          select: { id: true, version: true, updatedAt: true },
        });
        if (!currentDb) {
          throw new AppError("Website not found.", 404, "NOT_FOUND");
        }
        throw new AppError(
          "This website was modified in another session or browser tab. Please reload or review changes before saving.",
          409,
          "STALE_VERSION_CONFLICT"
        );
      }
    } else if (lastKnownUpdatedAt) {
      const expectedDate = new Date(lastKnownUpdatedAt);
      if (isNaN(expectedDate.getTime())) {
        throw new AppError("Invalid lastKnownUpdatedAt revision timestamp", 400, "INVALID_REVISION");
      }

      // ATOMIC OPTIMISTIC CONCURRENCY CONTROL (Compare-And-Swap on exact timestamp)
      // Zero tolerance: strictly eliminates race conditions between simultaneous saves.
      if (perfStr !== null) {
        updated = await prisma.$queryRaw`
          UPDATE websites
          SET "editorData" = ${jsonStr}::jsonb,
              "performanceSettings" = ${perfStr}::jsonb,
              status = ${statusVal},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE id = ${websiteId}::uuid
            AND "updatedAt" = ${expectedDate}
          RETURNING id, "userId", name, slug, status, "version", "editorData", "performanceSettings", "createdAt", "updatedAt"
        `;
      } else {
        updated = await prisma.$queryRaw`
          UPDATE websites
          SET "editorData" = ${jsonStr}::jsonb,
              status = ${statusVal},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE id = ${websiteId}::uuid
            AND "updatedAt" = ${expectedDate}
          RETURNING id, "userId", name, slug, status, "version", "editorData", "performanceSettings", "createdAt", "updatedAt"
        `;
      }

      if (!updated || updated.length === 0) {
        const currentDb = await prisma.website.findUnique({
          where: { id: websiteId },
          select: { id: true, version: true, updatedAt: true },
        });
        if (!currentDb) {
          throw new AppError("Website not found.", 404, "NOT_FOUND");
        }
        throw new AppError(
          "This website was modified in another session or browser tab. Please reload or review changes before saving.",
          409,
          "STALE_VERSION_CONFLICT"
        );
      }
    } else if (!force) {
      // Missing expected revision: reject editor saves without expected revision
      throw new AppError(
        "Expected revision (expectedVersion or lastKnownUpdatedAt) is required for editor save",
        400,
        "MISSING_REVISION"
      );
    } else {
      // Force update for internal non-editor callers
      if (perfStr !== null) {
        updated = await prisma.$queryRaw`
          UPDATE websites
          SET "editorData" = ${jsonStr}::jsonb,
              "performanceSettings" = ${perfStr}::jsonb,
              status = ${statusVal},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE id = ${websiteId}::uuid
          RETURNING id, "userId", name, slug, status, "version", "editorData", "performanceSettings", "createdAt", "updatedAt"
        `;
      } else {
        updated = await prisma.$queryRaw`
          UPDATE websites
          SET "editorData" = ${jsonStr}::jsonb,
              status = ${statusVal},
              "version" = "version" + 1,
              "updatedAt" = NOW()
          WHERE id = ${websiteId}::uuid
          RETURNING id, "userId", name, slug, status, "version", "editorData", "performanceSettings", "createdAt", "updatedAt"
        `;
      }
    }

    return updated[0];
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
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
        role: normalizeProjectRole(c.permission)
      });
    }
  }
  const invitationsList = await db.websiteInvitation.findMany({
    where: { websiteId, status: "PENDING" }
  });

  return {
    members,
    roles: members,
    invitations: invitationsList,
    availableRoles: CANONICAL_PROJECT_ROLES,
  };
}

export async function updateWebsiteRole(websiteId: string, requesterUserId: string, targetUserId: string, newRole: string) {
  const validRoles = [
    "OWNER",
    "ADMIN",
    "DESIGNER",
    "DEVELOPER",
    "CONTENT_EDITOR",
    "SEO_MANAGER",
    "VIEWER",
    "PROJECT_OWNER",
    "PROJECT_ADMIN",
    "REVIEWER",
    "CLIENT",
  ];
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

  const normalizedNewRole = normalizeProjectRole(newRole);
  const roleCheck = canAssignProjectRole(requesterRole, existing.permission, normalizedNewRole);
  if (!roleCheck.allowed) {
    throw new AppError(roleCheck.reason || "Unauthorized role assignment", 403, "FORBIDDEN");
  }

  await db.websiteCollaborator.update({
    where: { id: existing.id },
    data: { permission: normalizedNewRole }
  });

  try {
    await prisma.auditLog.create({
      data: {
        userId: requesterUserId,
        action: "ROLE_UPDATED",
        targetResource: `website:${websiteId}`,
        details: { targetUserId, newRole: normalizedNewRole, previousRole: existing.permission },
      },
    });
  } catch (e) {}

  return { success: true };
}

export async function inviteWebsiteMember(websiteId: string, inviterId: string, email: string, role: string = "DESIGNER") {
  const website = await getWebsiteById(websiteId, inviterId);
  const requesterRole = website.userPermission;

  if (requesterRole !== "OWNER" && requesterRole !== "ADMIN") {
    throw new AppError("You do not have permission to invite members.", 403, "FORBIDDEN");
  }

  const validRoles = [
    "OWNER",
    "ADMIN",
    "DESIGNER",
    "DEVELOPER",
    "CONTENT_EDITOR",
    "SEO_MANAGER",
    "VIEWER",
    "PROJECT_OWNER",
    "PROJECT_ADMIN",
    "REVIEWER",
    "CLIENT",
  ];
  if (!validRoles.includes(role)) {
    throw new AppError("Invalid role specified.", 400, "BAD_REQUEST");
  }

  const normalizedRole = normalizeProjectRole(role);
  const roleCheck = canAssignProjectRole(requesterRole, "VIEWER", normalizedRole);
  if (!roleCheck.allowed) {
    throw new AppError(roleCheck.reason || "Unauthorized role invitation", 403, "FORBIDDEN");
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
      role: normalizedRole,
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
        details: { email, role: normalizedRole, inviteId: invite.id },
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
  const requesterRole = website.userPermission;

  if (requesterRole !== "OWNER" && requesterRole !== "ADMIN") {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  const project = await db.website.findUnique({ where: { id: websiteId } });
  if (project?.userId === targetUserId) {
    throw new AppError("Cannot remove the project owner.", 403, "FORBIDDEN");
  }

  const targetMember = await db.websiteCollaborator.findUnique({
    where: { websiteId_userId: { websiteId, userId: targetUserId } }
  });
  if (!targetMember) {
    throw new AppError("Collaborator not found.", 404, "NOT_FOUND");
  }

  // Admin cannot remove peer Admin
  if (requesterRole !== "OWNER" && (targetMember.permission === "ADMIN" || targetMember.permission === "PROJECT_ADMIN")) {
    throw new AppError("Only the project owner can remove administrators.", 403, "FORBIDDEN");
  }

  await db.$transaction([
    db.websiteCollaborator.delete({
      where: { websiteId_userId: { websiteId, userId: targetUserId } }
    }),
    db.granularPermission.deleteMany({
      where: { websiteId, userId: targetUserId }
    })
  ]);

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
  post?: {
    id?: string;
    title?: string;
    name?: string;
    slug?: string;
    excerpt?: string;
    date?: string;
    author?: string;
    featuredImage?: string;
    data?: Record<string, any>;
    [key: string]: any;
  };
  request?: Record<string, string>;
  query?: Record<string, string>;
  requestParams?: Record<string, string>;
  custom?: Record<string, string>;
}

/**
 * Evaluates theme builder display conditions (include:all, include:singular:home, include:page:id, exclude:page:id, etc.)
 */
export function matchesThemeCondition(
  conditions: Array<string | { type?: string; condition?: string; isExcluded?: boolean; targetId?: string; [key: string]: any }> | undefined,
  pageContext: { pageId?: string; isHome?: boolean; slug?: string; isSearch?: boolean; is404?: boolean; isArchive?: boolean; [key: string]: any }
): boolean {
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return true; // Default: include everywhere
  }

  // Normalize conditions to standard strings e.g. "include:all", "exclude:page:123"
  const normalized: string[] = [];
  for (const item of conditions) {
    if (typeof item === "string") {
      normalized.push(item);
    } else if (item && typeof item === "object") {
      let ruleType = (item.type || item.condition || "entire_site").toLowerCase();
      let isExclude = Boolean(item.isExcluded || item.type?.toUpperCase() === "EXCLUDE");
      if (ruleType.startsWith("exclude:")) {
        isExclude = true;
        ruleType = ruleType.replace(/^exclude:/, "");
      } else if (ruleType.startsWith("include:")) {
        ruleType = ruleType.replace(/^include:/, "");
      }
      const prefix = isExclude ? "exclude" : "include";

      if (ruleType === "entire_site" || ruleType === "all") {
        normalized.push(`${prefix}:all`);
      } else if (ruleType === "homepage" || ruleType === "singular:home") {
        normalized.push(`${prefix}:singular:home`);
      } else if (ruleType === "specific_page" || ruleType.startsWith("page:")) {
        const target = item.targetId || ruleType.replace(/^page:/, "");
        if (target) normalized.push(`${prefix}:page:${target}`);
      } else if (ruleType === "specific_cpt" || ruleType.startsWith("cpt:")) {
        const target = item.targetId || ruleType.replace(/^cpt:/, "");
        if (target) normalized.push(`${prefix}:cpt:${target}`);
      } else if (ruleType === "cpt_archive" || ruleType.startsWith("archive:")) {
        const target = item.targetId || ruleType.replace(/^archive:/, "");
        if (target) normalized.push(`${prefix}:archive:${target}`);
        else normalized.push(`${prefix}:archive`);
      } else if (ruleType === "specific_entry" || ruleType.startsWith("entry:")) {
        const target = item.targetId || ruleType.replace(/^entry:/, "");
        if (target) normalized.push(`${prefix}:entry:${target}`);
      } else if (ruleType === "error_404" || ruleType === "404") {
        normalized.push(`${prefix}:404`);
      } else if (ruleType === "search" || ruleType === "search:results") {
        normalized.push(`${prefix}:search`);
      } else {
        normalized.push(`${prefix}:${ruleType}`);
      }
    }
  }

  // 1. Check exclusions first (exclusion takes priority)
  for (const cond of normalized) {
    if (cond === "exclude:all") return false;
    if (cond === "exclude:singular:home" && pageContext.isHome) return false;
    if (cond === "exclude:search" && pageContext.isSearch) return false;
    if (cond === "exclude:404" && pageContext.is404) return false;
    if (cond === "exclude:archive" && pageContext.isArchive) return false;
    if (cond.startsWith("exclude:page:")) {
      const target = cond.replace("exclude:page:", "").trim().toLowerCase();
      if (target === pageContext.pageId?.toLowerCase() || target === pageContext.slug?.toLowerCase()) return false;
    }
    if (cond.startsWith("exclude:cpt:")) {
      const target = cond.replace("exclude:cpt:", "").trim().toLowerCase();
      if (target === (pageContext as any).cptSlug?.toLowerCase()) return false;
    }
    if (cond.startsWith("exclude:archive:")) {
      const target = cond.replace("exclude:archive:", "").trim().toLowerCase();
      if (pageContext.isArchive && target === (pageContext as any).cptSlug?.toLowerCase()) return false;
    }
    if (cond.startsWith("exclude:entry:")) {
      const target = cond.replace("exclude:entry:", "").trim().toLowerCase();
      if (target === (pageContext as any).entrySlug?.toLowerCase() || target === pageContext.slug?.toLowerCase()) return false;
    }
  }

  // 2. Check inclusions
  let explicitlyIncluded = false;
  let hasInclusionRule = false;

  for (const cond of normalized) {
    if (cond.startsWith("include:")) {
      hasInclusionRule = true;
      if (cond === "include:all") explicitlyIncluded = true;
      if (cond === "include:singular:home" && pageContext.isHome) explicitlyIncluded = true;
      if (cond === "include:search" && pageContext.isSearch) explicitlyIncluded = true;
      if (cond === "include:404" && pageContext.is404) explicitlyIncluded = true;
      if (cond === "include:archive" && pageContext.isArchive) explicitlyIncluded = true;
      if (cond.startsWith("include:page:")) {
        const target = cond.replace("include:page:", "").trim().toLowerCase();
        if (target === pageContext.pageId?.toLowerCase() || target === pageContext.slug?.toLowerCase()) explicitlyIncluded = true;
      }
      if (cond.startsWith("include:cpt:")) {
        const target = cond.replace("include:cpt:", "").trim().toLowerCase();
        if (target === (pageContext as any).cptSlug?.toLowerCase()) explicitlyIncluded = true;
      }
      if (cond.startsWith("include:archive:")) {
        const target = cond.replace("include:archive:", "").trim().toLowerCase();
        if (pageContext.isArchive && target === (pageContext as any).cptSlug?.toLowerCase()) explicitlyIncluded = true;
      }
      if (cond.startsWith("include:entry:")) {
        const target = cond.replace("include:entry:", "").trim().toLowerCase();
        if (target === (pageContext as any).entrySlug?.toLowerCase() || target === pageContext.slug?.toLowerCase()) explicitlyIncluded = true;
      }
    }
  }

  return hasInclusionRule ? explicitlyIncluded : true;
}

/**
 * Replaces {{site.name}}, {{page.title}}, {{current.year}}, {{entry.field}}, {{post.field}}, {{request.param}}, etc. tokens inside a string.
 */
export function resolveDynamicTokens(content: string, context: DynamicContext = {}): string {
  if (typeof content !== "string" || !content.includes("{")) {
    return content;
  }

  const site = context.site || {};
  const siteSettings = site.siteSettings || {};
  const page = context.page || {};
  const entry = context.entry || {};
  const post = context.post || context.entry || {};
  const query = context.query || context.requestParams || context.request || {};
  const request = context.request || context.requestParams || context.query || {};
  const custom = context.custom || {};

  return content.replace(/\{{1,2}([^{}]+)\}{1,2}/g, (match, rawKey) => {
    const key = rawKey.trim().replace(/:/g, ".");

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

    // Request / Query parameter tokens: {{request.param}}, {{query.param}}
    if (key.startsWith("request.") || key.startsWith("query.")) {
      const param = key.replace(/^(request|query)\./, "");
      if (key.startsWith("request.") && request[param] !== undefined) {
        return String(request[param]);
      }
      if (query[param] !== undefined) {
        return String(query[param]);
      }
      if (request[param] !== undefined) {
        return String(request[param]);
      }
      return "";
    }

    // Post / CPT / Dynamic Entry tokens: {{post.title}}, {post:data.field}, {entry:status}, etc.
    if (key.startsWith("post.") || key.startsWith("entry.") || key.startsWith("cpt.")) {
      const field = key.replace(/^(post|entry|cpt)\./, "");
      const cleanField = field.startsWith("data.") ? field.replace(/^data\./, "") : field;
      const targetObj = post || entry;
      const targetData = targetObj.data || {};

      if (cleanField === "title" || cleanField === "name") return targetObj.title || targetObj.name || "";
      if (cleanField === "slug") return targetObj.slug || "";
      if (cleanField === "status") return targetObj.status || "";
      if (cleanField === "excerpt") return targetObj.excerpt || targetData.excerpt || targetData.description || "";
      if (cleanField === "date") return targetObj.date || targetData.date || targetObj.createdAt || "";
      if (cleanField === "createdAt") return targetObj.createdAt ? new Date(targetObj.createdAt).toISOString().split("T")[0] : "";
      if (cleanField === "updatedAt") return targetObj.updatedAt ? new Date(targetObj.updatedAt).toISOString().split("T")[0] : "";
      if (cleanField === "author") return targetObj.author || targetData.author || "";
      if (cleanField === "featuredImage" || cleanField === "image") return targetObj.featuredImage || targetData.featuredImage || targetData.image || "";

      if (targetData[cleanField] !== undefined) {
        return String(targetData[cleanField]);
      }
      if (targetObj[cleanField] !== undefined) {
        return String(targetObj[cleanField]);
      }
      if (targetData[field] !== undefined) {
        return String(targetData[field]);
      }
      if (targetObj[field] !== undefined) {
        return String(targetObj[field]);
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

  // Authoritative atomic release resolution: resolve snapshot via currentReleaseId pointer
  let activeReleaseSnapshot: any = null;
  if (rawEditorData.currentReleaseId && Array.isArray(rawEditorData.releases)) {
    const activeRelease = rawEditorData.releases.find((r: any) => r.releaseId === rawEditorData.currentReleaseId);
    if (activeRelease?.snapshotData) {
      activeReleaseSnapshot = activeRelease.snapshotData;
    }
  }

  // Fallback to publishedData or working editorData (Comment 12)
  let sourceData = activeReleaseSnapshot || rawEditorData.publishedData || rawEditorData;
  if (typeof sourceData === "string") {
    try {
      sourceData = JSON.parse(sourceData);
    } catch (_e) {
      sourceData = rawEditorData;
    }
  }

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

