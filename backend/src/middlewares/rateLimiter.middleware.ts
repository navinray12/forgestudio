import { Request, Response, NextFunction } from "express";

const rateLimits = new Map<string, { requests: number, windowStart: number }>();

export const developerApiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    // Only rate limit explicit developer API calls (where our auth middleware injected scopes)
    if (!res.locals.isDeveloperApi) {
        return next();
    }

    // Default 60 requests per minute
    const limit = 60;
    const windowMs = 60 * 1000;
    const key = res.locals.user.id;

    const now = Date.now();
    let record = rateLimits.get(key);

    if (!record) {
        record = { requests: 1, windowStart: now };
        rateLimits.set(key, record);
        return next();
    }

    if (now - record.windowStart > windowMs) {
        // Reset window
        record.requests = 1;
        record.windowStart = now;
        return next();
    }

    if (record.requests >= limit) {
        return res.status(429).json({
            success: false,
            message: "Too Many Requests. Developer API is limited to 60 req/min."
        });
    }

    record.requests++;
    return next();
};
