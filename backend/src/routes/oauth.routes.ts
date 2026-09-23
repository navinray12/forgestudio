import { Router } from "express";
import passport from "../config/passport.js";

import {
  googleOAuthCallback,
  githubOAuthCallback,
  createOAuthPasswordController,
} from "../controllers/oauth.controller.js";

import { logout } from "../controllers/auth.controller.js";

const router = Router();

// =========================
// Create Password for OAuth
// =========================

router.post(
  "/create-password",
  createOAuthPasswordController
);

// =========================
// Google OAuth
// =========================

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect:
      `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  googleOAuthCallback
);

// =========================
// GitHub OAuth
// =========================

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect:
      `${process.env.FRONTEND_URL}/login?error=github_auth_failed`,
  }),
  githubOAuthCallback
);

// =========================
// Logout
// =========================

router.post(
  "/logout",
  logout
);

export default router;