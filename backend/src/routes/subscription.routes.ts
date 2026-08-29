import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getPlans,
  getCurrentSubscription,
  selectPlan,
} from "../controllers/subscription.controller.js";

const router = Router();

// Public / Authenticated: Get all active plans
router.get("/plans", getPlans);

// Authenticated: Get current user's subscription and limits
router.get("/current", requireAuth, getCurrentSubscription);

// Authenticated: Select / upgrade plan
router.post("/select", requireAuth, selectPlan);

export default router;
