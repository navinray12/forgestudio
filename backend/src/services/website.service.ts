import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { checkWebsiteLimit } from "./subscription.service.js";

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
        orderBy: { createdAt: "desc" },
      });
      if (websites) return websites;
    }

    const rawWebsites: any[] = await prisma.$queryRaw`
      SELECT id, "userId", name, slug, status, "editorData", "createdAt", "updatedAt"
      FROM websites
      WHERE "userId" = ${userId}::uuid
      ORDER BY "createdAt" DESC
    `;
    return rawWebsites || [];
  } catch (error) {
    console.error("Error fetching user websites:", error);
    return [];
  }
}

/**
 * Get a single website by ID with ownership check
 */
export async function getWebsiteById(websiteId: string, userId: string) {
  try {
    let website: any = null;

    if (db?.website?.findFirst) {
      website = await db.website.findFirst({
        where: {
          id: websiteId,
          userId,
        },
      });
    }

    if (!website) {
      const rawWebsites: any[] = await prisma.$queryRaw`
        SELECT id, "userId", name, slug, status, "editorData", "createdAt", "updatedAt"
        FROM websites
        WHERE id = ${websiteId}::uuid AND "userId" = ${userId}::uuid
        LIMIT 1
      `;
      if (rawWebsites && rawWebsites.length > 0) {
        website = rawWebsites[0];
      }
    }

    if (!website) {
      throw new AppError(
        "Website not found or access denied",
        404,
        "WEBSITE_NOT_FOUND"
      );
    }

    return website;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to fetch website", 500, "WEBSITE_FETCH_FAILED");
  }
}

/**
 * Create a new website with subscription limit check
 */
export async function createWebsite(userId: string, name: string) {
  const trimmedName = name?.trim();
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

  const slug = generateSlug(trimmedName);
  const initialEditorData = {
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
 * Update editor JSON structure for a website
 */
export async function updateWebsiteEditorData(
  websiteId: string,
  userId: string,
  editorData: any
) {
  // Ensure website exists and belongs to user
  await getWebsiteById(websiteId, userId);

  try {
    if (db?.website?.update) {
      const updated = await db.website.update({
        where: { id: websiteId },
        data: {
          editorData,
          updatedAt: new Date(),
        },
      });
      return updated;
    }

    const jsonStr = JSON.stringify(editorData);
    const updated: any[] = await prisma.$queryRaw`
      UPDATE websites
      SET "editorData" = ${jsonStr}::jsonb, "updatedAt" = NOW()
      WHERE id = ${websiteId}::uuid AND "userId" = ${userId}::uuid
      RETURNING id, "userId", name, slug, status, "editorData", "createdAt", "updatedAt"
    `;

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
  // Ensure website exists and belongs to user
  await getWebsiteById(websiteId, userId);

  try {
    if (db?.website?.delete) {
      await db.website.delete({
        where: { id: websiteId },
      });
      return { success: true };
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM websites WHERE id = $1::uuid AND "userId" = $2::uuid`,
      websiteId,
      userId
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting website:", error);
    throw new AppError("Failed to delete website", 500, "DELETE_FAILED");
  }
}
