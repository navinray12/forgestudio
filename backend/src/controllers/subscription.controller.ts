import type { Request, Response, NextFunction } from "express";
import {
  getAllActivePlans,
  getUserSubscription,
  changeUserPlan,
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
 * POST /api/v1/subscriptions/select (or /api/subscriptions/select)
 * Select or upgrade current user's subscription plan
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
        message: "Authentication required",
      });
    }

    if (!planSlug || typeof planSlug !== "string") {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid planSlug",
      });
    }

    const updatedSub = await changeUserPlan(user.id, planSlug);

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
