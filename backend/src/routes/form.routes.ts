import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  submitFormHandler,
  getWebsiteSubmissionsHandler,
  deleteSubmissionHandler,
  exportSubmissionsHandler,
  downloadSubmissionPdfHandler,
  getFormNotificationSettingsHandler,
  updateFormNotificationSettingsHandler,
  testFormNotificationHandler,
  getFormWebhookSettingsHandler,
  updateFormWebhookSettingsHandler,
  deleteFormWebhookSettingsHandler,
  testFormWebhookHandler,
  getFormWebhookDeliveriesHandler,
  retryFormWebhookDeliveryHandler,
} from "../controllers/form.controller.js";

const router = Router();

// Public submission endpoint
router.post("/submit", submitFormHandler);

// Protected endpoints for website owners to inspect leads & configure notifications
router.get("/:websiteId/submissions", requireAuth, getWebsiteSubmissionsHandler);
router.get("/:websiteId/submissions/:submissionId/pdf", requireAuth, downloadSubmissionPdfHandler);
router.delete("/:websiteId/submissions/:submissionId", requireAuth, deleteSubmissionHandler);
router.get("/:websiteId/export", requireAuth, exportSubmissionsHandler);

// Lead Notification Settings (Feature 2)
router.get("/:websiteId/notifications", requireAuth, getFormNotificationSettingsHandler);
router.put("/:websiteId/notifications", requireAuth, updateFormNotificationSettingsHandler);
router.post("/:websiteId/notifications/test", requireAuth, testFormNotificationHandler);

// Webhook Settings & Deliveries (Feature 3B)
router.get("/:websiteId/webhooks", requireAuth, getFormWebhookSettingsHandler);
router.put("/:websiteId/webhooks", requireAuth, updateFormWebhookSettingsHandler);
router.delete("/:websiteId/webhooks", requireAuth, deleteFormWebhookSettingsHandler);
router.post("/:websiteId/webhooks/test", requireAuth, testFormWebhookHandler);
router.get("/:websiteId/webhooks/deliveries", requireAuth, getFormWebhookDeliveriesHandler);
router.post("/:websiteId/webhooks/deliveries/:deliveryId/retry", requireAuth, retryFormWebhookDeliveryHandler);

export default router;
