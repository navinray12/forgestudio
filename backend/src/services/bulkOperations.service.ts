import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { verifyWordPressConnection, syncWordPressPages } from "./wordpress/connector.service.js";
import { deleteWebsite } from "./website.service.js";

const db = prisma as any;

export interface BulkOperationResult {
  websiteId: string;
  siteName: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  message: string;
  details?: any;
}

/**
 * Bulk verify remote WordPress connections or site status
 */
export async function bulkVerifyWebsites(userId: string, websiteIds: string[]): Promise<BulkOperationResult[]> {
  if (!Array.isArray(websiteIds) || websiteIds.length === 0) {
    throw new AppError("No website IDs provided for bulk verification.", 400, "INVALID_PAYLOAD");
  }

  // Fetch website details with wpConnection
  let websites: any[] = [];
  if (db?.website?.findMany) {
    websites = await db.website.findMany({
      where: {
        id: { in: websiteIds },
        userId,
      },
      include: {
        wpConnection: true,
      },
    });
  } else {
    websites = await prisma.$queryRaw`
      SELECT w.id, w.name, w.status, row_to_json(wc.*) as "wpConnection"
      FROM websites w
      LEFT JOIN wordpress_connections wc ON wc."websiteId" = w.id
      WHERE w.id = ANY(${websiteIds}::uuid[]) AND w."userId" = ${userId}::uuid
    `;
  }

  const websiteMap = new Map<string, any>();
  for (const site of websites) {
    websiteMap.set(site.id, site);
  }

  const results = await Promise.allSettled(
    websiteIds.map(async (id): Promise<BulkOperationResult> => {
      const site = websiteMap.get(id);
      if (!site) {
        return {
          websiteId: id,
          siteName: "Unknown Site",
          status: "FAILED",
          message: "Website not found or unauthorized.",
        };
      }

      if (!site.wpConnection) {
        return {
          websiteId: id,
          siteName: site.name,
          status: "SKIPPED",
          message: "No WordPress connection configured. Site is standard ForgeStudio project.",
          details: { siteStatus: site.status },
        };
      }

      try {
        const verifyRes = await verifyWordPressConnection(id, userId);
        return {
          websiteId: id,
          siteName: site.name,
          status: "SUCCESS",
          message: `Connected successfully to ${verifyRes.wpSiteName || verifyRes.siteUrl}`,
          details: verifyRes,
        };
      } catch (err: any) {
        return {
          websiteId: id,
          siteName: site.name,
          status: "FAILED",
          message: err?.message || "Failed to reach remote WordPress endpoint.",
        };
      }
    })
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      websiteId: websiteIds[i],
      siteName: "Website",
      status: "FAILED",
      message: r.reason?.message || "Verification failed unexpectedly.",
    };
  });
}

/**
 * Bulk sync pages to connected WordPress sites
 */
export async function bulkSyncWebsites(userId: string, websiteIds: string[]): Promise<BulkOperationResult[]> {
  if (!Array.isArray(websiteIds) || websiteIds.length === 0) {
    throw new AppError("No website IDs provided for bulk synchronization.", 400, "INVALID_PAYLOAD");
  }

  let websites: any[] = [];
  if (db?.website?.findMany) {
    websites = await db.website.findMany({
      where: {
        id: { in: websiteIds },
        userId,
      },
      include: {
        wpConnection: true,
      },
    });
  } else {
    websites = await prisma.$queryRaw`
      SELECT w.id, w.name, w.status, row_to_json(wc.*) as "wpConnection"
      FROM websites w
      LEFT JOIN wordpress_connections wc ON wc."websiteId" = w.id
      WHERE w.id = ANY(${websiteIds}::uuid[]) AND w."userId" = ${userId}::uuid
    `;
  }

  const websiteMap = new Map<string, any>();
  for (const site of websites) {
    websiteMap.set(site.id, site);
  }

  const results = await Promise.allSettled(
    websiteIds.map(async (id): Promise<BulkOperationResult> => {
      const site = websiteMap.get(id);
      if (!site) {
        return {
          websiteId: id,
          siteName: "Unknown Site",
          status: "FAILED",
          message: "Website not found or unauthorized.",
        };
      }

      if (!site.wpConnection) {
        return {
          websiteId: id,
          siteName: site.name,
          status: "SKIPPED",
          message: "Site is not connected to WordPress.",
        };
      }

      try {
        const syncRes = await syncWordPressPages(id, userId);
        return {
          websiteId: id,
          siteName: site.name,
          status: "SUCCESS",
          message: `Successfully synchronized ${syncRes.syncedPagesCount} page(s) to remote WordPress site.`,
          details: syncRes,
        };
      } catch (err: any) {
        return {
          websiteId: id,
          siteName: site.name,
          status: "FAILED",
          message: err?.message || "Synchronization failed.",
        };
      }
    })
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      websiteId: websiteIds[i],
      siteName: "Website",
      status: "FAILED",
      message: r.reason?.message || "Sync failed unexpectedly.",
    };
  });
}

/**
 * Bulk delete websites safely with ownership checks
 */
export async function bulkDeleteWebsites(userId: string, websiteIds: string[]): Promise<BulkOperationResult[]> {
  if (!Array.isArray(websiteIds) || websiteIds.length === 0) {
    throw new AppError("No website IDs provided for bulk deletion.", 400, "INVALID_PAYLOAD");
  }

  // Get names first for friendly status
  let websites: any[] = [];
  if (db?.website?.findMany) {
    websites = await db.website.findMany({
      where: {
        id: { in: websiteIds },
        userId,
      },
      select: { id: true, name: true },
    });
  } else {
    websites = await prisma.$queryRaw`
      SELECT id, name FROM websites WHERE id = ANY(${websiteIds}::uuid[]) AND "userId" = ${userId}::uuid
    `;
  }

  const websiteMap = new Map<string, string>();
  for (const site of websites) {
    websiteMap.set(site.id, site.name);
  }

  const results = await Promise.allSettled(
    websiteIds.map(async (id): Promise<BulkOperationResult> => {
      const siteName = websiteMap.get(id) || "Website";
      try {
        await deleteWebsite(id, userId);
        return {
          websiteId: id,
          siteName,
          status: "SUCCESS",
          message: `Website "${siteName}" deleted successfully.`,
        };
      } catch (err: any) {
        return {
          websiteId: id,
          siteName,
          status: "FAILED",
          message: err?.message || "Failed to delete website.",
        };
      }
    })
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      websiteId: websiteIds[i],
      siteName: websiteMap.get(websiteIds[i]) || "Website",
      status: "FAILED",
      message: r.reason?.message || "Deletion failed.",
    };
  });
}
