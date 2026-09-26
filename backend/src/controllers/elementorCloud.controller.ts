import { Request, Response } from "express";
import { createElementorCloudBundle, getElementorCloudBundle } from "../services/elementorCloud.service.js";

export async function createElementorCloudHandler(req: Request, res: Response) {
  try {
    const userId = res.locals.user?.id || (req as any).user?.id;
    const { name, domain } = req.body;
    const bundle = await createElementorCloudBundle(userId, { name, domain });
    return res.status(201).json({ success: true, bundle });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

export async function getElementorCloudHandler(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals.user?.id || (req as any).user?.id;
    const bundle = await getElementorCloudBundle(websiteId, userId);
    return res.status(200).json({ success: true, bundle });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}
