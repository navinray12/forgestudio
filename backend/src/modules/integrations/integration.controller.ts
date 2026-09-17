/**
 * @file Integrations: HTTP handlers that translate requests into module operations and responses. File responsibility: integration controller.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type { Request, Response } from "express";
import { IntegrationService } from "./integration.service.js";

export class IntegrationController {
  // POST /api/integrations/paypal/create-order
  /**
   * Create Pay Pal Order.
   * @param req Express request containing route parameters, query values, headers and any parsed body.
   * @param res Express response used to send the result; authenticated request context may be stored in locals.
   */
  public static async createPayPalOrder(req: Request, res: Response) {
    try {
      const { amount = "19.99", currency = "USD", itemName = "Digital Product", itemDescription = "", quantity = 1, env = "sandbox" } = req.body;
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount. Amount must be a positive number greater than 0." });
      }
      const result = await IntegrationService.createPayPalOrder(amount, currency, itemName, itemDescription, quantity, env);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "PayPal order creation failed" });
    }
  }

  // POST /api/integrations/paypal/capture-order
  /**
   * Capture Pay Pal Order.
   * @param req Express request containing route parameters, query values, headers and any parsed body.
   * @param res Express response used to send the result; authenticated request context may be stored in locals.
   */
  public static async capturePayPalOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "orderId is required" });
      }
      const result = await IntegrationService.capturePayPalOrder(orderId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "PayPal order capture failed" });
    }
  }

  // POST /api/integrations/stripe/create-checkout-session
  /**
   * Create Stripe Checkout Session.
   * @param req Express request containing route parameters, query values, headers and any parsed body.
   * @param res Express response used to send the result; authenticated request context may be stored in locals.
   */
  public static async createStripeCheckoutSession(req: Request, res: Response) {
    try {
      const { amount = "49.00", currency = "USD", itemName = "Pro Plan" } = req.body;
      const result = await IntegrationService.createStripeCheckoutSession(amount, currency, itemName);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Stripe session creation failed" });
    }
  }

  // GET /api/integrations/dynamic-data/fetch
  /**
   * Fetch Dynamic Data.
   * @param req Express request containing route parameters, query values, headers and any parsed body.
   * @param res Express response used to send the result; authenticated request context may be stored in locals.
   */
  public static async fetchDynamicData(req: Request, res: Response) {
    try {
      const targetUrl = req.query.url as string;
      const jsonPath = req.query.jsonPath as string;

      if (!targetUrl) {
        return res.status(400).json({ success: false, message: "Query parameter 'url' is required" });
      }

      const result = await IntegrationService.fetchDynamicData(targetUrl, jsonPath);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Dynamic data fetch failed" });
    }
  }

  // POST /api/integrations/crm/submit-lead
  /**
   * Submit Lead To CRM.
   * @param req Express request containing route parameters, query values, headers and any parsed body.
   * @param res Express response used to send the result; authenticated request context may be stored in locals.
   */
  public static async submitLeadToCRM(req: Request, res: Response) {
    try {
      const { provider = "hubspot", name, email, customFields } = req.body;

      if (!name || !email) {
        return res.status(400).json({ success: false, message: "Name and email are required for CRM sync" });
      }

      const result = await IntegrationService.submitLeadToCRM(provider, name, email, customFields);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "CRM lead submission failed" });
    }
  }

  // POST /api/integrations/webhook/dispatch
  /**
   * Dispatch Webhook.
   * @param req Express request containing route parameters, query values, headers and any parsed body.
   * @param res Express response used to send the result; authenticated request context may be stored in locals.
   */
  public static async dispatchWebhook(req: Request, res: Response) {
    try {
      const { webhookUrl, eventType = "onButtonClick", payload, secret } = req.body;

      if (!webhookUrl) {
        return res.status(400).json({ success: false, message: "webhookUrl is required" });
      }

      const result = await IntegrationService.dispatchWebhook(webhookUrl, eventType, payload, secret);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || "Webhook dispatch failed" });
    }
  }
}
