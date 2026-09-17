import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { createSupportSession, revokeSupportSessions } from "../services/session.service.js";
import { prisma } from "../config/prisma.js";
import { hashSessionToken } from "../utils/session.js";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from "../config/auth.js";

const router = Router();

// Generate Temporary Support Token
router.post(
  "/support-token",
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const result = await createSupportSession(user.id, 120); // 2 hours
      return res.status(200).json({
        success: true,
        message: "Temporary support credentials generated successfully",
        data: {
          supportToken: result.supportToken,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login using Support Token
router.post(
  "/support-login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { supportToken } = req.body;
      if (!supportToken || typeof supportToken !== "string") {
        return res.status(400).json({
          success: false,
          message: "Support token is required",
        });
      }

      const tokenHash = hashSessionToken(supportToken.trim());
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        return res.status(401).json({
          success: false,
          message: "Invalid, expired, or revoked support token",
        });
      }

      res.cookie(AUTH_COOKIE_NAME, supportToken.trim(), AUTH_COOKIE_OPTIONS);

      return res.status(200).json({
        success: true,
        message: "Authenticated via temporary support credentials",
        data: {
          user: session.user,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Revoke Support Tokens
router.post(
  "/revoke-support-tokens",
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const user = res.locals.user;
      if (!user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      await revokeSupportSessions(user.id);

      return res.status(200).json({
        success: true,
        message: "All active support access tokens have been revoked",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
