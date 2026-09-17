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
    const { websiteId } = req.body || {};
    if (!websiteId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_WEBSITE_ID",
          message: "websiteId is required in request body to perform SFTP synchronization",
        },
      });
    }
    const result = await sftpService.syncFilesOverSftp(websiteId);
    return res.json(result);
  } catch (error: any) {
    if (error.message && error.message.includes("SFTP configuration not found")) {
      return res.status(404).json({
        success: false,
        error: {
          code: "SFTP_CONFIG_NOT_FOUND",
          message: "SFTP configuration not found for this website. Please save configuration via POST /api/v1/sftp/config first.",
        },
      });
    }
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: error.message || "An unexpected error occurred during SFTP sync",
      },
    });
  }
}

