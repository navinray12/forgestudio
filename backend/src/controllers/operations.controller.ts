import type { Request, Response, NextFunction } from "express";
import {
  getSystemHealth,
  getOperationalAlerts,
  recordOperationalAlert,
  getAdminPlatformStats,
  getAdminUsers,
  getAdminUserById,
  setAdminUserStatus,
  getAdminWebsites,
  getAdminWebsiteById,
  setAdminWebsiteModeration,
} from "../services/monitoring.service.js";
import {
  queryAuditLogs,
  exportAuditLogsToCsv,
} from "../services/audit.service.js";
import {
  listJobs,
  processNextJob,
  retryJob,
  cancelJob,
  purgeCompletedJobs,
} from "../services/jobs/jobRunner.js";
import {
  schedulePublish,
  cancelScheduledPublish,
  promoteDeployment,
} from "../services/publishing.service.js";
import { AppError } from "../utils/app-error.js";
import { prisma } from "../config/prisma.js";
import { canAssignGlobalRole } from "../services/permission.service.js";

// ==========================================
// System Health & Monitoring
// ==========================================

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

export async function getAdminMonitoringHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const health = await getSystemHealth();
    const alerts = getOperationalAlerts(20);
    return res.status(200).json({
      success: true,
      data: {
        health,
        alerts,
        nodeEnvironment: process.env.NODE_ENV || "development",
        serverUptimeFormatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// Live Admin Platform Statistics
// ==========================================

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

// ==========================================
// User Management & Suspension
// ==========================================

export async function getAdminUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query;
    const result = await getAdminUsers({
      search: query.search as string | undefined,
      status: query.status as string | undefined,
      role: query.role as string | undefined,
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as "asc" | "desc") || "desc",
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });

    return res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
      meta: { total: result.pagination.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminUserDetailsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = String(req.params.userId);
    const user = await getAdminUserById(userId);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminUserStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUser = res.locals.user || (req as any).user;
    if (!adminUser) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const targetUserId = String(req.params.userId);
    const { status, reason } = req.body;

    if (!status || !["ACTIVE", "SUSPENDED", "DELETED"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Status must be ACTIVE, SUSPENDED, or DELETED" },
      });
    }

    const updated = await setAdminUserStatus(targetUserId, status, adminUser, reason);
    return res.status(200).json({
      success: true,
      data: updated,
      message: `User status updated to ${status}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminUserRoleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUser = res.locals.user || (req as any).user;
    if (!adminUser) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const targetUserId = String(req.params.userId);
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Role is required" },
      });
    }

    if (adminUser.id === targetUserId) {
      return res.status(400).json({
        success: false,
        error: { code: "CANNOT_MODIFY_SELF", message: "You cannot change your own global role." },
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    let isLastSuperAdmin = false;
    if (targetUser.role === "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      });
      isLastSuperAdmin = superAdminCount <= 1;
    }

    const check = canAssignGlobalRole(adminUser.role, targetUser.role, role, isLastSuperAdmin);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: check.reason || "Unauthorized role assignment" },
      });
    }

    let dbRole: any = role;
    if (role === "CUSTOMER") dbRole = "USER";

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: dbRole },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          actorRole: adminUser.role,
          action: "USER_ROLE_CHANGED",
          targetResource: `user:${targetUserId}`,
          result: "SUCCESS",
          details: { previousRole: targetUser.role, newRole: updated.role },
        },
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      data: updated,
      message: `User global role updated to ${updated.role}`,
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// Website Management & Moderation
// ==========================================

export async function getAdminWebsitesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query;
    const result = await getAdminWebsites({
      search: query.search as string | undefined,
      status: query.status as string | undefined,
      moderationStatus: query.moderationStatus as string | undefined,
      ownerId: query.ownerId as string | undefined,
      sortBy: query.sortBy as string | undefined,
      sortOrder: (query.sortOrder as "asc" | "desc") || "desc",
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });

    return res.status(200).json({
      success: true,
      data: result.websites,
      pagination: result.pagination,
      meta: { total: result.pagination.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminWebsiteDetailsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const websiteId = String(req.params.websiteId);
    const website = await getAdminWebsiteById(websiteId);
    return res.status(200).json({
      success: true,
      data: website,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminWebsiteModerationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const adminUser = res.locals.user || (req as any).user;
    if (!adminUser) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const websiteId = String(req.params.websiteId);
    const { moderationStatus, reason } = req.body;

    if (!moderationStatus || !["ACTIVE", "SUSPENDED"].includes(moderationStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "moderationStatus must be ACTIVE or SUSPENDED" },
      });
    }

    const updated = await setAdminWebsiteModeration(websiteId, moderationStatus, adminUser, reason);
    return res.status(200).json({
      success: true,
      data: updated,
      message: `Website moderation status updated to ${moderationStatus}`,
    });
  } catch (err) {
    next(err);
  }
}

// ==========================================
// Admin Audit Logs
// ==========================================

export async function getAdminAuditLogsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query;
    const result = await queryAuditLogs({
      userId: query.userId as string | undefined,
      actorRole: query.actorRole as string | undefined,
      targetResource: query.targetResource as string | undefined,
      action: query.action as string | undefined,
      result: query.result as string | undefined,
      search: query.search as string | undefined,
      startDate: query.startDate as string | undefined,
      endDate: query.endDate as string | undefined,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 50,
    });

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
      meta: { total: result.pagination.total },
    });
  } catch (err) {
    next(err);
  }
}

export async function exportAdminAuditLogsCsvHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query;
    const csvContent = await exportAuditLogsToCsv({
      userId: query.userId as string | undefined,
      actorRole: query.actorRole as string | undefined,
      targetResource: query.targetResource as string | undefined,
      action: query.action as string | undefined,
      result: query.result as string | undefined,
      search: query.search as string | undefined,
      startDate: query.startDate as string | undefined,
      endDate: query.endDate as string | undefined,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="audit_logs_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

// ==========================================
// Background Jobs (Super Admin / Operations)
// ==========================================

export async function listJobsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = parseInt((req.query.limit as string) || "50", 10);

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

export async function retryJobHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const jobId = String(req.params.id);
    const job = await retryJob(jobId);
    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelJobHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const jobId = String(req.params.id);
    const reason = req.body?.reason || "Cancelled via Operations Dashboard";
    const result = await cancelJob(jobId, reason);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function purgeCompletedJobsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await purgeCompletedJobs();
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
    const limit = parseInt((req.query.limit as string) || "50", 10);
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

// ==========================================
// Publishing Workflows
// ==========================================

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
