import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AUTH_COOKIE_NAME } from "../config/auth.js";
import { verifyApiKey, CANONICAL_SCOPES, type CanonicalScope } from "../services/apiKey.service.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function authenticateApiV1(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();

      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing token in authorization header.",
          },
        });
      }

      // 1. Check Developer API Keys
      const keyResult = await verifyApiKey(token);
      if (keyResult) {
        if ("error" in keyResult) {
          if (keyResult.error === "REVOKED") {
            return res.status(401).json({
              success: false,
              error: {
                code: "REVOKED_API_KEY",
                message: "API key has been revoked.",
              },
            });
          }
          if (keyResult.error === "EXPIRED") {
            return res.status(401).json({
              success: false,
              error: {
                code: "EXPIRED_API_KEY",
                message: "API key has expired.",
              },
            });
          }
          if (keyResult.error === "SUSPENDED") {
            return res.status(403).json({
              success: false,
              error: {
                code: "ACCOUNT_SUSPENDED",
                message: "User account has been suspended.",
              },
            });
          }
        }

        if ("user" in keyResult && keyResult.user) {
          if (keyResult.user.status === "SUSPENDED") {
            return res.status(403).json({
              success: false,
              error: {
                code: "ACCOUNT_SUSPENDED",
                message: "User account has been suspended.",
              },
            });
          }

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

      if (session) {
        if (session.revokedAt || session.expiresAt <= new Date()) {
          return res.status(401).json({
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Session has expired or was revoked.",
            },
          });
        }

        if (session.user.status === "SUSPENDED") {
          return res.status(403).json({
            success: false,
            error: {
              code: "ACCOUNT_SUSPENDED",
              message: "User account has been suspended.",
            },
          });
        }

        await prisma.session.update({
          where: { id: session.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        res.locals.user = session.user;
        res.locals.session = session;
        res.locals.authType = "SESSION";
        return next();
      }

      // If an explicit Bearer header was provided, it MUST be valid.
      // Do NOT silently fall back to cookie session!
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid API key or session token provided in Authorization header.",
        },
      });
    }

    // 3. Check Session Cookie fallback (First-party dashboard browser session)
    // Only applied when NO explicit Authorization header was provided
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    if (cookieToken) {
      const cookieHash = hashToken(cookieToken);
      const cookieSession = await prisma.session.findUnique({
        where: { tokenHash: cookieHash },
        include: { user: true },
      });

      if (cookieSession && !cookieSession.revokedAt && cookieSession.expiresAt > new Date()) {
        if (cookieSession.user.status === "SUSPENDED") {
          return res.status(403).json({
            success: false,
            error: {
              code: "ACCOUNT_SUSPENDED",
              message: "User account has been suspended.",
            },
          });
        }

        await prisma.session.update({
          where: { id: cookieSession.id },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        // CSRF protection for cookie-based state-changing requests (POST, PUT, PATCH, DELETE)
        const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase());
        if (isMutation) {
          const customHeader = req.headers["x-requested-with"] || req.headers["x-forgestudio-client"];
          const origin = req.headers.origin || req.headers.referer;
          if (!customHeader && !origin) {
            return res.status(403).json({
              success: false,
              error: {
                code: "CSRF_VERIFICATION_FAILED",
                message: "CSRF protection: Custom client header or valid Origin required for session mutation.",
              },
            });
          }
        }

        res.locals.user = cookieSession.user;
        res.locals.session = cookieSession;
        res.locals.authType = "SESSION";
        return next();
      }
    }

    // Fail closed on unauthenticated request
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

export function requireApiV1Scope(requiredScope: CanonicalScope | string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Fail closed if security context is missing
    if (!res.locals.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication context missing.",
        },
      });
    }

    // If authenticated via API Key, verify scopes
    if (res.locals.authType === "API_KEY" && res.locals.apiKey) {
      const rawScopes: string[] = Array.isArray(res.locals.apiKey.scopes)
        ? res.locals.apiKey.scopes
        : [];

      // Check for privileged wildcard scope - restrict wildcard to super admins only
      const userRole = res.locals.user.role;
      const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "PLATFORM_ADMIN";

      const hasDirectScope = rawScopes.includes(requiredScope);
      const hasWriteImpliesRead =
        requiredScope === "websites:read" && rawScopes.includes("websites:write");
      const hasWildcard = isSuperAdmin && (rawScopes.includes("*") || rawScopes.includes("all"));

      const isAuthorized = hasDirectScope || hasWriteImpliesRead || hasWildcard;

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `Insufficient permissions. Required scope: ${requiredScope}`,
          },
        });
      }
    }

    // Sessions and scoped API keys proceed to resource RBAC validation in controller
    next();
  };
}
