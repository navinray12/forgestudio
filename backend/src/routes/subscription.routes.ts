import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getPlans,
  getCurrentSubscription,
  selectPlan,
  cancelUserSubscription,
  getBillingInvoices,
} from "../controllers/subscription.controller.js";

const router = Router();

// Public / Authenticated: Get all active plans
router.get("/plans", getPlans);

// Authenticated: Get current user's subscription and limits
router.get("/current", requireAuth, getCurrentSubscription);

// Authenticated: Select / upgrade plan
router.post("/select", requireAuth, selectPlan);

// Authenticated: Cancel subscription (Feature F-449)
router.post("/cancel", requireAuth, cancelUserSubscription);

// Authenticated: Get billing invoices (Features F-444, F-445, F-449)
router.get("/invoices", requireAuth, getBillingInvoices);

export default router;

