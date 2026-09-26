import { Request, Response } from "express";
import { optimizeImage, getOptimizationStats } from "../services/imageOptimization.service.js";

export async function optimizeImageHandler(req: Request, res: Response): Promise<void> {
  const user = res.locals.user || (req as any).user;
  if (!user || !user.id) {
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }
  const userId = user.id;
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
  const user = res.locals.user || (req as any).user;
  if (!user || !user.id) {
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } });
    return;
  }
  const userId = user.id;
  const id = req.params.id as string;
  const stats = await getOptimizationStats(id, userId);
  res.status(200).json({ success: true, ...stats });
}

