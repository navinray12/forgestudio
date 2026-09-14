import { Request, Response, NextFunction } from "express";
import {
  validateWebsiteForPublish,
  publishWebsite,
  getWebsiteDeployments,
  getDeploymentById,
  rollbackDeployment,
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
