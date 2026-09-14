import { Request, Response, NextFunction } from "express";
import {
  connectWordPress,
  getWordPressStatus,
  verifyWordPressConnection,
  disconnectWordPress,
  publishToWordPress,
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
