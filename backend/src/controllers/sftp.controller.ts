import { Request, Response } from "express";
import * as sftpService from "../services/sftp.service.js";

export async function saveSftpConfig(req: Request, res: Response) {
  try {
    const { websiteId, host, port, username, remotePath } = req.body;
    const userId = res.locals?.user?.id || (req as any).user?.id;
    if (!websiteId || !host || !username) {
      return res.status(400).json({ error: "websiteId, host, and username are required" });
    }
    const config = await sftpService.createOrUpdateSftpConfig(
      websiteId,
      host,
      port,
      username,
      remotePath,
      userId
    );
    return res.json({ success: true, config });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}

export async function getSftpConfig(req: Request, res: Response) {
  try {
    const websiteId = req.params.websiteId as string;
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const config = await sftpService.getSftpConfig(websiteId, userId);
    return res.json({ success: true, config });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}

export async function syncSftpFiles(req: Request, res: Response) {
  try {
    const { websiteId } = req.body;
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const result = await sftpService.syncFilesOverSftp(websiteId, userId);
    return res.json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}

export async function verifySftpConfig(req: Request, res: Response) {
  try {
    const websiteId = (req.params.websiteId || req.body?.websiteId) as string;
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const result = await sftpService.verifySftpConfig(websiteId, userId);
    return res.json({ success: true, result });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}
