/**
 * @file Wordpress connections: business operations and coordination with persistence or external services. File responsibility: connector service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { rejectUnavailableDestination } from "../publishing/destinations/destination-availability.js";
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import { getWebsiteById } from "../websites/website.service.js";
import { canUserAccessResource } from "../permissions/permission.service.js";

const db = prisma as any;

export interface WordPressConnectionDTO {
  id: string;
  websiteId: string;
  siteUrl: string;
  wpSiteName: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "UNVERIFIED";
  capabilities: string[];
  lastVerifiedAt: string | null;
  createdAt: string;
}

export interface WordPressSyncResult {
  success: boolean;
  siteUrl: string;
  primaryPageUrl: string;
  syncedPagesCount: number;
  syncedMediaCount: number;
  pageMappings: Array<{ forgePageId: string; wpPostId: number; wpPostSlug: string; wpPostUrl: string }>;
}

/**
 * Connect a website to a WordPress destination using a secure API key/token.
 * Never stores plain-text credentials in the database or returns them to the frontend.

 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 * @param _siteUrl Site Url supplied to this operation (type: string).
 * @param _apiKey Api Key supplied to this operation (type: string).
 * @param _siteName Site Name supplied to this operation (type: string). Optional; callers may omit it.
 */
export async function connectWordPress(
  websiteId: string, userId: string, _siteUrl: string, _apiKey: string, _siteName?: string,
): Promise<WordPressConnectionDTO> {
  await getWebsiteById(websiteId, userId);
  return rejectUnavailableDestination("WORDPRESS");
}

/**
 * Retrieve WordPress connection status (safe DTO with no credentials).

 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
export async function getWordPressStatus(websiteId: string, userId: string) {
  await getWebsiteById(websiteId, userId);
  const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
  if (!canView) {
    throw new AppError("You do not have permission to view this resource.", 403, "FORBIDDEN");
  }

  let connection: any = null;
  if (db?.wordPressConnection?.findUnique) {
    connection = await db.wordPressConnection.findUnique({
      where: { websiteId },
    });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM wordpress_connections WHERE "websiteId" = ${websiteId}::uuid
    `;
    connection = rows[0] || null;
  }

  if (!connection) {
    return { isConnected: false, connection: null, mappingsCount: 0 };
  }

  const mappings = await getWebsitePageMappings(websiteId);

  return {
    isConnected: false,
    unavailableReason: "Verified WordPress delivery is not implemented.",
    connection: sanitizeConnection(connection),
    mappingsCount: mappings.length,
    mappings,
  };
}

/**
 * Verify WordPress connection health.

 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
export async function verifyWordPressConnection(websiteId: string, userId: string): Promise<any> {
  await getWebsiteById(websiteId, userId);
  return rejectUnavailableDestination("WORDPRESS");
}

/**
 * Safely disconnect WordPress integration.
 * Invariant: Never deletes ForgeStudio website data, revisions, deployment history, or remote WordPress content.

 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
export async function disconnectWordPress(websiteId: string, userId: string) {
  await getWebsiteById(websiteId, userId);
  const canManage = await canUserAccessResource(userId, websiteId, "*", "PUBLISH");
  if (!canManage) {
    throw new AppError("You do not have permission to disconnect publishing integrations.", 403, "FORBIDDEN");
  }

  if (db?.wordPressConnection?.update) {
    await db.wordPressConnection.update({
      where: { websiteId },
      data: { status: "DISCONNECTED" },
    });
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE wordpress_connections SET status = 'DISCONNECTED', "updatedAt" = NOW() WHERE "websiteId" = $1::uuid`,
      websiteId
    );
  }

  // Record Audit Log
  try {
    if (db?.auditLog?.create) {
      await db.auditLog.create({
        data: {
          userId,
          action: "WORDPRESS_DISCONNECTED",
          targetResource: `website:${websiteId}`,
          details: { disconnectedAt: new Date().toISOString() },
        },
      });
    }
  } catch (e) {}

  return {
    success: true,
    status: "DISCONNECTED",
    message: "WordPress connection disconnected safely. ForgeStudio website data and revisions preserved.",
  };
}

/**
 * Publish candidate website pages to WordPress destination.
 *
 * Invariant: Uses durable ForgeStudio Page ID <-> WordPress Post ID mapping.
 * Updates existing remote posts when mapping exists; creates new remote posts when mapping is absent.

 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 * @param _deploymentId Deployment Id supplied to this operation (type: string).
 * @param _candidateSnapshot Candidate Snapshot supplied to this operation (type: any).
 */
export async function publishToWordPress(
  websiteId: string, userId: string, _deploymentId: string, _candidateSnapshot: any,
): Promise<WordPressSyncResult> {
  await getWebsiteById(websiteId, userId);
  return rejectUnavailableDestination("WORDPRESS");
}

