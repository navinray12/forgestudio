import { prisma } from "../config/prisma.js";

const db = prisma as any;

export interface AuditLogFilters {
  userId?: string;
  targetResource?: string;
  action?: string;
  actorRole?: string;
  result?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface RecordAuditLogParams {
  userId?: string;
  actorRole?: string;
  action: string;
  targetResource: string;
  result?: "SUCCESS" | "FAILED";
  reason?: string;
  correlationId?: string;
  details?: any;
  ipAddress?: string;
}

export async function queryAuditLogs(filters: AuditLogFilters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.userId) {
    where.userId = filters.userId;
  }
  if (filters.targetResource) {
    where.targetResource = { contains: filters.targetResource, mode: "insensitive" };
  }
  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.actorRole) {
    where.actorRole = filters.actorRole;
  }
  if (filters.result) {
    where.result = filters.result;
  }
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { action: { contains: s, mode: "insensitive" } },
      { targetResource: { contains: s, mode: "insensitive" } },
      { reason: { contains: s, mode: "insensitive" } },
      { user: { email: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
    }),
  ]);

  return {
    success: true,
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function recordAuditLog(
  paramsOrUserId: string | RecordAuditLogParams,
  action?: string,
  targetResource?: string,
  details?: any
) {
  try {
    if (typeof paramsOrUserId === "object" && paramsOrUserId !== null) {
      return await db.auditLog.create({
        data: {
          userId: paramsOrUserId.userId,
          actorRole: paramsOrUserId.actorRole,
          action: paramsOrUserId.action,
          targetResource: paramsOrUserId.targetResource,
          result: paramsOrUserId.result || "SUCCESS",
          reason: paramsOrUserId.reason,
          correlationId: paramsOrUserId.correlationId,
          details: paramsOrUserId.details || {},
          ipAddress: paramsOrUserId.ipAddress,
        },
      });
    } else {
      return await db.auditLog.create({
        data: {
          userId: paramsOrUserId,
          action: action || "UNKNOWN_ACTION",
          targetResource: targetResource || "system",
          result: "SUCCESS",
          details: details || {},
        },
      });
    }
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function exportAuditLogsToCsv(filters: AuditLogFilters = {}): Promise<string> {
  const result = await queryAuditLogs({ ...filters, limit: 1000, page: 1 });
  const headers = [
    "Event ID",
    "Timestamp",
    "Actor ID",
    "Actor Email",
    "Actor Role",
    "Action",
    "Target Resource",
    "Result",
    "Reason",
    "Correlation ID",
    "IP Address",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = (result.logs || []).map((l: any) => [
    escapeCsv(l.id),
    escapeCsv(l.createdAt ? new Date(l.createdAt).toISOString() : ""),
    escapeCsv(l.userId || ""),
    escapeCsv(l.user?.email || ""),
    escapeCsv(l.actorRole || l.user?.role || ""),
    escapeCsv(l.action || ""),
    escapeCsv(l.targetResource || ""),
    escapeCsv(l.result || "SUCCESS"),
    escapeCsv(l.reason || ""),
    escapeCsv(l.correlationId || ""),
    escapeCsv(l.ipAddress || ""),
  ].join(","));

  return [headers.join(","), ...rows].join("\r\n");
}
