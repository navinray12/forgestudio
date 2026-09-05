import path from "path";
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";

import loginRoutes from "./routes/login.routes.js";
import signupRoutes from "./routes/signup.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
import meRoutes from "./routes/me.routes.js";
import authRoutes from "./routes/auth.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import websiteRoutes from "./routes/website.routes.js";
import teamRoutes from "./routes/team.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import apiKeysRoutes from "./routes/apiKeys.routes.js";
import developerRoutes from "./routes/developer.routes.js";
import composerRoutes from "./routes/composer.routes.js";
import customPostTypeRoutes from "./routes/customPostType.routes.js";
import customCodeRoutes from "./routes/customCode.routes.js";
import pluginCompatRoutes from "./routes/pluginCompat.routes.js";
import designNotesRoutes from "./routes/designNotes.routes.js";
import componentAccessRoutes from "./routes/componentAccess.routes.js";

import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

// =========================
// Security
// =========================

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Serve static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// =========================
// CORS
// =========================

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// =========================
// Body Parsers
// =========================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// Cookies
// =========================

app.use(cookieParser());

// =========================
// Passport
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
// Authentication Routes
// =========================

// Normal email/phone authentication
app.use("/api/v1/auth", loginRoutes);
app.use("/api/v1/auth", signupRoutes);

// Support tokens & temporary credentials (F-020)
app.use("/api/v1/auth", authRoutes);
app.use("/api/auth", authRoutes);

// Google + GitHub OAuth
app.use("/api/v1/auth", oauthRoutes);

// Current authenticated user
app.use("/api/v1/auth", meRoutes);

// =========================
// Subscription Routes
// =========================

app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

// =========================
// Website Routes
// =========================

app.use("/api/v1/websites", websiteRoutes);
app.use("/api/websites", websiteRoutes);

// =========================
// Upload Routes
// =========================

app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/uploads", uploadRoutes);

// =========================
// Team Routes
// =========================

app.use("/api/v1/teams", teamRoutes);
app.use("/api/teams", teamRoutes);

// =========================
// API Keys Routes (session-authenticated)
// =========================

app.use("/api/v1/apikeys", apiKeysRoutes);
app.use("/api/apikeys", apiKeysRoutes);

// =========================
// Developer API Routes (API key-authenticated)
// =========================

app.use("/api/v1/developer", developerRoutes);
app.use("/api/developer", developerRoutes);

// =========================
// Composer Routes
// =========================

app.use("/api/v1/composer", composerRoutes);
app.use("/api/composer", composerRoutes);

// =========================
// Custom Post Type Routes
// =========================

app.use("/api/v1/cpt", customPostTypeRoutes);
app.use("/api/cpt", customPostTypeRoutes);

// =========================
// Custom Code Routes
// =========================
app.use("/api/v1/custom-code", customCodeRoutes);
app.use("/api/custom-code", customCodeRoutes);

// =========================
// Design Notes (F-404) & Component Permissions (F-405)
// =========================
app.use("/api/v1/design-notes", designNotesRoutes);
app.use("/api/design-notes", designNotesRoutes);
app.use("/api/v1/component-access", componentAccessRoutes);
app.use("/api/component-access", componentAccessRoutes);

// =========================
// Global Error Handler
// =========================

// Keep this AFTER all routes
// Mount plugin routes explicitly
app.use("/api/v1/plugins", pluginCompatRoutes);
app.use("/api/plugins", pluginCompatRoutes);

app.use(errorMiddleware);

export default app;
