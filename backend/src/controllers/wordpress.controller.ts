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
  importWordPressPageToForge,
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
  createWordPressPublishJob,
  getWordPressPublishJobStatus,
  listWordPressPublishJobs,
  cancelWordPressPublishJob,
  retryWordPressPublishJob,
  previewWordPressHtml,
  previewWordPressGutenberg,
} from "../services/wordpress/connector.service.js";
import {
  getWordPressFormsCapabilities,
  listWordPressForms,
  getWordPressForm,
  createWordPressForm,
  updateWordPressForm,
  deleteWordPressForm,
  syncWordPressForm,
  submitWordPressForm,
  getWordPressFormSubmissions,
  deleteWordPressFormSubmission,
} from "../services/wordpress/formsConnector.service.js";
import {
  getWordPressSeoCapabilities,
  getWordPressPageSeo,
  updateWordPressPageSeo,
  syncWordPressPageSeo,
  reconcileAmbiguousSeoSync,
} from "../services/wordpress/seoConnector.service.js";
import {
  getWordPressAnalyticsCapabilities,
  getWordPressAnalyticsConfig,
  updateWordPressAnalyticsConfig,
  getWordPressAnalyticsData,
  syncWordPressAnalytics,
  reconcileAmbiguousAnalyticsConfig,
} from "../services/wordpress/analyticsConnector.service.js";
import {
  getWordPressMenuCapabilities,
  listWordPressMenus,
  getWordPressMenu,
  createWordPressMenu,
  updateWordPressMenu,
  deleteWordPressMenu,
  listWordPressMenuItems,
  createWordPressMenuItem,
  updateWordPressMenuItem,
  deleteWordPressMenuItem,
  reorderWordPressMenuItems,
  getWordPressMenuLocations,
  assignWordPressMenuLocation,
  syncWordPressMenus,
  reconcileAmbiguousMenuOperation,
} from "../services/wordpress/wordpressMenuConnector.service.js";
import {
  getWordPressWebhookCapabilities,
  listWordPressWebhooks,
  getWordPressWebhook,
  createWordPressWebhook,
  updateWordPressWebhook,
  deleteWordPressWebhook,
  enableWordPressWebhook,
  disableWordPressWebhook,
  listWordPressWebhookDeliveries,
  processIncomingWebhookDelivery,
} from "../services/wordpress/wordpressWebhookConnector.service.js";
import {
  getWordPressPluginCapabilities,
  listWordPressPlugins,
  getWordPressPluginDetails,
  activateWordPressPlugin,
  deactivateWordPressPlugin,
  updateWordPressPlugin,
  deleteWordPressPlugin,
  installWordPressPlugin,
  reconcileAmbiguousPluginMutation,
} from "../services/wordpress/wordpressPluginConnector.service.js";
import {
  getWordPressThemeCapabilities,
  listWordPressThemes,
  getActiveWordPressTheme,
  getWordPressThemeDetails,
  activateWordPressTheme,
  updateWordPressTheme,
  deleteWordPressTheme,
  installWordPressTheme,
  reconcileAmbiguousThemeMutation,
} from "../services/wordpress/wordpressThemeConnector.service.js";
import {
  getWordPressCacheCapabilities,
  getWordPressCacheStatus,
  purgeWordPressCache,
  clearWordPressCache,
  warmWordPressCache,
  getWordPressCacheGroups,
  reconcileAmbiguousCacheOperation,
} from "../services/wordpress/wordpressCacheConnector.service.js";
import { AppError } from "../utils/app-error.js";
import { processWordPressWebhook } from "../services/wordpress/webhook.service.js";
import { getWebsiteById } from "../services/website.service.js";

