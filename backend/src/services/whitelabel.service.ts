import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getUserSubscription } from "./subscription.service.js";

const db = prisma as any;

export interface WhiteLabelUpdateData {
  agencyName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  hideForgeBranding?: boolean;
  customCss?: string | null;
}

/**
 * Fetch agency branding config for user (Feature F-446)
 */
export async function getWhiteLabelConfig(userId: string) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "INVALID_USER_ID");
  }

  const sub = await getUserSubscription(userId);
  const isAgencyPlan = sub?.plan?.slug?.toLowerCase() === "agency";

  const config = await (db.whiteLabelConfig?.findUnique
    ? db.whiteLabelConfig.findUnique({
        where: { userId },
      })
    : (async () => {
        const rows: any[] = await prisma.$queryRaw`
          SELECT * FROM white_label_configs WHERE "userId" = ${userId}::uuid LIMIT 1
        `;
        return rows[0] || null;
      })());

  return {
    isAgencyPlan,
    config: config || {
      agencyName: null,
      logoUrl: null,
      faviconUrl: null,
      hideForgeBranding: false,
      customCss: null,
    },
  };
}

/**
 * Update agency branding (Feature F-446, gated by F-452)
 */
export async function updateWhiteLabelConfig(
  userId: string,
  data: WhiteLabelUpdateData
) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "INVALID_USER_ID");
  }

  // 1. Verify user is on Agency plan
  const sub = await getUserSubscription(userId);
  const planSlug = sub?.plan?.slug?.toLowerCase();

  if (planSlug !== "agency") {
    throw new AppError(
      "White-label branding and watermark removal are exclusive to the Agency plan. Please upgrade your subscription to access this feature.",
      403,
      "AGENCY_PLAN_REQUIRED"
    );
  }

  // 2. Upsert config
  let updatedConfig: any = null;

  if (db.whiteLabelConfig?.upsert) {
    updatedConfig = await db.whiteLabelConfig.upsert({
      where: { userId },
      update: {
        ...(data.agencyName !== undefined && { agencyName: data.agencyName }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.faviconUrl !== undefined && { faviconUrl: data.faviconUrl }),
        ...(data.hideForgeBranding !== undefined && {
          hideForgeBranding: Boolean(data.hideForgeBranding),
        }),
        ...(data.customCss !== undefined && { customCss: data.customCss }),
        updatedAt: new Date(),
      },
      create: {
        userId,
        agencyName: data.agencyName || null,
        logoUrl: data.logoUrl || null,
        faviconUrl: data.faviconUrl || null,
        hideForgeBranding: Boolean(data.hideForgeBranding),
        customCss: data.customCss || null,
      },
    });
  } else {
    const rows: any[] = await prisma.$queryRaw`
      INSERT INTO white_label_configs (id, "userId", "agencyName", "logoUrl", "faviconUrl", "hideForgeBranding", "customCss", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        ${userId}::uuid,
        ${data.agencyName || null},
        ${data.logoUrl || null},
        ${data.faviconUrl || null},
        ${Boolean(data.hideForgeBranding)},
        ${data.customCss || null},
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId") DO UPDATE SET
        "agencyName" = COALESCE(${data.agencyName}, white_label_configs."agencyName"),
        "logoUrl" = COALESCE(${data.logoUrl}, white_label_configs."logoUrl"),
        "faviconUrl" = COALESCE(${data.faviconUrl}, white_label_configs."faviconUrl"),
        "hideForgeBranding" = COALESCE(${data.hideForgeBranding}, white_label_configs."hideForgeBranding"),
        "customCss" = COALESCE(${data.customCss}, white_label_configs."customCss"),
        "updatedAt" = NOW()
      RETURNING *
    `;
    updatedConfig = rows[0];
  }

  return {
    success: true,
    message: "White-label configuration updated successfully",
    config: updatedConfig,
  };
}

/**
 * Resolve public branding for a website (runtime / export / render)
 * Returns whether Forge branding should be suppressed and agency replacement assets.
 */
export async function resolvePublicBranding(websiteId: string) {
  if (!websiteId) {
    return { hideForgeBranding: false, branding: null };
  }

  try {
    const website = await (db.website?.findUnique
      ? db.website.findUnique({
          where: { id: websiteId },
          select: { userId: true },
        })
      : (async () => {
          const rows: any[] = await prisma.$queryRaw`
            SELECT "userId" FROM websites WHERE id = ${websiteId}::uuid LIMIT 1
          `;
          return rows[0] || null;
        })());

    if (!website || !website.userId) {
      return { hideForgeBranding: false, branding: null };
    }

    const sub = await getUserSubscription(website.userId);
    if (sub?.plan?.slug?.toLowerCase() !== "agency") {
      return { hideForgeBranding: false, branding: null };
    }

    const config = await (db.whiteLabelConfig?.findUnique
      ? db.whiteLabelConfig.findUnique({
          where: { userId: website.userId },
        })
      : (async () => {
          const rows: any[] = await prisma.$queryRaw`
            SELECT * FROM white_label_configs WHERE "userId" = ${website.userId}::uuid LIMIT 1
          `;
          return rows[0] || null;
        })());

    if (!config || !config.hideForgeBranding) {
      return { hideForgeBranding: false, branding: null };
    }

    return {
      hideForgeBranding: true,
      branding: {
        agencyName: config.agencyName,
        logoUrl: config.logoUrl,
        faviconUrl: config.faviconUrl,
        customCss: config.customCss,
      },
    };
  } catch (error) {
    console.error("[WhiteLabel] Failed to resolve public branding:", error);
    return { hideForgeBranding: false, branding: null };
  }
}
