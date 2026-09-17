/**
 * @file Publishing: business operations and coordination with persistence or external services. File responsibility: approval service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import { getWebsiteById } from "../websites/website.service.js";

const db = prisma as any;

/**
 * Set Approval Workflow Enabled.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 * @param enabled Enabled supplied to this operation (type: boolean).
 */
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

/**
 * Submit For Publish Approval.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param requesterId Requester Id supplied to this operation (type: string).
 * @param targetVersion Target Version supplied to this operation (type: number).
 * @param snapshot Snapshot supplied to this operation (type: any).
 * @param notes Notes supplied to this operation (type: string). Optional; callers may omit it.
 */
export async function submitForPublishApproval(
  websiteId: string,
  requesterId: string,
  targetVersion: number,
  snapshot: any,
  notes?: string
) {
  // Validate website exists and user is a collaborator
  await getWebsiteById(websiteId, requesterId);

  // Check if there is already a pending approval request
  const existingPending = await db.publishApprovalRequest.findFirst({
    where: { websiteId, status: "PENDING" },
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

/**
 * Review Publish Approval.
 * @param requestId Request Id supplied to this operation (type: string).
 * @param reviewerId Reviewer Id supplied to this operation (type: string).
 * @param decision Decision supplied to this operation (type: "APPROVED" | "REJECTED").
 * @param reviewNotes Review Notes supplied to this operation (type: string). Optional; callers may omit it.
 */
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

/**
 * Get Website Approval Requests.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param userId User identifier used to scope this operation; authorization is checked by the relevant caller or service.
 */
export async function getWebsiteApprovalRequests(websiteId: string, userId: string) {
  await getWebsiteById(websiteId, userId);

  return await db.publishApprovalRequest.findMany({
    where: { websiteId },
    orderBy: { createdAt: "desc" },
    include: {
      requester: { select: { id: true, fullName: true, email: true } },
      reviewer: { select: { id: true, fullName: true, email: true } },
    },
  });
}

/**
 * Cancel Publish Approval.
 * @param requestId Request Id supplied to this operation (type: string).
 * @param requesterId Requester Id supplied to this operation (type: string).
 */
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
