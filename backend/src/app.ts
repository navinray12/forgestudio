/**
 * @file Assemble Express middleware, application routes, readiness and error handling.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import path from "path";
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { jsonBodyParser } from "./platform/http/webhook-body.middleware.js";
import { checkDatabaseReadiness } from "./platform/database/database-readiness.js";
import passport from "./platform/authentication/passport.js";

import {
  loginRoutes,
  signupRoutes,
  authRoutes,
  oauthRoutes,
  meRoutes,
  subscriptionRoutes,
  websiteRoutes,
  teamRoutes,
  workspaceRoutes,
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
} from "./compatibility/routes.js";

import apiV1Routes from "./modules/public-api/api-v1.routes.js";
import websiteDraftRoutes from "./modules/pages/website-draft.routes.js";
import { errorMiddleware } from "./platform/http/error.middleware.js";

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

// The body parser preserves signed webhook bytes and applies request-size limits.
app.use(jsonBodyParser);
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(passport.initialize());

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API process is running",
  });
});

app.get("/api/v1/ready", async (_req: Request, res: Response) => {
  try {
    await checkDatabaseReadiness();
    res.status(200).json({ ready: true });
  } catch {
    res.status(503).json({ ready: false, code: "DATABASE_NOT_READY" });
  }
});

// Auth & Session
app.use("/api/v1/auth", loginRoutes);
app.use("/api/v1/auth", signupRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/v1/auth", oauthRoutes);
app.use("/api/v1/auth", meRoutes);

// Subscriptions
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

// Public API v1 Standardized Endpoints
app.use("/api/v1", apiV1Routes);

// Websites & Workspace
app.use('/api/v1/websites', websiteDraftRoutes);
app.use("/api/v1/websites", websiteRoutes);
app.use("/api/websites", websiteRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/workspaces", workspaceRoutes);

// Media & Uploads
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/uploads", uploadRoutes);

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



app.use("/api/v1/templates", templateRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/website-kits", templateRoutes);

// Forms: public submission + protected owner operations are enforced by the router.
app.use("/api/v1/forms", formRoutes);
app.use("/api/forms", formRoutes);

// Plugin compatibility and integrations.
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

app.use(errorMiddleware);

export default app;
