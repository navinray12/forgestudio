/**
 * @file Public api: HTTP handlers that translate requests into module operations and responses. File responsibility: api v1 controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import {
  getUserWebsites,
  getWebsiteById,
  createWebsite,
  updateWebsite,
  updateWebsiteEditorData,
} from "../websites/website.service.js";
import {
  publishWebsite,
  getWebsiteDeployments,
  rollbackDeployment,
} from "../publishing/publishing.service.js";
import { canUserAccessResource } from "../permissions/permission.service.js";

// Standard JSON Envelope Responders
/**
 * Send Success.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param data Data supplied to this operation (type: any).
 * @param meta Meta supplied to this operation (type: any). Optional; callers may omit it.
 * @param status Status supplied to this operation. Defaults to 200.
 */
export function sendSuccess(res: Response, data: any, meta?: any, status = 200) {
  const payload: any = { success: true, data };
  if (meta !== undefined) {
    payload.meta = meta;
  }
  return res.status(status).json(payload);
}

/**
 * Send Error.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param code Code supplied to this operation (type: string).
 * @param message Message supplied to this operation (type: string).
 * @param status Status supplied to this operation. Defaults to 400.
 * @param details Details supplied to this operation (type: any). Optional; callers may omit it.
 */
export function sendError(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: any
) {
  const payload: any = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details !== undefined) {
    payload.error.details = details;
  }
  return res.status(status).json(payload);
}

