/**
 * @file Authentication: request processing before the final handler. File responsibility: api key authentication middleware.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AppError } from "../../platform/http/app-error.js";
import { prisma as db } from "../../platform/database/prisma.js";

// Helper to hash the incoming bare token
/**
 * Hash Api Key.
 * @param token Token supplied to this operation; do not include secret tokens in logs.
 */
export function hashApiKey(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Require Api Scope.
 * @param requiredScope Required Scope supplied to this operation (type: string).
 */
export function requireApiScope(requiredScope: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                throw new AppError("Invalid or missing API key format.", 401, "UNAUTHORIZED");
            }

            const rawToken = authHeader.split(" ")[1];
            const hashedToken = hashApiKey(rawToken);

            const apiKeyRecord = await db.developerApiKey.findUnique({
                where: { tokenHash: hashedToken },
                include: { user: true }
            });

            if (!apiKeyRecord) {
                throw new AppError("Invalid API key.", 401, "UNAUTHORIZED");
            }

            if (apiKeyRecord.revokedAt) {
                throw new AppError("API key has been revoked.", 401, "UNAUTHORIZED");
            }

            const scopes = (apiKeyRecord.scopes as string[]) || [];
            if (!scopes.includes(requiredScope)) {
                throw new AppError(`Insufficient permissions. Required scope: ${requiredScope}`, 403, "FORBIDDEN");
            }

            // Update last used asynchronously without blocking request
            db.developerApiKey.update({
                where: { id: apiKeyRecord.id },
                data: { lastUsedAt: new Date() }
            }).catch((e: any) => console.error("Failed to track lastUsedAt API KEY:", e));

            // Set user on response locals so standard website controllers can reuse ownership validation smoothly!
            res.locals.user = apiKeyRecord.user;
            res.locals.apiKey = apiKeyRecord; // Track the current API key accessing it

            next();
        } catch (error) {
            next(error);
        }
    };
}
