/**
 * @file Templates: HTTP handlers that translate requests into module operations and responses. File responsibility: template controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import {
  createTemplate,
  getUserTemplates,
  updateTemplate,
  toggleTemplateShareStatus,
  getPublicTemplateByToken,
  deleteTemplate,
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
 * PATCH /api/templates/:id
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
    const user = res.locals.user;
    const templateId = String(req.params.id);
    const { name, description, category, isFavorite, isShared, shareToken, templateData } = req.body;

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
