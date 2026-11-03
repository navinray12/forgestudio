import { AppError } from '../utils/app-error.js';
export type BillingProvider = { configured: boolean; paymentMethod: (customer: string) => Promise<any>; portal: (customer: string) => Promise<string> };
// Customer IDs come exclusively from trusted server storage, never from browser input.
export function createStripeBillingProvider(env: Record<string, string | undefined>, request: typeof fetch = fetch): BillingProvider {
  const secret = env.STRIPE_SECRET_KEY;
  const returnUrl = new URL('/dashboard?section=billing', env.FRONTEND_URL || 'http://localhost:5173').href;
  async function call(path: string, body?: URLSearchParams) {
    if (!secret) throw new AppError('Payment management is not configured. Contact billing support.', 503, 'BILLING_PROVIDER_UNAVAILABLE');
    try {
      const response = await request(`https://api.stripe.com/v1/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${secret}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, body, signal: AbortSignal.timeout(12000) });
      const result = await response.json();
      if (!response.ok || result.deleted) throw new Error('Provider request failed');
      return result;
    } catch { throw new AppError('Payment management is temporarily unavailable. Please retry or contact billing support.', 502, 'BILLING_PROVIDER_ERROR'); }
  }
  function customerId(value: string) { if (!/^cus_[a-zA-Z0-9]+$/.test(value)) throw new AppError('The payment account needs review. Contact billing support.', 503, 'BILLING_CUSTOMER_INVALID'); return value; }
  return {
    configured: Boolean(secret),
    async paymentMethod(customer: string) {
      const id = customerId(customer);
      const result = await call(`customers/${id}?expand%5B%5D=invoice_settings.default_payment_method`);
      if (result.id !== id) throw new AppError('Payment account could not be verified', 502, 'BILLING_CUSTOMER_INVALID');
      const method = result.invoice_settings?.default_payment_method;
      if (!method || typeof method !== 'object' || method.type !== 'card') return null;
      if (method.customer !== id || !/^\d{4}$/.test(method.card?.last4 || '')) throw new AppError('Payment method could not be verified', 502, 'BILLING_METHOD_INVALID');
      return { brand: String(method.card.brand || 'Card').slice(0, 30), last4: method.card.last4, expMonth: method.card.exp_month, expYear: method.card.exp_year };
    },
    async portal(customer: string) {
      const result = await call('billing_portal/sessions', new URLSearchParams({ customer: customerId(customer), return_url: returnUrl, 'flow_data[type]': 'payment_method_update', 'flow_data[after_completion][type]': 'redirect', 'flow_data[after_completion][redirect][return_url]': returnUrl }));
      let url: URL; try { url = new URL(result.url); } catch { throw new AppError('Payment portal did not return a valid link', 502, 'BILLING_PORTAL_INVALID'); }
      if (url.protocol !== 'https:' || url.hostname !== 'billing.stripe.com' || url.username || url.password || url.port) throw new AppError('Payment portal did not return a valid link', 502, 'BILLING_PORTAL_INVALID');
      return url.href;
    },
  };
}
