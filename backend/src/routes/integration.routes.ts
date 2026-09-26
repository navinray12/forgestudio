import { Router } from "express";
import { IntegrationController } from "../controllers/integration.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Integration endpoints: public endpoints (payments, CRM leads, webhooks, dynamic data)
// can be triggered by visitors on published sites or authenticated users in the editor.
// Test endpoints require authentication.
router.post("/paypal/create-order", IntegrationController.createPayPalOrder);
router.post("/paypal/capture-order", IntegrationController.capturePayPalOrder);
router.post("/stripe/create-checkout-session", IntegrationController.createStripeCheckoutSession);
router.get("/dynamic-data/fetch", IntegrationController.fetchDynamicData);
router.post("/crm/submit-lead", IntegrationController.submitLeadToCRM);
router.post("/webhook/dispatch", IntegrationController.dispatchWebhook);

// Admin / Test Endpoints (Require Auth)
router.post("/google-sheets/test", requireAuth, IntegrationController.testGoogleSheets);
router.post("/mailchimp/test", requireAuth, IntegrationController.testMailchimp);
router.post("/zapier/test", requireAuth, IntegrationController.testZapier);

export default router;