export async function downloadPluginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const candidatePaths = [
      path.join(process.cwd(), "wordpress-plugin", "forgestudio-connector", "forgestudio-connector.php"),
      path.join(process.cwd(), "wordpress-plugin", "forgestudio-connector.php"),
      path.join(process.cwd(), "..", "wordpress-plugin", "forgestudio-connector", "forgestudio-connector.php"),
      path.join(process.cwd(), "..", "wordpress-plugin", "forgestudio-connector.php"),
    ];

    const pluginPhpPath = candidatePaths.find((p) => fs.existsSync(p));

    res.attachment("forgestudio-connector.zip");
    res.setHeader("Content-Type", "application/zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    if (pluginPhpPath) {
      archive.file(pluginPhpPath, { name: "forgestudio-connector/forgestudio-connector.php" });
    } else {
      const fallbackPhp = `<?php
/**
 * Plugin Name: ForgeStudio Connector
 * Description: Official ForgeStudio WordPress Integration Plugin.
 * Version: 1.0.0
 * Author: ForgeStudio Team
 */
if (!defined('ABSPATH')) exit;
add_action('rest_api_init', function() {
    register_rest_route('forgestudio/v1', '/status', [
        'methods' => 'GET',
        'callback' => function() {
            return new WP_REST_Response(['status' => 'active', 'version' => '1.0.0'], 200);
        },
        'permission_callback' => '__return_true',
    ]);
});
`;
      archive.append(fallbackPhp, { name: "forgestudio-connector/forgestudio-connector.php" });
    }

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

    try {
      const status = await getWordPressStatus(websiteId, userId);
      return res.status(200).json({
        success: true,
        ...status,
      });
    } catch (_err) {
      return res.status(200).json({
        success: true,
        isConnected: false,
        connection: null,
        mappingsCount: 0,
        mappings: [],
      });
    }
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

export async function importWordPressPageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = Number(req.params.pageId);
    const userId = res.locals.user?.id;

    const result = await importWordPressPageToForge(websiteId, pageId, userId);
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
      format: options.format || options.mode || "html",
      mode: options.mode || options.format || "html",
      includeStyles: options.includeStyles,
      includeResponsiveStyles: options.includeResponsiveStyles,
      assetStrategy: options.assetStrategy,
      metadata: options.metadata,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function previewWordPressHtmlHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = req.params.pageId ? String(req.params.pageId) : (req.query.pageId ? String(req.query.pageId) : undefined);
    const userId = res.locals.user?.id;

    const result = await previewWordPressHtml(websiteId, userId, pageId);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function previewWordPressGutenbergHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = req.params.pageId ? String(req.params.pageId) : (req.query.pageId ? String(req.query.pageId) : undefined);
    const userId = res.locals.user?.id;

    const result = await previewWordPressGutenberg(websiteId, userId, pageId);
    return res.status(200).json({
      success: true,
      data: result,
    });
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

