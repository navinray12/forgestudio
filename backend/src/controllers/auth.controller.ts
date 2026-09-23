import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from "../config/auth.js";

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

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