// 1. List Websites
/**
 * List Websites Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function listWebsitesHandler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    let limit = Math.max(1, parseInt((req.query.limit as string) || "20", 10));
    if (limit > 100) limit = 100;

    const statusFilter = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    let websites = await getUserWebsites(user.id);

    if (statusFilter) {
      websites = websites.filter(
        (w: any) => w.status?.toUpperCase() === statusFilter.toUpperCase()
      );
    }

    if (search) {
      const q = search.toLowerCase();
      websites = websites.filter(
        (w: any) =>
          w.name?.toLowerCase().includes(q) || w.slug?.toLowerCase().includes(q)
      );
    }

    const total = websites.length;
    const startIndex = (page - 1) * limit;
    const paginated = websites.slice(startIndex, startIndex + limit);

    return sendSuccess(res, paginated, { total, page, limit });
  } catch (err: any) {
    return sendError(res, "SERVER_ERROR", err.message || "Failed to list websites", 500);
  }
}

// 2. Create Website
/**
 * Create Website Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function createWebsiteHandler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const { name, slug, editorData, templateId } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return sendError(res, "VALIDATION_ERROR", "Website name is required", 400);
    }

    const website = await createWebsite({
      name: name.trim(),
      slug,
      editorData,
      templateId,
      userId: user.id,
    });

    return sendSuccess(res, website, undefined, 201);
  } catch (err: any) {
    return sendError(res, "SERVER_ERROR", err.message || "Failed to create website", 500);
  }
}

// 3. Get Website By ID
/**
 * Get Website By Id Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function getWebsiteByIdHandler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);

    const canView = await canUserAccessResource(user.id, websiteId, "*", "VIEW");
    if (!canView) {
      return sendError(res, "FORBIDDEN", "You do not have permission to view this website", 403);
    }

    const website = await getWebsiteById(websiteId, user.id);
    if (!website) {
      return sendError(res, "NOT_FOUND", "Website not found", 404);
    }

    return sendSuccess(res, website);
  } catch (err: any) {
    return sendError(res, "SERVER_ERROR", err.message || "Failed to get website", 500);
  }
}

// 4. Update Website
/**
 * Update Website Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function updateWebsiteHandler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);

    const canEdit = await canUserAccessResource(user.id, websiteId, "*", "EDIT");
    if (!canEdit) {
      return sendError(res, "FORBIDDEN", "You do not have permission to edit this website", 403);
    }

    const { name, slug, editorData, status } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (editorData !== undefined) updateData.editorData = editorData;
    if (status !== undefined) updateData.status = status;

    const updated = await updateWebsite(websiteId, updateData, user.id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, "SERVER_ERROR", err.message || "Failed to update website", 500);
  }
}

// 5. Get Pages
/**
 * Get Pages Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function getPagesHandler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);

    const canView = await canUserAccessResource(user.id, websiteId, "*", "VIEW");
    if (!canView) {
      return sendError(res, "FORBIDDEN", "You do not have permission to view this website", 403);
    }

    const website = await getWebsiteById(websiteId, user.id);
    if (!website) {
      return sendError(res, "NOT_FOUND", "Website not found", 404);
    }

    let editorData = website.editorData;
    if (typeof editorData === "string") {
      try {
        editorData = JSON.parse(editorData);
      } catch {
        editorData = {};
      }
    }

    const pages = Array.isArray(editorData?.pages)
      ? editorData.pages
      : [
          {
            id: "home",
            name: "Home",
            slug: "/",
            elements: Array.isArray(editorData?.elements) ? editorData.elements : [],
          },
        ];

    return sendSuccess(res, pages, { total: pages.length });
  } catch (err: any) {
    return sendError(res, "SERVER_ERROR", err.message || "Failed to get pages", 500);
  }
}

// 6. Update Pages
/**
 * Update Pages Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function updatePagesHandler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);

    const canEdit = await canUserAccessResource(user.id, websiteId, "*", "EDIT");
    if (!canEdit) {
      return sendError(res, "FORBIDDEN", "You do not have permission to edit this website", 403);
    }

    const website = await getWebsiteById(websiteId, user.id);
    if (!website) {
      return sendError(res, "NOT_FOUND", "Website not found", 404);
    }

    const rawPages = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body.pages)
      ? req.body.pages
      : null;

    if (!rawPages) {
      return sendError(res, "VALIDATION_ERROR", "Invalid payload. Expected { pages: [...] } or an array of pages", 400);
    }

    let editorData = website.editorData;
    if (typeof editorData === "string") {
      try {
        editorData = JSON.parse(editorData);
      } catch {
        editorData = {};
      }
    } else if (!editorData || typeof editorData !== "object") {
      editorData = {};
    }

    // Ensure all pages have valid IDs
    const sanitizedPages = rawPages.map((p: any, idx: number) => ({
      id: p.id ? String(p.id).trim() : `page-${idx + 1}`,
      name: p.name || p.title || `Page ${idx + 1}`,
      slug: p.slug || (idx === 0 ? "/" : `/${p.name || `page-${idx + 1}`}`.toLowerCase().replace(/[^a-z0-9-]/g, "-")),
      elements: Array.isArray(p.elements) ? p.elements : [],
      seo: p.seo || {},
      status: p.status || "PUBLISHED",
    }));

    editorData.pages = sanitizedPages;
    const updated = await updateWebsiteEditorData(websiteId, user.id, editorData);

    return sendSuccess(res, { pages: sanitizedPages });
  } catch (err: any) {
    return sendError(res, "SERVER_ERROR", err.message || "Failed to update pages", 500);
  }
}

// 7. Publish Website
/**
 * Publish Website V1 Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function publishWebsiteV1Handler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);

    const canPublish = await canUserAccessResource(user.id, websiteId, "*", "PUBLISH");
    if (!canPublish) {
      return sendError(res, "FORBIDDEN", "You do not have permission to publish this website", 403);
    }

    const { environment, destinationType, destinationRef, metadata } = req.body || {};
    const result: any = await publishWebsite(websiteId, user.id, {
      environment: environment || "PRODUCTION",
      destinationType: destinationType || "INTERNAL",
      metadata: destinationRef ? { destinationRef, ...(metadata || {}) } : metadata,
    });

    if (result.status === "APPROVAL_REQUIRED") {
      return sendError(
        res,
        "APPROVAL_REQUIRED",
        result.message || "Publish approval required before publication.",
        403,
        { approvalRequestId: result.approvalRequestId }
      );
    }

    return sendSuccess(res, result, undefined, 201);
  } catch (err: any) {
    return sendError(res, "PUBLISH_FAILED", err.message || "Publish failed", 500);
  }
}

// 8. List Deployments
/**
 * Get Deployments V1 Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function getDeploymentsV1Handler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);

    const canView = await canUserAccessResource(user.id, websiteId, "*", "VIEW");
    if (!canView) {
      return sendError(res, "FORBIDDEN", "You do not have permission to view deployments", 403);
    }

    const deployments = await getWebsiteDeployments(websiteId, user.id);
    return sendSuccess(res, deployments, { total: deployments.length });
  } catch (err: any) {
    return sendError(res, "SERVER_ERROR", err.message || "Failed to get deployments", 500);
  }
}

// 9. Rollback Deployment
/**
 * Rollback Deployment V1 Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function rollbackDeploymentV1Handler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);
    const deploymentId = String(req.params.deploymentId);

    const canRollback = await canUserAccessResource(user.id, websiteId, "*", "ROLLBACK");
    if (!canRollback) {
      return sendError(res, "FORBIDDEN", "You do not have permission to rollback this website", 403);
    }

    const result = await rollbackDeployment(websiteId, deploymentId, user.id);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, "ROLLBACK_FAILED", err.message || "Rollback failed", 500);
  }
}