export async function createWordPressPublishJobHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = req.params.pageId ? String(req.params.pageId) : "default";
    const userId = res.locals.user?.id;
    const options = req.body || {};

    const result = await createWordPressPublishJob(websiteId, pageId, userId, {
      targetWpPostId: options.targetWpPostId ? Number(options.targetWpPostId) : undefined,
      slug: options.slug,
      status: options.status,
      title: options.title,
      format: options.format || options.mode || "html",
    });

    return res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWordPressPublishJobStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const jobId = String(req.params.jobId);
    const userId = res.locals.user?.id;

    const result = await getWordPressPublishJobStatus(websiteId, jobId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listWordPressPublishJobsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = req.params.pageId ? String(req.params.pageId) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const userId = res.locals.user?.id;

    const result = await listWordPressPublishJobs(websiteId, userId, { pageId, status, limit });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function cancelWordPressPublishJobHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const jobId = String(req.params.jobId);
    const userId = res.locals.user?.id;
    const { reason } = req.body || {};

    const result = await cancelWordPressPublishJob(websiteId, jobId, userId, reason);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function retryWordPressPublishJobHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const jobId = String(req.params.jobId);
    const userId = res.locals.user?.id;

    const result = await retryWordPressPublishJob(websiteId, jobId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWordPressFormsCapabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const result = await getWordPressFormsCapabilities(websiteId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listWordPressFormsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const result = await listWordPressForms(websiteId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const formId = String(req.params.formId);
    const userId = res.locals.user?.id;
    const result = await getWordPressForm(websiteId, formId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const result = await createWordPressForm(websiteId, req.body || {}, userId);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const formId = String(req.params.formId);
    const userId = res.locals.user?.id;
    const result = await updateWordPressForm(websiteId, formId, req.body || {}, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const formId = String(req.params.formId);
    const userId = res.locals.user?.id;
    const result = await deleteWordPressForm(websiteId, formId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function syncWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const formId = String(req.params.formId);
    const userId = res.locals.user?.id;
    const result = await syncWordPressForm(websiteId, formId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function submitWordPressFormHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const formId = String(req.params.formId);
    const result = await submitWordPressForm(
      websiteId,
      formId,
      req.body || {},
      {
        ip: req.ip || String(req.headers["x-forwarded-for"] || "127.0.0.1"),
        userAgent: req.headers["user-agent"],
        referer: req.headers.referer,
      }
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getWordPressFormSubmissionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const formId = String(req.params.formId);
    const userId = res.locals.user?.id;
    const result = await getWordPressFormSubmissions(websiteId, formId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteWordPressFormSubmissionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const formId = String(req.params.formId);
    const submissionId = String(req.params.submissionId);
    const userId = res.locals.user?.id;
    const result = await deleteWordPressFormSubmission(websiteId, formId, submissionId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// F-502: WORDPRESS SEO API HANDLERS
// ============================================================================

export async function getWordPressSeoCapabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const capabilities = await getWordPressSeoCapabilities(websiteId, userId);
    return res.status(200).json({ success: true, capabilities });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressPageSeoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = String(req.params.pageId);
    const userId = res.locals.user?.id;
    const seo = await getWordPressPageSeo(websiteId, pageId, userId);
    return res.status(200).json({ success: true, seo });
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressPageSeoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = String(req.params.pageId);
    const userId = res.locals.user?.id;
    const updated = await updateWordPressPageSeo(websiteId, pageId, req.body || {}, userId);
    return res.status(200).json({ success: true, seo: updated });
  } catch (error) {
    next(error);
  }
}

export async function syncWordPressPageSeoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = String(req.params.pageId);
    const userId = res.locals.user?.id;
    const result = await syncWordPressPageSeo(websiteId, pageId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function reconcileWordPressPageSeoHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pageId = String(req.params.pageId);
    const expectedHash = String(req.body?.expectedHash || "");
    const userId = res.locals.user?.id;
    const reconciliation = await reconcileAmbiguousSeoSync(websiteId, pageId, expectedHash, userId);
    return res.status(200).json({ success: true, reconciliation });
  } catch (error) {
    next(error);
  }
}

// WordPress Analytics API (F-503)
export async function getWordPressAnalyticsCapabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const capabilities = await getWordPressAnalyticsCapabilities(websiteId, userId);
    return res.status(200).json({ success: true, capabilities });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressAnalyticsConfigHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const config = await getWordPressAnalyticsConfig(websiteId, userId);
    return res.status(200).json({ success: true, config });
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressAnalyticsConfigHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const config = await updateWordPressAnalyticsConfig(websiteId, req.body, userId);
    return res.status(200).json({ success: true, config });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressAnalyticsDataHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const query = {
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      granularity: req.query.granularity ? (String(req.query.granularity) as any) : undefined,
      pageId: req.query.pageId ? String(req.query.pageId) : undefined,
      provider: req.query.provider ? String(req.query.provider) : undefined,
    };
    const analytics = await getWordPressAnalyticsData(websiteId, query, userId);
    return res.status(200).json({ success: true, analytics });
  } catch (error) {
    next(error);
  }
}

export async function syncWordPressAnalyticsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const result = await syncWordPressAnalytics(websiteId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function reconcileWordPressAnalyticsConfigHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const expectedHash = String(req.body?.expectedHash || "");
    const userId = res.locals.user?.id;
    const reconciliation = await reconcileAmbiguousAnalyticsConfig(websiteId, expectedHash, userId);
    return res.status(200).json({ success: true, reconciliation });
  } catch (error) {
    next(error);
  }
}

/**
 * ============================================================================
 * F-504: WORDPRESS MENUS API CONTROLLERS
 * ============================================================================
 */

export async function getWordPressMenuCapabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const capabilities = await getWordPressMenuCapabilities(websiteId, userId);
    return res.status(200).json({ success: true, capabilities });
  } catch (error) {
    next(error);
  }
}

export async function listWordPressMenusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const menus = await listWordPressMenus(websiteId, userId);
    return res.status(200).json({ success: true, menus });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressMenuHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const userId = res.locals.user?.id;
    const menu = await getWordPressMenu(websiteId, menuId, userId);
    return res.status(200).json({ success: true, menu });
  } catch (error) {
    next(error);
  }
}

export async function createWordPressMenuHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const menu = await createWordPressMenu(websiteId, req.body, userId);
    return res.status(201).json({ success: true, menu });
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressMenuHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const userId = res.locals.user?.id;
    const menu = await updateWordPressMenu(websiteId, menuId, req.body, userId);
    return res.status(200).json({ success: true, menu });
  } catch (error) {
    next(error);
  }
}

