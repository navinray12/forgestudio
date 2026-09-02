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
<<<<<<< HEAD
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
=======
      // F-118: Fallback check for Developer API Key
      const apiKey = await (prisma as any).apiKey.findUnique({
        where: { keyHash: tokenHash },
        include: { user: true }
      });
      if (!apiKey || apiKey.revokedAt) {
        return res.status(401).json({
          success: false,
          message: "Invalid session or API key",
        });
      }

      await (prisma as any).apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
      });

      res.locals.user = apiKey.user;
      res.locals.isDeveloperApi = true;
      res.locals.apiScopes = apiKey.scopes;

      // F-118: Scopes Enforcement
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !apiKey.scopes.includes('write')) {
        return res.status(403).json({
          success: false,
          message: "API Key lacks required 'write' scope for this operation."
        });
      }

      return next();
>>>>>>> 8d95dec (Initial project code)
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

    next();
  } catch (error) {
    next(error);
  }
}