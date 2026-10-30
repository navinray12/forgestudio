import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";
import { canUserAccessResource } from "./permission.service.js";

const db = prisma as any;

export interface CreateRevisionInput {
  description?: string;
  revisionType?: "MANUAL" | "PUBLISH" | "CHECKPOINT" | "RESTORE";
  snapshot?: any;
  elements?: any[];
  pageSettings?: any;
  pages?: any[];
  siteParts?: any;
  globalSettings?: any;
  globalStyles?: any;
  navigation?: any[];
  siteSettings?: any;
  breakpoints?: any[];
  popups?: any[];
  pageCss?: string;
  homePageId?: string;
}

/**
 * Fetch all revisions for a given website (sorted newest to oldest)
 */
export async function getWebsiteRevisions(websiteId: string, userId: string) {
  // 1. Authorize: Enforce VIEW capability
  await getWebsiteById(websiteId, userId);
  const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
  if (!canView) {
    throw new AppError("You do not have permission to view revisions for this website.", 403, "FORBIDDEN");
  }

  // 2. Fetch revisions from PostgreSQL
  const revisions = await db.websiteRevision.findMany({
    where: { websiteId },
    orderBy: { createdAt: "desc" },
    include: {
      creator: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  // 3. Project safe client DTO summary
  return revisions.map((rev: any) => {
    const rawData = typeof rev.data === "string" ? JSON.parse(rev.data) : rev.data;
    const elementsList = Array.isArray(rawData?.elements) ? rawData.elements : [];
    const pagesList = Array.isArray(rawData?.pages) ? rawData.pages : [];

    return {
      id: rev.id,
      websiteId: rev.websiteId,
      version: rev.version,
      revisionType: rev.revisionType,
      description: rev.description || (rev.revisionType === "PUBLISH" ? `Published v${rev.version}` : `Revision v${rev.version}`),
      elementCount: elementsList.length,
      pageCount: pagesList.length > 0 ? pagesList.length : 1,
      createdAt: rev.createdAt,
      timestamp: new Date(rev.createdAt).getTime(),
      createdBy: rev.createdBy,
      author: rev.creator?.fullName || rev.creator?.email || "Collaborator",
    };
  });
}

/**
 * Fetch a single full revision including snapshot data
 */
export async function getRevisionById(websiteId: string, revisionId: string, userId: string) {
  // 1. Authorize: Enforce VIEW capability
  await getWebsiteById(websiteId, userId);
  const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
  if (!canView) {
    throw new AppError("You do not have permission to view this revision.", 403, "FORBIDDEN");
  }

  // 2. Fetch revision
  const revision = await db.websiteRevision.findUnique({
    where: { id: revisionId },
    include: {
      creator: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!revision || revision.websiteId !== websiteId) {
    throw new AppError("Revision not found or does not belong to this website.", 404, "NOT_FOUND");
  }

  const rawData = typeof revision.data === "string" ? JSON.parse(revision.data) : revision.data;

  return {
    id: revision.id,
    websiteId: revision.websiteId,
    version: revision.version,
    revisionType: revision.revisionType,
    description: revision.description,
    createdAt: revision.createdAt,
    timestamp: new Date(revision.createdAt).getTime(),
    createdBy: revision.createdBy,
    author: revision.creator?.fullName || revision.creator?.email || "Collaborator",
    data: rawData,
    elements: rawData?.elements || [],
    pageSettings: rawData?.pageSettings,
    pages: rawData?.pages || [],
    siteParts: rawData?.siteParts,
    globalSettings: rawData?.globalSettings,
    breakpoints: rawData?.breakpoints,
    popups: rawData?.popups,
    pageCss: rawData?.pageCss,
    homePageId: rawData?.homePageId,
  };
}

/**
 * Create a new revision with concurrency-safe monotonic version allocation
 */
export async function createRevision(websiteId: string, userId: string, payload: CreateRevisionInput) {
  // 1. Authorize: Enforce EDIT_DESIGN or EDIT_CONTENT
  const website = await getWebsiteById(websiteId, userId);
  const canEditDesign = await canUserAccessResource(userId, websiteId, "*", "EDIT_DESIGN");
  const canEditContent = await canUserAccessResource(userId, websiteId, "*", "EDIT_CONTENT");

  if (!canEditDesign && !canEditContent) {
    throw new AppError("You do not have permission to create revisions.", 403, "FORBIDDEN");
  }

  // 2. Build full website snapshot
  let snapshot = payload.snapshot;
  if (!snapshot) {
    const currentEditorData = typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : (website.editorData || {});

    snapshot = {
      version: currentEditorData.version || 1,
      elements: payload.elements ?? currentEditorData.elements ?? [],
      pages: payload.pages ?? currentEditorData.pages ?? [],
      pageSettings: payload.pageSettings ?? currentEditorData.pageSettings ?? {},
      siteParts: payload.siteParts ?? currentEditorData.siteParts ?? null,
      globalSettings: payload.globalSettings ?? currentEditorData.globalSettings ?? null,
      globalStyles: payload.globalStyles ?? currentEditorData.globalStyles ?? null,
      navigation: payload.navigation ?? currentEditorData.navigation ?? [],
      siteSettings: payload.siteSettings ?? currentEditorData.siteSettings ?? null,
      breakpoints: payload.breakpoints ?? currentEditorData.breakpoints ?? null,
      popups: payload.popups ?? currentEditorData.popups ?? null,
      pageCss: payload.pageCss ?? currentEditorData.pageCss ?? "",
      homePageId: payload.homePageId ?? currentEditorData.homePageId ?? "",
    };
  } else {
    // If snapshot provided, sanitize out internal publishedData
    snapshot = typeof snapshot === "string" ? JSON.parse(snapshot) : { ...snapshot };
    delete snapshot.publishedData;
  }

  const revisionType = payload.revisionType || "MANUAL";
  const description = payload.description?.trim() || (revisionType === "PUBLISH" ? "Website published" : "Manual checkpoint");

  // 3. Concurrency-safe version allocation with retry on unique constraint conflict
  const maxRetries = 3;
  let attempt = 0;
  let createdRevision: any = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      createdRevision = await db.$transaction(async (tx: any) => {
        const latestRev = await tx.websiteRevision.findFirst({
          where: { websiteId },
          orderBy: { version: "desc" },
          select: { version: true },
        });

        const nextVersion = (latestRev?.version ?? 0) + 1;

        return await tx.websiteRevision.create({
          data: {
            websiteId,
            version: nextVersion,
            revisionType,
            description,
            data: snapshot,
            createdBy: userId,
          },
          include: {
            creator: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        });
      });

      break; // Success!
    } catch (err: any) {
      // Check for Prisma unique constraint collision (P2002)
      if (err?.code === "P2002" && attempt < maxRetries) {
        // Wait small jitter and retry
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }
      console.error("Error in createRevision transaction:", err);
      throw new AppError("Failed to create revision snapshot.", 500, "REVISION_CREATE_FAILED");
    }
  }

  if (!createdRevision) {
    throw new AppError("Could not allocate version number for revision.", 500, "VERSION_COLLISION");
  }

  // 4. Record audit log
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: "REVISION_CREATED",
        targetResource: `website:${websiteId}`,
        details: {
          revisionId: createdRevision.id,
          version: createdRevision.version,
          revisionType: createdRevision.revisionType,
          description: createdRevision.description,
        },
      },
    });
  } catch (auditErr) {
    console.warn("Audit log creation for revision failed:", auditErr);
  }

  return {
    id: createdRevision.id,
    websiteId: createdRevision.websiteId,
    version: createdRevision.version,
    revisionType: createdRevision.revisionType,
    description: createdRevision.description,
    createdAt: createdRevision.createdAt,
    timestamp: new Date(createdRevision.createdAt).getTime(),
    createdBy: createdRevision.createdBy,
    author: createdRevision.creator?.fullName || createdRevision.creator?.email || "Collaborator",
  };
}

