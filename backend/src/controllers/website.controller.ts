import type { Request, Response, NextFunction } from "express";
import {
  getUserWebsites,
  getWebsiteById,
  createWebsite,
  updateWebsiteEditorData,
  deleteWebsite,
} from "../services/website.service.js";

/**
 * GET /api/websites
 * Fetch all websites for current authenticated user
 */
export async function getWebsitesHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websites = await getUserWebsites(user.id);

    return res.status(200).json({
      success: true,
      websites,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/websites/:id
 * Get single website details and editor JSON data
 */
export async function getWebsiteByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;

    const website = await getWebsiteById(websiteId, user.id);

    return res.status(200).json({
      success: true,
      website,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites
 * Create a new website with subscription limit validation
 */
export async function createWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const { name } = req.body;

    const website = await createWebsite(user.id, name);

    return res.status(201).json({
      success: true,
      message: "Website created successfully",
      website,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/websites/:id
 * Save updated editor JSON data
 */
export async function updateWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;
    const { editorData } = req.body;

    const website = await updateWebsiteEditorData(websiteId, user.id, editorData);

    return res.status(200).json({
      success: true,
      message: "Website saved successfully",
      website,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/websites/:id
 * Delete a user's website
 */
export async function deleteWebsiteHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.id as string;

    await deleteWebsite(websiteId, user.id);

    return res.status(200).json({
      success: true,
      message: "Website deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
