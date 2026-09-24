import crypto from "crypto";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/app-error.js";
import { sendSiteEmail } from "../siteMailer.service.js";

const db = prisma as any;

export interface ClientBillingConfig {
  enabled: boolean;
  clientEmail: string;
  clientName: string;
  currency: string;             // 'USD', 'EUR', 'INR', 'GBP', etc.
  baseCostMonthly: number;       // Platform base fee, e.g. 15
  clientPriceMonthly: number;    // Agency price to client, e.g. 49
  marginMonthly: number;         // Computed profit, e.g. 34
  billingInterval: "month" | "year";
  stripeConnectedAccountId?: string;
  subscriptionStatus: "UNBILLED" | "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  clientInvoiceUrl?: string;
  lastBilledAt?: string;
}

export const DEFAULT_CLIENT_BILLING: ClientBillingConfig = {
  enabled: false,
  clientEmail: "",
  clientName: "",
  currency: "USD",
  baseCostMonthly: 15,
  clientPriceMonthly: 49,
  marginMonthly: 34,
  billingInterval: "month",
  subscriptionStatus: "UNBILLED",
};

/**
 * Retrieves the client billing configuration and margin breakdown for a website.
 */
export async function getClientBilling(websiteId: string, userId: string) {
  if (!websiteId) throw new AppError("Website ID is required", 400, "BAD_REQUEST");

  const website = await db.website.findUnique({
    where: { id: websiteId },
    select: { id: true, userId: true, name: true, slug: true, editorData: true },
  });

  if (!website) throw new AppError("Website not found", 404, "NOT_FOUND");
  if (website.userId !== userId) {
    throw new AppError("Unauthorized access to website client billing", 403, "FORBIDDEN");
  }

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const config: ClientBillingConfig = {
    ...DEFAULT_CLIENT_BILLING,
    ...(editorData.clientBilling || {}),
  };

  // Recalculate margin defensively
  config.marginMonthly = Math.max(0, (config.clientPriceMonthly || 0) - (config.baseCostMonthly || 15));

  const multiplier = config.billingInterval === "year" ? 12 : 1;
  const annualProjectedRevenue = (config.clientPriceMonthly || 0) * 12;
  const annualProjectedProfit = config.marginMonthly * 12;

  return {
    websiteId: website.id,
    websiteName: website.name,
    config,
    metrics: {
      annualProjectedRevenue,
      annualProjectedProfit,
      marginPercentage: config.clientPriceMonthly > 0
        ? Math.round((config.marginMonthly / config.clientPriceMonthly) * 100)
        : 0,
      hasStripeConnect: Boolean(config.stripeConnectedAccountId),
    },
  };
}

/**
 * Updates the agency client billing settings and price markup.
 */
export async function updateClientBilling(
  websiteId: string,
  userId: string,
  input: Partial<ClientBillingConfig>
) {
  if (!websiteId) throw new AppError("Website ID is required", 400, "BAD_REQUEST");

  const website = await db.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) throw new AppError("Website not found", 404, "NOT_FOUND");
  if (website.userId !== userId) {
    throw new AppError("Unauthorized access to website client billing", 403, "FORBIDDEN");
  }

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const currentConfig: ClientBillingConfig = {
    ...DEFAULT_CLIENT_BILLING,
    ...(editorData.clientBilling || {}),
  };

  const baseCost = typeof input.baseCostMonthly === "number" ? Math.max(0, input.baseCostMonthly) : currentConfig.baseCostMonthly;
  const clientPrice = typeof input.clientPriceMonthly === "number" ? Math.max(baseCost, input.clientPriceMonthly) : currentConfig.clientPriceMonthly;
  const computedMargin = Math.max(0, clientPrice - baseCost);

  const updatedConfig: ClientBillingConfig = {
    ...currentConfig,
    ...input,
    baseCostMonthly: baseCost,
    clientPriceMonthly: clientPrice,
    marginMonthly: computedMargin,
    currency: (input.currency || currentConfig.currency || "USD").toUpperCase(),
    clientInvoiceUrl: input.clientInvoiceUrl || currentConfig.clientInvoiceUrl || `https://pay.forgestudio.io/c/${website.slug || website.id}`,
  };

  editorData.clientBilling = updatedConfig;

  await db.website.update({
    where: { id: websiteId },
    data: {
      editorData,
    },
  });

  return getClientBilling(websiteId, userId);
}

