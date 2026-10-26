import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME } from "../config/auth.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function enforceTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || !req.cookies?.[AUTH_COOKIE_NAME]) return next();

  const configuredOrigin = process.env.FRONTEND_URL?.trim();
  if (!configuredOrigin || process.env.NODE_ENV !== "production") return next();

  const origin = req.get("origin");
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(configuredOrigin).origin;
  } catch {
    return res.status(500).json({ success: false, message: "Server origin configuration is invalid" });
  }

  if (!origin || origin !== expectedOrigin) {
    return res.status(403).json({
      success: false,
      error: { code: "UNTRUSTED_ORIGIN", message: "Request origin is not allowed" },
    });
  }
  next();
}
