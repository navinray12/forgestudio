import { Request, Response } from "express";
import { measureSitePerformance, getPerformanceSummary } from "../publishing/sitePerformance.service.js";

export async function runPerformanceAuditHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const id = req.params.id as string;
  const { targetUrl } = req.body || {};
  const result = await measureSitePerformance(id, userId, targetUrl);
  res.status(200).json({ success: true, ...result });
}

export async function getPerformanceMetricsHandler(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const id = req.params.id as string;
  const summary = await getPerformanceSummary(id, userId);
  res.status(200).json({ success: true, ...summary });
}
