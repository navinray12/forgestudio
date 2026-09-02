<<<<<<< HEAD
import type { Request, Response, NextFunction } from "express";
=======
import type { Request, Response } from "express";
>>>>>>> 8d95dec (Initial project code)
import {
  loginWithOAuth,
  type OAuthProfile,
} from "../services/oauth.service.js";
<<<<<<< HEAD
import { hashPassword } from "../utils/password.js";
import { generateAndSendOtp } from "../services/otp.service.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
=======
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from "../config/auth.js";
>>>>>>> 8d95dec (Initial project code)

const getFrontendUrl = () =>
  process.env.FRONTEND_URL || "http://localhost:5173";

export async function googleOAuthCallback(
  req: Request,
  res: Response
) {
  try {
    const profile = req.user as {
      id: string;
      displayName?: string;
      emails?: Array<{ value: string }>;
    };

    if (!profile?.id) {
      return res.redirect(
        `${getFrontendUrl()}/login?error=google_auth_failed`
      );
    }

    const oauthProfile: OAuthProfile = {
      provider: "GOOGLE",
      providerUserId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      fullName: profile.displayName ?? null,
    };

    const result = await loginWithOAuth(oauthProfile);

<<<<<<< HEAD
    const emailParam = encodeURIComponent(result.user.email || "");
    const phoneParam = encodeURIComponent(result.user.phone || "");

    if (result.requiresPassword) {
      return res.redirect(
        `${getFrontendUrl()}/login?oauth_create_password=true&userId=${result.user.id}&email=${emailParam}&phone=${phoneParam}`
      );
    }

    return res.redirect(
      `${getFrontendUrl()}/login?oauth_select=true&userId=${result.user.id}&email=${emailParam}&phone=${phoneParam}`
=======
    res.cookie(AUTH_COOKIE_NAME, result.sessionToken, AUTH_COOKIE_OPTIONS);

    return res.redirect(
      `${getFrontendUrl()}/login?oauth=google_success`
>>>>>>> 8d95dec (Initial project code)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);

    return res.redirect(
      `${getFrontendUrl()}/login?error=google_auth_failed`
    );
  }
}

export async function githubOAuthCallback(
  req: Request,
  res: Response
) {
  try {
    const profile = req.user as {
      id: string;
      displayName?: string;
      username?: string;
      emails?: Array<{ value: string }>;
    };

    if (!profile?.id) {
      return res.redirect(
        `${getFrontendUrl()}/login?error=github_auth_failed`
      );
    }

    const oauthProfile: OAuthProfile = {
      provider: "GITHUB",
      providerUserId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      fullName:
        profile.displayName ||
        profile.username ||
        null,
    };

    const result = await loginWithOAuth(oauthProfile);

<<<<<<< HEAD
    const emailParam = encodeURIComponent(result.user.email || "");
    const phoneParam = encodeURIComponent(result.user.phone || "");

    if (result.requiresPassword) {
      return res.redirect(
        `${getFrontendUrl()}/login?oauth_create_password=true&userId=${result.user.id}&email=${emailParam}&phone=${phoneParam}`
      );
    }

    return res.redirect(
      `${getFrontendUrl()}/login?oauth_select=true&userId=${result.user.id}&email=${emailParam}&phone=${phoneParam}`
=======
    res.cookie(AUTH_COOKIE_NAME, result.sessionToken, AUTH_COOKIE_OPTIONS);

    return res.redirect(
      `${getFrontendUrl()}/login?oauth=github_success`
>>>>>>> 8d95dec (Initial project code)
    );
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);

    return res.redirect(
      `${getFrontendUrl()}/login?error=github_auth_failed`
    );
  }
<<<<<<< HEAD
}

export async function createOAuthPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, password } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "User ID is required.",
        },
      });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Password must be at least 6 characters long.",
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User account not found.", 404, "USER_NOT_FOUND");
    }

    const passwordHash = await hashPassword(password.trim());

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    if (user.email) {
      await generateAndSendOtp({
        userId: user.id,
        email: user.email,
        purpose: "EMAIL_LOGIN",
        channel: "EMAIL",
      });
    }

    return res.status(200).json({
      success: true,
      requireOtp: true,
      message: "Password created successfully. Verification code sent to your email.",
      data: {
        userId: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
=======
>>>>>>> 8d95dec (Initial project code)
}