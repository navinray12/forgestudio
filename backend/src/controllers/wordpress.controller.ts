import { Request, Response, NextFunction } from "express";
import {
  connectWordPress,
  getWordPressStatus,
  verifyWordPressConnection,
  disconnectWordPress,
  publishToWordPress,
  getAcfFields,
  getToolsetFields,
  getPodsFields,
  syncGutenbergBlocks,
  getMultisiteSites,
} from "../services/wordpress/connector.service.js";
import { processWordPressWebhook } from "../services/wordpress/webhook.service.js";
import { getWebsiteById } from "../services/website.service.js";

export async function connectWordPressHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const { siteUrl, apiKey, siteName } = req.body || {};

    const result = await connectWordPress(websiteId, userId, siteUrl, apiKey, siteName);
    return res.status(200).json({
      success: true,
      connection: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const status = await getWordPressStatus(websiteId, userId);
    return res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyWordPressHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const verification = await verifyWordPressConnection(websiteId, userId);
    return res.status(200).json({
      success: true,
      verification,
    });
  } catch (error) {
    next(error);
  }
}

export async function disconnectWordPressHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const result = await disconnectWordPress(websiteId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function syncWordPressPagesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const website = await getWebsiteById(websiteId, userId);
    const editorData = typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : (website.editorData || {});

    const result = await publishToWordPress(websiteId, userId, "manual-sync", editorData);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleWordPressWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const signature = String(
      req.headers["x-forgestudio-signature"] ||
      req.headers["x-hub-signature-256"] ||
      req.headers["x-signature"] ||
      ""
    );
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const parsedPayload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const result = await processWordPressWebhook(websiteId, signature, rawBody, parsedPayload);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadWordPressPluginHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const { generateWordPressPluginZip } = await import("../services/wordpress/connector.service.js");
    const zipBuffer = await generateWordPressPluginZip();

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="forgestudio-connector.zip"');
    return res.status(200).send(zipBuffer);
  } catch (error) {
    next(error);
  }
}

export async function getAcfFieldsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const postId = req.query.postId ? Number(req.query.postId) : undefined;
    const siteId = (req.headers["x-wp-site-id"] || req.query.siteId) as string;

    const result = await getAcfFields(websiteId, userId, postId, siteId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getToolsetFieldsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const postId = req.query.postId ? Number(req.query.postId) : undefined;
    const siteId = (req.headers["x-wp-site-id"] || req.query.siteId) as string;

    const result = await getToolsetFields(websiteId, userId, postId, siteId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPodsFieldsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const postId = req.query.postId ? Number(req.query.postId) : undefined;
    const siteId = (req.headers["x-wp-site-id"] || req.query.siteId) as string;

    const result = await getPodsFields(websiteId, userId, postId, siteId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function syncGutenbergBlocksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const siteId = (req.headers["x-wp-site-id"] || req.query.siteId) as string;

    const website = await getWebsiteById(websiteId, userId);
    const pageData = typeof website.editorData === "string"
      ? JSON.parse(website.editorData)
      : (website.editorData || {});

    const result = await syncGutenbergBlocks(websiteId, userId, pageData, siteId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMultisiteSitesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const activeSiteId = (req.headers["x-wp-site-id"] || req.query.siteId) as string;

    const result = await getMultisiteSites(websiteId, userId, activeSiteId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
