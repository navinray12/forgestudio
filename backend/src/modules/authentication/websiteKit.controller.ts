import type { Request, Response, NextFunction } from "express";
import { getWebsiteKits, applyWebsiteKit } from "../publishing/websiteKit.service.js";
import { AppError } from "../../platform/http/app-error.js";

/**
 * GET /api/v1/website-kits
 * Controller handler to list available website kits with optional filtering
 */
export async function getWebsiteKitsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { category, search, tag } = req.query;

    const categoryStr = typeof category === "string" ? category.trim() : undefined;
    const searchStr = typeof search === "string" ? search.trim() : undefined;
    const tagStr = typeof tag === "string" ? tag.trim() : undefined;

    // Validate query parameter lengths and guard against malicious inputs
    if (categoryStr && categoryStr.length > 100) {
      throw new AppError("Category filter exceeds maximum allowed length", 400, "INVALID_QUERY");
    }

    if (searchStr && searchStr.length > 100) {
      throw new AppError("Search query exceeds maximum allowed length", 400, "INVALID_QUERY");
    }

    if (tagStr && tagStr.length > 100) {
      throw new AppError("Tag filter exceeds maximum allowed length", 400, "INVALID_QUERY");
    }

    // Check for suspicious script payload tags in parameters
    const suspiciousPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    if (
      (categoryStr && suspiciousPattern.test(categoryStr)) ||
      (searchStr && suspiciousPattern.test(searchStr)) ||
      (tagStr && suspiciousPattern.test(tagStr))
    ) {
      throw new AppError("Invalid characters in query parameters", 400, "INVALID_QUERY");
    }

    const kits = await getWebsiteKits({
      category: categoryStr,
      search: searchStr,
      tag: tagStr,
    });

    return res.status(200).json({
      success: true,
      kits,
      data: {
        kits,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/website-kits/apply
 * Applies a Website Kit to a target website
 */
export async function applyWebsiteKitHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user || (req as any).user;
    if (!user || !user.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const { kitId, websiteId } = req.body || {};

    if (!kitId || typeof kitId !== "string" || !kitId.trim()) {
      throw new AppError("websiteId and kitId are required", 400, "BAD_REQUEST");
    }

    if (websiteId !== undefined && (typeof websiteId !== "string" || !websiteId.trim())) {
      throw new AppError("Invalid websiteId format", 400, "BAD_REQUEST");
    }

    const result = await applyWebsiteKit({
      userId: user.id,
      kitId: kitId.trim(),
      websiteId: websiteId ? websiteId.trim() : undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Website Kit applied successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
