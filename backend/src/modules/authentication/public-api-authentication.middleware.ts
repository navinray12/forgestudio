/**
 * @file Authentication: request processing before the final handler. File responsibility: public api authentication middleware.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../../platform/database/prisma.js";
import { AUTH_COOKIE_NAME } from "../../platform/authentication/auth.js";
import { verifyApiKey } from "../api-keys/api-key.service.js";

/**
 * Hash Token.
 * @param token Token supplied to this operation; do not include secret tokens in logs.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Authenticate Api V1.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export async function authenticateApiV1(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();

      // 1. Check Developer API Keys
      const keyResult = await verifyApiKey(token);
      if (keyResult) {
        if ("error" in keyResult && keyResult.error === "REVOKED") {
          return res.status(401).json({
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "API key has been revoked.",
            },
          });
        }

        if ("user" in keyResult && keyResult.user) {
          res.locals.user = keyResult.user;
          res.locals.apiKey = keyResult.apiKey;
          res.locals.authType = "API_KEY";
          return next();
        }
      }

      // 2. Check Bearer Session Token
      const sessionTokenHash = hashToken(token);
      const session = await prisma.session.findUnique({
        where: { tokenHash: sessionTokenHash },
        include: { user: true },
      });

      if (session && !session.revokedAt && session.expiresAt > new Date()) {
        await prisma.session.update({
          where: { id: session.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        res.locals.user = session.user;
        res.locals.session = session;
        res.locals.authType = "SESSION";
        return next();
      }
    }

    // 3. Check Session Cookie fallback
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    if (cookieToken) {
      const cookieHash = hashToken(cookieToken);
      const cookieSession = await prisma.session.findUnique({
        where: { tokenHash: cookieHash },
        include: { user: true },
      });

      if (cookieSession && !cookieSession.revokedAt && cookieSession.expiresAt > new Date()) {
        await prisma.session.update({
          where: { id: cookieSession.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        res.locals.user = cookieSession.user;
        res.locals.session = cookieSession;
        res.locals.authType = "SESSION";
        return next();
      }
    }

    // Unauthenticated
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required. Provide a valid Bearer API key or active session.",
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err?.message || "An unexpected authentication error occurred.",
      },
    });
  }
}

/**
 * Require Api V1 Scope.
 * @param requiredScope Required Scope supplied to this operation (type: string).
 */
export function requireApiV1Scope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // If authenticated via API Key, verify scopes
    if (res.locals.authType === "API_KEY" && res.locals.apiKey) {
      const scopes = Array.isArray(res.locals.apiKey.scopes)
        ? res.locals.apiKey.scopes
        : [];

      const hasScope =
        scopes.includes(requiredScope) ||
        scopes.includes("*") ||
        scopes.includes("all") ||
        (requiredScope.endsWith(":read") && scopes.includes(requiredScope.replace(":read", ":write")));

      if (!hasScope) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Insufficient permissions. Required scope: ${requiredScope}`,
          },
        });
      }
    }

    // Sessions or authorized API keys proceed
    next();
  };
}
