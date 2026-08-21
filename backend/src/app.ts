import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";

import loginRoutes from "./routes/login.routes.js";
import signupRoutes from "./routes/signup.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
import meRoutes from "./routes/me.routes.js";

import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

// =========================
// Security
// =========================

app.use(helmet());

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

// Google + GitHub OAuth
app.use("/api/v1/auth", oauthRoutes);

// Current authenticated user
app.use("/api/v1/auth", meRoutes);

// =========================
// Global Error Handler
// =========================

// Keep this AFTER all routes
app.use(errorMiddleware);

export default app;