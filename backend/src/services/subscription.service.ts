import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { syncUserLicenseForPlan } from "./license.service.js";
import { markStorefrontOrderPaid, markStorefrontOrderFailed } from "./ecommerce/commerce.service.js";

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
 * Module 18.3: Subscription Lifecycle States & Valid Transitions
 *
 * Supported States:
 * - PENDING:   Awaiting initial checkout/payment confirmation.
 * - ACTIVE:    Subscription is paid, valid, and within active billing period.
 * - PAST_DUE:  Renewal payment attempt failed; grace period active.
 * - CANCELED:  User or webhook requested cancellation; paid access retained until currentPeriodEnd.
 * - EXPIRED:   Billing period ended without payment/renewal; downgraded to free tier (1 site).
 */
export const SubscriptionStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
  EXPIRED: "EXPIRED",
} as const;

export type SubscriptionStatusType = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const VALID_SUBSCRIPTION_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"],
  ACTIVE: ["ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"],
  PAST_DUE: ["ACTIVE", "CANCELED", "EXPIRED"],
  CANCELED: ["ACTIVE", "EXPIRED"], // ACTIVE allowed only via new verified payment
  EXPIRED: ["PENDING", "ACTIVE"],
};

export function isValidSubscriptionTransition(fromStatus: string, toStatus: string): boolean {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus.toUpperCase() === toStatus.toUpperCase()) return true;
  const allowed = VALID_SUBSCRIPTION_TRANSITIONS[fromStatus.toUpperCase()];
  return allowed ? allowed.includes(toStatus.toUpperCase()) : false;
}

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
             s."stripeCustomerId", s."stripeSubscriptionId",
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
      let sub = rawSubs[0];

      // Reconcile expired subscription if currentPeriodEnd <= now and not on free plan
      if (
        sub.currentPeriodEnd &&
        new Date(sub.currentPeriodEnd).getTime() <= Date.now() &&
        sub.plan_slug.toLowerCase() !== "free"
      ) {
        await processSubscriptionExpirations();
        const refreshed: any[] = await prisma.$queryRaw`
          SELECT s.id, s."userId", s."planId", s.status, s."currentPeriodStart", s."currentPeriodEnd",
                 s."stripeCustomerId", s."stripeSubscriptionId",
                 p.id as "plan_id", p.name as "plan_name", p.slug as "plan_slug", p.price as "plan_price",
                 p.currency as "plan_currency", p."billingInterval" as "plan_billingInterval",
                 p."websiteLimit" as "plan_websiteLimit", p."storageLimitMb" as "plan_storageLimitMb",
                 p."aiCreditLimit" as "plan_aiCreditLimit", p.features as "plan_features"
          FROM user_subscriptions s
          JOIN subscription_plans p ON s."planId" = p.id
          WHERE s."userId" = ${userId}::uuid
          LIMIT 1
        `;
        if (refreshed && refreshed.length > 0) {
          sub = refreshed[0];
        }
      }

      return {
        id: sub.id,
        userId: sub.userId,
        planId: sub.planId,
        status: sub.status,
        stripeCustomerId: sub.stripeCustomerId || null,
        stripeSubscriptionId: sub.stripeSubscriptionId || null,
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

  const isFreePlan = plan.slug.toLowerCase() === "free";
  const periodStart = new Date();
  const isAnnual =
    (plan.billingInterval || "").toLowerCase().includes("year") ||
    (plan.billingInterval || "").toLowerCase().includes("annual");
  const periodEnd = isFreePlan
    ? null
    : isAnnual
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Determine site limit based on plan
  const sitesLimit =
    plan.websiteLimit ||
    (plan.slug === "agency"
      ? 50
      : plan.slug === "professional"
      ? 10
      : plan.slug === "starter"
      ? 3
      : 1);

  // Atomic Transaction: License sync, Invoice creation, and Subscription upsert
  return await prisma.$transaction(async (tx: any) => {
    // 1. Sync / upgrade user's license atomically within transaction (F-444, F-445)
    const linkedLicense = await syncUserLicenseForPlan(userId, plan.slug, sitesLimit, isFreePlan, tx);

    // 2. Generate Billing Invoice record only for paid plans (F-444, F-445, F-449)
    let invoiceNumber: string | null = null;
    if (!isFreePlan && Number(plan.price) > 0) {
      invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const planName = plan.name || "Paid Plan";
      const description = `ForgeStudio ${planName} Subscription`;
      const amount = Number(plan.price) || 0;
      const currency = plan.currency || "INR";

      if (tx?.billingInvoice?.create) {
        await tx.billingInvoice.create({
          data: {
            userId,
            planId: plan.id,
            planName,
            description,
            amount,
            currency,
            status: "PAID",
            invoiceNumber,
            paymentProvider: "system",
            paymentReference: `sys_${Date.now()}`,
            taxAmount: 0,
            subtotal: amount,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd!,
          },
        });
      } else {
        await tx.$executeRawUnsafe(
          `INSERT INTO billing_invoices (id, "userId", "planId", "planName", description, amount, currency, status, "invoiceNumber", "paymentProvider", "paymentReference", "taxAmount", subtotal, "billingPeriodStart", "billingPeriodEnd", "createdAt")
           VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, 'PAID', $7, 'system', $8, 0, $9, $10, $11, NOW())`,
          userId,
          plan.id,
          planName,
          description,
          amount,
          currency,
          invoiceNumber,
          `sys_${Date.now()}`,
          amount,
          periodStart,
          periodEnd!
        );
      }
    }

    // 3. Upsert UserSubscription atomically within transaction
    if (tx?.userSubscription?.upsert) {
      const updatedSub = await tx.userSubscription.upsert({
        where: {
          userId,
        },
        update: {
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        create: {
          userId,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        include: {
          plan: true,
        },
      });

      return {
        ...updatedSub,
        license: linkedLicense,
        invoiceNumber,
      };
    }

    // Raw SQL Upsert within transaction
    await tx.$executeRawUnsafe(
      `INSERT INTO user_subscriptions (id, "userId", "planId", status, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'ACTIVE', $3, $4, NOW(), NOW())
       ON CONFLICT ("userId") DO UPDATE SET
         "planId" = EXCLUDED."planId",
         status = 'ACTIVE',
         "currentPeriodStart" = EXCLUDED."currentPeriodStart",
         "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
         "updatedAt" = NOW()`,
      userId,
      plan.id,
      periodStart,
      periodEnd
    );

    return {
      id: "sub-" + userId,
      userId,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      plan,
      license: linkedLicense,
      invoiceNumber,
    };
  });
}

/**
 * Cancel user's subscription (Feature F-449)
 * Supports graceful cancellation (access retained until currentPeriodEnd) or immediate cancellation
 */
export async function cancelSubscription(
  userId: string,
  options?: { immediate?: boolean }
) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "INVALID_USER_ID");
  }

  const currentSub = await getUserSubscription(userId);

  if (!isValidSubscriptionTransition(currentSub.status, "CANCELED")) {
    throw new AppError(
      `Cannot cancel subscription with status ${currentSub.status}`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const immediate = options?.immediate === true;

  if (immediate) {
    let freePlan: any = null;
    const plans: any[] = await prisma.$queryRaw`
      SELECT id, name, slug, price, currency, "billingInterval", "websiteLimit", "storageLimitMb", "aiCreditLimit", features, "isActive"
      FROM subscription_plans
      WHERE LOWER(slug) = 'free'
      LIMIT 1
    `;
    if (plans && plans.length > 0) freePlan = plans[0];

    await prisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(
        `UPDATE user_subscriptions
         SET "planId" = $1::uuid,
             status = 'CANCELED',
             "currentPeriodEnd" = NULL,
             "updatedAt" = NOW()
         WHERE "userId" = $2::uuid`,
        freePlan?.id || currentSub.plan.id,
        userId
      );
      await syncUserLicenseForPlan(userId, "free", 1, true, tx);
    });

    return {
      success: true,
      message: "Subscription cancelled immediately. Plan downgraded to Free.",
      subscription: {
        ...currentSub,
        status: "CANCELED",
        currentPeriodEnd: null,
      },
    };
  }

  await prisma.$executeRawUnsafe(
    `UPDATE user_subscriptions SET status = 'CANCELED', "updatedAt" = NOW() WHERE "userId" = $1::uuid`,
    userId
  );

  return {
    success: true,
    message: "Subscription cancelled successfully. You will retain access until the end of your current billing period.",
    subscription: {
      ...currentSub,
      status: "CANCELED",
    },
  };
}

/**
 * HTML escaping utility to prevent XSS in generated invoice documents (Module 18.4)
 */
export function escapeHtml(str: any): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Get all billing invoices for a user (Features F-444, F-445, F-449, Module 18.4)
 */
