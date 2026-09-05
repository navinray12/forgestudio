import { Router } from "express";
import { IntegrationController } from "../controllers/integration.controller.js";

const router = Router();

// F-418: PayPal Payment Integration
router.post("/paypal/create-order", IntegrationController.createPayPalOrder);
router.post("/paypal/capture-order", IntegrationController.capturePayPalOrder);

// F-419: Stripe Payment Integration
router.post("/stripe/create-checkout-session", IntegrationController.createStripeCheckoutSession);

// F-422: Dynamic Data Fetcher Proxy
router.get("/dynamic-data/fetch", IntegrationController.fetchDynamicData);

// F-424: CRM Lead Capture Integration
router.post("/crm/submit-lead", IntegrationController.submitLeadToCRM);

// F-425: Event-Driven Webhook Dispatcher
router.post("/webhook/dispatch", IntegrationController.dispatchWebhook);

export default router;
