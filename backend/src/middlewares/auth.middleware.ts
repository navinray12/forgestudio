import type {
  Request,
  Response,
  NextFunction,
} from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AUTH_COOKIE_NAME } from "../config/auth.js";
import { recordAuditLog } from "../services/audit.service.js";
import { normalizeGlobalRole, authorizeCapability } from "../services/permission.service.js";

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * Primary authentication middleware.
 * Supports session cookies (primary) and Authorization: Bearer <token> headers (API fallback).
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];

    // Bearer token fallback for API and mobile clients
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.substring(7).trim();
    } else if (!token && typeof req.headers["x-auth-token"] === "string") {
      token = req.headers["x-auth-token"].trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const tokenHash = hashToken(token);

    const session = await prisma.session.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    const clientIp = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";

    if (session.user.status === "SUSPENDED") {
      // Invalidate session immediately upon suspended user attempt
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }).catch(() => {});

      // Record security audit log asynchronously
      recordAuditLog({
        userId: session.user.id,
        actorRole: session.user.role,
        action: "SUSPENDED_USER_ACCESS_BLOCKED",
        targetResource: req.originalUrl || req.path,
        result: "FAILED",
        reason: "Access attempted by suspended user account.",
        ipAddress: clientIp,
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        error: {
          code: "ACCOUNT_SUSPENDED",
          message: "Account has been suspended. Please contact support.",
        },
      });
    }

    if (session.user.status === "DELETED") {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }).catch(() => {});

      recordAuditLog({
        userId: session.user.id,
        actorRole: session.user.role,
        action: "DELETED_USER_ACCESS_BLOCKED",
        targetResource: req.originalUrl || req.path,
        result: "FAILED",
        reason: "Access attempted on deleted user account.",
        ipAddress: clientIp,
      }).catch(() => {});

      return res.status(401).json({
        success: false,
        error: {
          code: "ACCOUNT_DELETED",
          message: "Account has been deleted.",
        },
      });
    }

    if (session.revokedAt) {
      return res.status(401).json({
        success: false,
        message: "Session has been revoked",
      });
    }

    if (session.expiresAt <= new Date()) {
      return res.status(401).json({
        success: false,
        message: "Session expired",
      });
    }

    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        lastUsedAt: new Date(),
      },
    });

    res.locals.user = session.user;
    res.locals.session = session;
    (req as any).user = session.user;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-based authorization middleware.
 * Verifies that the authenticated user possesses one of the allowed global roles.
 */
export function requireRole(allowedRoles: string | string[]) {
  const rawAllowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const normalizedAllowed = rawAllowed.map((r) => normalizeGlobalRole(r));

  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user || (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userGlobalRole = normalizeGlobalRole(user.role);

    if (!rawAllowed.includes(user.role) && !normalizedAllowed.includes(userGlobalRole)) {
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";

      // Asynchronously audit role access violation
      recordAuditLog({
        userId: user.id,
        actorRole: user.role,
        action: "PERMISSION_DENIED",
        targetResource: req.originalUrl || req.path,
        result: "FAILED",
        reason: `Role '${user.role}' lacks required role (${rawAllowed.join(", ")})`,
        ipAddress: clientIp,
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this resource.",
        },
      });
    }

    next();
  };
}

export { authorizeCapability };