export async function deleteWordPressMenuHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const userId = res.locals.user?.id;
    const result = await deleteWordPressMenu(websiteId, menuId, userId);
    return res.status(200).json({ ...result, success: true });
  } catch (error) {
    next(error);
  }
}

export async function listWordPressMenuItemsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const userId = res.locals.user?.id;
    const items = await listWordPressMenuItems(websiteId, menuId, userId);
    return res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
}

export async function createWordPressMenuItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const userId = res.locals.user?.id;
    const item = await createWordPressMenuItem(websiteId, menuId, req.body, userId);
    return res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressMenuItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const itemId = String(req.params.itemId);
    const userId = res.locals.user?.id;
    const item = await updateWordPressMenuItem(websiteId, menuId, itemId, req.body, userId);
    return res.status(200).json({ success: true, item });
  } catch (error) {
    next(error);
  }
}

export async function deleteWordPressMenuItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const itemId = String(req.params.itemId);
    const userId = res.locals.user?.id;
    const result = await deleteWordPressMenuItem(websiteId, menuId, itemId, userId);
    return res.status(200).json({ ...result, success: true });
  } catch (error) {
    next(error);
  }
}

export async function reorderWordPressMenuItemsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const userId = res.locals.user?.id;
    const reorderPayload = req.body?.items || req.body;
    const items = await reorderWordPressMenuItems(websiteId, menuId, reorderPayload, userId);
    return res.status(200).json({ success: true, items });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressMenuLocationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const locations = await getWordPressMenuLocations(websiteId, userId);
    return res.status(200).json({ success: true, locations });
  } catch (error) {
    next(error);
  }
}

export async function assignWordPressMenuLocationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const { menuId, location } = req.body || {};
    const assigned = await assignWordPressMenuLocation(websiteId, menuId, location, userId);
    return res.status(200).json({ success: true, location: assigned });
  } catch (error) {
    next(error);
  }
}

export async function syncWordPressMenusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const userId = res.locals.user?.id;
    const result = await syncWordPressMenus(websiteId, menuId, userId);
    return res.status(200).json({ ...result, success: true });
  } catch (error) {
    next(error);
  }
}

export async function reconcileWordPressMenuHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const menuId = String(req.params.menuId);
    const expectedHash = String(req.body?.expectedHash || "");
    const userId = res.locals.user?.id;
    const reconciliation = await reconcileAmbiguousMenuOperation(websiteId, menuId, expectedHash, userId);
    return res.status(200).json({ success: true, reconciliation });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// F-505 — WORDPRESS WEBHOOKS API CONTROLLER HANDLERS
// ============================================================================

export async function getWordPressWebhookCapabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const capabilities = await getWordPressWebhookCapabilities(websiteId, userId);
    return res.status(200).json({ success: true, capabilities });
  } catch (error) {
    next(error);
  }
}

export async function listWordPressWebhooksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const webhooks = await listWordPressWebhooks(websiteId, userId);
    return res.status(200).json({ success: true, webhooks });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const webhookId = String(req.params.webhookId);
    const userId = res.locals.user?.id;
    const webhook = await getWordPressWebhook(websiteId, webhookId, userId);
    return res.status(200).json({ success: true, webhook });
  } catch (error) {
    next(error);
  }
}

export async function createWordPressWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const created = await createWordPressWebhook(websiteId, req.body || {}, userId);
    return res.status(201).json({ success: true, webhook: created });
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const webhookId = String(req.params.webhookId);
    const userId = res.locals.user?.id;
    const updated = await updateWordPressWebhook(websiteId, webhookId, req.body || {}, userId);
    return res.status(200).json({ success: true, webhook: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteWordPressWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const webhookId = String(req.params.webhookId);
    const userId = res.locals.user?.id;
    const result = await deleteWordPressWebhook(websiteId, webhookId, userId);
    return res.status(200).json({ ...result, success: true });
  } catch (error) {
    next(error);
  }
}

export async function enableWordPressWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const webhookId = String(req.params.webhookId);
    const userId = res.locals.user?.id;
    const webhook = await enableWordPressWebhook(websiteId, webhookId, userId);
    return res.status(200).json({ success: true, webhook });
  } catch (error) {
    next(error);
  }
}

