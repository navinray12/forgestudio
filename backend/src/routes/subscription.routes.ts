import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import {
  getPlans,
  getCurrentSubscription,
  selectPlan,
  createCheckoutSession,
  cancelUserSubscription,
  getBillingInvoices,
  getBillingInvoiceById,
  getBillingInvoiceHtml,
  handleStripeWebhook,
  triggerSubscriptionExpiryCheck,
} from "../controllers/subscription.controller.js";

const router = Router();

// Public / Authenticated: Get all active plans
router.get("/plans", getPlans);

// Authenticated: Get current user's subscription and limits
router.get("/current", requireAuth, getCurrentSubscription);

// Authenticated: Select free plan (direct downgrade)
router.post("/select", requireAuth, selectPlan);

// Authenticated: Create secure checkout session for paid plan
router.post("/checkout-session", requireAuth, createCheckoutSession);

// Authenticated: Cancel subscription (Feature F-449)
router.post("/cancel", requireAuth, cancelUserSubscription);

// Authenticated: Get billing invoices history (Features F-444, F-445, F-449)
router.get("/invoices", requireAuth, getBillingInvoices);

// Authenticated: Get single billing invoice by ID or Invoice# (Module 18.4)
router.get("/invoices/:invoiceId", requireAuth, getBillingInvoiceById);

// Authenticated: View or Download printable HTML invoice document (Module 18.4)
router.get("/invoices/:invoiceId/html", requireAuth, getBillingInvoiceHtml);
router.get("/invoices/:invoiceId/download", requireAuth, getBillingInvoiceHtml);

// Public (Cryptographically verified via stripe-signature): Stripe payment webhook
router.post("/webhook", handleStripeWebhook);

// Scheduled / Maintenance: Process expired subscriptions (Restricted to Admins)
router.post(
  "/process-expirations",
  requireAuth,
  requireRole(["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"]),
  triggerSubscriptionExpiryCheck
);

export default router;