export async function getUserInvoices(userId: string) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "INVALID_USER_ID");
  }

  const rows: any[] = await prisma.$queryRaw`
    SELECT
      i.id,
      i."userId",
      i."planId",
      COALESCE(i."planName", p.name, i."planId") as "planName",
      COALESCE(i.description, CONCAT('ForgeStudio ', COALESCE(p.name, 'Subscription'))) as description,
      i.amount,
      i.currency,
      i.status,
      i."invoiceNumber",
      COALESCE(i."paymentProvider", 'stripe') as "paymentProvider",
      i."paymentReference",
      COALESCE(i."taxAmount", 0) as "taxAmount",
      COALESCE(i.subtotal, i.amount) as subtotal,
      i."billingPeriodStart",
      i."billingPeriodEnd",
      i."createdAt"
    FROM billing_invoices i
    LEFT JOIN subscription_plans p ON i."planId"::text = p.id::text OR LOWER(i."planId") = LOWER(p.slug)
    WHERE i."userId" = ${userId}::uuid
    ORDER BY i."createdAt" DESC
  `;
  return rows || [];
}

/**
 * Get a specific billing invoice by ID or Invoice Number with ownership verification (Module 18.4)
 */
export async function getUserInvoiceById(userId: string, invoiceIdentifier: string, isAdmin: boolean = false) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "INVALID_USER_ID");
  }
  if (!invoiceIdentifier) {
    throw new AppError("Invoice ID is required", 400, "INVALID_INVOICE_ID");
  }

  let invoice: any = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceIdentifier);

  if (isUuid) {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        i.*,
        u."fullName" as "userFullName",
        u.email as "userEmail"
      FROM billing_invoices i
      LEFT JOIN users u ON i."userId" = u.id
      WHERE i.id = ${invoiceIdentifier}::uuid
      LIMIT 1
    `;
    if (rows && rows.length > 0) invoice = rows[0];
  }

  if (!invoice) {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        i.*,
        u."fullName" as "userFullName",
        u.email as "userEmail"
      FROM billing_invoices i
      LEFT JOIN users u ON i."userId" = u.id
      WHERE i."invoiceNumber" = ${invoiceIdentifier}
      LIMIT 1
    `;
    if (rows && rows.length > 0) invoice = rows[0];
  }

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  }

  // Authorization check: User can only view their own invoice unless Admin
  if (!isAdmin && invoice.userId !== userId) {
    throw new AppError("You do not have permission to view this invoice", 403, "FORBIDDEN");
  }

  // Plan info lookup if missing
  let plan: any = null;
  const planIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoice.planId);
  if (planIsUuid) {
    const pRows: any[] = await prisma.$queryRaw`
      SELECT name, slug, price, currency, "websiteLimit" FROM subscription_plans WHERE id = ${invoice.planId}::uuid LIMIT 1
    `;
    if (pRows && pRows.length > 0) plan = pRows[0];
  } else {
    const pRows: any[] = await prisma.$queryRaw`
      SELECT name, slug, price, currency, "websiteLimit" FROM subscription_plans WHERE LOWER(slug) = LOWER(${invoice.planId}) LIMIT 1
    `;
    if (pRows && pRows.length > 0) plan = pRows[0];
  }

  const planName = invoice.planName || plan?.name || (invoice.planId ? `${invoice.planId.charAt(0).toUpperCase() + invoice.planId.slice(1)} Plan` : "ForgeStudio Subscription");
  const description = invoice.description || (plan ? `ForgeStudio ${plan.name} Subscription (${plan.websiteLimit} Site${plan.websiteLimit === 1 ? '' : 's'})` : "ForgeStudio Subscription");

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    userId: invoice.userId,
    customer: {
      id: invoice.userId,
      name: invoice.userFullName || "Valued Customer",
      email: invoice.userEmail || "",
    },
    planId: invoice.planId,
    planName,
    description,
    amount: Number(invoice.amount) || 0,
    subtotal: invoice.subtotal != null ? Number(invoice.subtotal) : Number(invoice.amount) || 0,
    taxAmount: invoice.taxAmount != null ? Number(invoice.taxAmount) : 0,
    currency: (invoice.currency || "INR").toUpperCase(),
    status: invoice.status || "PAID",
    paymentProvider: invoice.paymentProvider || "stripe",
    paymentReference: invoice.paymentReference || null,
    billingPeriodStart: invoice.billingPeriodStart,
    billingPeriodEnd: invoice.billingPeriodEnd,
    createdAt: invoice.createdAt,
    issuer: {
      name: "ForgeStudio Technologies Inc.",
      tagline: "High-Performance Cloud Website Builder & CMS",
      website: "https://forgestudio.io",
      supportEmail: "billing@forgestudio.io",
      address: "100 Innovation Way, Suite 400, San Francisco, CA 94105",
    },
  };
}

/**
 * Generates secure, print-friendly HTML invoice document with XSS protection (Module 18.4)
 */
