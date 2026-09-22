import { Request, Response } from "express";
import * as serverConfigService from "../publishing/serverConfig.service.js";

export async function getServerConfig(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const config = await serverConfigService.getServerConfig(websiteId, userId);
    return res.status(200).json({ success: true, config });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export async function updateServerConfig(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const { phpMemoryLimit, phpMaxExecutionTime } = req.body;
    const config = await serverConfigService.updateServerConfig(
      websiteId,
      { phpMemoryLimit, phpMaxExecutionTime },
      userId
    );
    return res.status(200).json({
      success: true,
      config,
      message: "Server resource settings saved successfully",
    });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

export async function getWebsiteSftp(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const sftp = await serverConfigService.getWebsiteSftpDetails(websiteId, userId);
    return res.status(200).json({ success: true, sftp });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

export async function testWebsiteSftp(req: Request, res: Response) {
  try {
    const websiteId = String(req.params.websiteId || "");
    const userId = res.locals?.user?.id || (req as any).user?.id;
    const result = await serverConfigService.testWebsiteSftpConnection(websiteId, userId);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}
