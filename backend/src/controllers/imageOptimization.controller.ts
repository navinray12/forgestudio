import type { Request, Response, NextFunction } from "express";
import {
  optimizeImage,
  getOptimizationStats,
  convertToWebp,
} from "../services/imageOptimization.service.js";

export async function optimizeImageHandler(
  req: Request,
  res: Response,
  next?: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).user?.id || res.locals?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const id = req.params.id as string;
    const {
      imageUrl,
      fileName,
      originalBytes,
      assetId,
      quality,
      maxWidth,
      maxHeight,
      format,
    } = req.body || {};

    const result = await optimizeImage(id, userId, {
      imageUrl,
      fileName,
      originalBytes,
      assetId,
      quality: quality ? parseInt(quality, 10) : undefined,
      maxWidth: maxWidth ? parseInt(maxWidth, 10) : undefined,
      maxHeight: maxHeight ? parseInt(maxHeight, 10) : undefined,
      format,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (next) {
      next(error);
    } else {
      res.status(500).json({ success: false, message: (error as any)?.message || "Optimization failed" });
    }
  }
}

export async function getOptimizationStatsHandler(
  req: Request,
  res: Response,
  next?: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).user?.id || res.locals?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const id = req.params.id as string;
    const stats = await getOptimizationStats(id, userId);
    res.status(200).json({ success: true, ...stats });
  } catch (error) {
    if (next) {
      next(error);
    } else {
      res.status(500).json({ success: false, message: (error as any)?.message || "Failed to fetch stats" });
    }
  }
}

export async function convertWebpHandler(
  req: Request,
  res: Response,
  next?: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).user?.id || res.locals?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const id = req.params.id as string;
    const {
      imageUrl,
      fileName,
      assetId,
      quality,
      maxWidth,
      maxHeight,
      altText,
    } = req.body || {};

    const result = await convertToWebp(id, userId, {
      imageUrl,
      fileName,
      assetId,
      quality: quality ? parseInt(quality, 10) : undefined,
      maxWidth: maxWidth ? parseInt(maxWidth, 10) : undefined,
      maxHeight: maxHeight ? parseInt(maxHeight, 10) : undefined,
      altText,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (next) {
      next(error);
    } else {
      res.status(500).json({ success: false, message: (error as any)?.message || "WebP conversion failed" });
    }
  }
}
