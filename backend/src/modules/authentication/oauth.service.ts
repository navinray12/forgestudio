/**
 * @file Authentication: business operations and coordination with persistence or external services. File responsibility: oauth service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import crypto from "crypto";
import { prisma } from "../../platform/database/prisma.js";
import { assignDefaultFreePlan } from "../subscriptions/subscription.service.js";

export type OAuthProvider = "GOOGLE" | "GITHUB";

export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  fullName: string | null;
}

const SESSION_DURATION_DAYS = 30;

/**
 * Generate Session Token.
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash Token.
 * @param token Token supplied to this operation; do not include secret tokens in logs.
 */
function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * Login With O Auth.
 * @param profile Profile supplied to this operation (type: OAuthProfile).
 */
export async function loginWithOAuth(
  profile: OAuthProfile
) {
  // --------------------------------------------------
  // 1. Check existing OAuth identity
  // --------------------------------------------------

  const existingIdentity = await prisma.identity.findUnique({
    where: {
      provider_providerUserId: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      },
    },
    include: {
      user: true,
    },
  });

  let user;

  // --------------------------------------------------
  // 2. Existing OAuth account
  // --------------------------------------------------

  if (existingIdentity) {
    user = existingIdentity.user;
  }

  // --------------------------------------------------
  // 3. No OAuth identity → try email
  // --------------------------------------------------

  if (!user && profile.email) {
    user = await prisma.user.findUnique({
      where: {
        email: profile.email,
      },
    });
  }

  // --------------------------------------------------
  // 4. Create new user if necessary
  // --------------------------------------------------

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        fullName: profile.fullName,
        emailVerified: Boolean(profile.email),
        verificationMethod:
          profile.provider === "GITHUB"
            ? "GITHUB"
            : "EMAIL",
      },
    });

    try {
      await assignDefaultFreePlan(user.id);
    } catch (err) {
      console.error("Could not assign default free plan for OAuth user:", err);
    }
  }

  // --------------------------------------------------
  // 5. Create OAuth identity if not already linked
  // --------------------------------------------------

  if (!existingIdentity) {
    await prisma.identity.create({
      data: {
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
      },
    });
  }

  // --------------------------------------------------
  // 6. Update last login
  // --------------------------------------------------

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  // --------------------------------------------------
  // 6. Return user and requiresPassword flag (session created after mandatory password & OTP)
  // --------------------------------------------------

  const requiresPassword = !user.passwordHash;

  return {
    user,
    requiresPassword,
  };
}