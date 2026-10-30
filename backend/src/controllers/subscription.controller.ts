import type { Request, Response, NextFunction } from "express";
import {
  getAllActivePlans,
  getUserSubscription,
  changeUserPlan,
  cancelSubscription,
  getUserInvoices,
  getUserInvoiceById,
  generateInvoiceHtml,
  createSubscriptionCheckoutSession,
  handleStripePaymentWebhook,
  processSubscriptionExpirations,
} from "../services/subscription.service.js";

/**
 * GET /api/v1/subscriptions/plans (or /api/subscriptions/plans)
 * Returns all active subscription plans
 */
export async function getPlans(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const plans = await getAllActivePlans();

    return res.status(200).json({
      success: true,
      data: {
        plans,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/subscriptions/current (or /api/subscriptions/current)
 * Returns the authenticated user's current subscription & plan limits
 */
export async function getCurrentSubscription(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const subscription = await getUserSubscription(user.id);

    return res.status(200).json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          plan: subscription.plan,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/subscriptions/checkout-session
 * Creates an authenticated checkout session for paid plans.
 * Does NOT activate the paid plan on creation.
 */
export async function createCheckoutSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const { planSlug, successUrl, cancelUrl } = req.body;
    if (!planSlug || typeof planSlug !== "string") {
      return res.status(400).json({
        success: false,
        code: "INVALID_PLAN_SLUG",
        message: "Please provide a valid planSlug",
      });
    }

    const result = await createSubscriptionCheckoutSession(user.id, planSlug, {
      successUrl,
      cancelUrl,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || "CHECKOUT_ERROR",
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * POST /api/v1/subscriptions/select (or /api/subscriptions/select)
 * Select or downgrade current user's subscription plan.
 * RESTRICTED: Only the free tier may be selected directly.
 * Paid tiers require completing checkout through checkout-session.
 */
export async function selectPlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const { planSlug } = req.body;

    if (!user?.id) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    if (!planSlug || typeof planSlug !== "string") {
      return res.status(400).json({
        success: false,
        code: "INVALID_PLAN_SLUG",
        message: "Please provide a valid planSlug",
      });
    }

    const normalizedSlug = planSlug.toLowerCase().trim();

    // Secure guard: direct selection is restricted strictly to the free tier.
    // Paid tiers (starter, professional, agency) must complete checkout.
    if (normalizedSlug !== "free") {
      return res.status(400).json({
        success: false,
        code: "PAID_PLAN_REQUIRES_CHECKOUT",
        message: "Paid plans require completing checkout. Direct selection is restricted to the free plan.",
      });
    }

    const updatedSub = await changeUserPlan(user.id, "free");

    return res.status(200).json({
      success: true,
      message: `Successfully changed plan to ${updatedSub.plan.name}`,
      data: {
        subscription: {
          id: updatedSub.id,
          status: updatedSub.status,
          currentPeriodStart: updatedSub.currentPeriodStart,
          currentPeriodEnd: updatedSub.currentPeriodEnd,
          plan: updatedSub.plan,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/subscriptions/cancel (Feature F-449)
 * Cancels current user subscription gracefully
 */
export async function cancelUserSubscription(
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

    const immediate = req.body?.immediate === true;
    const result = await cancelSubscription(user.id, { immediate });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        subscription: result.subscription,
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || "CANCELLATION_ERROR",
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/v1/subscriptions/invoices (Features F-444, F-445, F-449)
 * Fetches user's billing invoice history
 */
export async function getBillingInvoices(
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

    const invoices = await getUserInvoices(user.id);

    return res.status(200).json({
      success: true,
      data: {
        invoices,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/subscriptions/invoices/:invoiceId (Module 18.4)
 * Returns details for a specific invoice. Supports JSON and HTML formats.
 */
export async function getBillingInvoiceById(
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

    const rawInvoiceId = req.params.invoiceId;
    const invoiceId = Array.isArray(rawInvoiceId) ? rawInvoiceId[0] : rawInvoiceId;
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        code: "INVALID_INVOICE_ID",
        message: "Invoice ID or number is required",
      });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.role);
    const invoice = await getUserInvoiceById(user.id, invoiceId, isAdmin);

    const wantsHtml = req.query.format === "html" || (req.headers.accept?.includes("text/html") && !req.headers.accept?.includes("application/json"));
    if (wantsHtml) {
      const html = generateInvoiceHtml(invoice);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    return res.status(200).json({
      success: true,
      data: {
        invoice,
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || "INVOICE_ERROR",
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/v1/subscriptions/invoices/:invoiceId/html or /download (Module 18.4)
 * Directly returns a standalone, print-friendly HTML invoice document.
 */
export async function getBillingInvoiceHtml(
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

    const rawInvoiceId = req.params.invoiceId;
    const invoiceId = Array.isArray(rawInvoiceId) ? rawInvoiceId[0] : rawInvoiceId;
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        code: "INVALID_INVOICE_ID",
        message: "Invoice ID or number is required",
      });
    }

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"].includes(user.role);
    const invoice = await getUserInvoiceById(user.id, invoiceId, isAdmin);
    const html = generateInvoiceHtml(invoice);

    const isDownload = req.path.endsWith("/download") || req.query.download === "true";
    if (isDownload) {
      res.setHeader("Content-Disposition", `attachment; filename="Invoice-${invoice.invoiceNumber}.html"`);
    } else {
      res.setHeader("Content-Disposition", `inline; filename="Invoice-${invoice.invoiceNumber}.html"`);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || "INVOICE_ERROR",
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * POST /api/v1/subscriptions/webhook (or /api/subscriptions/webhook)
 * Receives and cryptographically verifies Stripe payment webhooks.
 * Activates paid subscriptions, writes paid invoices, and syncs licenses.
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const rawBody =
      (req as any).rawBody ||
      (Buffer.isBuffer(req.body)
        ? req.body
        : typeof req.body === "string"
        ? Buffer.from(req.body)
        : Buffer.from(JSON.stringify(req.body || {})));

    const signatureHeader = req.headers["stripe-signature"] as string | undefined;

    const result = await handleStripePaymentWebhook(rawBody, signatureHeader);

    return res.status(200).json(result);
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        code: error.code || "WEBHOOK_VERIFICATION_FAILED",
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * POST /api/v1/subscriptions/process-expirations (or /api/subscriptions/process-expirations)
 * Maintenance / Cron trigger to reconcile expired paid periods down to Free tier.
 */
export async function triggerSubscriptionExpiryCheck(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await processSubscriptionExpirations();
    return res.status(200).json({
      success: true,
      message: `Processed ${result.processedCount} expired subscriptions`,
      data: {
        processedCount: result.processedCount,
        status: "COMPLETED",
      },
    });
  } catch (error) {
    next(error);
  }
}

