import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import {
  processFormSubmission,
  getWebsiteSubmissions,
  deleteWebsiteSubmission,
  getSubmissionPdf,
  exportSubmissionsCsv,
  getFormNotificationSettings,
  saveFormNotificationSettings,
  testFormNotification,
  getFormWebhookSettings,
  saveFormWebhookSettings,
  deleteFormWebhookSettings,
  testFormWebhook,
  getFormWebhookDeliveries,
  retryFormWebhookDelivery,
} from "../services/form/form.service.js";

/**
 * POST /api/forms/submit
 * Public endpoint to accept visitor form submissions
 */
export async function submitFormHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      websiteId,
      formId,
      formName,
      fields,
      actions,
      spamProtection,
      honeypotValue,
      conditionalLogic,
      fieldConfigs,
    } = req.body;

    const metadata = {
      ip: req.ip || req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      referer: req.headers["referer"] || "",
    };

    const result = await processFormSubmission({
      websiteId,
      formId,
      formName,
      fields,
      actions,
      spamProtection,
      honeypotValue,
      conditionalLogic,
      fieldConfigs,
      metadata,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/forms/:websiteId/submissions
 * Authenticated endpoint to fetch leads for a specific website
 */
export async function getWebsiteSubmissionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;

    const submissions = await getWebsiteSubmissions(websiteId, user.id);

    return res.status(200).json({
      success: true,
      submissions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/forms/:websiteId/submissions/:submissionId
 * Authenticated endpoint to delete a submission record
 */
export async function deleteSubmissionHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const submissionId = req.params.submissionId as string;

    await deleteWebsiteSubmission(websiteId, submissionId, user.id);

    return res.status(200).json({
      success: true,
      message: "Submission deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/forms/:websiteId/export
 * Authenticated endpoint to export submissions as CSV or JSON
 */
export async function exportSubmissionsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    if (!user?.id) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const websiteId = req.params.websiteId as string;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!websiteId || !UUID_REGEX.test(websiteId.trim())) {
      throw new AppError("Invalid website ID format.", 400, "BAD_REQUEST");
    }

    const format = (req.query.format as string) || "json";
    const formId = req.query.formId ? String(req.query.formId).trim() : undefined;

    if (format === "csv") {
      const { csvContent, filename } = await exportSubmissionsCsv(websiteId, user.id, { formId });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.status(200).send(csvContent);
    }

    const submissions = await getWebsiteSubmissions(websiteId, user.id);

    return res.status(200).json({
      success: true,
      submissions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/forms/:websiteId/submissions/:submissionId/pdf
 * Authenticated endpoint to stream a binary PDF lead report (X-800)
 */
export async function downloadSubmissionPdfHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const submissionId = req.params.submissionId as string;

    const { pdfBuffer, filename } = await getSubmissionPdf(websiteId, submissionId, user.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/forms/:websiteId/notifications
 * Authenticated endpoint to fetch lead email notification settings
 */
export async function getFormNotificationSettingsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;

    const settings = await getFormNotificationSettings(websiteId, user.id);
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/forms/:websiteId/notifications
 * Authenticated endpoint to update lead email notification settings
 */
export async function updateFormNotificationSettingsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const { notificationEmail, enabled, subjectTemplate } = req.body || {};

    const saved = await saveFormNotificationSettings(websiteId, user.id, {
      notificationEmail,
      enabled,
      subjectTemplate,
    });

    return res.status(200).json({
      success: true,
      message: "Notification settings saved successfully",
      data: saved,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/forms/:websiteId/notifications/test
 * Authenticated endpoint to dispatch a live test notification email
 */
export async function testFormNotificationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const { targetEmail } = req.body || {};

    const result = await testFormNotification(websiteId, user.id, targetEmail);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/forms/:websiteId/webhooks
 * Authenticated endpoint to fetch webhook settings (secret is securely masked)
 */
export async function getFormWebhookSettingsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;

    const settings = await getFormWebhookSettings(websiteId, user.id);
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/forms/:websiteId/webhooks
 * Authenticated endpoint to configure webhook endpoint and signing secret
 */
export async function updateFormWebhookSettingsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const { endpointUrl, enabled, events, signingSecret, clearSecret } = req.body || {};

    const saved = await saveFormWebhookSettings(websiteId, user.id, {
      endpointUrl,
      enabled,
      events,
      signingSecret,
      clearSecret,
    });

    return res.status(200).json({
      success: true,
      message: "Webhook settings saved successfully",
      data: saved,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/forms/:websiteId/webhooks
 * Authenticated endpoint to remove webhook configuration
 */
export async function deleteFormWebhookSettingsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;

    const result = await deleteFormWebhookSettings(websiteId, user.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/forms/:websiteId/webhooks/test
 * Authenticated endpoint to send a live test webhook event
 */
export async function testFormWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const { targetUrl, customSecret } = req.body || {};

    const result = await testFormWebhook(websiteId, user.id, targetUrl, customSecret);
    return res.status(200).json({
      success: result.success,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/forms/:websiteId/webhooks/deliveries
 * Authenticated endpoint to list recent webhook delivery records
 */
export async function getFormWebhookDeliveriesHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;

    const deliveries = await getFormWebhookDeliveries(websiteId, user.id, limit);
    return res.status(200).json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/forms/:websiteId/webhooks/deliveries/:deliveryId/retry
 * Authenticated endpoint to retry an eligible failed delivery
 */
export async function retryFormWebhookDeliveryHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = res.locals.user;
    const websiteId = req.params.websiteId as string;
    const deliveryId = req.params.deliveryId as string;

    const result = await retryFormWebhookDelivery(websiteId, deliveryId, user.id);
    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Delivery retry succeeded (HTTP ${result.httpStatus || 200})`
        : `Delivery retry failed: ${result.errorMessage || "Receiver error"}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
