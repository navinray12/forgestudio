/**
 * @file Authentication: request processing before the final handler. File responsibility: session authentication middleware.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type {
  Request,
  Response,
  NextFunction,
} from "express";
import crypto from "crypto";
import { prisma } from "../../platform/database/prisma.js";
import { AUTH_COOKIE_NAME } from "../../platform/authentication/auth.js";

/**
 * Hash Token.
 * @param token Token supplied to this operation; do not include secret tokens in logs.
 */
function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * Require Auth.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

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

    if (session.revokedAt) {
      return res.status(401).json({
        success: false,
        message: "Session has been revoked",
      });
    }

    if (session.user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_UNAVAILABLE', message: 'Account is unavailable.' } });
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

    next();
  } catch (error) {
    next(error);
  }
}
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user || (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(user.role)) {
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
