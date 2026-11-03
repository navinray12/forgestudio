import { AppError } from '../utils/app-error.js';
import type { BillingProvider } from './dashboard-billing-provider.js';
export type BillingInput = { search: string; status: string; page: number };
const invoiceFields = { id: true, invoiceNumber: true, amount: true, currency: true, status: true, billingPeriodStart: true, billingPeriodEnd: true, createdAt: true };
const planFields = { name: true, slug: true, price: true, currency: true, billingInterval: true };
export function createDashboardBillingService(db: any, provider: BillingProvider, clock = () => new Date()) {
  async function active(client: any, userId: string) {
    const user = await client.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status !== 'ACTIVE') throw new AppError('Your account cannot access billing', 403, 'ACCOUNT_INACTIVE');
  }
  async function customer(userId: string) {
    await active(db, userId);
    const [row] = await db.$queryRaw`SELECT "providerCustomerId" FROM dashboard_billing_customers WHERE "userId"=${userId}::uuid AND provider='stripe'`;
    return row?.providerCustomerId || null;
  }
  async function read(userId: string, input: BillingInput) {
    return db.$transaction(async (tx: any) => {
      await active(tx, userId);
      // Escape LIKE metacharacters: invoice-number searches are literal, not SQL patterns.
      const search = input.search.replace(/[\\%_]/g, '\\$&');
      const where = { userId, ...(search ? { invoiceNumber: { contains: search, mode: 'insensitive' } } : {}), ...(input.status !== 'all' ? { status: input.status } : {}) };
      // One transaction connection: keep its queries sequential for pg compatibility.
      const subscription = await tx.userSubscription.findUnique({ where: { userId }, select: { status: true, currentPeriodStart: true, currentPeriodEnd: true, plan: { select: planFields } } });
      const free = await tx.subscriptionPlan.findUnique({ where: { slug: 'free' }, select: planFields });
      const latest = await tx.billingInvoice.findFirst({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
      const total = await tx.billingInvoice.count({ where });
      const invoices = await tx.billingInvoice.findMany({ where, select: invoiceFields, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 6, skip: (input.page - 1) * 6 });
      const mapping = await tx.$queryRaw`SELECT "providerCustomerId" FROM dashboard_billing_customers WHERE "userId"=${userId}::uuid AND provider='stripe'`;
      const plan = subscription?.plan || free || { name: 'Free', slug: 'free', price: 0, currency: 'INR', billingInterval: 'monthly' };
      const end = subscription?.currentPeriodEnd;
      const nextBillingDate = subscription?.status === 'ACTIVE' && Number(plan.price) > 0 && end && new Date(end) > clock() ? end : null;
      return { scope: 'account', subscription: { status: subscription?.status || 'FREE', plan, currentPeriodEnd: end || null, nextBillingDate }, invoices, total, page: input.page, pageSize: 6, latestInvoiceId: latest?.id || null,
        payment: { available: Boolean(provider.configured && mapping[0]), reason: !provider.configured ? 'Payment management is not configured yet.' : !mapping[0] ? 'No payment account is connected yet.' : null } };
    }, { isolationLevel: 'RepeatableRead' });
  }
  async function invoice(userId: string, id: string) {
    await active(db, userId);
    const row = await db.billingInvoice.findFirst({ where: { id, userId }, select: invoiceFields });
    if (!row) throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
    return row;
  }
  async function paymentMethod(userId: string) {
    const id = await customer(userId);
    if (!provider.configured || !id) return { method: null, available: false };
    return { method: await provider.paymentMethod(id), available: true };
  }
  async function portal(userId: string) {
    const id = await customer(userId);
    if (!provider.configured || !id) throw new AppError('Payment management is not connected. Contact billing support for help.', 503, 'BILLING_PROVIDER_UNAVAILABLE');
    return { url: await provider.portal(id) };
  }
  async function support(userId: string, input: { id: string; subject: string; message: string }) {
    return db.$transaction(async (tx: any) => {
      await active(tx, userId);
      const [category] = await tx.$queryRaw`SELECT id FROM support_categories WHERE slug='billing-subscriptions' AND "isActive" FOR SHARE`;
      if (!category) throw new AppError('Billing support is temporarily unavailable. Please try again later.', 503, 'BILLING_SUPPORT_UNAVAILABLE');
      const number = `BILL-${input.id}`;
      await tx.$queryRaw`INSERT INTO support_tickets(id,"ticketNumber","userId","categoryId",subject,description,tags) VALUES(${input.id}::uuid,${number},${userId}::uuid,${category.id}::uuid,${input.subject},${input.message},ARRAY['dashboard-billing']) ON CONFLICT(id) DO NOTHING RETURNING id`;
      const [ticket] = await tx.$queryRaw`SELECT "ticketNumber","userId",subject,description FROM support_tickets WHERE id=${input.id}::uuid`;
      if (!ticket || ticket.userId !== userId || ticket.subject !== input.subject || ticket.description !== input.message) throw new AppError('This request was already used. Please create a new request.', 409, 'BILLING_REQUEST_CONFLICT');
      return { ticketNumber: ticket.ticketNumber };
    });
  }
  async function supportHistory(userId: string) {
    await active(db, userId);
    const tickets = await db.$queryRaw`SELECT t."ticketNumber",t.subject,t.status,t."createdAt" FROM support_tickets t JOIN support_categories c ON c.id=t."categoryId" WHERE t."userId"=${userId}::uuid AND c.slug='billing-subscriptions' ORDER BY t."createdAt" DESC,t.id LIMIT 10`;
    return { tickets };
  }
  return { read, invoice, paymentMethod, portal, support, supportHistory };
}
