/**
 * @file Revisions: HTTP handlers that translate requests into module operations and responses. File responsibility: revision controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import {
  getWebsiteRevisions,
  getRevisionById,
  createRevision,
  restoreRevision,
} from "./revision.service.js";

/**
 * GET /api/websites/:id/revisions
 * List all revisions for a website

 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
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

 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
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

 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
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

 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
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

    const result = await restoreRevision(websiteId, revisionId, user.id);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
