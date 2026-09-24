import path from "path";
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";

import {
  loginRoutes,
  signupRoutes,
  authRoutes,
  oauthRoutes,
  meRoutes,
  subscriptionRoutes,
  websiteRoutes,
  teamRoutes,
  uploadRoutes,
  apiKeysRoutes,
  developerRoutes,
  composerRoutes,
  customPostTypeRoutes,
  customCodeRoutes,
  pluginCompatRoutes,
  designNotesRoutes,
  componentAccessRoutes,
  templateRoutes,
  formRoutes,
  integrationRoutes,
  sftpRoutes,
  pluginIntegrationRoutes,
  multisiteRoutes,
  designTokenRoutes,
  commerceRoutes,
  enterpriseMultisiteRoutes,
  licenseRoutes,
  whitelabelRoutes,
  usageRoutes,
  stagingRoutes,
  serverConfigRoutes,
  hostingRoutes,
} from "./routes/index.js";

import apiV1Routes from "./routes/api-v1.routes.js";
import operationsRoutes from "./routes/operations.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import blockPatternRoutes from "./routes/blockPattern.routes.js";
import blockTemplateRoutes from "./routes/blockTemplate.routes.js";
import { downloadWordPressPluginHandler } from "./controllers/wordpress.controller.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import mailerRoutes from "./routes/mailer.routes.js";
import { rateLimit } from "express-rate-limit";

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many authentication requests, please try again after 15 minutes.",
    },
  },
});

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(passport.initialize());


app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
  });
});

// Auth & Session Rate Limiting (F-439)
app.use("/api/v1/auth/login", authRateLimiter);
app.use("/api/auth/login", authRateLimiter);
app.use("/api/v1/auth/signup", authRateLimiter);
app.use("/api/auth/signup", authRateLimiter);

// Auth & Session
app.use("/api/v1/auth", loginRoutes);
app.use("/api/v1/auth", signupRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/v1/auth", oauthRoutes);
app.use("/api/v1/auth", meRoutes);

// Subscriptions, Licensing, Whitelabel & Usage (F-440 to F-452)
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/v1/licenses", licenseRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/v1/agency", whitelabelRoutes);
app.use("/api/agency", whitelabelRoutes);
app.use("/api/v1/users/me", usageRoutes);
app.use("/api/users/me", usageRoutes);

// Public API v1 Standardized Endpoints
app.use("/api/v1", apiV1Routes);

// Websites & Workspace
app.use("/api/v1/websites", websiteRoutes);
app.use("/api/websites", websiteRoutes);
app.use("/api/v1/websites", mailerRoutes);
app.use("/api/websites", mailerRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/teams", teamRoutes);

// Media & Uploads
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/v1/media", mediaRoutes);
app.use("/api/media", mediaRoutes);

// API Keys & Developer Access
app.use("/api/v1/apikeys", apiKeysRoutes);
app.use("/api/apikeys", apiKeysRoutes);
app.use("/api/v1/developer", developerRoutes);
app.use("/api/developer", developerRoutes);

// Editor & Custom Content
app.use("/api/v1/composer", composerRoutes);
app.use("/api/composer", composerRoutes);
app.use("/api/v1/cpt", customPostTypeRoutes);
app.use("/api/cpt", customPostTypeRoutes);
app.use("/api/v1/custom-code", customCodeRoutes);
app.use("/api/custom-code", customCodeRoutes);
app.use("/api/v1/design-notes", designNotesRoutes);
app.use("/api/design-notes", designNotesRoutes);
app.use("/api/v1/component-access", componentAccessRoutes);
app.use("/api/component-access", componentAccessRoutes);
app.use("/api/v1/blocks", blockPatternRoutes);
app.use("/api/blocks", blockPatternRoutes);
app.use("/api/v1/blocks", blockTemplateRoutes);
app.use("/api/blocks", blockTemplateRoutes);



app.use("/api/v1/templates", templateRoutes);
app.use("/api/templates", templateRoutes);

// Forms: public submission + protected owner operations are enforced by the router.
app.use("/api/v1/forms", formRoutes);
app.use("/api/forms", formRoutes);

// Plugin compatibility and integrations.
app.get("/api/v1/plugins/wordpress/download", downloadWordPressPluginHandler);
app.get("/api/plugins/wordpress/download", downloadWordPressPluginHandler);
app.use("/api/v1/plugins", pluginCompatRoutes);
app.use("/api/plugins", pluginCompatRoutes);
app.use("/api/v1/plugins-integration", pluginIntegrationRoutes);
app.use("/api/plugins-integration", pluginIntegrationRoutes);

// Deployment, multisite and external integrations.
app.use("/api/v1/sftp", sftpRoutes);
app.use("/api/sftp", sftpRoutes);
app.use("/api/v1/multisite", multisiteRoutes);
app.use("/api/multisite", multisiteRoutes);
app.use("/api/v1/integrations", integrationRoutes);
app.use("/api/integrations", integrationRoutes);

// Phase 17: Design System / Tokens
app.use("/api/v1/websites", designTokenRoutes);
app.use("/api/websites", designTokenRoutes);

// Phase 18: E-Commerce & WooCommerce Parity
app.use("/api/v1/websites", commerceRoutes);
app.use("/api/websites", commerceRoutes);

// Phase 19: Custom Domains & Backups
app.use("/api/v1/websites", enterpriseMultisiteRoutes);
app.use("/api/websites", enterpriseMultisiteRoutes);

// Staging Sandbox Environments
app.use("/api/v1/websites", stagingRoutes);
app.use("/api/websites", stagingRoutes);

// Server Resources & SFTP Configuration
app.use("/api/v1/websites", serverConfigRoutes);
app.use("/api/websites", serverConfigRoutes);

// Security, Privacy, Cache, Transfer & Hosting Logs
app.use("/api/v1/websites", hostingRoutes);
app.use("/api/websites", hostingRoutes);

// Audit Logs
app.use("/api/v1/audit-logs", auditLogRoutes);
app.use("/api/audit-logs", auditLogRoutes);

// Operations, Automation & Monitoring
app.use("/api/v1/operations", operationsRoutes);
app.use("/api/operations", operationsRoutes);
app.get("/api/health", (_req, res) => {
  res.redirect("/api/operations/health");
});

// Phase 20: Production Health & Canary
app.use("/api", healthRoutes);

app.use(errorMiddleware);

export default app;
