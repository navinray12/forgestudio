import type { Request, Response, NextFunction } from "express";
import {
  activateLicense,
  deactivateLicense,
  transferLicense,
  getUserLicenses,
  syncUserLicenseForPlan,
} from "../publishing/license.service.js";
import { getUserSubscription } from "../subscriptions/subscription.service.js";

/**
 * POST /api/v1/licenses/activate (Features F-440, F-441, F-443)
 * Activate a site domain under a license key
 */
export async function activateLicenseHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { licenseKey, siteUrl } = req.body;
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || req.ip;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: "License key is required",
      });
    }

    if (!siteUrl) {
      return res.status(400).json({
        success: false,
        message: "Site URL is required",
      });
    }

    const result = await activateLicense(licenseKey, siteUrl, ipAddress);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/licenses/deactivate (Feature F-442)
 * Deactivate a domain under a license key
 */
export async function deactivateLicenseHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { licenseKey, siteDomain } = req.body;

    if (!licenseKey || !siteDomain) {
      return res.status(400).json({
        success: false,
        message: "Both licenseKey and siteDomain are required",
      });
    }

    const result = await deactivateLicense(licenseKey, siteDomain);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/licenses/transfer (Features F-442, F-443)
 * Atomically transfer license from one domain to another
 */
export async function transferLicenseHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { licenseKey, fromDomain, toDomain, siteUrl } = req.body;
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || req.ip;

    if (!licenseKey || !fromDomain || !toDomain) {
      return res.status(400).json({
        success: false,
        message: "licenseKey, fromDomain, and toDomain are required",
      });
    }

    const result = await transferLicense(
      licenseKey,
      fromDomain,
      toDomain,
      siteUrl,
      ipAddress
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/licenses/my-licenses (Features F-441, F-447, F-448)
 * Returns authenticated user's licenses with active domain activations and quotas
 */
export async function getMyLicensesHandler(
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

    const licenses = await getUserLicenses(user.id);

    return res.status(200).json({
      success: true,
      data: {
        licenses,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/licenses/generate (Feature F-440, F-451)
 * Generate / sync license key for user's active plan
 */
export async function generateUserLicenseHandler(
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

    const sub = await getUserSubscription(user.id);
    const planSlug = sub?.plan?.slug || "free";
    const sitesLimit = sub?.plan?.websiteLimit || 1;

    const license = await syncUserLicenseForPlan(user.id, planSlug, sitesLimit);

    return res.status(201).json({
      success: true,
      message: "License provisioned successfully",
      data: {
        license,
      },
    });
  } catch (error) {
    next(error);
  }
}
