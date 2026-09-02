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
<<<<<<< HEAD
import authRoutes from "./routes/auth.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import websiteRoutes from "./routes/website.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
=======
import subscriptionRoutes from "./routes/subscription.routes.js";
import websiteRoutes from "./routes/website.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import developerRoutes from "./routes/developer.routes.js";
import pluginRoutes from "./routes/plugin.routes.js";
import composerRoutes from "./routes/composer.routes.js";
>>>>>>> 8d95dec (Initial project code)

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

<<<<<<< HEAD
// =========================
// CORS
// =========================

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
=======
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed = allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:");

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
>>>>>>> 8d95dec (Initial project code)
    credentials: true,
  })
);

<<<<<<< HEAD
=======
// Request Logger
app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url} - Origin: ${req.headers.origin || "none"}`);
  next();
});

>>>>>>> 8d95dec (Initial project code)
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

<<<<<<< HEAD
// Support tokens & temporary credentials (F-020)
app.use("/api/v1/auth", authRoutes);
app.use("/api/auth", authRoutes);

=======
>>>>>>> 8d95dec (Initial project code)
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
<<<<<<< HEAD
=======
// Developer API (F-118)
// =========================

app.use("/api/v1/developer", developerRoutes);
app.use("/api/developer", developerRoutes);

// =========================
// Plugin Compatibility (F-120)
// =========================

app.use("/api/v1/plugins", pluginRoutes);
app.use("/api/plugins", pluginRoutes);

// =========================
// Composer Integration (F-122)
// =========================

app.use("/api/v1/composer", composerRoutes);
app.use("/api/composer", composerRoutes);

// =========================
>>>>>>> 8d95dec (Initial project code)
// Global Error Handler
// =========================

// Keep this AFTER all routes
app.use(errorMiddleware);

export default app;