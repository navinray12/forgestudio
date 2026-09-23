/**
 * @file Authentication: HTTP handlers that translate requests into module operations and responses. File responsibility: auth controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../../platform/database/prisma.js";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from "../../platform/authentication/auth.js";

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
 * Logout.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 */
export async function logout(
  req: Request,
  res: Response
) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (token) {
      const tokenHash = hashToken(token);

      await prisma.session.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
}