import { prisma } from "../config/prisma.js";
import { recordAuditLog } from "./audit.service.js";
import { AppError } from "../utils/app-error.js";

const db = prisma as any;

export interface OperationalAlert {
  id: string;
  level: "INFO" | "WARNING" | "CRITICAL";
  source: string;
  message: string;
  details?: any;
  timestamp: string;
}

const recentAlerts: OperationalAlert[] = [];
const MAX_ALERTS = 100;

export async function getSystemHealth() {
  const startTime = Date.now();
  let dbConnected = false;
  let dbLatencyMs = -1;
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startTime;
    dbConnected = true;
  } catch (err: any) {
    dbError = err?.message || String(err);
  }

  // Retrieve Job Queue statistics
  let queuedJobs = 0;
  let runningJobs = 0;
  let failedJobs = 0;
  let completedJobs = 0;

  try {
    const jobStats: any[] = await prisma.$queryRaw`
      SELECT status, COUNT(*)::int as count FROM background_jobs GROUP BY status
    `;
    for (const s of jobStats) {
      if (s.status === "QUEUED") queuedJobs = s.count;
      else if (s.status === "RUNNING") runningJobs = s.count;
      else if (s.status === "FAILED") failedJobs = s.count;
      else if (s.status === "COMPLETED") completedJobs = s.count;
    }
  } catch {}

  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const isHealthy = dbConnected && (dbLatencyMs < 2000);

  return {
    status: isHealthy ? "HEALTHY" : "DEGRADED",
    timestamp: new Date().toISOString(),
    database: {
      connected: dbConnected,
      latencyMs: dbLatencyMs,
      error: dbError,
    },
    system: {
      uptimeSeconds,
      nodeVersion: process.version,
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    },
    jobs: {
      queued: queuedJobs,
      running: runningJobs,
      failed: failedJobs,
      completed: completedJobs,
    },
  };
}

export async function recordOperationalAlert(
  level: "INFO" | "WARNING" | "CRITICAL",
  source: string,
  message: string,
  details?: any
): Promise<OperationalAlert> {
  const alert: OperationalAlert = {
    id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    level,
    source,
    message,
    details,
    timestamp: new Date().toISOString(),
  };

  recentAlerts.unshift(alert);
  if (recentAlerts.length > MAX_ALERTS) {
    recentAlerts.pop();
  }

  // Persist high-severity alerts into AuditLog asynchronously
  if (level === "WARNING" || level === "CRITICAL") {
    recordAuditLog({
      action: `ALERT_${level}`,
      targetResource: `system:${source}`,
      result: "FAILED",
      reason: message,
      details: { message, ...details },
    }).catch(() => {});
  }

  return alert;
}

export function getOperationalAlerts(limit: number = 50, levelFilter?: string): OperationalAlert[] {
  let alerts = recentAlerts;
  if (levelFilter) {
    alerts = alerts.filter((a) => a.level.toUpperCase() === levelFilter.toUpperCase());
  }
  return alerts.slice(0, limit);
}

export function clearOperationalAlerts() {
  recentAlerts.length = 0;
}

