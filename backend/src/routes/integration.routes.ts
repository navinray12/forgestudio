import { Router } from "express";
import { IntegrationController } from "../controllers/integration.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// All integration operations are authenticated because they can initiate payments,
// proxy external URLs, submit CRM data, or dispatch outbound webhooks.
router.use(requireAuth);

router.post("/paypal/create-order", IntegrationController.createPayPalOrder);
router.post("/paypal/capture-order", IntegrationController.capturePayPalOrder);
router.post("/stripe/create-checkout-session", IntegrationController.createStripeCheckoutSession);
router.get("/dynamic-data/fetch", IntegrationController.fetchDynamicData);
router.post("/crm/submit-lead", IntegrationController.submitLeadToCRM);
router.post("/webhook/dispatch", IntegrationController.dispatchWebhook);

export default router;
