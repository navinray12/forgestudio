import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const archiver = require("archiver");
import { Request, Response, NextFunction } from "express";
import {
  connectWordPress,
  getWordPressStatus,
  verifyWordPressConnection,
  disconnectWordPress,
  revokeWordPressConnection,
  publishToWordPress,
  publishWordPressPage,
  getAcfFields,
  getToolsetFields,
  getPodsFields,
  syncGutenbergBlocks,
  getMultisiteSites,
  getWordPressSiteInformation,
  getWordPressSiteHealth,
  listWordPressPages,
  getWordPressPage,
  createWordPressPage,
  updateWordPressPage,
  deleteWordPressPage,
  duplicateWordPressPage,
  reorderWordPressPage,
  uploadWordPressMedia,
  listWordPressMedia,
  getWordPressMedia,
  updateWordPressMedia,
  deleteWordPressMedia,
  getWordPressPublishStatus,
  getWordPressRollbackTargets,
  rollbackWordPressPage,
} from "../services/wordpress/connector.service.js";
import { AppError } from "../utils/app-error.js";
import { processWordPressWebhook } from "../services/wordpress/webhook.service.js";
import { getWebsiteById } from "../services/website.service.js";

export async function downloadPluginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pluginPhpPath = path.join(process.cwd(), "wordpress-plugin", "forgestudio-connector", "forgestudio-connector.php");

    if (!fs.existsSync(pluginPhpPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PLUGIN_NOT_FOUND",
          message: "WordPress plugin file is not available on server.",
        },
      });
    }

    res.attachment("forgestudio-connector.zip");
    res.setHeader("Content-Type", "application/zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    archive.file(pluginPhpPath, { name: "forgestudio-connector/forgestudio-connector.php" });
    await archive.finalize();
  } catch (error) {
    next(error);
  }
}

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

    const result = await verifyWordPressConnection(websiteId, userId);
    return res.status(200).json(result);
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

export async function revokeWordPressHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const result = await revokeWordPressConnection(websiteId, userId);
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

export async function getWordPressSiteInfoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const result = await getWordPressSiteInformation(websiteId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWordPressSiteHealthHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const result = await getWordPressSiteHealth(websiteId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listWordPressPagesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const { search, status, parent, author, page, perPage } = req.query;

    const query = {
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
      parent: parent !== undefined ? Number(parent) : undefined,
      author: author !== undefined ? Number(author) : undefined,
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined,
    };

    const result = await listWordPressPages(websiteId, userId, query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWordPressPageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = Number(req.params.pageId);
    const userId = res.locals.user?.id;

    const result = await getWordPressPage(websiteId, pageId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createWordPressPageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const pageData = req.body || {};

    const result = await createWordPressPage(websiteId, userId, pageData);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressPageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = Number(req.params.pageId);
    const userId = res.locals.user?.id;
    const pageData = req.body || {};

    const result = await updateWordPressPage(websiteId, pageId, userId, pageData);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteWordPressPageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = Number(req.params.pageId);
    const userId = res.locals.user?.id;
    const force = req.query.force === "true" || req.query.force === "1";

    const result = await deleteWordPressPage(websiteId, pageId, userId, force);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function duplicateWordPressPageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = Number(req.params.pageId);
    const userId = res.locals.user?.id;
    const options = req.body || {};

    const result = await duplicateWordPressPage(websiteId, pageId, userId, options);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function reorderWordPressPageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = Number(req.params.pageId);
    const userId = res.locals.user?.id;
    const options = req.body || {};

    const result = await reorderWordPressPage(websiteId, pageId, userId, options);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function uploadWordPressMediaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const file = (req as any).file;
    const body = req.body || {};

    const originalFilename = file?.originalname || body.filename || "upload.png";
    const declaredMimeType = file?.mimetype || body.mimeType || "image/png";
    let fileBuffer: Buffer | null = null;

    if (file?.buffer) {
      fileBuffer = file.buffer;
    } else if (body.base64Data) {
      fileBuffer = Buffer.from(body.base64Data, "base64");
    } else if (body.data) {
      fileBuffer = Buffer.from(body.data, "base64");
    }

    if (!fileBuffer) {
      throw new AppError("No media file buffer or base64Data provided.", 400, "WORDPRESS_MEDIA_INVALID_FILE");
    }

    const options = {
      title: body.title,
      altText: body.altText || body.alt_text,
      caption: body.caption,
      description: body.description,
    };

    const media = await uploadWordPressMedia(
      websiteId,
      userId,
      fileBuffer,
      originalFilename,
      declaredMimeType,
      options
    );

    return res.status(201).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
}

export async function listWordPressMediaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const query = req.query || {};

    const options = {
      page: query.page ? Number(query.page) : undefined,
      perPage: query.perPage ? Number(query.perPage) : query.per_page ? Number(query.per_page) : undefined,
      search: query.search ? String(query.search) : undefined,
      mimeType: query.mimeType ? String(query.mimeType) : undefined,
      mediaType: query.mediaType ? (String(query.mediaType) as any) : undefined,
      order: query.order ? (String(query.order) as any) : undefined,
      orderby: query.orderby ? (String(query.orderby) as any) : undefined,
    };

    const result = await listWordPressMedia(websiteId, userId, options);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWordPressMediaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const mediaId = Number(req.params.mediaId);
    const userId = res.locals.user?.id;

    const media = await getWordPressMedia(websiteId, userId, mediaId);
    return res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressMediaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const mediaId = Number(req.params.mediaId);
    const userId = res.locals.user?.id;
    const data = req.body || {};

    const updated = await updateWordPressMedia(websiteId, userId, mediaId, data);
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteWordPressMediaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const mediaId = Number(req.params.mediaId);
    const userId = res.locals.user?.id;
    const force = req.query.force === "true" || req.body?.force === true;

    const result = await deleteWordPressMedia(websiteId, userId, mediaId, { force });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function publishWordPressPageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const options = req.body || {};

    const result = await publishWordPressPage(websiteId, userId, {
      pageId: options.pageId,
      wordpressPageId: options.wordpressPageId ? Number(options.wordpressPageId) : undefined,
      title: options.title,
      slug: options.slug,
      status: options.status,
      content: options.content,
      excerpt: options.excerpt,
      template: options.template,
      metadata: options.metadata,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWordPressPublishStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = req.params.pageId ? String(req.params.pageId) : "default";
    const userId = res.locals.user?.id;

    const result = await getWordPressPublishStatus(websiteId, pageId, userId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressRollbackTargetsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = req.params.pageId ? String(req.params.pageId) : "default";
    const userId = res.locals.user?.id;

    const result = await getWordPressRollbackTargets(websiteId, pageId, userId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function rollbackWordPressPageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = req.params.pageId ? String(req.params.pageId) : "default";
    const userId = res.locals.user?.id;
    const { snapshotId } = req.body || {};

    const result = await rollbackWordPressPage(websiteId, pageId, userId, { snapshotId });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
