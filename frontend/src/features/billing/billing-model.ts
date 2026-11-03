export type Invoice = { id: string; invoiceNumber: string; amount: number; currency: string; status: string; createdAt: string; billingPeriodStart: string; billingPeriodEnd: string };
export type Billing = { scope: 'account'; subscription: { status: string; plan: { name: string; slug: string; price: number; currency: string; billingInterval: string }; currentPeriodEnd: string | null; nextBillingDate: string | null }; invoices: Invoice[]; total: number; page: number; pageSize: number; latestInvoiceId: string | null; payment: { available: boolean; reason: string | null } };
export type PaymentMethod = { brand: string; last4: string; expMonth: number; expYear: number };
export type SupportTicket = { ticketNumber: string; subject: string; status: string; createdAt: string };
export const invoiceStatuses = ['all', 'PAID', 'PENDING', 'FAILED', 'VOID', 'REFUNDED', 'DRAFT', 'OPEN', 'UNPAID', 'CANCELED'] as const;
export function billingQuery(search: string, status: string, page: number) { return new URLSearchParams({ search: search.trim(), status, page: String(page) }).toString(); }
export function billingMoney(value: number, currency: string) { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2 }).format(Number(value)); } catch { return `${currency} ${Number(value).toFixed(2)}`; } }
export function billingDate(value: string | null, full = false) { return value ? new Date(value).toLocaleDateString(undefined, { month: full ? 'long' : 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Not scheduled'; }
export function billingInterval(value: string) { return ['year','yearly','annual','annually'].includes(value.toLowerCase()) ? 'year' : ['month','monthly'].includes(value.toLowerCase()) ? 'month' : value; }
export function billingLabel(value: string) { return value.replaceAll('_',' ').toLowerCase().replace(/^./, char => char.toUpperCase()); }
export async function billingRequest<T>(path = '', options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dashboard/billing${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(response.status === 401 ? 'Your session has expired. Please sign in again.' : data?.error?.message || data?.message || 'Unable to load billing. Please try again.'); }
  return response.headers.get('content-type')?.includes('application/pdf') ? await response.blob() as T : response.json();
}
