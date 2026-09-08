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
  integrationRoutes
} from "./routes/index.js";

import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

// =========================
// Security & Static Files
// =========================

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// =========================
// CORS & Parsers
// =========================

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =========================
// Passport Authentication
// =========================

app.use(passport.initialize());

// =========================
// Health Check
// =========================

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
  });
});

// =========================
// API Route Endpoints
// =========================

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

// Websites & Workspace
app.use("/api/v1/websites", websiteRoutes);
app.use("/api/websites", websiteRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/teams", teamRoutes);

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

// Plugins & Integrations
app.use("/api/v1/plugins", pluginCompatRoutes);
app.use("/api/plugins", pluginCompatRoutes);


// =========================
// Global Error Handler
// =========================

app.use(errorMiddleware);

export default app;
