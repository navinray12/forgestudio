import type { Request, Response, NextFunction } from "express";
import {
  listMediaAssets,
  getMediaAssetById,
  updateMediaAsset,
  deleteMediaAsset,
} from "../services/media.service.js";
import { optimizeImage, convertToWebp } from "../services/imageOptimization.service.js";

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

    const rawWebsiteId = typeof websiteId === "string" ? websiteId.trim() : undefined;
    const cleanWebsiteId =
      rawWebsiteId && rawWebsiteId !== "undefined" && rawWebsiteId !== "null" && rawWebsiteId !== ""
        ? rawWebsiteId
        : undefined;

    const result = await listMediaAssets(user.id, {
      websiteId: cleanWebsiteId,
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

    const force = req.query.force === "true" || req.body?.force === true;
    const result = await deleteMediaAsset(id, user.id, { force });

    return res.status(200).json({
      success: true,
      message: "Media asset deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/media/:id/optimize
 * Optimize an existing media asset
 */
export async function optimizeMediaAssetHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const id = req.params.id as string;
    const { quality, maxWidth, maxHeight, websiteId, width, height } = req.body || {};

    const asset = await getMediaAssetById(id, user.id);
    const targetWebsiteId = websiteId || asset.websiteId || undefined;

    const resolvedMaxWidth = maxWidth ?? width;
    const resolvedMaxHeight = maxHeight ?? height;

    const result = await optimizeImage(targetWebsiteId, user.id, {
      assetId: id,
      quality: quality ? parseInt(quality, 10) : undefined,
      maxWidth: resolvedMaxWidth ? parseInt(resolvedMaxWidth, 10) : undefined,
      maxHeight: resolvedMaxHeight ? parseInt(resolvedMaxHeight, 10) : undefined,
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
 * POST /api/media/:id/convert-webp
 * Convert an existing media asset to WebP (Feature 9)
 */
export async function convertMediaAssetToWebpHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const id = req.params.id as string;
    const { quality, maxWidth, maxHeight, websiteId, altText } = req.body || {};

    const asset = await getMediaAssetById(id, user.id);
    const targetWebsiteId = websiteId || asset.websiteId || undefined;

    const result = await convertToWebp(targetWebsiteId, user.id, {
      assetId: id,
      quality: quality ? parseInt(quality, 10) : undefined,
      maxWidth: maxWidth ? parseInt(maxWidth, 10) : undefined,
      maxHeight: maxHeight ? parseInt(maxHeight, 10) : undefined,
      altText,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}
