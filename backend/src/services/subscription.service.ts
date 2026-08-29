import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// Helper alias for prisma client model access
const db = prisma as any;

const DEFAULT_FREE_PLAN_FALLBACK = {
  id: "free",
  name: "Free",
  slug: "free",
  price: 0,
  currency: "INR",
  billingInterval: "monthly",
  websiteLimit: 1,
  storageLimitMb: 100,
  aiCreditLimit: 0,
  features: [
    "1 Website",
    "Basic widgets",
    "Basic templates",
    "Basic responsive editing",
    "Basic styling",
    "Basic project saving",
    "Preview",
    "Basic HTML/CSS export",
  ],
};

/**
 * Get all active subscription plans from PostgreSQL
 */
export async function getAllActivePlans() {
  try {
    if (db?.subscriptionPlan?.findMany) {
      const plans = await db.subscriptionPlan.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          price: "asc",
        },
      });

      if (plans && plans.length > 0) {
        return plans;
      }
    }

    // Raw SQL fallback for Prisma 7 / direct DB query
    const rawPlans: any[] = await prisma.$queryRaw`
      SELECT id, name, slug, price, currency, "billingInterval", "websiteLimit", "storageLimitMb", "aiCreditLimit", features, "isActive"
      FROM subscription_plans
      WHERE "isActive" = true
      ORDER BY price ASC
    `;

    return rawPlans || [];
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return [];
  }
}

/**
 * Get current user's subscription (automatically assigns FREE plan if missing)
 */
export async function getUserSubscription(userId: string) {
  try {
    if (db?.userSubscription?.findUnique) {
      let userSub = await db.userSubscription.findUnique({
        where: {
          userId,
        },
        include: {
          plan: true,
        },
      });

      if (userSub) {
        return userSub;
      }
    }

    // Raw SQL lookup
    const rawSubs: any[] = await prisma.$queryRaw`
      SELECT s.id, s."userId", s."planId", s.status, s."currentPeriodStart", s."currentPeriodEnd",
             p.id as "plan_id", p.name as "plan_name", p.slug as "plan_slug", p.price as "plan_price",
             p.currency as "plan_currency", p."billingInterval" as "plan_billingInterval",
             p."websiteLimit" as "plan_websiteLimit", p."storageLimitMb" as "plan_storageLimitMb",
             p."aiCreditLimit" as "plan_aiCreditLimit", p.features as "plan_features"
      FROM user_subscriptions s
      JOIN subscription_plans p ON s."planId" = p.id
      WHERE s."userId" = ${userId}::uuid
      LIMIT 1
    `;

    if (rawSubs && rawSubs.length > 0) {
      const sub = rawSubs[0];
      return {
        id: sub.id,
        userId: sub.userId,
        planId: sub.planId,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        plan: {
          id: sub.plan_id,
          name: sub.plan_name,
          slug: sub.plan_slug,
          price: sub.plan_price,
          currency: sub.plan_currency,
          billingInterval: sub.plan_billingInterval,
          websiteLimit: sub.plan_websiteLimit,
          storageLimitMb: sub.plan_storageLimitMb,
          aiCreditLimit: sub.plan_aiCreditLimit,
          features: sub.plan_features,
        },
      };
    }

    // Automatically assign Free plan if user has no subscription record
    return await assignDefaultFreePlan(userId);
  } catch (error) {
    console.error("Error fetching user subscription:", error);
    return {
      id: "default-sub",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      plan: DEFAULT_FREE_PLAN_FALLBACK,
    };
  }
}

/**
 * Assign Free Plan to a user (default on signup)
 */
export async function assignDefaultFreePlan(userId: string) {
  try {
    return await changeUserPlan(userId, "free");
  } catch (error) {
    console.error("Error assigning default free plan:", error);
    return {
      id: "default-sub",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      plan: DEFAULT_FREE_PLAN_FALLBACK,
    };
  }
}

/**
 * Change or upgrade current user's subscription plan
 */
export async function changeUserPlan(userId: string, planSlug: string) {
  let plan: any = null;

  if (db?.subscriptionPlan?.findUnique) {
    plan = await db.subscriptionPlan.findUnique({
      where: {
        slug: planSlug.toLowerCase(),
      },
    });
  }

  if (!plan) {
    const plans: any[] = await prisma.$queryRaw`
      SELECT id, name, slug, price, currency, "billingInterval", "websiteLimit", "storageLimitMb", "aiCreditLimit", features, "isActive"
      FROM subscription_plans
      WHERE LOWER(slug) = ${planSlug.toLowerCase()}
      LIMIT 1
    `;
    if (plans && plans.length > 0) {
      plan = plans[0];
    }
  }

  if (!plan || !plan.isActive) {
    throw new AppError(
      `Invalid or inactive subscription plan: ${planSlug}`,
      400,
      "INVALID_PLAN"
    );
  }

  if (db?.userSubscription?.upsert) {
    const updatedSub = await db.userSubscription.upsert({
      where: {
        userId,
      },
      update: {
        planId: plan.id,
        status: "ACTIVE",
      },
      create: {
        userId,
        planId: plan.id,
        status: "ACTIVE",
      },
      include: {
        plan: true,
      },
    });

    return updatedSub;
  }

  // Raw SQL Upsert for user_subscriptions
  await prisma.$executeRawUnsafe(
    `INSERT INTO user_subscriptions (id, "userId", "planId", status, "currentPeriodStart", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'ACTIVE', NOW(), NOW(), NOW())
     ON CONFLICT ("userId") DO UPDATE SET
       "planId" = EXCLUDED."planId",
       status = 'ACTIVE',
       "updatedAt" = NOW()`,
    userId,
    plan.id
  );

  return {
    id: "sub-" + userId,
    userId,
    planId: plan.id,
    status: "ACTIVE",
    currentPeriodStart: new Date(),
    currentPeriodEnd: null,
    plan,
  };
}

/**
 * Server-side website creation limit checker
 */
export async function checkWebsiteLimit(userId: string, currentWebsiteCount: number = 0) {
  try {
    const sub = await getUserSubscription(userId);
    const limit = sub?.plan?.websiteLimit || 1;

    const allowed = currentWebsiteCount < limit;

    return {
      allowed,
      limit,
      current: currentWebsiteCount,
      message: allowed
        ? undefined
        : `Your current plan allows up to ${limit} website${limit === 1 ? "" : "s"}. Please upgrade your plan to create another website.`,
    };
  } catch (error) {
    return {
      allowed: true,
      limit: 1,
      current: currentWebsiteCount,
    };
  }
}