export function generateInvoiceHtml(invoice: any): string {
  const invNumber = escapeHtml(invoice.invoiceNumber);
  const customerName = escapeHtml(invoice.customer?.name || "Valued Customer");
  const customerEmail = escapeHtml(invoice.customer?.email || "");
  const customerId = escapeHtml(invoice.customer?.id || invoice.userId);
  const planName = escapeHtml(invoice.planName || "ForgeStudio Subscription");
  const description = escapeHtml(invoice.description || `${planName} Subscription`);
  const status = escapeHtml(invoice.status || "PAID");
  const provider = escapeHtml(invoice.paymentProvider || "Stripe");
  const reference = invoice.paymentReference ? escapeHtml(invoice.paymentReference) : null;
  const currency = escapeHtml(invoice.currency || "INR");
  const currencySymbol = currency === "INR" ? "&#8377;" : "$";
  const amountFormatted = Number(invoice.amount).toFixed(2);
  const subtotalFormatted = Number(invoice.subtotal || invoice.amount).toFixed(2);
  const taxFormatted = Number(invoice.taxAmount || 0).toFixed(2);

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const issueDate = formatDate(invoice.createdAt);
  const periodStart = formatDate(invoice.billingPeriodStart);
  const periodEnd = formatDate(invoice.billingPeriodEnd);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invNumber} - ForgeStudio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #0f172a;
      line-height: 1.5;
      padding: 30px 16px;
    }
    .no-print-bar {
      max-width: 800px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: background-color 0.15s ease;
      border: 1px solid transparent;
    }
    .btn-primary {
      background-color: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover {
      background-color: #1d4ed8;
    }
    .btn-secondary {
      background-color: #1e293b;
      color: #94a3b8;
      border-color: #334155;
    }
    .btn-secondary:hover {
      background-color: #334155;
      color: #ffffff;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      padding: 48px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 28px;
      margin-bottom: 28px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #2563eb;
    }
    .meta-row {
      font-size: 13px;
      color: #475569;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 9999px;
      margin-top: 6px;
    }
    .badge-paid {
      background-color: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .badge-other {
      background-color: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    .section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .detail-text {
      font-size: 14px;
      color: #1e293b;
    }
    .detail-bold {
      font-weight: 700;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background-color: #f8fafc;
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      text-align: left;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    th.text-right, td.text-right {
      text-align: right;
    }
    td {
      padding: 16px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
      color: #1e293b;
    }
    .summary-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 36px;
    }
    .summary-table {
      width: 320px;
    }
    .summary-table td {
      padding: 8px 12px;
      border: none;
    }
    .summary-total {
      border-top: 2px solid #e2e8f0 !important;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .summary-total td {
      padding-top: 12px;
    }
    .payment-info {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 36px;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    @media print {
      body {
        background-color: #ffffff !important;
        padding: 0 !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .invoice-card {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      @page {
        size: A4;
        margin: 1.5cm;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <button onclick="window.print()" class="btn btn-primary">
      🖨️ Print or Save as PDF
    </button>
    <button onclick="window.close()" class="btn btn-secondary">
      ✕ Close
    </button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand-title">ForgeStudio</div>
        <div class="brand-subtitle">High-Performance Cloud Website Builder & CMS</div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">Tax Invoice</div>
        <div class="meta-row"><strong>Invoice #:</strong> ${invNumber}</div>
        <div class="meta-row"><strong>Issue Date:</strong> ${issueDate}</div>
        <div>
          <span class="badge ${status === "PAID" ? "badge-paid" : "badge-other"}">${status}</span>
        </div>
      </div>
    </div>

    <div class="details-grid">
      <div>
        <div class="section-label">Billed To</div>
        <div class="detail-text detail-bold">${customerName}</div>
        <div class="detail-text">${customerEmail}</div>
        <div class="detail-text" style="font-size: 12px; color: #64748b; margin-top: 4px;">Account ID: ${customerId}</div>
      </div>
      <div>
        <div class="section-label">Billing Period</div>
        <div class="detail-text detail-bold">${periodStart} &ndash; ${periodEnd}</div>
        <div class="section-label" style="margin-top: 12px;">Issuer</div>
        <div class="detail-text">ForgeStudio Technologies Inc.</div>
        <div class="detail-text" style="font-size: 12px; color: #64748b;">billing@forgestudio.io &bull; https://forgestudio.io</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="width: 140px;">Billing Period</th>
          <th class="text-right" style="width: 120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="detail-bold">${planName}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${description}</div>
          </td>
          <td style="font-size: 13px; color: #475569;">
            ${periodStart}<br>&ndash; ${periodEnd}
          </td>
          <td class="text-right detail-bold">
            ${currencySymbol}${amountFormatted}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="summary-wrap">
      <table class="summary-table">
        <tbody>
          <tr>
            <td style="color: #64748b;">Subtotal:</td>
            <td class="text-right detail-bold">${currencySymbol}${subtotalFormatted}</td>
          </tr>
          ${Number(taxFormatted) > 0 ? `
          <tr>
            <td style="color: #64748b;">Tax:</td>
            <td class="text-right detail-bold">${currencySymbol}${taxFormatted}</td>
          </tr>
          ` : `
          <tr>
            <td style="color: #64748b;">Tax (0% / Inclusive):</td>
            <td class="text-right" style="color: #64748b;">${currencySymbol}0.00</td>
          </tr>
          `}
          <tr class="summary-total">
            <td>Total Paid:</td>
            <td class="text-right" style="color: #2563eb;">${currencySymbol}${amountFormatted} ${currency}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="payment-info">
      <div class="section-label" style="margin-bottom: 10px;">Payment Details</div>
      <div class="payment-grid">
        <div>
          <div style="font-size: 11px; color: #64748b;">Payment Method / Provider</div>
          <div class="detail-text detail-bold">${provider}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #64748b;">Payment Status</div>
          <div class="detail-text detail-bold" style="color: #15803d;">${status}</div>
        </div>
        ${reference ? `
        <div>
          <div style="font-size: 11px; color: #64748b;">Transaction Reference</div>
          <div class="detail-text detail-bold" style="font-family: monospace; font-size: 12px;">${reference}</div>
        </div>
        ` : ""}
      </div>
    </div>

    <div class="footer">
      <p>Thank you for using ForgeStudio! This document serves as an official receipt for your subscription payment.</p>
      <p style="margin-top: 4px;">For billing inquiries or enterprise support, please contact billing@forgestudio.io.</p>
    </div>
  </div>
</body>
</html>`;
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

/**
 * Validates a redirect URL against trusted origins to prevent open redirects.
 */
function validateRedirectUrl(urlStr: string | undefined, fallback: string): string {
  if (!urlStr) return fallback;
  try {
    const parsed = new URL(urlStr);
    const trustedHosts = ["localhost", "127.0.0.1"];
    if (process.env.APP_URL) {
      try {
        const appUrlObj = new URL(process.env.APP_URL);
        trustedHosts.push(appUrlObj.hostname);
      } catch {}
    }
    if (trustedHosts.includes(parsed.hostname)) {
      return urlStr;
    }
  } catch {}
  return fallback;
}

/**
 * Creates a secure checkout session for a paid plan.
 * Does NOT activate the plan or modify user subscriptions.
 */
export async function createSubscriptionCheckoutSession(
  userId: string,
  planSlug: string,
  redirects?: { successUrl?: string; cancelUrl?: string }
) {
  if (!userId) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }
  if (!planSlug || typeof planSlug !== "string") {
    throw new AppError("Valid planSlug is required", 400, "INVALID_PLAN_SLUG");
  }

  const cleanSlug = planSlug.toLowerCase().trim();
  if (cleanSlug === "free") {
    throw new AppError(
      "The free plan does not require checkout. Use the plan selection endpoint instead.",
      400,
      "FREE_PLAN_NO_CHECKOUT"
    );
  }

  // Look up plan
  let plan: any = null;
  if (db?.subscriptionPlan?.findUnique) {
    plan = await db.subscriptionPlan.findUnique({
      where: { slug: cleanSlug },
    });
  }
  if (!plan) {
    const plans: any[] = await prisma.$queryRaw`
      SELECT id, name, slug, price, currency, "billingInterval", "websiteLimit", "storageLimitMb", "aiCreditLimit", features, "isActive"
      FROM subscription_plans
      WHERE LOWER(slug) = ${cleanSlug}
      LIMIT 1
    `;
    if (plans && plans.length > 0) {
      plan = plans[0];
    }
  }

  if (!plan || !plan.isActive) {
    throw new AppError(`Invalid or inactive subscription plan: ${planSlug}`, 400, "INVALID_PLAN");
  }

  if (plan.price <= 0) {
    throw new AppError(
      "The free plan does not require checkout. Use the plan selection endpoint instead.",
      400,
      "FREE_PLAN_NO_CHECKOUT"
    );
  }

  // Look up user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true },
  });
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  // Resolve trusted redirect URLs
  const appBase = process.env.APP_URL || "http://localhost:5173";
  const defaultSuccess = `${appBase.replace(/\/$/, "")}/subscriptions?status=success&session_id={CHECKOUT_SESSION_ID}`;
  const defaultCancel = `${appBase.replace(/\/$/, "")}/subscriptions?status=cancelled`;

  const validatedSuccess = validateRedirectUrl(redirects?.successUrl, defaultSuccess);
  const validatedCancel = validateRedirectUrl(redirects?.cancelUrl, defaultCancel);

  // Check payment provider configuration
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new AppError(
      "Payment gateway is not configured on the server. Please contact support or configure payment credentials.",
      503,
      "PAYMENT_GATEWAY_NOT_CONFIGURED"
    );
  }

  const amountMinor = Math.round(Number(plan.price) * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new AppError("Invalid plan pricing configuration", 500, "INVALID_PRICE");
  }

  const isOneTime =
    (plan.billingInterval || "").toLowerCase() === "one_time" ||
    (plan.billingInterval || "").toLowerCase() === "once";
  const isAnnual =
    (plan.billingInterval || "").toLowerCase().includes("year") ||
    (plan.billingInterval || "").toLowerCase().includes("annual");
  const interval = isAnnual ? "year" : "month";

  // Reuse existing Stripe Customer ID if known to avoid creating duplicate customers
  const existingSubRows: any[] = await prisma.$queryRaw`
    SELECT "stripeCustomerId" FROM user_subscriptions WHERE "userId" = ${user.id}::uuid LIMIT 1
  `;
  const existingCustomerId = existingSubRows?.[0]?.stripeCustomerId;

  const form = new URLSearchParams({
    mode: isOneTime ? "payment" : "subscription",
    success_url: validatedSuccess,
    cancel_url: validatedCancel,
    client_reference_id: user.id,
    "line_items[0][price_data][currency]": (plan.currency || "INR").toLowerCase(),
    "line_items[0][price_data][product_data][name]": `${plan.name} Plan Subscription`,
    "line_items[0][price_data][unit_amount]": String(amountMinor),
    "line_items[0][quantity]": "1",
    "metadata[userId]": user.id,
    "metadata[planId]": plan.id,
    "metadata[planSlug]": plan.slug,
  });

  if (existingCustomerId) {
    form.append("customer", existingCustomerId);
  } else {
    form.append("customer_email", user.email || "");
  }

  if (!isOneTime) {
    form.append("line_items[0][price_data][recurring][interval]", interval);
    form.append("subscription_data[metadata][userId]", user.id);
    form.append("subscription_data[metadata][planId]", plan.id);
    form.append("subscription_data[metadata][planSlug]", plan.slug);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.id || !data?.url) {
    const errorMsg = data?.error?.message || `Payment gateway rejected checkout creation (${response.status})`;
    throw new AppError(errorMsg, 502, "CHECKOUT_CREATION_FAILED");
  }

  return {
    success: true,
    sessionId: data.id,
    checkoutUrl: data.url,
    planSlug: plan.slug,
    planName: plan.name,
    amount: plan.price,
    currency: plan.currency || "INR",
  };
}

/**
 * Verifies Stripe's webhook signature header against the raw request body.
 * Adheres strictly to the official Stripe webhook signing specification:
 * - Header format: t=timestamp,v1=signature[,v1=signature2]
 * - Signed payload: `${t}.${rawBody}`
 * - Comparison: timingSafeEqual HMAC-SHA256
 * - Timestamp tolerance: default 300 seconds (5 minutes) replay protection
 */
export function verifyStripeSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  secret: string | undefined,
  toleranceSeconds: number = 300
): boolean {
  if (!secret) {
    throw new AppError("Stripe webhook secret is not configured", 500, "MISSING_WEBHOOK_SECRET");
  }
  if (!signatureHeader || typeof signatureHeader !== "string") {
    throw new AppError("Missing stripe-signature header", 400, "MISSING_SIGNATURE");
  }

  // Parse header elements
  const elements = signatureHeader.split(",");
  let timestampStr: string | null = null;
  const signatures: string[] = [];

  for (const item of elements) {
    const [key, value] = item.trim().split("=");
    if (key === "t") {
      timestampStr = value;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!timestampStr) {
    throw new AppError("Malformed stripe-signature header: missing timestamp", 400, "INVALID_SIGNATURE_HEADER");
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    throw new AppError("Malformed stripe-signature header: invalid timestamp", 400, "INVALID_SIGNATURE_HEADER");
  }

  if (signatures.length === 0) {
    throw new AppError("Malformed stripe-signature header: missing v1 signature", 400, "INVALID_SIGNATURE_HEADER");
  }

  // Replay protection: check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    throw new AppError(
      `Webhook timestamp (${timestamp}) is outside tolerance window of ${toleranceSeconds}s (current time: ${now})`,
      400,
      "TIMESTAMP_OUT_OF_RANGE"
    );
  }

  const rawBodyString = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const signedPayload = `${timestampStr}.${rawBodyString}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  let matchFound = false;
  for (const sig of signatures) {
    try {
      const candidateBuffer = Buffer.from(sig, "hex");
      if (candidateBuffer.length === expectedBuffer.length) {
        if (crypto.timingSafeEqual(candidateBuffer, expectedBuffer)) {
          matchFound = true;
          break;
        }
      }
    } catch (_) {}
  }

  if (!matchFound) {
    throw new AppError("Invalid Stripe webhook signature", 400, "INVALID_SIGNATURE");
  }

  return true;
}

/**
 * Safely resolves and cross-validates user ownership for Stripe webhook events.
 * Priority:
 * 1. Stored Stripe Subscription ID mapping (authoritative)
 * 2. Stored Stripe Customer ID mapping
 * 3. Cross-validation: ensures customer and subscription IDs do not point to conflicting users.
 * 4. Validated fallback: metadata.userId or client_reference_id (must exist and not conflict)
 * 5. Validated fallback: customer_email (must exist and not conflict)
 */
export async function resolveUserForStripeEvent(params: {
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  metadataUserId?: string | null;
  customerEmail?: string | null;
}): Promise<{
  user: { id: string; email?: string | null } | null;
  mismatch?: boolean;
  reason?: string;
}> {
  const { stripeSubscriptionId, stripeCustomerId, metadataUserId, customerEmail } = params;

  let subUserRow: { userId: string; stripeCustomerId: string | null } | null = null;
  let custUserRow: { userId: string; stripeSubscriptionId: string | null } | null = null;

  if (stripeSubscriptionId) {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "userId", "stripeCustomerId" FROM user_subscriptions
      WHERE "stripeSubscriptionId" = ${stripeSubscriptionId}
      LIMIT 1
    `;
    if (rows && rows.length > 0) {
      subUserRow = rows[0];
    }
  }

  if (stripeCustomerId) {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "userId", "stripeSubscriptionId" FROM user_subscriptions
      WHERE "stripeCustomerId" = ${stripeCustomerId}
      LIMIT 1
    `;
    if (rows && rows.length > 0) {
      custUserRow = rows[0];
    }
  }

  // Cross-validation 1: Both IDs exist in DB but belong to different users -> Ownership mismatch!
  if (subUserRow && custUserRow) {
    if (subUserRow.userId !== custUserRow.userId) {
      return {
        user: null,
        mismatch: true,
        reason: `Ownership mismatch: subscription ${stripeSubscriptionId} belongs to user ${subUserRow.userId} but customer ${stripeCustomerId} belongs to user ${custUserRow.userId}`,
      };
    }
  }

  // If resolved via subscription ID
  if (subUserRow) {
    // If stripeCustomerId is present in event and belongs to a different user in DB, reject mismatch
    if (stripeCustomerId) {
      const conflictCust: any[] = await prisma.$queryRaw`
        SELECT "userId" FROM user_subscriptions
        WHERE "stripeCustomerId" = ${stripeCustomerId} AND "userId" != ${subUserRow.userId}::uuid
        LIMIT 1
      `;
      if (conflictCust && conflictCust.length > 0) {
        return {
          user: null,
          mismatch: true,
          reason: `Ownership mismatch: stripeCustomerId is already mapped to a different user`,
        };
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: subUserRow.userId },
      select: { id: true, email: true },
    });
    return { user };
  }

  // If resolved via customer ID
  if (custUserRow) {
    // If stripeSubscriptionId is present in event and belongs to a different user in DB, reject mismatch
    if (stripeSubscriptionId) {
      const conflictSub: any[] = await prisma.$queryRaw`
        SELECT "userId" FROM user_subscriptions
        WHERE "stripeSubscriptionId" = ${stripeSubscriptionId} AND "userId" != ${custUserRow.userId}::uuid
        LIMIT 1
      `;
      if (conflictSub && conflictSub.length > 0) {
        return {
          user: null,
          mismatch: true,
          reason: `Ownership mismatch: stripeSubscriptionId is already mapped to a different user`,
        };
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: custUserRow.userId },
      select: { id: true, email: true },
    });
    return { user };
  }

  // Fallback 1: metadata userId or client_reference_id
  if (metadataUserId) {
    const candidateUser = await prisma.user.findUnique({
      where: { id: metadataUserId },
      select: { id: true, email: true },
    });

    if (candidateUser) {
      // Validate that incoming stripe IDs are not already mapped to another user
      if (stripeSubscriptionId) {
        const subConflict: any[] = await prisma.$queryRaw`
          SELECT "userId" FROM user_subscriptions
          WHERE "stripeSubscriptionId" = ${stripeSubscriptionId} AND "userId" != ${candidateUser.id}::uuid
          LIMIT 1
        `;
        if (subConflict && subConflict.length > 0) {
          return {
            user: null,
            mismatch: true,
            reason: `Metadata fallback rejected: stripeSubscriptionId is already mapped to a different user`,
          };
        }
      }

      if (stripeCustomerId) {
        const custConflict: any[] = await prisma.$queryRaw`
          SELECT "userId" FROM user_subscriptions
          WHERE "stripeCustomerId" = ${stripeCustomerId} AND "userId" != ${candidateUser.id}::uuid
          LIMIT 1
        `;
        if (custConflict && custConflict.length > 0) {
          return {
            user: null,
            mismatch: true,
            reason: `Metadata fallback rejected: stripeCustomerId is already mapped to a different user`,
          };
        }
      }

      return { user: candidateUser };
    }
  }

  // Fallback 2: customer_email
  if (customerEmail) {
    const candidateUser = await prisma.user.findUnique({
      where: { email: customerEmail },
      select: { id: true, email: true },
    });

    if (candidateUser) {
      if (stripeSubscriptionId) {
        const subConflict: any[] = await prisma.$queryRaw`
          SELECT "userId" FROM user_subscriptions
          WHERE "stripeSubscriptionId" = ${stripeSubscriptionId} AND "userId" != ${candidateUser.id}::uuid
          LIMIT 1
        `;
        if (subConflict && subConflict.length > 0) {
          return {
            user: null,
            mismatch: true,
            reason: `Email fallback rejected: stripeSubscriptionId is already mapped to a different user`,
          };
        }
      }

      if (stripeCustomerId) {
        const custConflict: any[] = await prisma.$queryRaw`
          SELECT "userId" FROM user_subscriptions
          WHERE "stripeCustomerId" = ${stripeCustomerId} AND "userId" != ${candidateUser.id}::uuid
          LIMIT 1
        `;
        if (custConflict && custConflict.length > 0) {
          return {
            user: null,
            mismatch: true,
            reason: `Email fallback rejected: stripeCustomerId is already mapped to a different user`,
          };
        }
      }

      return { user: candidateUser };
    }
  }

  return { user: null };
}

/**
 * Executes a webhook event transaction safely and idempotently under concurrent requests.
 * Catches unique constraint errors on payment_webhook_events caused by parallel duplicate deliveries.
 */
async function runIdempotentWebhookTransaction(
  eventId: string,
  fn: (tx: any) => Promise<void>
): Promise<{ alreadyProcessed: boolean }> {
  try {
    await prisma.$transaction(async (tx: any) => {
      await fn(tx);
    });
    return { alreadyProcessed: false };
  } catch (txErr: any) {
    const isUniqueConstraint =
      txErr?.code === "P2002" ||
      txErr?.code === "23505" ||
      String(txErr?.message || "").includes("payment_webhook_events") ||
      String(txErr?.message || "").includes("unique constraint");

    if (isUniqueConstraint) {
      const alreadyDone: any[] = await prisma.$queryRaw`
        SELECT id FROM payment_webhook_events WHERE "eventId" = ${eventId} LIMIT 1
      `;
      if (alreadyDone && alreadyDone.length > 0) {
        return { alreadyProcessed: true };
      }
    }
    throw txErr;
  }
}

/**
 * Processes an incoming Stripe payment webhook event safely and idempotently.
 * Enforces:
 * 1. Cryptographic HMAC signature check
 * 2. Successful payment status check (payment_status === "paid")
 * 3. Exact price and currency verification against server-side plan
 * 4. User and plan database consistency
 * 5. Idempotent deduplication via payment_webhook_events with concurrent conflict handling
 * 6. Cross-tenant ownership validation preventing cross-user corruption
 * 7. Out-of-order & stale event protection across all lifecycle events
 * 8. Atomic database transaction for subscription activation, invoice creation, and license syncing
 */
export async function handleStripePaymentWebhook(
  rawBody: Buffer | string,
  signatureHeader: string | undefined
) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  // 1. Verify Cryptographic Signature
  verifyStripeSignature(rawBody, signatureHeader, secret);

  // 2. Parse Event JSON safely
  let event: any;
  try {
    const rawBodyString = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
    event = JSON.parse(rawBodyString);
  } catch (parseErr) {
    throw new AppError("Malformed JSON payload in webhook body", 400, "INVALID_JSON");
  }

  if (!event || typeof event !== "object" || !event.type || !event.id) {
    throw new AppError("Invalid event object structure", 400, "INVALID_EVENT");
  }

  // 3. Process supported lifecycle webhook events
  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    if (!session || typeof session !== "object") {
      throw new AppError("Missing checkout session data in event", 400, "INVALID_EVENT_DATA");
    }

    // Storefront Product Order Separation
    const isStorefrontOrder =
      session.metadata?.type === "storefront_order" ||
      (Boolean(session.metadata?.orderId) && Boolean(session.metadata?.websiteId));

    if (isStorefrontOrder) {
      if (session.payment_status !== "paid") {
        return {
          success: true,
          storefront: true,
          processed: false,
          message: `Storefront order checkout session payment status is not paid (${session.payment_status}).`,
        };
      }

      // Check Idempotency: Has this event or checkout session already been processed?
      const existingEvents: any[] = await prisma.$queryRaw`
        SELECT id, "eventId", "checkoutSessionId"
        FROM payment_webhook_events
        WHERE "eventId" = ${event.id}
           OR ("checkoutSessionId" IS NOT NULL AND "checkoutSessionId" = ${session.id})
        LIMIT 1
      `;

      if (existingEvents && existingEvents.length > 0) {
        return {
          success: true,
          storefront: true,
          processed: true,
          idempotent: true,
          message: "Storefront webhook event already processed (idempotent)",
        };
      }

      const websiteId = String(session.metadata?.websiteId || "");
      const orderId = String(session.metadata?.orderId || session.client_reference_id || "");

      const markResult = await markStorefrontOrderPaid(websiteId, orderId, session);

      await runIdempotentWebhookTransaction(event.id, async (tx: any) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO payment_webhook_events (id, "eventId", provider, "eventType", "checkoutSessionId", "userId", amount, currency, "createdAt")
           VALUES (gen_random_uuid(), $1, 'stripe', $2, $3, NULL, $4, $5, NOW())`,
          event.id,
          event.type,
          session.id,
          (Number(session.amount_total) || 0) / 100,
          (session.currency || "USD").toUpperCase()
        );
      });

      return {
        success: true,
        storefront: true,
        processed: true,
        orderId,
        alreadyPaid: markResult.alreadyPaid,
      };
    }

    // A. Verify Payment Status: Must be PAID
    if (session.payment_status !== "paid") {
      return {
        success: true,
        message: `Checkout session payment status is not paid (${session.payment_status}). Subscription not activated.`,
        processed: false,
        activated: false,
      };
    }

    // B. Check Idempotency: Has this event or checkout session already been processed?
    const existingEvents: any[] = await prisma.$queryRaw`
      SELECT id, "eventId", "checkoutSessionId"
      FROM payment_webhook_events
      WHERE "eventId" = ${event.id}
         OR ("checkoutSessionId" IS NOT NULL AND "checkoutSessionId" = ${session.id})
      LIMIT 1
    `;

    if (existingEvents && existingEvents.length > 0) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    // C. Extract customer and plan metadata
    const userId = session.metadata?.userId || session.client_reference_id;
    const planSlug = session.metadata?.planSlug;
    const planId = session.metadata?.planId;

    if (!userId || !planSlug) {
      throw new AppError(
        "Missing customer (userId) or plan (planSlug) metadata in checkout session",
        400,
        "MISSING_SESSION_METADATA"
      );
    }

    // Verify User exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new AppError("Target user for checkout session was not found", 404, "USER_NOT_FOUND");
    }

    // Verify Plan exists and is active
    let plan: any = null;
    if (db?.subscriptionPlan?.findUnique) {
      plan = await db.subscriptionPlan.findUnique({
        where: { slug: String(planSlug).toLowerCase() },
      });
    }
    if (!plan) {
      const plans: any[] = await prisma.$queryRaw`
        SELECT id, name, slug, price, currency, "billingInterval", "websiteLimit", "storageLimitMb", "aiCreditLimit", features, "isActive"
        FROM subscription_plans
        WHERE LOWER(slug) = ${String(planSlug).toLowerCase()}
        LIMIT 1
      `;
      if (plans && plans.length > 0) plan = plans[0];
    }

    if (!plan || !plan.isActive) {
      throw new AppError("Target plan for checkout session was not found or is inactive", 400, "INVALID_PLAN");
    }

    if (planId && plan.id !== planId) {
      throw new AppError("Plan ID mismatch in session metadata", 400, "PLAN_ID_MISMATCH");
    }

    // D. Verify Amount and Currency against server plan
    const expectedMinor = Math.round(Number(plan.price) * 100);
    const receivedAmount = session.amount_total ?? session.amount_subtotal;

    if (receivedAmount !== undefined && receivedAmount !== null && Number(receivedAmount) !== expectedMinor) {
      throw new AppError(
        `Payment amount mismatch: expected ${expectedMinor} (${plan.price}), received ${receivedAmount}`,
        400,
        "AMOUNT_MISMATCH"
      );
    }

    const receivedCurrency = (session.currency || "").toLowerCase();
    const expectedCurrency = (plan.currency || "INR").toLowerCase();
    if (receivedCurrency && receivedCurrency !== expectedCurrency) {
      throw new AppError(
        `Payment currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`,
        400,
        "CURRENCY_MISMATCH"
      );
    }

    // E. Out-of-order & Stale Event Protection
    const currentSubs: any[] = await prisma.$queryRaw`
      SELECT s.id, s.status, (EXTRACT(EPOCH FROM s."updatedAt") * 1000)::bigint AS "updatedAtMs"
      FROM user_subscriptions s WHERE s."userId" = ${user.id}::uuid LIMIT 1
    `;

    if (currentSubs && currentSubs.length > 0) {
      const currentSub = currentSubs[0];
      const eventTimeMs = event.created ? event.created * 1000 : Date.now();
      const subUpdatedMs = currentSub.updatedAtMs != null ? Number(currentSub.updatedAtMs) : 0;

      // If user explicitly cancelled or expired their plan AFTER this checkout event was created,
      // do not resurrect or overwrite the newer state!
      if (
        (currentSub.status === "CANCELED" || currentSub.status === "EXPIRED") &&
        subUpdatedMs > 0 &&
        eventTimeMs < subUpdatedMs - 15000
      ) {
        return {
          success: true,
          processed: true,
          stale: true,
          message: "Ignored stale event: subscription has a newer canceled/expired state",
        };
      }

      if (!isValidSubscriptionTransition(currentSub.status, "ACTIVE")) {
        throw new AppError(
          `Invalid subscription state transition from ${currentSub.status} to ACTIVE`,
          400,
          "INVALID_STATUS_TRANSITION"
        );
      }
    }

    // F. Cross-Tenant Ownership Verification for Stripe IDs
    const stripeCustomerId = typeof session.customer === "object" ? session.customer?.id : session.customer ? String(session.customer) : null;
    const stripeSubscriptionId = typeof session.subscription === "object" ? session.subscription?.id : session.subscription ? String(session.subscription) : null;

    if (stripeSubscriptionId) {
      const conflictSub: any[] = await prisma.$queryRaw`
        SELECT "userId" FROM user_subscriptions
        WHERE "stripeSubscriptionId" = ${stripeSubscriptionId} AND "userId" != ${user.id}::uuid
        LIMIT 1
      `;
      if (conflictSub && conflictSub.length > 0) {
        throw new AppError(
          "Stripe subscription ID is already mapped to another user",
          400,
          "SUBSCRIPTION_OWNERSHIP_MISMATCH"
        );
      }
    }

    if (stripeCustomerId) {
      const conflictCust: any[] = await prisma.$queryRaw`
        SELECT "userId" FROM user_subscriptions
        WHERE "stripeCustomerId" = ${stripeCustomerId} AND "userId" != ${user.id}::uuid
        LIMIT 1
      `;
      if (conflictCust && conflictCust.length > 0) {
        throw new AppError(
          "Stripe customer ID is already mapped to another user",
          400,
          "CUSTOMER_OWNERSHIP_MISMATCH"
        );
      }
    }

    // G. Atomic Database Transaction with Concurrent Idempotency
    const isAnnual =
      (plan.billingInterval || "").toLowerCase().includes("year") ||
      (plan.billingInterval || "").toLowerCase().includes("annual");

    let periodStart = new Date();
    let periodEnd = isAnnual
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const sessionPeriodStart = Number(
      session.lines?.data?.[0]?.period?.start ||
      session.subscription_data?.current_period_start ||
      session.period_start
    );
    const sessionPeriodEnd = Number(
      session.lines?.data?.[0]?.period?.end ||
      session.subscription_data?.current_period_end ||
      session.period_end
    );
    if (sessionPeriodStart && sessionPeriodEnd && !isNaN(sessionPeriodStart) && !isNaN(sessionPeriodEnd)) {
      periodStart = new Date(sessionPeriodStart * 1000);
      periodEnd = new Date(sessionPeriodEnd * 1000);
    }
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const sitesLimit =
      plan.websiteLimit ||
      (plan.slug === "agency"
        ? 50
        : plan.slug === "professional"
        ? 10
        : plan.slug === "starter"
        ? 3
        : 1);

    const txResult = await runIdempotentWebhookTransaction(event.id, async (tx: any) => {
      // Record processed payment event
      await tx.$executeRawUnsafe(
        `INSERT INTO payment_webhook_events (id, "eventId", provider, "eventType", "checkoutSessionId", "userId", amount, currency, "createdAt")
         VALUES (gen_random_uuid(), $1, 'stripe', $2, $3, $4::uuid, $5, $6, NOW())`,
        event.id,
        event.type,
        session.id,
        user.id,
        Number(plan.price) || 0,
        plan.currency || "INR"
      );

      // Upsert UserSubscription to ACTIVE with verified Stripe identifiers
      await tx.$executeRawUnsafe(
        `INSERT INTO user_subscriptions (id, "userId", "planId", status, "stripeCustomerId", "stripeSubscriptionId", "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'ACTIVE', $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT ("userId") DO UPDATE SET
           "planId" = EXCLUDED."planId",
           status = 'ACTIVE',
           "stripeCustomerId" = COALESCE(EXCLUDED."stripeCustomerId", user_subscriptions."stripeCustomerId"),
           "stripeSubscriptionId" = COALESCE(EXCLUDED."stripeSubscriptionId", user_subscriptions."stripeSubscriptionId"),
           "currentPeriodStart" = EXCLUDED."currentPeriodStart",
           "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
           "updatedAt" = NOW()`,
        user.id,
        plan.id,
        stripeCustomerId,
        stripeSubscriptionId,
        periodStart,
        periodEnd
      );

      // Synchronize user license atomically within transaction
      await syncUserLicenseForPlan(user.id, plan.slug, sitesLimit, false, tx);

      // Create verified PAID BillingInvoice with duplicate prevention
      const paymentRef = session.payment_intent || session.id || null;
      let existingInvoice: any[] = [];
      if (paymentRef) {
        existingInvoice = await tx.$queryRaw`
          SELECT id FROM billing_invoices
          WHERE "invoiceNumber" = ${invoiceNumber}
             OR ("paymentReference" IS NOT NULL AND "paymentReference" = ${paymentRef})
          LIMIT 1
        `;
      }

      if (!existingInvoice || existingInvoice.length === 0) {
        const desc = `ForgeStudio ${plan.name} Subscription (${sitesLimit} Site${sitesLimit === 1 ? '' : 's'})`;
        const amount = Number(plan.price) || 0;
        const currency = (plan.currency || "INR").toUpperCase();
        const tax = session.total_details?.amount_tax != null ? session.total_details.amount_tax / 100 : 0;
        const subtotal = session.amount_subtotal != null ? session.amount_subtotal / 100 : amount;

        await tx.$executeRawUnsafe(
          `INSERT INTO billing_invoices (id, "userId", "planId", "planName", description, amount, currency, status, "invoiceNumber", "paymentProvider", "paymentReference", "taxAmount", subtotal, "billingPeriodStart", "billingPeriodEnd", "createdAt")
           VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, 'PAID', $7, 'stripe', $8, $9, $10, $11, $12, NOW())`,
          user.id,
          plan.id,
          plan.name,
          desc,
          amount,
          currency,
          invoiceNumber,
          paymentRef,
          tax,
          subtotal,
          periodStart,
          periodEnd
        );
      }
    });

    if (txResult.alreadyProcessed) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    return {
      success: true,
      processed: true,
      activated: true,
      plan: plan.slug,
      userId: user.id,
      invoiceNumber,
    };
  }

  // 3b. Storefront Checkout Expiration / Failure
  if (event.type === "checkout.session.expired") {
    const session = event.data?.object;
    const isStorefrontOrder =
      session?.metadata?.type === "storefront_order" ||
      (Boolean(session?.metadata?.orderId) && Boolean(session?.metadata?.websiteId));

    if (isStorefrontOrder) {
      const existingEvents: any[] = await prisma.$queryRaw`
        SELECT id FROM payment_webhook_events WHERE "eventId" = ${event.id} LIMIT 1
      `;
      if (existingEvents && existingEvents.length > 0) {
        return {
          success: true,
          storefront: true,
          processed: true,
          idempotent: true,
          message: "Storefront webhook event already processed (idempotent)",
        };
      }

      const websiteId = String(session.metadata?.websiteId || "");
      const orderId = String(session.metadata?.orderId || session.client_reference_id || "");

      await markStorefrontOrderFailed(websiteId, orderId, "checkout_session_expired");

      await runIdempotentWebhookTransaction(event.id, async (tx: any) => {
        await tx.$executeRawUnsafe(
          `INSERT INTO payment_webhook_events (id, "eventId", provider, "eventType", "checkoutSessionId", "userId", amount, currency, "createdAt")
           VALUES (gen_random_uuid(), $1, 'stripe', $2, $3, NULL, $4, $5, NOW())`,
          event.id,
          event.type,
          session.id,
          (Number(session.amount_total) || 0) / 100,
          (session.currency || "USD").toUpperCase()
        );
      });

      return {
        success: true,
        storefront: true,
        processed: true,
        expired: true,
        orderId,
      };
    }
  }

  // 4. Recurring Billing Renewal: invoice.payment_succeeded
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data?.object;
    if (!invoice || typeof invoice !== "object") {
      throw new AppError("Missing invoice data in event", 400, "INVALID_EVENT_DATA");
    }

    const existingEvents: any[] = await prisma.$queryRaw`
      SELECT id FROM payment_webhook_events WHERE "eventId" = ${event.id} LIMIT 1
    `;
    if (existingEvents && existingEvents.length > 0) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    const stripeSubId = typeof invoice.subscription === "object" ? invoice.subscription?.id : invoice.subscription ? String(invoice.subscription) : null;
    const stripeCustId = typeof invoice.customer === "object" ? invoice.customer?.id : invoice.customer ? String(invoice.customer) : null;

    const resolution = await resolveUserForStripeEvent({
      stripeSubscriptionId: stripeSubId,
      stripeCustomerId: stripeCustId,
      metadataUserId:
        invoice.subscription_details?.metadata?.userId ||
        invoice.metadata?.userId ||
        invoice.client_reference_id,
      customerEmail: invoice.customer_email,
    });

    if (resolution.mismatch) {
      return {
        success: true,
        processed: false,
        mismatch: true,
        message: `Ignored invoice event: ${resolution.reason}`,
      };
    }

    const user = resolution.user;
    if (!user) {
      return {
        success: true,
        message: "Ignored invoice event: No matching ForgeStudio user found",
        processed: false,
      };
    }

    const currentSubs: any[] = await prisma.$queryRaw`
      SELECT
        s.id,
        s.status,
        s."planId",
        (EXTRACT(EPOCH FROM s."updatedAt") * 1000)::bigint AS "updatedAtMs",
        p.slug as "plan_slug",
        p.price as "plan_price",
        p.currency as "plan_currency",
        p."websiteLimit" as "plan_websiteLimit",
        p."billingInterval" as "plan_billingInterval"
      FROM user_subscriptions s
      JOIN subscription_plans p ON s."planId" = p.id
      WHERE s."userId" = ${user.id}::uuid
      LIMIT 1
    `;

    if (!currentSubs || currentSubs.length === 0) {
      return {
        success: true,
        message: "Ignored invoice event: User has no active subscription record",
        processed: false,
      };
    }

    const currentSub = currentSubs[0];
    const eventTimeMs = event.created ? event.created * 1000 : Date.now();
    const subUpdatedMs = currentSub.updatedAtMs != null ? Number(currentSub.updatedAtMs) : 0;

    // Check stale event: if subscription was explicitly cancelled/expired after event creation, ignore
    if (
      (currentSub.status === "CANCELED" || currentSub.status === "EXPIRED") &&
      subUpdatedMs > 0 &&
      eventTimeMs < subUpdatedMs - 15000
    ) {
      return {
        success: true,
        processed: true,
        stale: true,
        message: "Ignored stale event: subscription has a newer canceled/expired state",
      };
    }

    if (!isValidSubscriptionTransition(currentSub.status, "ACTIVE")) {
      throw new AppError(
        `Cannot transition subscription from ${currentSub.status} to ACTIVE on renewal`,
        400,
        "INVALID_STATUS_TRANSITION"
      );
    }

    const isAnnual =
      (currentSub.plan_billingInterval || "").toLowerCase().includes("year") ||
      (currentSub.plan_billingInterval || "").toLowerCase().includes("annual");

    let periodStart = new Date();
    let periodEnd = isAnnual
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const linePeriod = invoice.lines?.data?.[0]?.period;
    const periodStartSec = Number(linePeriod?.start || invoice.period_start);
    const periodEndSec = Number(linePeriod?.end || invoice.period_end);

    if (periodStartSec && periodEndSec && !isNaN(periodStartSec) && !isNaN(periodEndSec)) {
      periodStart = new Date(periodStartSec * 1000);
      periodEnd = new Date(periodEndSec * 1000);
    }
    const invoiceNumber = invoice.number || `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const amountPaid = invoice.amount_paid != null ? invoice.amount_paid / 100 : Number(currentSub.plan_price);
    const currency = (invoice.currency || currentSub.plan_currency || "INR").toUpperCase();

    const txResult = await runIdempotentWebhookTransaction(event.id, async (tx: any) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO payment_webhook_events (id, "eventId", provider, "eventType", "checkoutSessionId", "userId", amount, currency, "createdAt")
         VALUES (gen_random_uuid(), $1, 'stripe', $2, $3, $4::uuid, $5, $6, NOW())`,
        event.id,
        event.type,
        invoice.id || `inv_${Date.now()}`,
        user.id,
        amountPaid,
        currency
      );

      await tx.$executeRawUnsafe(
        `UPDATE user_subscriptions
         SET status = 'ACTIVE',
             "stripeCustomerId" = COALESCE($1, user_subscriptions."stripeCustomerId"),
             "stripeSubscriptionId" = COALESCE($2, user_subscriptions."stripeSubscriptionId"),
             "currentPeriodStart" = $3,
             "currentPeriodEnd" = $4,
             "updatedAt" = NOW()
         WHERE "userId" = $5::uuid`,
        stripeCustId,
        stripeSubId,
        periodStart,
        periodEnd,
        user.id
      );

      const sitesLimit = currentSub.plan_websiteLimit || 1;
      await syncUserLicenseForPlan(user.id, currentSub.plan_slug, sitesLimit, false, tx);

      // Create verified PAID BillingInvoice with duplicate prevention
      const paymentRef = invoice.id || invoice.payment_intent || null;
      let existingInvoice: any[] = [];
      if (paymentRef) {
        existingInvoice = await tx.$queryRaw`
          SELECT id FROM billing_invoices
          WHERE "invoiceNumber" = ${invoiceNumber}
             OR ("paymentReference" IS NOT NULL AND "paymentReference" = ${paymentRef})
          LIMIT 1
        `;
      }

      if (!existingInvoice || existingInvoice.length === 0) {
        const planName = currentSub.plan_slug
          ? (currentSub.plan_slug.charAt(0).toUpperCase() + currentSub.plan_slug.slice(1) + " Plan")
          : "ForgeStudio Subscription";
        const desc = `ForgeStudio ${planName} Subscription Renewal`;
        const tax = invoice.tax != null ? invoice.tax / 100 : 0;
        const subtotal = invoice.subtotal != null ? invoice.subtotal / 100 : amountPaid;

        await tx.$executeRawUnsafe(
          `INSERT INTO billing_invoices (id, "userId", "planId", "planName", description, amount, currency, status, "invoiceNumber", "paymentProvider", "paymentReference", "taxAmount", subtotal, "billingPeriodStart", "billingPeriodEnd", "createdAt")
           VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, $6, 'PAID', $7, 'stripe', $8, $9, $10, $11, $12, NOW())`,
          user.id,
          currentSub.planId,
          planName,
          desc,
          amountPaid,
          currency,
          invoiceNumber,
          paymentRef,
          tax,
          subtotal,
          periodStart,
          periodEnd
        );
      }
    });

    if (txResult.alreadyProcessed) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    return {
      success: true,
      processed: true,
      activated: true,
      renewed: true,
      plan: currentSub.plan_slug,
      userId: user.id,
      invoiceNumber,
    };
  }

  // 5. Payment Failed: invoice.payment_failed
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data?.object;
    if (!invoice || typeof invoice !== "object") {
      throw new AppError("Missing invoice data in event", 400, "INVALID_EVENT_DATA");
    }

    const existingEvents: any[] = await prisma.$queryRaw`
      SELECT id FROM payment_webhook_events WHERE "eventId" = ${event.id} LIMIT 1
    `;
    if (existingEvents && existingEvents.length > 0) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    const stripeSubId = typeof invoice.subscription === "object" ? invoice.subscription?.id : invoice.subscription ? String(invoice.subscription) : null;
    const stripeCustId = typeof invoice.customer === "object" ? invoice.customer?.id : invoice.customer ? String(invoice.customer) : null;

    const resolution = await resolveUserForStripeEvent({
      stripeSubscriptionId: stripeSubId,
      stripeCustomerId: stripeCustId,
      metadataUserId:
        invoice.subscription_details?.metadata?.userId ||
        invoice.metadata?.userId ||
        invoice.client_reference_id,
      customerEmail: invoice.customer_email,
    });

    if (resolution.mismatch) {
      return {
        success: true,
        processed: false,
        mismatch: true,
        message: `Ignored failed invoice: ${resolution.reason}`,
      };
    }

    const user = resolution.user;
    if (!user) {
      return {
        success: true,
        message: "Ignored failed invoice: No matching ForgeStudio user found",
        processed: false,
      };
    }

    const currentSubs: any[] = await prisma.$queryRaw`
      SELECT s.id, s.status, (EXTRACT(EPOCH FROM s."updatedAt") * 1000)::bigint AS "updatedAtMs"
      FROM user_subscriptions s WHERE s."userId" = ${user.id}::uuid LIMIT 1
    `;

    if (!currentSubs || currentSubs.length === 0) {
      return { success: true, processed: false, message: "User has no subscription record" };
    }

    const currentSub = currentSubs[0];
    const eventTimeMs = event.created ? event.created * 1000 : Date.now();
    const subUpdatedMs = currentSub.updatedAtMs != null ? Number(currentSub.updatedAtMs) : 0;

    // Out-of-order protection: if user's subscription was updated AFTER this failed invoice was created, ignore
    if (subUpdatedMs > 0 && eventTimeMs < subUpdatedMs - 15000) {
      return {
        success: true,
        processed: true,
        stale: true,
        message: "Ignored stale failed invoice: subscription has a newer state",
      };
    }

    if (!isValidSubscriptionTransition(currentSub.status, "PAST_DUE")) {
      return {
        success: true,
        processed: false,
        message: `Ignored transition: cannot transition from ${currentSub.status} to PAST_DUE`,
      };
    }

    const txResult = await runIdempotentWebhookTransaction(event.id, async (tx: any) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO payment_webhook_events (id, "eventId", provider, "eventType", "checkoutSessionId", "userId", amount, currency, "createdAt")
         VALUES (gen_random_uuid(), $1, 'stripe', $2, $3, $4::uuid, $5, $6, NOW())`,
        event.id,
        event.type,
        invoice.id || `inv_fail_${Date.now()}`,
        user.id,
        invoice.amount_due != null ? invoice.amount_due / 100 : 0,
        (invoice.currency || "INR").toUpperCase()
      );

      await tx.$executeRawUnsafe(
        `UPDATE user_subscriptions
         SET status = 'PAST_DUE',
             "stripeCustomerId" = COALESCE($1, user_subscriptions."stripeCustomerId"),
             "stripeSubscriptionId" = COALESCE($2, user_subscriptions."stripeSubscriptionId"),
             "updatedAt" = NOW()
         WHERE "userId" = $3::uuid`,
        stripeCustId,
        stripeSubId,
        user.id
      );
    });

    if (txResult.alreadyProcessed) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    return {
      success: true,
      processed: true,
      activated: false,
      status: "PAST_DUE",
      userId: user.id,
    };
  }

  // 6. Subscription Deleted: customer.subscription.deleted
  if (event.type === "customer.subscription.deleted") {
    const stripeSub = event.data?.object;
    if (!stripeSub || typeof stripeSub !== "object") {
      throw new AppError("Missing subscription data in event", 400, "INVALID_EVENT_DATA");
    }

    const existingEvents: any[] = await prisma.$queryRaw`
      SELECT id FROM payment_webhook_events WHERE "eventId" = ${event.id} LIMIT 1
    `;
    if (existingEvents && existingEvents.length > 0) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    const stripeSubId = typeof stripeSub.id === "object" ? stripeSub.id?.id : stripeSub.id ? String(stripeSub.id) : null;
    const stripeCustId = typeof stripeSub.customer === "object" ? stripeSub.customer?.id : stripeSub.customer ? String(stripeSub.customer) : null;

    const resolution = await resolveUserForStripeEvent({
      stripeSubscriptionId: stripeSubId,
      stripeCustomerId: stripeCustId,
      metadataUserId: stripeSub.metadata?.userId || stripeSub.client_reference_id,
      customerEmail: stripeSub.customer_email,
    });

    if (resolution.mismatch) {
      return {
        success: true,
        processed: false,
        mismatch: true,
        message: `Ignored deletion event: ${resolution.reason}`,
      };
    }

    const user = resolution.user;
    if (!user) {
      return { success: true, processed: false, message: "No matching ForgeStudio user found" };
    }

    const currentSubs: any[] = await prisma.$queryRaw`
      SELECT s.id, s.status, s."planId", s."currentPeriodEnd",
             (EXTRACT(EPOCH FROM s."updatedAt") * 1000)::bigint AS "updatedAtMs"
      FROM user_subscriptions s WHERE s."userId" = ${user.id}::uuid LIMIT 1
    `;
    if (!currentSubs || currentSubs.length === 0) {
      return { success: true, processed: false };
    }

    const currentSub = currentSubs[0];
    const eventTimeMs = event.created ? event.created * 1000 : Date.now();
    const subUpdatedMs = currentSub.updatedAtMs != null ? Number(currentSub.updatedAtMs) : 0;

    // Out-of-order protection: if user's subscription was updated or activated AFTER this deletion event was created, ignore
    if (
      currentSub.status === "ACTIVE" &&
      subUpdatedMs > 0 &&
      eventTimeMs < subUpdatedMs - 15000
    ) {
      return {
        success: true,
        processed: true,
        stale: true,
        message: "Ignored stale deletion event: subscription has a newer active state",
      };
    }

    const periodEndPassed = currentSub.currentPeriodEnd && new Date(currentSub.currentPeriodEnd).getTime() <= Date.now();
    const newStatus = periodEndPassed ? "EXPIRED" : "CANCELED";

    const txResult = await runIdempotentWebhookTransaction(event.id, async (tx: any) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO payment_webhook_events (id, "eventId", provider, "eventType", "checkoutSessionId", "userId", amount, currency, "createdAt")
         VALUES (gen_random_uuid(), $1, 'stripe', $2, $3, $4::uuid, 0, 'INR', NOW())`,
        event.id,
        event.type,
        stripeSub.id || `sub_${Date.now()}`,
        user.id
      );

      if (periodEndPassed) {
        let freePlan: any = null;
        const plans: any[] = await prisma.$queryRaw`
          SELECT id FROM subscription_plans WHERE LOWER(slug) = 'free' LIMIT 1
        `;
        if (plans && plans.length > 0) freePlan = plans[0];

        await tx.$executeRawUnsafe(
          `UPDATE user_subscriptions
           SET "planId" = $1::uuid,
               status = 'EXPIRED',
               "currentPeriodEnd" = NULL,
               "updatedAt" = NOW()
           WHERE "userId" = $2::uuid`,
          freePlan ? freePlan.id : currentSub.planId,
          user.id
        );
        await syncUserLicenseForPlan(user.id, "free", 1, true, tx);
      } else {
        await tx.$executeRawUnsafe(
          `UPDATE user_subscriptions SET status = 'CANCELED', "updatedAt" = NOW() WHERE "userId" = $1::uuid`,
          user.id
        );
      }
    });

    if (txResult.alreadyProcessed) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    return {
      success: true,
      processed: true,
      status: newStatus,
      userId: user.id,
    };
  }

  // 7. Subscription Updated: customer.subscription.updated
  if (event.type === "customer.subscription.updated") {
    const stripeSub = event.data?.object;
    if (!stripeSub || typeof stripeSub !== "object") {
      throw new AppError("Missing subscription data in event", 400, "INVALID_EVENT_DATA");
    }

    const existingEvents: any[] = await prisma.$queryRaw`
      SELECT id FROM payment_webhook_events WHERE "eventId" = ${event.id} LIMIT 1
    `;
    if (existingEvents && existingEvents.length > 0) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    const stripeSubId = typeof stripeSub.id === "object" ? stripeSub.id?.id : stripeSub.id ? String(stripeSub.id) : null;
    const stripeCustId = typeof stripeSub.customer === "object" ? stripeSub.customer?.id : stripeSub.customer ? String(stripeSub.customer) : null;

    const resolution = await resolveUserForStripeEvent({
      stripeSubscriptionId: stripeSubId,
      stripeCustomerId: stripeCustId,
      metadataUserId: stripeSub.metadata?.userId || stripeSub.client_reference_id,
      customerEmail: stripeSub.customer_email,
    });

    if (resolution.mismatch) {
      return {
        success: true,
        processed: false,
        mismatch: true,
        message: `Ignored update event: ${resolution.reason}`,
      };
    }

    const user = resolution.user;
    if (!user) {
      return { success: true, processed: false, message: "No matching ForgeStudio user found" };
    }

    const currentSubs: any[] = await prisma.$queryRaw`
      SELECT s.id, s.status, s."planId",
             (EXTRACT(EPOCH FROM s."updatedAt") * 1000)::bigint AS "updatedAtMs"
      FROM user_subscriptions s WHERE s."userId" = ${user.id}::uuid LIMIT 1
    `;
    if (!currentSubs || currentSubs.length === 0) {
      return { success: true, processed: false };
    }

    const currentSub = currentSubs[0];
    const eventTimeMs = event.created ? event.created * 1000 : Date.now();
    const subUpdatedMs = currentSub.updatedAtMs != null ? Number(currentSub.updatedAtMs) : 0;

    // Out-of-order protection: if user's subscription was updated after event creation, ignore stale event
    if (subUpdatedMs > 0 && eventTimeMs < subUpdatedMs - 15000) {
      return {
        success: true,
        processed: true,
        stale: true,
        message: "Ignored stale update event: subscription has a newer state",
      };
    }

    const stripeStatus = (stripeSub.status || "").toLowerCase();
    let mappedStatus = "ACTIVE";
    if (stripeStatus === "past_due") mappedStatus = "PAST_DUE";
    else if (stripeStatus === "canceled" || stripeStatus === "unpaid") mappedStatus = "CANCELED";
    else if (stripeStatus === "active" || stripeStatus === "trialing") mappedStatus = "ACTIVE";

    if (!isValidSubscriptionTransition(currentSub.status, mappedStatus)) {
      return {
        success: true,
        processed: false,
        message: `Ignored transition: cannot transition from ${currentSub.status} to ${mappedStatus}`,
      };
    }

    const periodStartSec = Number(stripeSub.current_period_start);
    const periodEndSec = Number(stripeSub.current_period_end);
    const periodStart = periodStartSec && !isNaN(periodStartSec) ? new Date(periodStartSec * 1000) : new Date();
    const periodEnd = periodEndSec && !isNaN(periodEndSec) ? new Date(periodEndSec * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const txResult = await runIdempotentWebhookTransaction(event.id, async (tx: any) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO payment_webhook_events (id, "eventId", provider, "eventType", "checkoutSessionId", "userId", amount, currency, "createdAt")
         VALUES (gen_random_uuid(), $1, 'stripe', $2, $3, $4::uuid, 0, 'INR', NOW())`,
        event.id,
        event.type,
        stripeSub.id || `sub_${Date.now()}`,
        user.id
      );

      await tx.$executeRawUnsafe(
        `UPDATE user_subscriptions
         SET status = $1,
             "stripeCustomerId" = COALESCE($2, user_subscriptions."stripeCustomerId"),
             "stripeSubscriptionId" = COALESCE($3, user_subscriptions."stripeSubscriptionId"),
             "currentPeriodStart" = $4,
             "currentPeriodEnd" = $5,
             "updatedAt" = NOW()
         WHERE "userId" = $6::uuid`,
        mappedStatus,
        stripeCustId,
        stripeSubId,
        periodStart,
        periodEnd,
        user.id
      );
    });

    if (txResult.alreadyProcessed) {
      return {
        success: true,
        message: "Webhook event already processed (idempotent)",
        processed: true,
        idempotent: true,
      };
    }

    return {
      success: true,
      processed: true,
      status: mappedStatus,
      userId: user.id,
    };
  }

  // Unhandled event
  return {
    success: true,
    message: `Ignored unhandled event type: ${event.type}`,
    processed: false,
  };
}

