import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AUTH_COOKIE_NAME } from "../config/auth.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (typeof token !== "string" || !token) return res.status(401).json({ success: false, message: "Authentication required" });
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return res.status(401).json({ success: false, message: "Session is invalid or expired" });
    }
    // A valid cookie must not keep a suspended or deleted account active.
    if (session.user.status !== "ACTIVE") return res.status(403).json({ success: false, message: "Account is not active" });
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    res.locals.user = session.user;
    res.locals.session = session;
    (req as Request & { user: typeof session.user }).user = session.user;
    next();
  } catch (error) { next(error); }
}

export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user ?? (req as Request & { user?: { role: string } }).user;
    if (!user) return res.status(401).json({ success: false, message: "Authentication required" });
    if (!roles.includes(user.role)) return res.status(403).json({ success: false, error: { code: "FORBIDDEN", message: "You do not have access to this resource." } });
    next();
  };
}
