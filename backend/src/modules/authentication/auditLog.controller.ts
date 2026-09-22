import type { Request, Response, NextFunction } from "express";
import { queryAuditLogs, type AuditLogFilters } from "../audit/audit.service.js";
import { getWebsiteById } from "../websites/website.service.js";
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";

const db = prisma as any;

const SENSITIVE_KEYS = new Set([
    "token",
    "tokenhash",
    "token_hash",
    "password",
    "passwordhash",
    "password_hash",
    "apikey",
    "api_key",
    "secret",
    "privatekey",
    "private_key",
    "authorization",
    "credentials",
]);

function redactSecrets(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(redactSecrets);

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            sanitized[key] = "[REDACTED]";
        } else if (value && typeof value === "object") {
            sanitized[key] = redactSecrets(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

export async function getAuditLogsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const user = res.locals.user || (req as any).user;
        if (!user) {
            throw new AppError("Authentication required", 401, "UNAUTHORIZED");
        }

        const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
        const query = req.query as Record<string, string | undefined>;

        const filters: AuditLogFilters = {
            userId: query.userId,
            targetResource: query.targetResource,
            action: query.action,
            startDate: query.startDate,
            endDate: query.endDate,
            page: query.page ? Number(query.page) : undefined,
            limit: query.limit ? Number(query.limit) : undefined,
        };

        if (!isAdmin) {
            if (filters.userId && filters.userId !== user.id) {
                throw new AppError("Forbidden: Cross-tenant audit log access denied", 403, "FORBIDDEN");
            }

            if (filters.targetResource) {
                const resource = filters.targetResource;
                if (resource.startsWith("website:")) {
                    const websiteId = resource.split(":")[1];
                    try {
                        await getWebsiteById(websiteId, user.id);
                    } catch {
                        throw new AppError("Forbidden: Unauthorized resource access", 403, "FORBIDDEN");
                    }
                } else if (resource.startsWith("team:")) {
                    const teamId = resource.split(":")[1];
                    const membership = await db.teamMember.findUnique({
                        where: { teamId_userId: { teamId, userId: user.id } },
                    });
                    if (!membership) {
                        throw new AppError("Forbidden: Unauthorized resource access", 403, "FORBIDDEN");
                    }
                }
            } else if (!filters.userId) {
                filters.userId = user.id;
            }
        }

        const result = await queryAuditLogs(filters);

        const sanitizedLogs = result.logs.map((log: any) => ({
            ...log,
            details: redactSecrets(log.details),
        }));

        return res.status(200).json({
            success: true,
            logs: sanitizedLogs,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
}