/**
 * Restore a revision to the working draft.
 * INVARIANT: Restore updates the working draft ONLY.
 * It strictly preserves any publishedData, does NOT set status to PUBLISHED,
 * and does NOT alter the public website runtime.
 *
 * Atomically:
 * 1. Verifies caller permissions.
 * 2. In a Prisma transaction:
 *    - Verifies optimistic concurrency (expectedVersion).
 *    - Validates target revision belongs to the same website.
 *    - Captures a complete snapshot of the CURRENT working draft.
 *    - Creates a durable recovery revision representing the pre-restore state.
 *    - Applies the selected historical revision to the draft (preserving publishedData).
 *    - Increments website version.
 *    - Records audit log.
 * Any failure rolls back the entire transaction.
 */
export async function restoreRevision(
  websiteId: string,
  revisionId: string,
  userId: string,
  expectedVersion?: number
) {
  // 1. Authorize: Enforce EDIT_DESIGN or EDIT_CONTENT (rejects VIEWER / REVIEWER)
  await getWebsiteById(websiteId, userId);
  const canEditDesign = await canUserAccessResource(userId, websiteId, "*", "EDIT_DESIGN");
  const canEditContent = await canUserAccessResource(userId, websiteId, "*", "EDIT_CONTENT");

  if (!canEditDesign && !canEditContent) {
    throw new AppError("You do not have permission to restore revisions.", 403, "FORBIDDEN");
  }

  // 2. Atomic PostgreSQL Transaction
  try {
    return await db.$transaction(async (tx: any) => {
    // A. Validate current website state
    const website = await tx.website.findUnique({
      where: { id: websiteId },
    });

    if (!website) {
      throw new AppError("Website not found.", 404, "NOT_FOUND");
    }

    // B. Optimistic Concurrency Check (CAS)
    if (expectedVersion !== undefined && expectedVersion !== null) {
      const expNum = Number(expectedVersion);
      if (website.version !== expNum) {
        throw new AppError(
          `Optimistic concurrency conflict: Expected website version ${expNum}, but current database version is ${website.version}.`,
          409,
          "STALE_VERSION_CONFLICT"
        );
      }
    }

    // C. Validate requested historical revision belongs to the same website
    const historicalRevision = await tx.websiteRevision.findUnique({
      where: { id: revisionId },
    });

    if (!historicalRevision || historicalRevision.websiteId !== websiteId) {
      throw new AppError("Revision not found or does not belong to this website.", 404, "NOT_FOUND");
    }

    // D. Capture complete durable snapshot of the CURRENT working draft BEFORE overwriting
    const currentEditorData = typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : (website.editorData || {});

    // Preserve published snapshot and active deployment data
    const currentPublishedData = currentEditorData.publishedData;

    const preRestoreDraftSnapshot = {
      version: currentEditorData.version ?? website.version,
      elements: currentEditorData.elements ?? [],
      pages: currentEditorData.pages ?? [],
      pageSettings: currentEditorData.pageSettings ?? {},
      siteParts: currentEditorData.siteParts ?? null,
      globalSettings: currentEditorData.globalSettings ?? null,
      globalStyles: currentEditorData.globalStyles ?? null,
      navigation: currentEditorData.navigation ?? [],
      siteSettings: currentEditorData.siteSettings ?? null,
      breakpoints: currentEditorData.breakpoints ?? null,
      popups: currentEditorData.popups ?? null,
      pageCss: currentEditorData.pageCss ?? "",
      homePageId: currentEditorData.homePageId ?? "",
    };

    // E. Allocate next monotonic revision version and create durable recovery revision
    const latestRev = await tx.websiteRevision.findFirst({
      where: { websiteId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const recoveryRevisionVersion = (latestRev?.version ?? 0) + 1;

    const recoveryRevision = await tx.websiteRevision.create({
      data: {
        websiteId,
        version: recoveryRevisionVersion,
        revisionType: "RESTORE",
        description: `Pre-restore recovery snapshot before restoring v${historicalRevision.version}`,
        data: preRestoreDraftSnapshot,
        createdBy: userId,
      },
    });

    // F. Apply selected historical revision to draft ONLY, strictly preserving publishedData
    const restoredRawData = typeof historicalRevision.data === "string"
      ? JSON.parse(historicalRevision.data)
      : (historicalRevision.data || {});

    const updatedEditorData = {
      ...restoredRawData,
      ...(currentPublishedData ? { publishedData: currentPublishedData } : {}),
    };

    // G. Atomically increment website optimistic concurrency version via CAS
    const targetExpectedVersion = expectedVersion !== undefined && expectedVersion !== null
      ? Number(expectedVersion)
      : website.version;
    const newWebsiteVersion = targetExpectedVersion + 1;

    const updateResult = await tx.website.updateMany({
      where: {
        id: websiteId,
        version: targetExpectedVersion,
      },
      data: {
        editorData: updatedEditorData,
        version: newWebsiteVersion,
        updatedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new AppError(
        `Optimistic concurrency conflict: Expected website version ${targetExpectedVersion}, but current database version has changed.`,
        409,
        "STALE_VERSION_CONFLICT"
      );
    }

    const updatedWebsite = await tx.website.findUnique({
      where: { id: websiteId },
    });

    // H. Persist mandatory audit record inside transaction
    await tx.auditLog.create({
      data: {
        userId,
        action: "REVISION_RESTORED",
        targetResource: `website:${websiteId}`,
        details: {
          restoredFromRevisionId: historicalRevision.id,
          restoredFromVersion: historicalRevision.version,
          recoveryRevisionId: recoveryRevision.id,
          recoveryVersion: recoveryRevision.version,
          previousWebsiteVersion: website.version,
          newWebsiteVersion: newWebsiteVersion,
        },
      },
    });

    return {
      success: true,
      message: `Restored working draft to revision v${historicalRevision.version} successfully. Recovery snapshot saved as v${recoveryRevision.version}.`,
      recoveryRevisionId: recoveryRevision.id,
      recoveryVersion: recoveryRevision.version,
      recoveryRevision,
      restoredRevision: {
        id: historicalRevision.id,
        version: historicalRevision.version,
        revisionType: historicalRevision.revisionType,
        description: historicalRevision.description,
        data: restoredRawData,
      },
      website: updatedWebsite,
    };
  });
  } catch (error: any) {
    if (
      error?.code === "P2002" ||
      error?.message?.includes("Unique constraint failed") ||
      error?.cause?.driverAdapterError?.name === "UniqueConstraintViolation" ||
      error?.driverAdapterError?.name === "UniqueConstraintViolation"
    ) {
      throw new AppError(
        "Optimistic concurrency conflict: A concurrent update or restore operation was completed first.",
        409,
        "STALE_VERSION_CONFLICT"
      );
    }
    throw error;
  }
}


export interface RevisionDiffSummary {
  addedPagesCount: number;
  deletedPagesCount: number;
  modifiedPagesCount: number;
  homepageChanged: { from: string; to: string } | null;
  elementCountDelta: number;
}

export interface PageDiffDetail {
  pageId: string;
  name: string;
  slug: string;
  changes: Array<"RENAME" | "SLUG_CHANGE" | "SETTINGS_MODIFIED" | "ELEMENTS_MODIFIED">;
  details: {
    oldName?: string;
    newName?: string;
    oldSlug?: string;
    newSlug?: string;
    oldElementCount?: number;
    newElementCount?: number;
  };
}

/**
 * Compare two website revisions and return a structured diff of pages, settings, and elements.
 */
export async function compareRevisions(
  websiteId: string,
  baseIdentifier: string | number,
  targetIdentifier: string | number,
  userId: string
) {
  // 1. Authorize: Enforce VIEW capability
  await getWebsiteById(websiteId, userId);
  const canView = await canUserAccessResource(userId, websiteId, "*", "VIEW");
  if (!canView) {
    throw new AppError("You do not have permission to view revisions.", 403, "FORBIDDEN");
  }

  // Helper to fetch revision by ID or version number
  const resolveRevisionSnapshot = async (identifier: string | number) => {
    if (identifier === "current" || identifier === "draft") {
      const site = await db.website.findUnique({ where: { id: websiteId } });
      if (!site) throw new AppError("Website not found.", 404, "NOT_FOUND");
      const ed = typeof site.editorData === "string" ? JSON.parse(site.editorData) : site.editorData || {};
      return {
        id: "current",
        version: site.version || 0,
        revisionType: "DRAFT",
        description: "Current Working Draft",
        createdAt: site.updatedAt,
        data: ed,
      };
    }

    const isUuid = typeof identifier === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    let rev = null;
    if (isUuid) {
      rev = await db.websiteRevision.findUnique({
        where: { id: identifier as string },
      });
    } else {
      const verNum = Number(identifier);
      if (!isNaN(verNum)) {
        rev = await db.websiteRevision.findUnique({
          where: { websiteId_version: { websiteId, version: verNum } },
        });
      }
    }

    if (!rev || rev.websiteId !== websiteId) {
      throw new AppError(`Revision '${identifier}' not found for this website.`, 404, "NOT_FOUND");
    }

    const rawData = typeof rev.data === "string" ? JSON.parse(rev.data) : rev.data;
    return {
      id: rev.id,
      version: rev.version,
      revisionType: rev.revisionType,
      description: rev.description,
      createdAt: rev.createdAt,
      data: rawData,
    };
  };

  const baseRev = await resolveRevisionSnapshot(baseIdentifier);
  const targetRev = await resolveRevisionSnapshot(targetIdentifier);

  const baseData = baseRev.data || {};
  const targetData = targetRev.data || {};

  const basePages: any[] = Array.isArray(baseData.pages) ? baseData.pages : [];
  const targetPages: any[] = Array.isArray(targetData.pages) ? targetData.pages : [];

  const basePageMap = new Map<string, any>(basePages.map((p) => [p.id, p]));
  const targetPageMap = new Map<string, any>(targetPages.map((p) => [p.id, p]));

  const addedPages: any[] = [];
  const deletedPages: any[] = [];
  const modifiedPages: PageDiffDetail[] = [];

  // Identify added & modified pages
  for (const [id, targetPage] of targetPageMap.entries()) {
    const basePage = basePageMap.get(id);
    if (!basePage) {
      addedPages.push({
        id: targetPage.id,
        name: targetPage.name,
        slug: targetPage.slug,
        elementCount: targetPage.elements?.length || 0,
      });
    } else {
      const changes: Array<"RENAME" | "SLUG_CHANGE" | "SETTINGS_MODIFIED" | "ELEMENTS_MODIFIED"> = [];
      const details: PageDiffDetail["details"] = {};

      if (basePage.name !== targetPage.name) {
        changes.push("RENAME");
        details.oldName = basePage.name;
        details.newName = targetPage.name;
      }

      if (basePage.slug !== targetPage.slug) {
        changes.push("SLUG_CHANGE");
        details.oldSlug = basePage.slug;
        details.newSlug = targetPage.slug;
      }

      const baseSettingsStr = JSON.stringify(basePage.pageSettings || {});
      const targetSettingsStr = JSON.stringify(targetPage.pageSettings || {});
      if (baseSettingsStr !== targetSettingsStr) {
        changes.push("SETTINGS_MODIFIED");
      }

      const baseCount = basePage.elements?.length || 0;
      const targetCount = targetPage.elements?.length || 0;
      const baseElementsStr = JSON.stringify(basePage.elements || []);
      const targetElementsStr = JSON.stringify(targetPage.elements || []);
      if (baseElementsStr !== targetElementsStr) {
        changes.push("ELEMENTS_MODIFIED");
        details.oldElementCount = baseCount;
        details.newElementCount = targetCount;
      }

      if (changes.length > 0) {
        modifiedPages.push({
          pageId: id,
          name: targetPage.name,
          slug: targetPage.slug,
          changes,
          details,
        });
      }
    }
  }

  // Identify deleted pages
  for (const [id, basePage] of basePageMap.entries()) {
    if (!targetPageMap.has(id)) {
      deletedPages.push({
        id: basePage.id,
        name: basePage.name,
        slug: basePage.slug,
        elementCount: basePage.elements?.length || 0,
      });
    }
  }

  // Compare homePageId
  const baseHome = baseData.homePageId || basePages.find((p) => p.isHome || p.slug === "/")?.id || "";
  const targetHome = targetData.homePageId || targetPages.find((p) => p.isHome || p.slug === "/")?.id || "";
  const homepageChanged = baseHome !== targetHome ? { from: baseHome, to: targetHome } : null;

  // Total element counts
  const countElements = (pages: any[], fallbackElements: any[] = []) => {
    if (pages.length > 0) {
      return pages.reduce((sum, p) => sum + (p.elements?.length || 0), 0);
    }
    return fallbackElements.length;
  };

  const baseElemCount = countElements(basePages, baseData.elements || []);
  const targetElemCount = countElements(targetPages, targetData.elements || []);

  const summary: RevisionDiffSummary = {
    addedPagesCount: addedPages.length,
    deletedPagesCount: deletedPages.length,
    modifiedPagesCount: modifiedPages.length,
    homepageChanged,
    elementCountDelta: targetElemCount - baseElemCount,
  };

  return {
    success: true,
    baseRevision: {
      id: baseRev.id,
      version: baseRev.version,
      revisionType: baseRev.revisionType,
      description: baseRev.description,
      createdAt: baseRev.createdAt,
    },
    targetRevision: {
      id: targetRev.id,
      version: targetRev.version,
      revisionType: targetRev.revisionType,
      description: targetRev.description,
      createdAt: targetRev.createdAt,
    },
    summary,
    addedPages,
    deletedPages,
    modifiedPages,
  };
}

