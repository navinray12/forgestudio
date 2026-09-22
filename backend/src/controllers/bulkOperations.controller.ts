import { Request, Response } from "express";
import { bulkVerifyWebsites, bulkSyncWebsites, bulkDeleteWebsites } from "../services/bulkOperations.service.js";

export async function bulkVerifyHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const { websiteIds } = req.body;
  const results = await bulkVerifyWebsites(userId, websiteIds);
  res.status(200).json({ success: true, results });
}

export async function bulkSyncHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const { websiteIds } = req.body;
  const results = await bulkSyncWebsites(userId, websiteIds);
  res.status(200).json({ success: true, results });
}

export async function bulkDeleteHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const { websiteIds } = req.body;
  const results = await bulkDeleteWebsites(userId, websiteIds);
  res.status(200).json({ success: true, results });
}
