import { Request, Response } from "express";
import { executeAiHostingTool, type AiHostingToolAction } from "../services/aiHosting.service.js";

export async function handleAiHostingTool(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || req.body.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const action = req.body.action as AiHostingToolAction;
    const params = req.body.params || {};

    if (!websiteId) {
      return res.status(400).json({ success: false, message: "Website ID is required" });
    }
    if (!action) {
      return res.status(400).json({ success: false, message: "Action parameter is required" });
    }

    const result = await executeAiHostingTool(websiteId, userId, action, params);
    return res.status(200).json({ success: true, result });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}
