import type { Request, Response, NextFunction } from "express";
import {
  createTemplate,
  getUserTemplates,
  updateTemplate,
  toggleTemplateShareStatus,
  getPublicTemplateByToken,
  deleteTemplate,
} from "../services/template.service.js";

/**
 * POST /api/templates
 * Create a new reusable design template for authenticated user
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
