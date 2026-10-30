import type { Request, Response, NextFunction } from "express";
import {
  getUserWebsites,
  getWebsiteById,
  createWebsite,
  updateWebsite,
  updateWebsiteEditorData,
} from "../services/website.service.js";
import {
  publishWebsite,
  getWebsiteDeployments,
  rollbackDeployment,
} from "../services/publishing.service.js";
import { canUserAccessResource } from "../services/permission.service.js";
import { AppError } from "../utils/app-error.js";

// Standard JSON Envelope Responders
export function sendSuccess(res: Response, data: any, meta?: any, status = 200) {
  const payload: any = { success: true, data };
  if (meta !== undefined) {
    payload.meta = meta;
  }
  if (res.locals.correlationId) {
    payload.requestId = res.locals.correlationId;
  }
  return res.status(status).json(payload);
}

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
  if (res.locals.correlationId) {
    payload.requestId = res.locals.correlationId;
    payload.error.requestId = res.locals.correlationId;
  }
  return res.status(status).json(payload);
}

function handleControllerError(res: Response, err: any, fallbackMessage: string) {
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode);
  }
  return sendError(res, "SERVER_ERROR", err?.message || fallbackMessage, 500);
}

// 1. List Websites
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
    return handleControllerError(res, err, "Failed to list websites");
  }
}

// 2. Create Website
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
    return handleControllerError(res, err, "Failed to create website");
  }
}

// 3. Get Website By ID
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
    return handleControllerError(res, err, "Failed to get website");
  }
}

// 4. Update Website
export async function updateWebsiteHandler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);

    const canEdit = await canUserAccessResource(user.id, websiteId, "*", "EDIT");
    if (!canEdit) {
      return sendError(res, "FORBIDDEN", "You do not have permission to edit this website", 403);
    }

    const { name, slug, editorData, status, expectedVersion, lastKnownUpdatedAt } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (editorData !== undefined) updateData.editorData = editorData;
    if (status !== undefined) updateData.status = status;

    if (editorData !== undefined && (expectedVersion !== undefined || lastKnownUpdatedAt !== undefined)) {
      const expVer = expectedVersion !== undefined ? Number(expectedVersion) : undefined;
      const updated = await updateWebsiteEditorData(
        websiteId,
        user.id,
        editorData,
        undefined,
        lastKnownUpdatedAt,
        expVer
      );
      if (name !== undefined || slug !== undefined || status !== undefined) {
        await updateWebsite(websiteId, { name, slug, status }, user.id);
      }
      return sendSuccess(res, updated);
    }

    const updated = await updateWebsite(websiteId, updateData, user.id);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return handleControllerError(res, err, "Failed to update website");
  }
}

// 5. Get Pages
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
    return handleControllerError(res, err, "Failed to get pages");
  }
}

// 6. Update Pages
export async function updatePagesHandler(req: Request, res: Response) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);

    const rawPages = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body.pages)
      ? req.body.pages
      : null;

    if (!rawPages) {
      return sendError(res, "VALIDATION_ERROR", "Invalid payload. Expected { pages: [...] } or an array of pages", 400);
    }

    const rawExpectedVersion = req.body?.expectedVersion;
    const expTimestamp = req.body?.lastKnownUpdatedAt;
    const expVer = rawExpectedVersion !== undefined && rawExpectedVersion !== null ? Number(rawExpectedVersion) : undefined;

    if (expVer === undefined && !expTimestamp) {
      return sendError(
        res,
        "MISSING_REVISION",
        "Expected revision (expectedVersion or lastKnownUpdatedAt) is required for updating pages",
        400
      );
    }

    const canEdit = await canUserAccessResource(user.id, websiteId, "*", "EDIT");
    if (!canEdit) {
      return sendError(res, "FORBIDDEN", "You do not have permission to edit this website", 403);
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

    const updated = await updateWebsiteEditorData(websiteId, user.id, editorData, undefined, expTimestamp, expVer);

    return sendSuccess(res, { pages: sanitizedPages });
  } catch (err: any) {
    return handleControllerError(res, err, "Failed to update pages");
  }
}

// 7. Publish Website
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
    return handleControllerError(res, err, "Publish failed");
  }
}

// 8. List Deployments
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
    return handleControllerError(res, err, "Failed to get deployments");
  }
}

// 9. Rollback Deployment
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
    return handleControllerError(res, err, "Rollback failed");
  }
}
