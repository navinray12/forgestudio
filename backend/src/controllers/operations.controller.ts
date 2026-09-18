import type { Request, Response, NextFunction } from "express";
import {
  getSystemHealth,
  getOperationalAlerts,
  recordOperationalAlert,
  getAdminPlatformStats,
  getAdminUsers,
  setAdminUserStatus,
  getAdminWebsites,
} from "../services/monitoring.service.js";
import {
  listJobs,
  processNextJob,
  enqueueJob,
  getJobById,
} from "../services/jobs/jobRunner.js";
import {
  schedulePublish,
  cancelScheduledPublish,
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

export async function cancelScheduledPublishHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = res.locals.user || (req as any).user;
    const websiteId = String(req.params.id);
    const { jobId, reason } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "jobId is required" },
      });
    }

    const result = await cancelScheduledPublish(websiteId, jobId, user.id, reason);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminStatsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await getAdminPlatformStats();
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const users = await getAdminUsers(limit);
    return res.status(200).json({
      success: true,
      data: users,
      meta: { total: users.length },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminUserStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUser = res.locals.user || (req as any).user;
    const targetUserId = req.params.userId;
    const { status } = req.body;

    if (!status || !["ACTIVE", "SUSPENDED", "DELETED"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Status must be ACTIVE, SUSPENDED, or DELETED" },
      });
    }

    const updated = await setAdminUserStatus(targetUserId, status, adminUser?.id);
    return res.status(200).json({
      success: true,
      data: updated,
      message: `User status updated to ${status}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminWebsitesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const websites = await getAdminWebsites(limit);
    return res.status(200).json({
      success: true,
      data: websites,
      meta: { total: websites.length },
    });
  } catch (err) {
    next(err);
  }
}

