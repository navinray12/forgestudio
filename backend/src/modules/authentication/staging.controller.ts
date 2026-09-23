import { Request, Response } from "express";
import {
  getStagingEnvironment,
  createStagingEnvironment,
  promoteStagingEnvironment,
  deleteStagingEnvironment,
} from "../publishing/staging.service.js";

export async function getStagingHandler(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || req.params.id || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const staging = await getStagingEnvironment(websiteId, userId);
    return res.status(200).json({ success: true, staging });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

export async function createStagingHandler(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || req.params.id || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const staging = await createStagingEnvironment(websiteId, userId);
    return res.status(201).json({ success: true, staging });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

export async function promoteStagingHandler(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || req.params.id || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const result = await promoteStagingEnvironment(websiteId, userId);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

export async function deleteStagingHandler(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || req.params.id || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const result = await deleteStagingEnvironment(websiteId, userId);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}