/**
 * Generates a direct client payment link and optionally dispatches a branded invoice email.
 */
export async function generateClientInvoice(
  websiteId: string,
  userId: string,
  options?: { sendEmail?: boolean; customNotes?: string }
) {
  if (!websiteId) throw new AppError("Website ID is required", 400, "BAD_REQUEST");

  const website = await db.website.findUnique({
    where: { id: websiteId },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  if (!website) throw new AppError("Website not found", 404, "NOT_FOUND");
  if (website.userId !== userId) {
    throw new AppError("Unauthorized access to website client billing", 403, "FORBIDDEN");
  }

  const editorData = typeof website.editorData === "string"
    ? JSON.parse(website.editorData)
    : (website.editorData || {});

  const config: ClientBillingConfig = {
    ...DEFAULT_CLIENT_BILLING,
    ...(editorData.clientBilling || {}),
  };

  const invoiceId = `inv_cli_${crypto.randomBytes(6).toString("hex")}`;
  const invoiceUrl = `https://pay.forgestudio.io/c/${website.slug || website.id}?ref=${invoiceId}`;

  config.clientInvoiceUrl = invoiceUrl;
  config.subscriptionStatus = "PENDING";
  config.lastBilledAt = new Date().toISOString();
  config.enabled = true;

  editorData.clientBilling = config;

  await db.website.update({
    where: { id: websiteId },
    data: { editorData },
  });

  let emailSent = false;
  if (options?.sendEmail && config.clientEmail) {
    try {
      const agencyName = website.user?.fullName || "Your Digital Agency";
      const subject = `Invoice for Website Hosting & Care - ${website.name}`;
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #f4f4f5; border: 1px solid #27272a; border-radius: 12px;">
          <div style="margin-bottom: 20px;">
            <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #10b981;">Website Care & Hosting</span>
            <h1 style="font-size: 22px; font-weight: 700; margin: 8px 0 4px; color: #ffffff;">Invoice for ${website.name}</h1>
            <p style="color: #a1a1aa; font-size: 14px; margin: 0;">Managed by ${agencyName}</p>
          </div>

          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="color: #a1a1aa; padding-bottom: 8px;">Plan</td>
                <td style="text-align: right; font-weight: 600; color: #ffffff; padding-bottom: 8px;">Professional Managed Hosting</td>
              </tr>
              <tr>
                <td style="color: #a1a1aa; padding-bottom: 8px;">Billing Interval</td>
                <td style="text-align: right; color: #ffffff; padding-bottom: 8px; text-transform: capitalize;">${config.billingInterval}ly</td>
              </tr>
              <tr>
                <td style="color: #a1a1aa; padding-bottom: 8px;">Invoice Reference</td>
                <td style="text-align: right; font-family: monospace; color: #a1a1aa; padding-bottom: 8px;">${invoiceId}</td>
              </tr>
              <tr style="border-top: 1px solid #27272a;">
                <td style="color: #ffffff; font-weight: 700; padding-top: 12px; font-size: 16px;">Total Due</td>
                <td style="text-align: right; color: #10b981; font-weight: 700; padding-top: 12px; font-size: 18px;">${config.currency} ${config.clientPriceMonthly} / mo</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${invoiceUrl}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
              Complete Payment Now →
            </a>
          </div>

          <p style="font-size: 12px; color: #71717a; text-align: center; margin: 0;">
            Secure 256-bit encrypted checkout powered by Stripe. If you have questions regarding this invoice, contact ${website.user?.email || "your agency"}.
          </p>
        </div>
      `;

      await sendSiteEmail(websiteId, {
        to: config.clientEmail,
        subject,
        html,
        text: `Invoice for ${website.name}: Total due ${config.currency} ${config.clientPriceMonthly}/${config.billingInterval}. Pay here: ${invoiceUrl}`,
        fromName: agencyName,
      });
      emailSent = true;
    } catch (mailErr: any) {
      console.warn(`[ClientBilling] Warning: Could not dispatch invoice email to ${config.clientEmail}:`, mailErr.message);
    }
  }

  return {
    success: true,
    invoiceId,
    invoiceUrl,
    clientEmail: config.clientEmail,
    emailSent,
    amount: config.clientPriceMonthly,
    currency: config.currency,
  };
}
