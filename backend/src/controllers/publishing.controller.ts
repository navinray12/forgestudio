import { Request, Response, NextFunction } from "express";
import {
  validateWebsiteForPublish,
  publishWebsite,
  getWebsiteDeployments,
  getDeploymentById,
  rollbackDeployment,
  getWebsiteReleases,
  instantRollbackRelease,
} from "../services/publishing.service.js";

export async function validatePublishHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const candidateData = req.body?.editorData;

    const validation = await validateWebsiteForPublish(websiteId, userId, candidateData);
    return res.status(200).json({
      success: true,
      validation,
    });
  } catch (error) {
    next(error);
  }
}

export async function publishWebsiteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const { editorData, environment, destinationType, metadata } = req.body || {};

    const result = await publishWebsite(websiteId, userId, {
      editorData,
      environment,
      destinationType,
      metadata,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDeploymentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const deployments = await getWebsiteDeployments(websiteId, userId);
    return res.status(200).json({
      success: true,
      deployments,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDeploymentByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const deploymentId = String(req.params.deploymentId);
    const userId = res.locals.user?.id;

    const deployment = await getDeploymentById(websiteId, deploymentId, userId);
    return res.status(200).json({
      success: true,
      deployment,
    });
  } catch (error) {
    next(error);
  }
}

export async function rollbackDeploymentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const deploymentId = String(req.params.deploymentId);
    const userId = res.locals.user?.id;

    const result = await rollbackDeployment(websiteId, deploymentId, userId);
    return res.status(200).json({
      message: "Rollback deployment initiated successfully",
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/websites/:id/releases
 * Returns versioned release timeline with active release pointer
 */
export async function getReleasesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;

    const result = await getWebsiteReleases(websiteId, userId);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/websites/:id/releases/:releaseId/rollback
 * Instant zero-downtime rollback in < 100ms
 */
export async function instantRollbackHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const releaseId = String(req.params.releaseId);
    const userId = res.locals.user?.id;

    const result = await instantRollbackRelease(websiteId, releaseId, userId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadStaticExportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const deploymentId = String(req.params.deploymentId);
    const userId = res.locals.user?.id;

    const deployment = await getDeploymentById(websiteId, deploymentId, userId);
    const { getWebsiteById } = await import("../services/website.service.js");
    const website = await getWebsiteById(websiteId, userId);

    const rawEditorData =
      typeof website.editorData === "string"
        ? JSON.parse(website.editorData)
        : website.editorData || {};

    const snapshot = rawEditorData.publishedData || rawEditorData;
    const { compileCanonicalToStaticBundle } = await import("../services/destinations/staticCompiler.js");
    const bundle = compileCanonicalToStaticBundle(websiteId, deployment.version, snapshot);

    if (req.query.format === "json") {
      return res.status(200).json({
        success: true,
        websiteId,
        deploymentId,
        version: deployment.version,
        bundle: {
          totalFiles: bundle.files.length,
          totalBytes: bundle.totalBytes,
          pageCount: bundle.pageCount,
          files: bundle.files.map((f) => ({
            path: f.path,
            size: f.size,
            contentType: f.contentType,
          })),
        },
      });
    }

    const { createStaticZipArchive } = await import("../services/destinations/staticZip.service.js");
    const zipBuffer = await createStaticZipArchive(bundle);

    const safeSiteName = (website.title || website.name || `website-${websiteId}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeSiteName}-v${deployment.version}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", zipBuffer.length.toString());
    return res.status(200).send(zipBuffer);
  } catch (error) {
    next(error);
  }
}

export async function downloadLatestStaticExportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const userId = res.locals.user?.id;
    const { getWebsiteById } = await import("../services/website.service.js");
    const website = await getWebsiteById(websiteId, userId);

    const rawEditorData =
      typeof website.editorData === "string"
        ? JSON.parse(website.editorData)
        : website.editorData || {};

    const snapshot = rawEditorData.publishedData || rawEditorData;
    const { compileCanonicalToStaticBundle } = await import("../services/destinations/staticCompiler.js");
    const bundle = compileCanonicalToStaticBundle(websiteId, 1, snapshot);

    const { createStaticZipArchive } = await import("../services/destinations/staticZip.service.js");
    const zipBuffer = await createStaticZipArchive(bundle);

    const safeSiteName = (website.title || website.name || `website-${websiteId}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeSiteName}-static-bundle.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", zipBuffer.length.toString());
    return res.status(200).send(zipBuffer);
  } catch (error) {
    next(error);
  }
}

