import type {
  Request,
  Response,
  NextFunction,
} from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AUTH_COOKIE_NAME } from "../config/auth.js";

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (res.locals.user || (req as any).user) {
      return next();
    }

    let token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token && req.headers.authorization && /^Bearer\s+/i.test(req.headers.authorization)) {
      token = req.headers.authorization.replace(/^Bearer\s+/i, "").trim();
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

    if (session.user.status === "SUSPENDED") {
      // Invalidate session immediately upon suspended user attempt
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
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

import { normalizeGlobalRole } from "../services/permission.service.js";

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