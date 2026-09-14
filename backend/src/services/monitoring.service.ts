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
