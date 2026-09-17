/**
 * @file Plugin integrations: HTTP handlers that translate requests into module operations and responses. File responsibility: plugin integration controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Request, Response } from "express";
import * as pluginService from "./plugin-integration.service.js";

/**
 * Save Integration.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function saveIntegration(req: Request, res: Response) {
  try {
    const { websiteId, pluginSlug, config, isEnabled } = req.body;
    if (!websiteId || !pluginSlug) {
      return res.status(400).json({ error: "websiteId and pluginSlug are required" });
    }
    const integration = await pluginService.upsertPluginIntegration(
      websiteId,
      pluginSlug,
      config,
      isEnabled
    );
    return res.json({ success: true, integration });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * List Integrations.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function listIntegrations(req: Request, res: Response) {
  try {
    const websiteId = req.params.websiteId as string;
    const integrations = await pluginService.getPluginIntegrations(websiteId);
    return res.json({ success: true, integrations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Sync Plugin Data.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function syncPluginData(req: Request, res: Response) {
  try {
    const { websiteId, pluginSlug } = req.body;
    const result = await pluginService.syncExternalPluginFields(websiteId, pluginSlug);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
