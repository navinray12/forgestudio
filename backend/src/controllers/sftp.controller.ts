import { Request, Response } from "express";
import * as sftpService from "../services/sftp.service.js";

export async function saveSftpConfig(req: Request, res: Response) {
  try {
    const { websiteId, host, port, username, remotePath } = req.body;
    if (!websiteId || !host || !username) {
      return res.status(400).json({ error: "websiteId, host, and username are required" });
    }
    const config = await sftpService.createOrUpdateSftpConfig(
      websiteId,
      host,
      port,
      username,
      remotePath
    );
    return res.json({ success: true, config });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getSftpConfig(req: Request, res: Response) {
  try {
    const websiteId = req.params.websiteId as string;
    const config = await sftpService.getSftpConfig(websiteId);
    return res.json({ success: true, config });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function syncSftpFiles(req: Request, res: Response) {
  try {
    const { websiteId } = req.body;
    const result = await sftpService.syncFilesOverSftp(websiteId);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
