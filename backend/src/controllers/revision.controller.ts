import type { Request, Response, NextFunction } from "express";
import {
  getWebsiteRevisions,
  getRevisionById,
  createRevision,
  restoreRevision,
  compareRevisions,
} from "../services/revision.service.js";

/**
 * GET /api/websites/:id/revisions
 * List all revisions for a website
 */
export async function getWebsiteRevisionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const websiteId = req.params.id as string;
    const user = res.locals.user;

    const revisions = await getWebsiteRevisions(websiteId, user.id);

    return res.status(200).json({
      success: true,
      revisions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/websites/:id/revisions/:revisionId
 * Fetch full revision detail and snapshot
 */
export async function getRevisionByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const websiteId = req.params.id as string;
    const revisionId = req.params.revisionId as string;
    const user = res.locals.user;

    const revision = await getRevisionById(websiteId, revisionId, user.id);

    return res.status(200).json({
      success: true,
      revision,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/revisions
 * Create a new revision checkpoint
 */
export async function createRevisionHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const websiteId = req.params.id as string;
    const user = res.locals.user;
    const payload = req.body || {};

    const revision = await createRevision(websiteId, user.id, payload);

    return res.status(201).json({
      success: true,
      message: "Revision created successfully",
      revision,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/revisions/:revisionId/restore
 * Restore a revision snapshot to the working draft (does NOT publish)
 */
export async function restoreRevisionHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const websiteId = req.params.id as string;
    const revisionId = req.params.revisionId as string;
    const user = res.locals.user;
    const expectedVersion = req.body?.expectedVersion ?? req.query?.expectedVersion;
    const result = await restoreRevision(
      websiteId,
      revisionId,
      user.id,
      expectedVersion !== undefined && expectedVersion !== null ? Number(expectedVersion) : undefined
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/websites/:id/revisions/compare
 * Compare two revisions or compare a revision with current working draft
 */
export async function compareRevisionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const websiteId = req.params.id as string;
    const user = res.locals.user;
    const baseVersion = (req.query.baseVersion || req.query.baseRevisionId) as string;
    const targetVersion = (req.query.targetVersion || req.query.targetRevisionId || "current") as string;

    if (!baseVersion) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_VERSION", message: "baseVersion parameter is required for comparison" },
      });
    }

    const diff = await compareRevisions(websiteId, baseVersion, targetVersion, user.id);
    return res.status(200).json(diff);
  } catch (error) {
    next(error);
  }
}

