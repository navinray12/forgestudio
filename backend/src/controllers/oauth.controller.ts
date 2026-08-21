import type { Request, Response } from "express";
import {
  loginWithOAuth,
  type OAuthProfile,
} from "../services/oauth.service.js";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from "../config/auth.js";

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

    res.cookie(AUTH_COOKIE_NAME, result.sessionToken, AUTH_COOKIE_OPTIONS);

    return res.redirect(
      `${getFrontendUrl()}/login?oauth=google_success`
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

    res.cookie(AUTH_COOKIE_NAME, result.sessionToken, AUTH_COOKIE_OPTIONS);

    return res.redirect(
      `${getFrontendUrl()}/login?oauth=github_success`
    );
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);

    return res.redirect(
      `${getFrontendUrl()}/login?error=github_auth_failed`
    );
  }
}