export async function getAdminPlatformStats() {
  const health = await getSystemHealth();

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalUsers = 0;
  let newUsersToday = 0;
  let newUsers7Days = 0;
  let newUsers30Days = 0;
  let activeUsers = 0;
  let suspendedUsers = 0;

  let totalWebsites = 0;
  let draftWebsites = 0;
  let publishedWebsites = 0;
  let suspendedWebsites = 0;
  let recentWebsiteActivityCount = 0;

  let totalDeployments = 0;
  let failedDeployments = 0;
  let recentDeploymentsCount = 0;

  let totalOrganizations = 0;
  let totalWorkspaces = 0;
  let totalMediaBytes = 0;

  let recentAuditLogs: any[] = [];
  let recentDeployments: any[] = [];
  let recentWebsites: any[] = [];

  try {
    const [
      uTotal,
      uToday,
      u7d,
      u30d,
      uSuspended,
      activeSessionsUsers,
      wTotal,
      wDraft,
      wPublished,
      wSuspended,
      wRecentCount,
      dTotal,
      dFailed,
      dRecentCount,
      orgCount,
      wsCount,
      mediaSum,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: startOfDay } } }),
      db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.user.count({ where: { status: "SUSPENDED" } }),
      // Active users definition: Users with lastLoginAt in last 30 days OR an active, non-revoked session
      db.user.count({
        where: {
          status: "ACTIVE",
          OR: [
            { lastLoginAt: { gte: thirtyDaysAgo } },
            { sessions: { some: { revokedAt: null, expiresAt: { gt: now } } } },
          ],
        },
      }),
      db.website.count(),
      db.website.count({ where: { status: "DRAFT" } }),
      db.website.count({ where: { status: "PUBLISHED" } }),
      db.website.count({ where: { moderationStatus: "SUSPENDED" } }),
      db.website.count({ where: { updatedAt: { gte: sevenDaysAgo } } }),
      db.deployment.count(),
      db.deployment.count({ where: { status: "FAILED" } }),
      db.deployment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.organization ? db.organization.count().catch(() => 0) : 0,
      db.workspace ? db.workspace.count().catch(() => 0) : 0,
      db.mediaAsset ? db.mediaAsset.aggregate({ _sum: { sizeBytes: true } }).catch(() => ({ _sum: { sizeBytes: 0 } })) : { _sum: { sizeBytes: 0 } },
    ]);

    totalUsers = uTotal;
    newUsersToday = uToday;
    newUsers7Days = u7d;
    newUsers30Days = u30d;
    suspendedUsers = uSuspended;
    activeUsers = activeSessionsUsers;

    totalWebsites = wTotal;
    draftWebsites = wDraft;
    publishedWebsites = wPublished;
    suspendedWebsites = wSuspended;
    recentWebsiteActivityCount = wRecentCount;

    totalDeployments = dTotal;
    failedDeployments = dFailed;
    recentDeploymentsCount = dRecentCount;

    totalOrganizations = orgCount;
    totalWorkspaces = wsCount;
    totalMediaBytes = mediaSum?._sum?.sizeBytes || 0;

    recentAuditLogs = await db.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
    });

    recentDeployments = await db.deployment.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { website: { select: { id: true, name: true, slug: true } } },
    });

    recentWebsites = await db.website.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        moderationStatus: true,
        updatedAt: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
  } catch (err: any) {
    recordOperationalAlert("WARNING", "admin-stats", "Failed to query full platform statistics", {
      error: err?.message,
    });
  }

  return {
    health,
    totals: {
      totalUsers,
      newUsersToday,
      newUsers7Days,
      newUsers30Days,
      activeUsers,
      suspendedUsers,
      totalWebsites,
      draftWebsites,
      publishedWebsites,
      suspendedWebsites,
      recentWebsiteActivityCount,
      totalDeployments,
      failedDeployments,
      recentDeploymentsCount,
      totalOrganizations,
      totalWorkspaces,
      storageUsageMb: Math.round((totalMediaBytes / (1024 * 1024)) * 100) / 100,
      recentAlertsCount: recentAlerts.length,
    },
    recentAuditLogs,
    recentDeployments,
    recentWebsites,
    timestamp: now.toISOString(),
    activityDefinition: "Active users include accounts in ACTIVE status that logged in within 30 days or maintain an active, unrevoked session.",
  };
}

export interface AdminUserQueryParams {
  search?: string;
  status?: string;
  role?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function getAdminUsers(params: AdminUserQueryParams = {}) {
  const page = Math.max(Number(params.page) || 1, 1);
  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.status) {
    where.status = params.status;
  }
  if (params.role) {
    where.role = params.role;
  }
  if (params.search) {
    const s = params.search.trim();
    where.OR = [
      { fullName: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
      { phone: { contains: s, mode: "insensitive" } },
    ];
  }

  const validSortFields = ["createdAt", "updatedAt", "lastLoginAt", "fullName", "email"];
  const sortBy = validSortFields.includes(params.sortBy || "") ? params.sortBy! : "createdAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        suspensionReason: true,
        suspendedAt: true,
        suspendedBy: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { websites: true } },
      },
    }),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getAdminUserById(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      suspensionReason: true,
      suspendedAt: true,
      suspendedBy: true,
      emailVerified: true,
      phoneVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      websites: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          moderationStatus: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { deployments: true, revisions: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          websites: true,
          sessions: true,
          deployments: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return user;
}

export async function setAdminUserStatus(
  targetUserId: string,
  status: "ACTIVE" | "SUSPENDED" | "DELETED",
  adminUser: { id: string; role: string; email?: string },
  reason?: string
) {
  // 1. Safety Check: An admin cannot suspend themselves
  if (targetUserId === adminUser.id) {
    throw new AppError("Administrators cannot change their own account status.", 400, "CANNOT_MODIFY_SELF");
  }

  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new AppError("Target user not found.", 404, "USER_NOT_FOUND");
  }

  // 2. Safety Check: Regular admins cannot suspend a Super Admin or Platform Admin
  if (adminUser.role === "ADMIN") {
    if (["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN"].includes(targetUser.role)) {
      throw new AppError("Admins cannot suspend other administrators or Super Admins.", 403, "FORBIDDEN");
    }
  }

  // 3. Safety Check: Protect the last active Super Admin from lockout
  if (targetUser.role === "SUPER_ADMIN" && status === "SUSPENDED") {
    const activeSuperAdmins = await db.user.count({
      where: {
        role: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });

    if (activeSuperAdmins <= 1) {
      throw new AppError("Cannot suspend the only remaining active Super Admin.", 400, "CANNOT_LOCKOUT_LAST_SUPER_ADMIN");
    }
  }

  let updatedUser;

  if (status === "SUSPENDED") {
    // Invalidate/revoke active sessions for this suspended user immediately
    await db.session.updateMany({
      where: {
        userId: targetUserId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: {
        status: "SUSPENDED",
        suspensionReason: reason || "Suspended by administrator",
        suspendedAt: new Date(),
        suspendedBy: adminUser.id,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        role: true,
        suspensionReason: true,
        suspendedAt: true,
      },
    });

    await recordAuditLog({
      userId: adminUser.id,
      actorRole: adminUser.role,
      action: "USER_SUSPEND",
      targetResource: `user:${targetUserId}`,
      result: "SUCCESS",
      reason: reason || "Suspended by administrator",
      details: {
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        reason,
      },
    });
  } else if (status === "ACTIVE") {
    // Reactivate user: clear suspension metadata without restoring revoked sessions
    updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: {
        status: "ACTIVE",
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        role: true,
      },
    });

    await recordAuditLog({
      userId: adminUser.id,
      actorRole: adminUser.role,
      action: "USER_REACTIVATE",
      targetResource: `user:${targetUserId}`,
      result: "SUCCESS",
      reason: reason || "Reactivated by administrator",
      details: {
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
      },
    });
  } else {
    // DELETED
    updatedUser = await db.user.update({
      where: { id: targetUserId },
      data: { status: "DELETED" },
      select: { id: true, email: true, status: true, role: true },
    });

    await recordAuditLog({
      userId: adminUser.id,
      actorRole: adminUser.role,
      action: "USER_DELETED",
      targetResource: `user:${targetUserId}`,
      result: "SUCCESS",
      details: { targetUserEmail: targetUser.email },
    });
  }

  return updatedUser;
}

