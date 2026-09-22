import { Request, Response } from "express";
import { optimizeImage, getOptimizationStats } from "../services/imageOptimization.service.js";

export async function optimizeImageHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const id = req.params.id as string;
  const { imageUrl, fileName, originalBytes } = req.body || {};

  const result = await optimizeImage(id, userId, {
    imageUrl,
    fileName,
    originalBytes,
  });

  res.status(200).json({ success: true, ...result });
}

export async function getOptimizationStatsHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const id = req.params.id as string;
  const stats = await getOptimizationStats(id, userId);
  res.status(200).json({ success: true, ...stats });
}