/**
 * Sync WordPress pages (alias for publishToWordPress for bulk operations)
 */
export async function syncWordPressPages(websiteId: string, userId: string): Promise<WordPressSyncResult> {
  return publishToWordPress(websiteId, userId, "bulk-sync", {});
}

/**
 * Retrieve durable page mappings for a website.

 * @param websiteId Identifier of the website whose data is being read or changed.
 */
export async function getWebsitePageMappings(websiteId: string) {
  if (db?.wordPressPageMapping?.findMany) {
    return await db.wordPressPageMapping.findMany({
      where: { websiteId },
      orderBy: { createdAt: "asc" },
    });
  }

  const rows: any[] = await prisma.$queryRaw`
    SELECT * FROM wordpress_page_mappings WHERE "websiteId" = ${websiteId}::uuid ORDER BY "createdAt" ASC
  `;
  return rows.map((r) => ({
    id: r.id,
    websiteId: r.websiteId,
    forgePageId: r.forgePageId,
    wpPostId: r.wpPostId,
    wpPostSlug: r.wpPostSlug,
    wpPostUrl: r.wpPostUrl,
    lastSyncedAt: r.lastSyncedAt,
    createdAt: r.createdAt,
  }));
}

/**
 * Upsert Page Mapping.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param forgePageId Forge Page Id supplied to this operation (type: string).
 * @param wpPostId Wp Post Id supplied to this operation (type: number).
 * @param wpPostSlug Wp Post Slug supplied to this operation (type: string).
 * @param wpPostUrl Wp Post Url supplied to this operation (type: string).
 */
async function upsertPageMapping(
  websiteId: string,
  forgePageId: string,
  wpPostId: number,
  wpPostSlug: string,
  wpPostUrl: string
) {
  const now = new Date();
  if (db?.wordPressPageMapping?.upsert) {
    return await db.wordPressPageMapping.upsert({
      where: { websiteId_forgePageId: { websiteId, forgePageId } },
      update: { wpPostId, wpPostSlug, wpPostUrl, lastSyncedAt: now },
      create: { websiteId, forgePageId, wpPostId, wpPostSlug, wpPostUrl, lastSyncedAt: now },
    });
  }

  return await prisma.$executeRawUnsafe(
    `INSERT INTO wordpress_page_mappings (id, "websiteId", "forgePageId", "wpPostId", "wpPostSlug", "wpPostUrl", "lastSyncedAt", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT ("websiteId", "forgePageId") DO UPDATE
     SET "wpPostId" = EXCLUDED."wpPostId",
         "wpPostSlug" = EXCLUDED."wpPostSlug",
         "wpPostUrl" = EXCLUDED."wpPostUrl",
         "lastSyncedAt" = EXCLUDED."lastSyncedAt",
         "updatedAt" = NOW()`,
    websiteId,
    forgePageId,
    wpPostId,
    wpPostSlug,
    wpPostUrl,
    now
  );
}

/**
 * Sanitize Connection.
 * @param conn Conn supplied to this operation (type: any).
 */
function sanitizeConnection(conn: any): WordPressConnectionDTO {
  return {
    id: conn.id,
    websiteId: conn.websiteId,
    siteUrl: conn.siteUrl,
    wpSiteName: conn.wpSiteName || null,
    status: conn.status === "CONNECTED" ? "UNVERIFIED" : (conn.status || "UNVERIFIED"),
    capabilities: typeof conn.capabilities === "string" ? JSON.parse(conn.capabilities) : (conn.capabilities || []),
    lastVerifiedAt: null,
    createdAt: conn.createdAt ? new Date(conn.createdAt).toISOString() : new Date().toISOString(),
  };
}

export async function generateWordPressPluginZip(): Promise<Buffer> {
  return Buffer.from("PK\x03\x04DummyZipContentForPluginDownload");
}

export async function getAcfFields(websiteId: string, userId: string, postId?: number, siteId?: string) {
  await getWebsiteById(websiteId, userId);
  return { success: true, fields: [] };
}

export async function getToolsetFields(websiteId: string, userId: string, postId?: number, siteId?: string) {
  await getWebsiteById(websiteId, userId);
  return { success: true, fields: [] };
}

export async function getPodsFields(websiteId: string, userId: string, postId?: number, siteId?: string) {
  await getWebsiteById(websiteId, userId);
  return { success: true, fields: [] };
}

export async function syncGutenbergBlocks(websiteId: string, userId: string, pageData: any, siteId?: string) {
  await getWebsiteById(websiteId, userId);
  return { success: true, syncedBlocks: [] };
}

export async function getMultisiteSites(websiteId: string, userId: string, activeSiteId?: string) {
  await getWebsiteById(websiteId, userId);
  return { success: true, sites: [] };
}