export interface AdminWebsiteQueryParams {
  search?: string;
  status?: string;
  moderationStatus?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function getAdminWebsites(params: AdminWebsiteQueryParams = {}) {
  const page = Math.max(Number(params.page) || 1, 1);
  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.status) {
    where.status = params.status;
  }
  if (params.moderationStatus) {
    where.moderationStatus = params.moderationStatus;
  }
  if (params.ownerId) {
    where.userId = params.ownerId;
  }
  if (params.search) {
    const s = params.search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { slug: { contains: s, mode: "insensitive" } },
      { user: { email: { contains: s, mode: "insensitive" } } },
      { user: { fullName: { contains: s, mode: "insensitive" } } },
    ];
  }

  const validSortFields = ["updatedAt", "createdAt", "name", "status"];
  const sortBy = validSortFields.includes(params.sortBy || "") ? params.sortBy! : "updatedAt";
  const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

  const [total, websites] = await Promise.all([
    db.website.count({ where }),
    db.website.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        moderationStatus: true,
        moderationReason: true,
        moderatedAt: true,
        moderatedBy: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, fullName: true, email: true } },
        deployments: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            destinationType: true,
            createdAt: true,
          },
        },
        _count: { select: { deployments: true, revisions: true } },
      },
    }),
  ]);

  return {
    websites,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getAdminWebsiteById(websiteId: string) {
  const website = await db.website.findUnique({
    where: { id: websiteId },
    include: {
      user: { select: { id: true, fullName: true, email: true, role: true, status: true } },
      deployments: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          destinationType: true,
          createdAt: true,
          version: true,
        },
      },
      _count: {
        select: {
          deployments: true,
          revisions: true,
          collaborators: true,
        },
      },
    },
  });

  if (!website) {
    throw new AppError("Website not found", 404, "WEBSITE_NOT_FOUND");
  }

  return website;
}

export async function setAdminWebsiteModeration(
  websiteId: string,
  moderationStatus: "ACTIVE" | "SUSPENDED",
  adminUser: { id: string; role: string; email?: string },
  reason?: string
) {
  const website = await db.website.findUnique({
    where: { id: websiteId },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!website) {
    throw new AppError("Website not found", 404, "WEBSITE_NOT_FOUND");
  }

  const updatedWebsite = await db.website.update({
    where: { id: websiteId },
    data: {
      moderationStatus,
      moderationReason: reason || (moderationStatus === "SUSPENDED" ? "Suspended by Administrator" : null),
      moderatedAt: new Date(),
      moderatedBy: adminUser.id,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      moderationStatus: true,
      moderationReason: true,
      moderatedAt: true,
    },
  });

  await recordAuditLog({
    userId: adminUser.id,
    actorRole: adminUser.role,
    action: moderationStatus === "SUSPENDED" ? "WEBSITE_MODERATION_SUSPEND" : "WEBSITE_MODERATION_REACTIVATE",
    targetResource: `website:${websiteId}`,
    result: "SUCCESS",
    reason: reason || `Website set to ${moderationStatus}`,
    details: {
      websiteName: website.name,
      websiteSlug: website.slug,
      ownerEmail: website.user?.email,
      moderationStatus,
      reason,
    },
  });

  return updatedWebsite;
}
