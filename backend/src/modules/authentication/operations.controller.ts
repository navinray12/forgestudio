import type { Request, Response, NextFunction } from "express";
import { runPlatformHealthCheck } from "../publishing/platformHealth.service.js";
import { enqueueJob } from "../../services/jobs/jobRunner.js";
import {
    schedulePublish,
    cancelScheduledPublish,
    promoteDeployment,
} from "../publishing/publishing.service.js";

export async function getHealthHandler(_req: Request, res: Response, next: NextFunction) {
    try {
        const health = await runPlatformHealthCheck();
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
        const health = await runPlatformHealthCheck();
        return res.status(200).json({
            success: true,
            data: {
                health,
                recentAlerts: [],
            },
        });
    } catch (err) {
        next(err);
    }
}

export async function listJobsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        return res.status(200).json({
            success: true,
            data: [],
            meta: { total: 0 },
        });
    } catch (err) {
        next(err);
    }
}

export async function processNextJobHandler(_req: Request, res: Response, next: NextFunction) {
    try {
        return res.status(200).json({
            success: true,
            data: null,
        });
    } catch (err) {
        next(err);
    }
}

export async function getAlertsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        return res.status(200).json({
            success: true,
            data: [],
            meta: { total: 0 },
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
