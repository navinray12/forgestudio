import type { Request, Response, NextFunction } from "express";
import {
  getWhiteLabelConfig,
  updateWhiteLabelConfig,
  resolvePublicBranding,
} from "../publishing/whitelabel.service.js";

/**
 * GET /api/v1/agency/whitelabel (Feature F-446)
 * Retrieve agency white-label configuration
 */
export async function getWhiteLabelHandler(
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

    const data = await getWhiteLabelConfig(user.id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v1/agency/whitelabel (Feature F-446, F-452)
 * Update agency white-label configuration (Agency plan gated)
 */
export async function updateWhiteLabelHandler(
  req: Request,
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

    const { agencyName, logoUrl, faviconUrl, hideForgeBranding, customCss } = req.body;

    const result = await updateWhiteLabelConfig(user.id, {
      agencyName,
      logoUrl,
      faviconUrl,
      hideForgeBranding,
      customCss,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/agency/whitelabel/resolve/:websiteId (Feature F-446)
 * Public resolver to determine if ForgeStudio branding watermark is suppressed
 */
export async function resolvePublicBrandingHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const websiteId = req.params.websiteId as string;
    if (!websiteId) {
      return res.status(400).json({
        success: false,
        message: "Website ID is required",
      });
    }

    const brandingInfo = await resolvePublicBranding(websiteId);

    return res.status(200).json({
      success: true,
      data: brandingInfo,
    });
  } catch (error) {
    next(error);
  }
}