export async function disableWordPressWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const webhookId = String(req.params.webhookId);
    const userId = res.locals.user?.id;
    const webhook = await disableWordPressWebhook(websiteId, webhookId, userId);
    return res.status(200).json({ success: true, webhook });
  } catch (error) {
    next(error);
  }
}

export async function listWordPressWebhookDeliveriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const webhookId = String(req.params.webhookId);
    const userId = res.locals.user?.id;
    const deliveries = await listWordPressWebhookDeliveries(websiteId, webhookId, userId);
    return res.status(200).json({ success: true, deliveries });
  } catch (error) {
    next(error);
  }
}

export async function handleIncomingWordPressWebhookDeliveryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const deliveryId = String(req.headers["x-webhook-delivery"] || `del_${Date.now()}`);
    const signature = String(req.headers["x-webhook-signature"] || "");
    const timestamp = Number(req.headers["x-webhook-timestamp"] || Math.floor(Date.now() / 1000));
    const event = String(req.body?.event || "unknown");

    const result = await processIncomingWebhookDelivery(
      websiteId,
      deliveryId,
      signature,
      timestamp,
      JSON.stringify(req.body || {}),
      event,
      req.body || {}
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// F-506 — WORDPRESS PLUGINS API CONTROLLER HANDLERS
// ============================================================================

export async function getWordPressPluginCapabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const capabilities = await getWordPressPluginCapabilities(websiteId, userId);
    return res.status(200).json({ success: true, capabilities });
  } catch (error) {
    next(error);
  }
}

export async function listWordPressPluginsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const { status, search, updateAvailable } = req.query || {};
    const filter = {
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
      updateAvailable: updateAvailable !== undefined ? updateAvailable === "true" : undefined,
    };
    const plugins = await listWordPressPlugins(websiteId, filter, userId);
    return res.status(200).json({ success: true, plugins });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressPluginDetailsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pluginId = String(req.params.pluginId);
    const userId = res.locals.user?.id;
    const plugin = await getWordPressPluginDetails(websiteId, pluginId, userId);
    return res.status(200).json({ success: true, plugin });
  } catch (error) {
    next(error);
  }
}

export async function activateWordPressPluginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pluginId = String(req.params.pluginId);
    const isNetwork = req.body?.isNetwork === true;
    const userId = res.locals.user?.id;
    const plugin = await activateWordPressPlugin(websiteId, pluginId, isNetwork, userId);
    return res.status(200).json({ success: true, plugin });
  } catch (error) {
    next(error);
  }
}

export async function deactivateWordPressPluginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pluginId = String(req.params.pluginId);
    const isNetwork = req.body?.isNetwork === true;
    const userId = res.locals.user?.id;
    const plugin = await deactivateWordPressPlugin(websiteId, pluginId, isNetwork, userId);
    return res.status(200).json({ success: true, plugin });
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressPluginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pluginId = String(req.params.pluginId);
    const userId = res.locals.user?.id;
    const plugin = await updateWordPressPlugin(websiteId, pluginId, userId);
    return res.status(200).json({ success: true, plugin });
  } catch (error) {
    next(error);
  }
}

export async function deleteWordPressPluginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pluginId = String(req.params.pluginId);
    const userId = res.locals.user?.id;
    const result = await deleteWordPressPlugin(websiteId, pluginId, userId);
    return res.status(200).json({ ...result, success: true });
  } catch (error) {
    next(error);
  }
}

export async function installWordPressPluginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const packageSource = String(req.body?.packageSource || "");
    const userId = res.locals.user?.id;
    const plugin = await installWordPressPlugin(websiteId, packageSource, userId);
    return res.status(201).json({ success: true, plugin });
  } catch (error) {
    next(error);
  }
}

export async function reconcileWordPressPluginMutationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const pluginId = String(req.params.pluginId);
    const expectedStatus = String(req.body?.expectedStatus || "ACTIVE");
    const userId = res.locals.user?.id;
    const reconciliation = await reconcileAmbiguousPluginMutation(websiteId, pluginId, expectedStatus, userId);
    return res.status(200).json({ success: true, reconciliation });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// F-507 — WORDPRESS THEMES API CONTROLLER HANDLERS
// ============================================================================

export async function getWordPressThemeCapabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const capabilities = await getWordPressThemeCapabilities(websiteId, userId);
    return res.status(200).json({ success: true, capabilities });
  } catch (error) {
    next(error);
  }
}

