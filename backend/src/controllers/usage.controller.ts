import type { Request, Response, NextFunction } from "express";
import { getUserUsageSummary } from "../services/usage.service.js";

/**
 * GET /api/v1/users/me/usage (Features F-450, F-452)
 * Centralized telemetry and quota usage breakdown
 */
export async function getMyUsageHandler(
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

    const usage = await getUserUsageSummary(user.id);

    return res.status(200).json(usage);
  } catch (error) {
    next(error);
  }
}
