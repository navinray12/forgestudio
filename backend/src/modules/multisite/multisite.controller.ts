/**
 * @file Multisite: HTTP handlers that translate requests into module operations and responses. File responsibility: multisite controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Request, Response } from "express";
import * as multisiteService from "./multisite.service.js";

/**
 * Create Network.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function createNetwork(req: Request, res: Response) {
  try {
    const { name, domain, networkType, config } = req.body;
    if (!name || !domain) {
      return res.status(400).json({ error: "name and domain are required" });
    }
    const network = await multisiteService.createNetwork(name, domain, networkType, config);
    return res.json({ success: true, network });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * List Networks.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function listNetworks(req: Request, res: Response) {
  try {
    const networks = await multisiteService.listNetworks();
    return res.json({ success: true, networks });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Delete Network.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function deleteNetwork(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await multisiteService.deleteNetwork(id);
    return res.json({ success: true, message: "Multisite network deleted" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
