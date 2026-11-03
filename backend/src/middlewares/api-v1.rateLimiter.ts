import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";

// Ensure shared rate limit table exists in PostgreSQL
let tableInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureRateLimitTable() {
  if (tableInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "api_rate_limits" (
            "key" VARCHAR(255) PRIMARY KEY,
            "count" INT NOT NULL DEFAULT 1,
            "reset_at" TIMESTAMP WITH TIME ZONE NOT NULL
          );
          CREATE INDEX IF NOT EXISTS "idx_api_rate_limits_reset" ON "api_rate_limits" ("reset_at");
        `);
        tableInitialized = true;
      } catch (err) {
        console.warn("Failed to ensure api_rate_limits table:", err);
      }
    })();
  }
  await initPromise;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  errorMessage?: string;
  skipInTests?: boolean;
}

export function createApiV1RateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyPrefix = "api-v1",
    errorMessage = "Rate limit exceeded. Please try again later.",
    skipInTests = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // If explicitly configured to skip in test environment and not testing rate limiter
    if (skipInTests && process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) {
      return next();
    }

    // Ensure database table exists
    await ensureRateLimitTable();

    // Determine client identifier:
    // 1. Bearer API Key Hash (if authenticated by API Key)
    // 2. User ID (if authenticated by session)
    // 3. Fallback to IP address
    let clientKey = "";
    if (res.locals.apiKey?.id) {
      clientKey = `key:${res.locals.apiKey.id}`;
    } else if (res.locals.user?.id) {
      clientKey = `user:${res.locals.user.id}`;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const rawToken = authHeader.substring(7).trim();
        const hashed = crypto.createHash("sha256").update(rawToken).digest("hex").slice(0, 16);
        clientKey = `bearer:${hashed}`;
      } else {
        const ip =
          req.ip ||
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.socket.remoteAddress ||
          "unknown-ip";
        clientKey = `ip:${ip}`;
      }
    }

    const bucketKey = `${keyPrefix}:${clientKey}`;

    try {
      // Atomic upsert with Postgres:
      // If bucket doesn't exist or expired, reset to 1 and new reset_at.
      // If bucket exists and active, atomically increment count.
      const rows: any[] = await prisma.$queryRawUnsafe(`
        INSERT INTO "api_rate_limits" ("key", "count", "reset_at")
        VALUES (
          $1, 
          1, 
          NOW() + ($2 || ' milliseconds')::interval
        )
        ON CONFLICT ("key") DO UPDATE
        SET 
          "count" = CASE 
            WHEN "api_rate_limits"."reset_at" <= NOW() THEN 1 
            ELSE "api_rate_limits"."count" + 1 
          END,
          "reset_at" = CASE 
            WHEN "api_rate_limits"."reset_at" <= NOW() THEN NOW() + ($2 || ' milliseconds')::interval 
            ELSE "api_rate_limits"."reset_at" 
          END
        RETURNING "count", EXTRACT(EPOCH FROM ("reset_at" - NOW()))::int AS "ttl_seconds";
      `, bucketKey, windowMs);

      const record = rows[0] || { count: 1, ttl_seconds: Math.ceil(windowMs / 1000) };
      const currentCount = Number(record.count);
      const resetSeconds = Math.max(1, Number(record.ttl_seconds));
      const remaining = Math.max(0, max - currentCount);

      // Standard RFC RateLimit headers
      res.setHeader("RateLimit-Limit", max);
      res.setHeader("RateLimit-Remaining", remaining);
      res.setHeader("RateLimit-Reset", resetSeconds);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", resetSeconds);

      if (currentCount > max) {
        res.setHeader("Retry-After", resetSeconds);
        return res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: errorMessage,
            retryAfter: resetSeconds,
          },
        });
      }

      next();
    } catch (dbErr) {
      // Fail open gracefully or log if DB query fails to prevent whole API outage
      console.error("Distributed rate limiter error:", dbErr);
      next();
    }
  };
}

// Preset standard limiters
export const standardApiLimiter = createApiV1RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests/min per key/user
  keyPrefix: "api-v1:general",
  errorMessage: "Too many requests to Developer API. Quota is 120 requests per minute.",
  skipInTests: true,
});

export const mutationApiLimiter = createApiV1RateLimiter({
  windowMs: 60 * 1000,
  max: 30, // 30 mutations/min
  keyPrefix: "api-v1:mutation",
  errorMessage: "Too many write requests. Quota is 30 mutations per minute.",
  skipInTests: true,
});

export const publishApiLimiter = createApiV1RateLimiter({
  windowMs: 60 * 1000,
  max: 10, // 10 publishes/min
  keyPrefix: "api-v1:publish",
  errorMessage: "Publishing rate limit exceeded. Quota is 10 publish operations per minute.",
  skipInTests: true,
});

export const keyManagementLimiter = createApiV1RateLimiter({
  windowMs: 60 * 1000,
  max: 15, // 15 key operations/min
  keyPrefix: "api-v1:keys",
  errorMessage: "Too many API key management operations. Please wait a minute.",
  skipInTests: true,
});
