/**
 * @file Wordpress connections: HTTP handlers that translate requests into module operations and responses. File responsibility: wordpress controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
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
} from "./connector.service.js";
import { processWordPressWebhook } from "./webhook.service.js";
import { getWebsiteById } from "../websites/website.service.js";
import { AppError } from "../../platform/http/app-error.js";

/**
 * Connect Word Press Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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

/**
 * Get Word Press Status Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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

/**
 * Verify Word Press Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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

/**
 * Disconnect Word Press Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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

/**
 * Sync Word Press Pages Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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

/**
 * Handle Word Press Webhook.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function handleWordPressWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const signature = String(
      req.headers["x-forgestudio-signature"] ||
      req.headers["x-hub-signature-256"] ||
      req.headers["x-signature"] ||
      ""
    );
    if (!req.rawBody) {
      throw new AppError("Webhook requires an application/json body.", 415, "INVALID_WEBHOOK_CONTENT_TYPE");
    }

    const result = await processWordPressWebhook(websiteId, signature, req.rawBody);
    return res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadWordPressPluginHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const { generateWordPressPluginZip } = await import("./connector.service.js");
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
