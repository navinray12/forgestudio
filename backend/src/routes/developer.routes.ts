import { Router } from "express";
import crypto from "crypto";
import { requireApiScope } from "../middlewares/auth.apiKey.middleware.js";
import {
    getDeveloperWebsitesHandler,
    getDeveloperWebsiteByIdHandler,
    updateDeveloperWebsiteHandler,
    publishDeveloperWebsiteHandler
} from "../controllers/developer.controller.js";

import { rateLimit } from "express-rate-limit"; // Common default rate limiter

// F-118 Rate limits
const generalApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: { code: "RATE_LIMITED", message: "Too many requests to Developer API, please try again later." } }
});

const publishApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: { code: "RATE_LIMITED", message: "Publishing rate limit exceeded, please try again later." } }
});

const router = Router();

// Add request IDs using imported crypto module (ESM-compatible)
router.use((_req, res, next) => {
    const requestId = "req_" + crypto.randomBytes(8).toString("hex");
    res.setHeader("X-Request-Id", requestId);
    res.locals.requestId = requestId;
    next();
});

router.use(generalApiLimiter);

// ----------------------------------------------------
// WEBSITE API endpoints
// ----------------------------------------------------
router.get("/websites", requireApiScope("websites:read"), getDeveloperWebsitesHandler);
router.get("/websites/:id", requireApiScope("websites:read"), getDeveloperWebsiteByIdHandler);
router.patch("/websites/:id", requireApiScope("websites:write"), updateDeveloperWebsiteHandler);

// ----------------------------------------------------
// PUBLISH API endpoints
// ----------------------------------------------------
router.post("/websites/:id/publish", publishApiLimiter, requireApiScope("publish:write"), publishDeveloperWebsiteHandler);

export default router;

