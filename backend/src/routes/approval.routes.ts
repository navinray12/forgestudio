import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  submitApprovalRequestHandler,
  getWebsiteApprovalRequestsHandler,
  reviewApprovalRequestHandler,
  cancelApprovalRequestHandler,
  toggleApprovalWorkflowHandler,
} from "../controllers/approval.controller.js";

/**
 * Top-level approval requests router.
 * Mounted at `/api/v1/approval-requests` and `/api/approval-requests`.
 */
const approvalRouter = Router();

approvalRouter.use(requireAuth);

// Submit an approval request (accepts websiteId in body)
approvalRouter.post("/", submitApprovalRequestHandler);

// Query approval requests via ?websiteId=...
approvalRouter.get("/", getWebsiteApprovalRequestsHandler);

// Review a pending request (APPROVE or REJECT)
approvalRouter.post("/:id/review", reviewApprovalRequestHandler);

// Cancel a pending request
approvalRouter.post("/:id/cancel", cancelApprovalRequestHandler);

/**
 * Website-scoped approval router.
 * Mounted at `/api/v1/websites` and `/api/websites`.
 */
export const websiteApprovalRoutes = Router({ mergeParams: true });

websiteApprovalRoutes.use(requireAuth);

// Website-scoped approval requests
websiteApprovalRoutes.post("/:id/approval-requests", submitApprovalRequestHandler);
websiteApprovalRoutes.get("/:id/approval-requests", getWebsiteApprovalRequestsHandler);

// Website approval workflow toggle (PATCH and POST compatibility)
websiteApprovalRoutes.patch("/:id/approval-workflow", toggleApprovalWorkflowHandler);
websiteApprovalRoutes.post("/:id/approval-workflow", toggleApprovalWorkflowHandler);

export default approvalRouter;
