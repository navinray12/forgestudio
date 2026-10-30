import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getWebsiteById } from "./website.service.js";

const db = prisma as any;

export async function setApprovalWorkflowEnabled(
  websiteId: string,
  userId: string,
  enabled: boolean
) {
  const website = await getWebsiteById(websiteId, userId);
  if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN") {
    throw new AppError("Only website owners and admins can configure approval workflow", 403, "FORBIDDEN");
  }

  const updated = await db.website.update({
    where: { id: websiteId },
    data: { approvalWorkflowEnabled: enabled },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: "APPROVAL_WORKFLOW_CONFIGURED",
        targetResource: `website:${websiteId}`,
        details: { approvalWorkflowEnabled: enabled },
      },
    });
  } catch (_) {}

  return { success: true, approvalWorkflowEnabled: updated.approvalWorkflowEnabled };
}

export async function submitForPublishApproval(
  websiteId: string,
  requesterId: string,
  targetVersion: number,
  snapshot: any,
  notes?: string
) {
  // Validate website exists and user is a collaborator
  await getWebsiteById(websiteId, requesterId);

  // Validate targetVersion
  if (!targetVersion || typeof targetVersion !== "number" || targetVersion < 1) {
    throw new AppError("Target version must be a positive integer", 400, "INVALID_TARGET_VERSION");
  }

  // Validate snapshot
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new AppError("A valid snapshot object is required", 400, "INVALID_SNAPSHOT");
  }

  // Check if there is already a pending approval request
  const existingPending = await db.publishApprovalRequest.findFirst({
    where: { websiteId, status: { in: ["PENDING", "CONSUMING"] } },
  });
  if (existingPending) {
    throw new AppError(
      "A publish approval request is already pending for this website.",
      400,
      "APPROVAL_ALREADY_PENDING"
    );
  }

  const request = await db.publishApprovalRequest.create({
    data: {
      websiteId,
      requesterId,
      targetVersion,
      snapshot,
      reviewNotes: notes?.trim() || null,
      status: "PENDING",
    },
    include: {
      requester: { select: { id: true, fullName: true, email: true } },
    },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: requesterId,
        action: "PUBLISH_APPROVAL_REQUESTED",
        targetResource: `website:${websiteId}`,
        details: { requestId: request.id, targetVersion },
      },
    });
  } catch (_) {}

  return request;
}

export async function reviewPublishApproval(
  requestId: string,
  reviewerId: string,
  decision: "APPROVED" | "REJECTED",
  reviewNotes?: string
) {
  const request = await db.publishApprovalRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) {
    throw new AppError("Approval request not found", 404, "NOT_FOUND");
  }

  if (request.status !== "PENDING") {
    throw new AppError(`Approval request has already been ${request.status.toLowerCase()}`, 400, "BAD_REQUEST");
  }

  // Reviewer must be OWNER or ADMIN of the website
  const website = await getWebsiteById(request.websiteId, reviewerId);
  if (website.userPermission !== "OWNER" && website.userPermission !== "ADMIN") {
    throw new AppError("Only website owners and admins can approve publish requests", 403, "FORBIDDEN");
  }

  // Self-approval prevention (Separation of duties / four-eyes principle)
  if (request.requesterId === reviewerId) {
    throw new AppError("Users cannot review or approve their own approval requests", 403, "SELF_APPROVAL_FORBIDDEN");
  }

  const updated = await db.publishApprovalRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      reviewerId,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes?.trim() || request.reviewNotes,
    },
    include: {
      requester: { select: { id: true, fullName: true, email: true } },
      reviewer: { select: { id: true, fullName: true, email: true } },
      website: { select: { id: true, name: true, slug: true } },
    },
  });

  // Audit Log
  try {
    await db.auditLog.create({
      data: {
        userId: reviewerId,
        action: `PUBLISH_APPROVAL_${decision}`,
        targetResource: `website:${request.websiteId}`,
        details: { requestId, decision, targetVersion: request.targetVersion },
      },
    });
  } catch (_) {}

  return updated;
}

export async function getWebsiteApprovalRequests(websiteId: string, userId: string) {
  await getWebsiteById(websiteId, userId);

  return await db.publishApprovalRequest.findMany({
    where: { websiteId },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, fullName: true, email: true } },
      reviewer: { select: { id: true, fullName: true, email: true } },
      website: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function cancelPublishApproval(requestId: string, requesterId: string) {
  const request = await db.publishApprovalRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) {
    throw new AppError("Approval request not found", 404, "NOT_FOUND");
  }

  if (request.requesterId !== requesterId) {
    throw new AppError("You can only cancel your own approval requests", 403, "FORBIDDEN");
  }

  if (request.status !== "PENDING") {
    throw new AppError("Cannot cancel an approval request that is no longer pending", 400, "BAD_REQUEST");
  }

  return await db.publishApprovalRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });
}

/**
 * Deterministically serializes JSON with recursively sorted object keys.
 */
export function canonicalizeJson(value: any): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalizeJson(item)).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const pairs: string[] = [];
  for (const k of keys) {
    if (value[k] !== undefined) {
      pairs.push(`${JSON.stringify(k)}:${canonicalizeJson(value[k])}`);
    }
  }
  return "{" + pairs.join(",") + "}";
}

/**
 * Strips volatile/runtime metadata properties that do not represent design or content changes.
 */
function stripVolatileProperties(data: any): any {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(stripVolatileProperties);

  const volatileKeys = new Set([
    "backups",
    "publishing",
    "publishedData",
    "deployment",
    "version",
    "publishedVersion",
    "lastSaved",
    "lastSavedAt",
    "createdAt",
    "updatedAt",
  ]);

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!volatileKeys.has(k)) {
      clean[k] = stripVolatileProperties(v);
    }
  }
  return clean;
}

/**
 * Compares an approved review snapshot with the publish candidate data.
 * Returns true only if the canonical content (elements, pages, and content structures) matches.
 */
export function isApprovedSnapshotMatch(approvedSnapshot: any, candidateData: any): boolean {
  if (!approvedSnapshot || !candidateData) return false;

  let rawApproved: any;
  let rawCandidate: any;
  try {
    rawApproved = typeof approvedSnapshot === "string" ? JSON.parse(approvedSnapshot) : approvedSnapshot;
    rawCandidate = typeof candidateData === "string" ? JSON.parse(candidateData) : candidateData;
  } catch (_) {
    return false;
  }

  if (!rawApproved || typeof rawApproved !== "object" || !rawCandidate || typeof rawCandidate !== "object") {
    return false;
  }

  // 1. Direct stripped comparison (handles identical full editor snapshots regardless of key order)
  const cleanApproved = stripVolatileProperties(rawApproved);
  const cleanCandidate = stripVolatileProperties(rawCandidate);

  if (canonicalizeJson(cleanApproved) === canonicalizeJson(cleanCandidate)) {
    return true;
  }

  // 2. Unwrapped editorData canonical comparison
  const snap = cleanApproved.editorData || cleanApproved;
  const cand = cleanCandidate.editorData || cleanCandidate;

  return canonicalizeJson(snap) === canonicalizeJson(cand);
}