/**
 * Processes overdue and expired subscriptions.
 * Reconciles expired paid periods and grace periods down to the Free plan.
 * Resets user license site limits strictly to 1 site.
 * Completely idempotent and safe to run on a repeated schedule.
 */
export async function processSubscriptionExpirations(): Promise<{
  processedCount: number;
  expiredUserIds: string[];
}> {
  // Query all non-free subscriptions where currentPeriodEnd <= NOW()
  const overdueSubs: any[] = await prisma.$queryRaw`
    SELECT s.id, s."userId", s.status, s."currentPeriodEnd", p.slug as "plan_slug"
    FROM user_subscriptions s
    JOIN subscription_plans p ON s."planId" = p.id
    WHERE s."currentPeriodEnd" IS NOT NULL
      AND s."currentPeriodEnd" <= NOW()
      AND LOWER(p.slug) != 'free'
  `;

  if (!overdueSubs || overdueSubs.length === 0) {
    return {
      processedCount: 0,
      expiredUserIds: [],
    };
  }

  let freePlan: any = null;
  const plans: any[] = await prisma.$queryRaw`
    SELECT id, slug, "websiteLimit" FROM subscription_plans WHERE LOWER(slug) = 'free' LIMIT 1
  `;
  if (plans && plans.length > 0) freePlan = plans[0];

  const expiredUserIds: string[] = [];

  for (const sub of overdueSubs) {
    await prisma.$transaction(async (tx: any) => {
      if (freePlan) {
        await tx.$executeRawUnsafe(
          `UPDATE user_subscriptions
           SET "planId" = $1::uuid,
               status = 'EXPIRED',
               "currentPeriodEnd" = NULL,
               "updatedAt" = NOW()
           WHERE "userId" = $2::uuid`,
          freePlan.id,
          sub.userId
        );
      } else {
        await tx.$executeRawUnsafe(
          `UPDATE user_subscriptions
           SET status = 'EXPIRED',
               "currentPeriodEnd" = NULL,
               "updatedAt" = NOW()
           WHERE "userId" = $1::uuid`,
          sub.userId
        );
      }

      // Synchronize license down to free limits (1 site) atomically within transaction
      await syncUserLicenseForPlan(sub.userId, "free", 1, true, tx);
    });

    expiredUserIds.push(sub.userId);
  }

  return {
    processedCount: expiredUserIds.length,
    expiredUserIds,
  };
}
