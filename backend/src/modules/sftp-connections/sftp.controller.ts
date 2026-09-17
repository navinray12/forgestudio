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

/**
 * Get Sftp Config.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
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

/**
 * Sync Sftp Files.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
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
