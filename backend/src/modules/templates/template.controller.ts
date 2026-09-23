/**
 * @file Templates: HTTP handlers that translate requests into module operations and responses. File responsibility: template controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../platform/http/app-error.js";
import {
  createTemplate,
  getUserTemplates,
  updateTemplate,
  toggleTemplateShareStatus,
  getPublicTemplateByToken,
  deleteTemplate,
  getLibraryTemplates,
  getWebsiteKitsService,
  adminBulkSeedTemplates,
} from "./template.service.js";


/**
 * POST /api/templates
 * Create a new reusable design template for authenticated user

 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function createTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const { name, description, type, category, isFavorite, templateData } = req.body;

    const template = await createTemplate(user.id, {
      name,
      description,
      type,
      category,
      isFavorite,
      templateData,
    });

    return res.status(201).json({
      success: true,
      message: "Template saved successfully",
      template,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/templates
 * Get all templates saved by authenticated user

 * @param _req Req supplied to this operation (type: Request).
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function getUserTemplatesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const templates = await getUserTemplates(user.id);

    return res.status(200).json({
      success: true,
      templates,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/templates/public/:shareToken
 * Public unauthenticated endpoint to fetch a shared template safely

 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function getPublicTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const shareToken = String(req.params.shareToken);
    const template = await getPublicTemplateByToken(shareToken);

    return res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/templates/:id/share
 * Toggle sharing status (enabled/disabled) and generate share token for template

 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function toggleShareHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const templateId = String(req.params.id);
    const { isShared } = req.body;

    const template = await toggleTemplateShareStatus(user.id, templateId, Boolean(isShared));

    return res.status(200).json({
      success: true,
      message: isShared ? "Template sharing enabled" : "Template sharing disabled",
      template,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT/PATCH /api/templates/:id
 * Update metadata (name, description, category, isFavorite, isShared) of a template owned by authenticated user

 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function updateTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user || (req as any).user;
    if (!user || !user.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const templateId = String(req.params.id || "");
    const { name, description, category, isFavorite, isShared, shareToken, templateData } = req.body || {};

    const template = await updateTemplate(user.id, templateId, {
      name,
      description,
      category,
      isFavorite,
      isShared,
      shareToken,
      templateData,
    });

    return res.status(200).json({
      success: true,
      message: "Template updated successfully",
      template,
      data: {
        template,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/templates/:id
 * Delete a template owned by authenticated user

 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function deleteTemplateHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const templateId = String(req.params.id);

    await deleteTemplate(user.id, templateId);

    return res.status(200).json({
      success: true,
      message: "Template deleted successfully",
      id: templateId,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/templates/library
 * Public / Authenticated discovery endpoint for template items
 */
export async function getLibraryTemplatesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;

    const templates = await getLibraryTemplates(type, category);

    return res.status(200).json({
      success: true,
      templates,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/website-kits and GET /api/v1/templates/kits
 * Returns all seeded 10 website template packs for preview and instantiation
 */
export async function getWebsiteKitsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const kits = await getWebsiteKitsService();

    return res.status(200).json({
      success: true,
      kits,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/templates/admin/seed
 * Protected admin endpoint to run bulk template seeding
 */
export async function adminBulkSeedHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const result = await adminBulkSeedTemplates(user);

    return res.status(200).json({
      success: true,
      message: "Bulk template packs seeded successfully",
      result,
    });
  } catch (error) {
    next(error);
  }
}

