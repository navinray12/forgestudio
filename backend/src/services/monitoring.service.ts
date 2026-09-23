import { prisma } from "../config/prisma.js";
import { recordAuditLog } from "./audit.service.js";

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

  let totalUsers = 0;
  let activeUsers = 0;
  let totalWebsites = 0;
  let publishedWebsites = 0;
  let totalDeployments = 0;
  let totalOrganizations = 0;
  let totalWorkspaces = 0;
  let recentAuditLogs: any[] = [];
  let recentDeployments: any[] = [];

  try {
    const [uCount, aUCount, wCount, pWCount, dCount, oCount, wsCount] = await Promise.all([
      (prisma as any).user.count(),
      (prisma as any).user.count({ where: { status: "ACTIVE" } }),
      (prisma as any).website.count(),
      (prisma as any).website.count({ where: { status: "PUBLISHED" } }),
      (prisma as any).deployment.count(),
      (prisma as any).organization ? (prisma as any).organization.count() : 0,
      (prisma as any).workspace ? (prisma as any).workspace.count() : 0,
    ]);

    totalUsers = uCount;
    activeUsers = aUCount;
    totalWebsites = wCount;
    publishedWebsites = pWCount;
    totalDeployments = dCount;
    totalOrganizations = oCount;
    totalWorkspaces = wsCount;

    recentAuditLogs = await (prisma as any).auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });

    recentDeployments = await (prisma as any).deployment.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { website: { select: { id: true, name: true, slug: true } } },
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
      activeUsers,
      totalWebsites,
      publishedWebsites,
      totalDeployments,
      totalOrganizations,
      totalWorkspaces,
    },
    recentAuditLogs,
    recentDeployments,
  };
}

export async function getAdminUsers(limit: number = 50) {
  return await (prisma as any).user.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { websites: true } },
    },
  });
}

export async function setAdminUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED" | "DELETED", adminUserId?: string) {
  const updatedUser = await (prisma as any).user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, email: true, status: true, role: true },
  });

  if (adminUserId) {
    await recordAuditLog({
      userId: adminUserId,
      action: `USER_STATUS_${status}`,
      targetResource: `user:${userId}`,
      details: { newStatus: status, userEmail: updatedUser.email },
    });
  }

  return updatedUser;
}

export async function getAdminWebsites(limit: number = 50) {
  return await (prisma as any).website.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, fullName: true, email: true } },
      _count: { select: { deployments: true, revisions: true } },
    },
  });
}
