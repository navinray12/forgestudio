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
 */
export async function restoreRevision(websiteId: string, revisionId: string, userId: string) {
  // 1. Authorize: Enforce EDIT_DESIGN or EDIT_CONTENT (rejects REVIEWER)
  await getWebsiteById(websiteId, userId);
  const canEditDesign = await canUserAccessResource(userId, websiteId, "*", "EDIT_DESIGN");
  const canEditContent = await canUserAccessResource(userId, websiteId, "*", "EDIT_CONTENT");

  if (!canEditDesign && !canEditContent) {
    throw new AppError("You do not have permission to restore revisions.", 403, "FORBIDDEN");
  }

  // 2. Fetch target revision
  const revision = await db.websiteRevision.findUnique({
    where: { id: revisionId },
  });

  if (!revision || revision.websiteId !== websiteId) {
    throw new AppError("Revision not found or does not belong to this website.", 404, "NOT_FOUND");
  }

  // 3. Fetch current website and isolate publishedData
  const website = await db.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new AppError("Website not found.", 404, "NOT_FOUND");
  }

  const currentEditorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  // Preserved published snapshot from current state
  const currentPublishedData = currentEditorData.publishedData;

  const restoredSnapshot = typeof revision.data === "string"
    ? JSON.parse(revision.data)
    : revision.data;

  // 4. Construct updated editorData:
  // Restored working draft with publishedData strictly preserved
  const updatedEditorData = {
    ...restoredSnapshot,
    ...(currentPublishedData ? { publishedData: currentPublishedData } : {}),
  };

  // 5. Update website in database
  // Notice: status is NOT modified to "PUBLISHED"
  const updatedWebsite = await db.website.update({
    where: { id: websiteId },
    data: {
      editorData: updatedEditorData,
      updatedAt: new Date(),
    },
  });

  // 6. Record a RESTORE checkpoint revision documenting the action
  let restoreRevRecord: any = null;
  try {
    restoreRevRecord = await createRevision(websiteId, userId, {
      revisionType: "RESTORE",
      description: `Restored from version v${revision.version}`,
      snapshot: restoredSnapshot,
    });
  } catch (chkErr) {
    console.warn("Failed to create RESTORE checkpoint revision:", chkErr);
  }

  // 7. Record audit log
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: "REVISION_RESTORED",
        targetResource: `website:${websiteId}`,
        details: {
          restoredFromRevisionId: revision.id,
          restoredFromVersion: revision.version,
          restoreCheckpointVersion: restoreRevRecord?.version,
        },
      },
    });
  } catch (auditErr) {
    console.warn("Audit log creation for restore failed:", auditErr);
  }

  return {
    success: true,
    message: `Restored working draft to revision v${revision.version} successfully.`,
    restoredRevision: {
      id: revision.id,
      version: revision.version,
      revisionType: revision.revisionType,
      description: revision.description,
      data: restoredSnapshot,
    },
    website: updatedWebsite,
  };
}
