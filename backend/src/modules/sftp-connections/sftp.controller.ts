/**
 * @file Sftp connections: HTTP handlers that translate requests into module operations and responses. File responsibility: sftp controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Request, Response } from "express";
import * as sftpService from "./sftp.service.js";

/**
 * Save Sftp Config.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
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

/**
 * Get Sftp Config.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function getSftpConfig(req: Request, res: Response) {
  try {
    const websiteId = req.params.websiteId as string;
    const config = await sftpService.getSftpConfig(websiteId);
    return res.json({ success: true, config });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Sync Sftp Files.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function syncSftpFiles(req: Request, res: Response) {
  try {
    const { websiteId } = req.body;
    const result = await sftpService.syncFilesOverSftp(websiteId);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
