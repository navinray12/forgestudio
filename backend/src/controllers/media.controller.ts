import type { Request, Response, NextFunction } from "express";
import {
  listMediaAssets,
  getMediaAssetById,
  updateMediaAsset,
  deleteMediaAsset,
} from "../services/media.service.js";

/**
 * GET /api/media
 * List media assets for authenticated user
 */
export async function listMediaAssetsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const { websiteId, search, mimeType, page, limit } = req.query;

    const result = await listMediaAssets(user.id, {
      websiteId: websiteId as string,
      search: search as string,
      mimeType: mimeType as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/media/:id
 * Get single media asset
 */
export async function getMediaAssetHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const id = req.params.id as string;

    const asset = await getMediaAssetById(id, user.id);

    return res.status(200).json({
      success: true,
      asset,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/media/:id
 * Update media asset metadata
 */
export async function updateMediaAssetHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const id = req.params.id as string;
    const { altText, websiteId } = req.body;

    const updated = await updateMediaAsset(id, user.id, { altText, websiteId });

    return res.status(200).json({
      success: true,
      asset: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/media/:id
 * Delete media asset
 */
export async function deleteMediaAssetHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const id = req.params.id as string;

    const result = await deleteMediaAsset(id, user.id);

    return res.status(200).json({
      success: true,
      message: "Media asset deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
