/**
 * @file Publishing: HTTP handlers that translate requests into module operations and responses. File responsibility: publishing controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Request, Response, NextFunction } from "express";
import {
  validateWebsiteForPublish,
  publishWebsite,
  getWebsiteDeployments,
  getDeploymentById,
  rollbackDeployment,
} from "./publishing.service.js";

/**
 * Validate Publish Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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

/**
 * Publish Website Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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

/**
 * Get Deployments Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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

/**
 * Get Deployment By Id Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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

/**
 * Rollback Deployment Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
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
 * Download Static Export Handler.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function downloadStaticExportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.id);
    const deploymentId = String(req.params.deploymentId);
    const userId = res.locals.user?.id;

    const deployment = await getDeploymentById(websiteId, deploymentId, userId);
    const { AppError } = await import("../../platform/http/app-error.js");
    if (deployment.status !== "PUBLISHED" || !deployment.sourceRevisionId) {
      throw new AppError("Only a published deployment with a durable revision can be exported.", 409, "EXPORT_UNAVAILABLE");
    }
    if (deployment.destinationType === "STATIC") {
      const { StaticExportPublisher } = await import("./destinations/static-export.publisher.js");
      const bundle = await new StaticExportPublisher().readExport(websiteId, deploymentId, deployment.version);
      return res.status(200).json({ success: true, websiteId, deploymentId, version: deployment.version, bundle });
    }
    const { getRevisionById } = await import("../revisions/revision.service.js");
    const revision = await getRevisionById(websiteId, deployment.sourceRevisionId, userId);
    const snapshot = revision.data;
    const { compileCanonicalToStaticBundle } = await import("./destinations/static-compiler.js");
    const bundle = compileCanonicalToStaticBundle(websiteId, deployment.version, snapshot);

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
          content: Buffer.from(f.content).toString("base64"),
          encoding: "base64",
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

