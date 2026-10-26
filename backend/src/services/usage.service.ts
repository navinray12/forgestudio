import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { getUserSubscription } from "./subscription.service.js";
import { getUserLicenses } from "./license.service.js";

const db = prisma as any;

/**
 * Get comprehensive usage and telemetry summary for authenticated user (Features F-450, F-452)
 */
export async function getUserUsageSummary(userId: string) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "INVALID_USER_ID");
  }

  // 1. Fetch Subscription and Plan
  const subscription = await getUserSubscription(userId);
  const plan = subscription.plan || {
    name: "Free",
    slug: "free",
    websiteLimit: 1,
    storageLimitMb: 100,
    aiCreditLimit: 0,
    billingInterval: "monthly",
  };

  // 2. Compute Website Count
  let websiteCount = 0;
  try {
    if (db.website?.count) {
      websiteCount = await db.website.count({
        where: { userId },
      });
    } else {
      const rows: any[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM websites WHERE "userId" = ${userId}::uuid
      `;
      websiteCount = rows[0]?.count || 0;
    }
  } catch (err) {
    console.error("[UsageService] Failed to count websites:", err);
  }

  // 3. Compute Storage Used (from media_assets and media_optimization_assets)
  let totalStorageBytes = 0;
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT COALESCE(SUM("sizeBytes"), 0)::bigint as total
      FROM media_assets
      WHERE "userId" = ${userId}::uuid
    `;
    totalStorageBytes = Number(rows[0]?.total || 0);
  } catch (err) {
    // If media_assets query fails or has different schema
    console.warn("[UsageService] Could not aggregate media assets size:", err);
  }

  const storageUsedMb = parseFloat((totalStorageBytes / (1024 * 1024)).toFixed(2));
  const storageLimitMb = plan.storageLimitMb || 100;
  const storageRemainingMb = Math.max(0, parseFloat((storageLimitMb - storageUsedMb).toFixed(2)));
  const storagePercentage = Math.min(
    100,
    Math.round((storageUsedMb / Math.max(1, storageLimitMb)) * 100)
  );

  // 4. Optimization Credits (from users table)
  let optimizationCredits = 250;
  let ledgerTransactionsCount = 0;
  try {
    const userRow: any[] = await prisma.$queryRaw`
      SELECT "optimizationCredits" FROM users WHERE id = ${userId}::uuid LIMIT 1
    `;
    if (userRow.length > 0 && userRow[0].optimizationCredits !== undefined) {
      optimizationCredits = userRow[0].optimizationCredits;
    }

    const ledgerRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM optimization_credit_ledgers WHERE "userId" = ${userId}::uuid
    `;
    ledgerTransactionsCount = ledgerRows[0]?.count || 0;
  } catch (err) {
    console.warn("[UsageService] Could not fetch optimization credits:", err);
  }

  // 5. Licenses and Activations
  let userLicenses: any[] = [];
  try {
    userLicenses = await getUserLicenses(userId);
  } catch (err) {
    console.warn("[UsageService] Could not fetch user licenses:", err);
  }

  let totalProductionSitesActivated = 0;
  let totalLocalhostSitesActivated = 0;
  for (const lic of userLicenses) {
    totalProductionSitesActivated += lic.telemetry?.productionActivations || 0;
    totalLocalhostSitesActivated += lic.telemetry?.localhostActivations || 0;
  }

  return {
    success: true,
    user: {
      id: userId,
      optimizationCredits,
    },
    subscription: {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        price: plan.price,
        currency: plan.currency || "INR",
        billingInterval: plan.billingInterval || "monthly",
      },
    },
    quotas: {
      websites: {
        used: websiteCount,
        limit: plan.websiteLimit,
        remaining: Math.max(0, plan.websiteLimit - websiteCount),
        percentage: Math.min(
          100,
          Math.round((websiteCount / Math.max(1, plan.websiteLimit)) * 100)
        ),
        isLimitReached: websiteCount >= plan.websiteLimit,
      },
      storage: {
        usedBytes: totalStorageBytes,
        usedMb: storageUsedMb,
        limitMb: storageLimitMb,
        remainingMb: storageRemainingMb,
        percentage: storagePercentage,
        isLimitReached: storageUsedMb >= storageLimitMb,
      },
      aiCredits: {
        used: 0,
        limit: plan.aiCreditLimit || 0,
        remaining: plan.aiCreditLimit || 0,
        percentage: 0,
      },
      optimizationCredits: {
        remaining: optimizationCredits,
        ledgerTransactions: ledgerTransactionsCount,
      },
      licensing: {
        totalLicenses: userLicenses.length,
        activeLicenses: userLicenses.filter((l) => l.status === "ACTIVE").length,
        totalProductionSitesActivated,
        totalLocalhostSitesActivated,
        licenses: userLicenses,
      },
    },
  };
}

/**
 * Check if user has sufficient storage remaining
 */
export async function checkStorageLimit(userId: string, addedBytes: number = 0) {
  try {
    const summary = await getUserUsageSummary(userId);
    const usedBytes = summary.quotas.storage.usedBytes;
    const limitBytes = summary.quotas.storage.limitMb * 1024 * 1024;
    const wouldExceed = usedBytes + addedBytes > limitBytes;

    return {
      allowed: !wouldExceed,
      usedMb: summary.quotas.storage.usedMb,
      limitMb: summary.quotas.storage.limitMb,
      message: wouldExceed
        ? `Storage limit reached (${summary.quotas.storage.usedMb}MB / ${summary.quotas.storage.limitMb}MB). Upgrade your plan for more capacity.`
        : undefined,
    };
  } catch (error) {
    return { allowed: true, usedMb: 0, limitMb: 100 };
  }
}
