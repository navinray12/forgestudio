import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import {
  setApprovalWorkflowEnabled,
  submitForPublishApproval,
  reviewPublishApproval,
  getWebsiteApprovalRequests,
  cancelPublishApproval,
} from "../services/approval.service.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id: unknown): id is string {
  return typeof id === "string" && UUID_REGEX.test(id.trim());
}

/**
 * POST /api/approval-requests
 * POST /api/websites/:id/approval-requests
 * Submits an approval request for a website publish snapshot.
 */
export async function submitApprovalRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = res.locals.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const websiteId = String(req.params.id || req.params.websiteId || req.body.websiteId || "").trim();
    if (!websiteId) {
      throw new AppError("Missing required parameter: websiteId", 400, "INVALID_INPUT");
    }
    if (!isValidUuid(websiteId)) {
      throw new AppError("Invalid websiteId format (must be UUID)", 400, "INVALID_ID");
    }

    const { targetVersion, snapshot } = req.body || {};
    const notes = req.body?.notes || req.body?.note;

    // Validate targetVersion
    const parsedVersion = Number(targetVersion);
    if (!targetVersion || isNaN(parsedVersion) || !Number.isInteger(parsedVersion) || parsedVersion < 1) {
      throw new AppError(
        "Missing or invalid required parameter: targetVersion (positive integer version required)",
        400,
        "INVALID_TARGET_VERSION"
      );
    }

    // Validate snapshot
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new AppError(
        "Missing or invalid required parameter: snapshot (editor snapshot object required)",
        400,
        "INVALID_SNAPSHOT"
      );
    }

    if (notes && typeof notes !== "string") {
      throw new AppError("Review notes must be a string", 400, "INVALID_NOTES");
    }
    if (notes && notes.length > 1000) {
      throw new AppError("Review notes cannot exceed 1000 characters", 400, "INVALID_NOTES");
    }

    // Delegate to service, using authenticated userId as requesterId
    const request = await submitForPublishApproval(
      websiteId,
      userId,
      parsedVersion,
      snapshot,
      notes
    );

    res.status(201).json({
      success: true,
      request,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/approval-requests?websiteId=...
 * GET /api/websites/:id/approval-requests
 * Lists all approval requests for a given website.
 */
export async function getWebsiteApprovalRequestsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = res.locals.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const websiteId = String(
      req.params.id || req.params.websiteId || req.query.websiteId || ""
    ).trim();

    if (!websiteId) {
      throw new AppError("Missing required query or parameter: websiteId", 400, "INVALID_INPUT");
    }
    if (!isValidUuid(websiteId)) {
      throw new AppError("Invalid websiteId format (must be UUID)", 400, "INVALID_ID");
    }

    const requests = await getWebsiteApprovalRequests(websiteId, userId);

    res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/approval-requests/:id/review
 * Approver reviews a pending publish approval request.
 */
export async function reviewApprovalRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const reviewerId = res.locals.user?.id;
    if (!reviewerId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const requestId = String(req.params.id || "").trim();
    if (!requestId) {
      throw new AppError("Missing required parameter: requestId", 400, "INVALID_INPUT");
    }
    if (!isValidUuid(requestId)) {
      throw new AppError("Invalid requestId format (must be UUID)", 400, "INVALID_ID");
    }

    const { decision, reviewNotes } = req.body || {};

    if (!decision || typeof decision !== "string") {
      throw new AppError("Missing required parameter: decision", 400, "INVALID_DECISION");
    }

    const normalizedDecision = decision.trim().toUpperCase();
    if (normalizedDecision !== "APPROVED" && normalizedDecision !== "REJECTED") {
      throw new AppError(
        "Invalid decision value. Must be either 'APPROVED' or 'REJECTED'",
        400,
        "INVALID_DECISION"
      );
    }

    if (reviewNotes && typeof reviewNotes !== "string") {
      throw new AppError("Review notes must be a string", 400, "INVALID_NOTES");
    }
    if (reviewNotes && reviewNotes.length > 1000) {
      throw new AppError("Review notes cannot exceed 1000 characters", 400, "INVALID_NOTES");
    }

    const updated = await reviewPublishApproval(
      requestId,
      reviewerId,
      normalizedDecision as "APPROVED" | "REJECTED",
      reviewNotes
    );

    res.status(200).json({
      success: true,
      request: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/approval-requests/:id/cancel
 * Requester cancels their own pending approval request.
 */
export async function cancelApprovalRequestHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = res.locals.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const requestId = String(req.params.id || "").trim();
    if (!requestId) {
      throw new AppError("Missing required parameter: requestId", 400, "INVALID_INPUT");
    }
    if (!isValidUuid(requestId)) {
      throw new AppError("Invalid requestId format (must be UUID)", 400, "INVALID_ID");
    }

    const cancelled = await cancelPublishApproval(requestId, userId);

    res.status(200).json({
      success: true,
      request: cancelled,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/websites/:id/approval-workflow
 * POST /api/websites/:id/approval-workflow
 * Enables or disables the approval workflow requirement on a website.
 */
export async function toggleApprovalWorkflowHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = res.locals.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const websiteId = String(req.params.id || req.params.websiteId || req.body.websiteId || "").trim();
    if (!websiteId) {
      throw new AppError("Missing required parameter: websiteId", 400, "INVALID_INPUT");
    }
    if (!isValidUuid(websiteId)) {
      throw new AppError("Invalid websiteId format (must be UUID)", 400, "INVALID_ID");
    }

    const { enabled } = req.body || {};
    if (typeof enabled !== "boolean") {
      throw new AppError(
        "Missing or invalid parameter: enabled (boolean required)",
        400,
        "INVALID_INPUT"
      );
    }

    const result = await setApprovalWorkflowEnabled(websiteId, userId, enabled);

    res.status(200).json({
      success: true,
      approvalWorkflowEnabled: result.approvalWorkflowEnabled,
    });
  } catch (error) {
    next(error);
  }
}
