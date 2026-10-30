import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitBucket>();

// Periodic garbage collection to prevent unbounded memory growth
const GC_INTERVAL = 60 * 1000;
let gcTimer: NodeJS.Timeout | null = null;

function ensureGc() {
  if (gcTimer) return;
  gcTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of memoryStore.entries()) {
      if (bucket.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, GC_INTERVAL);
  if (gcTimer && typeof gcTimer === "object" && "unref" in gcTimer) {
    gcTimer.unref();
  }
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

  ensureGc();

  return (req: Request, res: Response, next: NextFunction) => {
    // If explicitly configured to skip in test environment and not testing rate limiter
    if (skipInTests && process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) {
      return next();
    }

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
    const now = Date.now();
    let bucket = memoryStore.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 1,
        resetAt: now + windowMs,
      };
      memoryStore.set(bucketKey, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    // Standard RFC RateLimit headers
    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetSeconds);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (bucket.count > max) {
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
