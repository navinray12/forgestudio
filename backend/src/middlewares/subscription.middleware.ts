import type { Request, Response, NextFunction } from "express";
import { checkWebsiteLimit } from "../services/subscription.service.js";

/**
 * Middleware to enforce plan website limits server-side
 */
export async function enforceWebsiteLimit(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Pass 0 or count of websites for user
    const limitCheck = await checkWebsiteLimit(user.id, 0);

    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: "WEBSITE_LIMIT_EXCEEDED",
          message: limitCheck.message,
          limit: limitCheck.limit,
          current: limitCheck.current,
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
