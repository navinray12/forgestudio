import { prisma } from "../config/prisma.js";

const db = prisma as any;

export interface AuditLogFilters {
  userId?: string;
  targetResource?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
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
    where.targetResource = { contains: filters.targetResource };
  }
  if (filters.action) {
    where.action = filters.action;
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

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
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
      totalPages: Math.ceil(total / limit),
    },
  };
}
