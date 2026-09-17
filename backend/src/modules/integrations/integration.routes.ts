/**
 * @file Integrations: HTTP route registration and middleware order. File responsibility: integration routes.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { Router } from "express";
import { IntegrationController } from "./integration.controller.js";
import { requireAuth } from "../authentication/session-authentication.middleware.js";

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