export async function listWordPressThemesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const { active, isBlockTheme, updateAvailable, search } = req.query || {};
    const filter = {
      active: active !== undefined ? active === "true" : undefined,
      isBlockTheme: isBlockTheme !== undefined ? isBlockTheme === "true" : undefined,
      updateAvailable: updateAvailable !== undefined ? updateAvailable === "true" : undefined,
      search: search ? String(search) : undefined,
    };
    const themes = await listWordPressThemes(websiteId, filter, userId);
    return res.status(200).json({ success: true, themes });
  } catch (error) {
    next(error);
  }
}

export async function getActiveWordPressThemeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const theme = await getActiveWordPressTheme(websiteId, userId);
    return res.status(200).json({ success: true, theme });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressThemeDetailsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const themeId = String(req.params.themeId);
    const userId = res.locals.user?.id;
    const theme = await getWordPressThemeDetails(websiteId, themeId, userId);
    return res.status(200).json({ success: true, theme });
  } catch (error) {
    next(error);
  }
}

export async function activateWordPressThemeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const themeId = String(req.params.themeId);
    const userId = res.locals.user?.id;
    const theme = await activateWordPressTheme(websiteId, themeId, userId);
    return res.status(200).json({ success: true, theme });
  } catch (error) {
    next(error);
  }
}

export async function updateWordPressThemeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const themeId = String(req.params.themeId);
    const userId = res.locals.user?.id;
    const theme = await updateWordPressTheme(websiteId, themeId, userId);
    return res.status(200).json({ success: true, theme });
  } catch (error) {
    next(error);
  }
}

export async function deleteWordPressThemeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const themeId = String(req.params.themeId);
    const userId = res.locals.user?.id;
    const result = await deleteWordPressTheme(websiteId, themeId, userId);
    return res.status(200).json({ ...result, success: true });
  } catch (error) {
    next(error);
  }
}

export async function installWordPressThemeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const packageSource = String(req.body?.packageSource || "");
    const userId = res.locals.user?.id;
    const theme = await installWordPressTheme(websiteId, packageSource, userId);
    return res.status(201).json({ success: true, theme });
  } catch (error) {
    next(error);
  }
}

export async function reconcileWordPressThemeMutationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const themeId = String(req.params.themeId);
    const expectedActive = req.body?.expectedActive === true;
    const userId = res.locals.user?.id;
    const reconciliation = await reconcileAmbiguousThemeMutation(websiteId, themeId, expectedActive, userId);
    return res.status(200).json({ success: true, reconciliation });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// F-508 — WORDPRESS CACHE API CONTROLLER HANDLERS
// ============================================================================

export async function getWordPressCacheCapabilitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const capabilities = await getWordPressCacheCapabilities(websiteId, userId);
    return res.status(200).json({ success: true, capabilities });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressCacheStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const cacheStatus = await getWordPressCacheStatus(websiteId, userId);
    return res.status(200).json({ success: true, cacheStatus });
  } catch (error) {
    next(error);
  }
}

export async function purgeWordPressCacheHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const { scope, targetId, targetUrl, groupName } = req.body || {};
    const target = {
      scope: scope || "ALL",
      targetId: targetId ? String(targetId) : undefined,
      targetUrl: targetUrl ? String(targetUrl) : undefined,
      groupName: groupName ? String(groupName) : undefined,
    };
    const result = await purgeWordPressCache(websiteId, target, userId);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
}

export async function clearWordPressCacheHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const result = await clearWordPressCache(websiteId, userId);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    next(error);
  }
}

export async function warmWordPressCacheHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    const userId = res.locals.user?.id;
    const result = await warmWordPressCache(websiteId, urls, userId);
    return res.status(200).json({ ...result, success: true });
  } catch (error) {
    next(error);
  }
}

export async function getWordPressCacheGroupsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const groups = await getWordPressCacheGroups(websiteId, userId);
    return res.status(200).json({ success: true, groups });
  } catch (error) {
    next(error);
  }
}

export async function reconcileWordPressCacheOperationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const operationId = String(req.body?.operationId || req.params.operationId || "");
    const userId = res.locals.user?.id;
    const reconciliation = await reconcileAmbiguousCacheOperation(websiteId, operationId, userId);
    return res.status(200).json({ success: true, reconciliation });
  } catch (error) {
    next(error);
  }
}





