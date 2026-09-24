import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  getClientBillingHandler,
  updateClientBillingHandler,
  generateClientInvoiceHandler,
} from "../controllers/clientBilling.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get("/:id/client-billing", getClientBillingHandler);
router.put("/:id/client-billing", updateClientBillingHandler);
router.post("/:id/client-billing/invoice", generateClientInvoiceHandler);

export default router;
