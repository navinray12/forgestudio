import type { Request, Response, NextFunction } from "express";
import {
  getSystemHealth,
  getOperationalAlerts,
  recordOperationalAlert,
} from "../services/monitoring.service.js";
import {
  listJobs,
  processNextJob,
  enqueueJob,
  getJobById,
} from "../services/jobs/jobRunner.js";
import {
  schedulePublish,
  promoteDeployment,
} from "../services/publishing.service.js";

export async function getHealthHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const health = await getSystemHealth();
    return res.status(200).json({
      success: true,
      ...health,
    });
  } catch (err) {
    next(err);
  }
}

export async function getOperationalStatusHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const health = await getSystemHealth();
    const alerts = getOperationalAlerts(10);
    return res.status(200).json({
      success: true,
      data: {
        health,
        recentAlerts: alerts,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listJobsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string || "50", 10);

    const jobs = await listJobs({ type, status, limit });
    return res.status(200).json({
      success: true,
      data: jobs,
      meta: { total: jobs.length },
    });
  } catch (err) {
    next(err);
  }
}

export async function processNextJobHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await processNextJob();
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAlertsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const level = req.query.level as string | undefined;
    const limit = parseInt(req.query.limit as string || "50", 10);
    const alerts = getOperationalAlerts(limit, level);

    return res.status(200).json({
      success: true,
      data: alerts,
      meta: { total: alerts.length },
    });
  } catch (err) {
    next(err);
  }
}

export async function schedulePublishHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);
    const { publishAt, environment, destinationType, destinationRef, metadata } = req.body;

    if (!publishAt) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "publishAt is required" },
      });
    }

    const result = await schedulePublish(websiteId, user.id, {
      publishAt,
      environment,
      destinationType,
      destinationRef,
      metadata,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function promoteDeploymentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user;
    const websiteId = String(req.params.id);
    const { stagingDeploymentId } = req.body;

    if (!stagingDeploymentId) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "stagingDeploymentId is required" },
      });
    }

    const result = await promoteDeployment(websiteId, stagingDeploymentId, user.id);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
