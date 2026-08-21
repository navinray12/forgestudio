import type { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";

const COOKIE_NAME = "forge_session";

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
    const token = req.cookies?.[COOKIE_NAME];

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

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      path: "/",
    });

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