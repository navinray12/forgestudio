import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/app-error.js';
import { generateInvoicePdf } from '../services/dashboard-invoice-pdf.js';
import type { createDashboardBillingService } from '../services/dashboard-billing.service.js';
export const billingQuery = z.object({ search: z.string().trim().max(100).default(''), status: z.enum(['all','PAID','PENDING','FAILED','VOID','REFUNDED','DRAFT','OPEN','UNPAID','CANCELED']).default('all'), page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();
export const billingSupportInput = z.object({ id: z.uuid(), subject: z.string().trim().min(5).max(180), message: z.string().trim().min(10).max(5000) }).strict();
export function createDashboardBillingRouter(auth: RequestHandler, service: ReturnType<typeof createDashboardBillingService>) {
  const router = Router();
  const writes = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Please wait a minute and try again.' } });
  const handle = (schema: z.ZodType, source: 'query' | 'body', action: (userId: string, input: any) => Promise<any>): RequestHandler => async (req,res,next) => {
    const parsed = schema.safeParse(source === 'query' ? req.query : req.body);
    if (!parsed.success) { res.status(400).json({ message: 'Check the billing fields and try again.' }); return; }
    res.setHeader('Cache-Control', 'private, no-store');
    try { res.json(await action(res.locals.user.id, parsed.data)); } catch (error: any) {
      if (['42P01','42703'].includes(error?.meta?.code || error?.code)) next(new AppError('Billing storage needs setup. Apply the dashboard billing migration and retry.',503,'BILLING_STORAGE_NOT_READY')); else next(error);
    }
  };
  router.get('/dashboard/billing',auth,handle(billingQuery,'query',(u,i)=>service.read(u,i)));
  router.get('/dashboard/billing/payment-method',auth,handle(z.object({}).strict(),'query',u=>service.paymentMethod(u)));
  router.post('/dashboard/billing/portal',auth,writes,handle(z.object({}).strict(),'body',u=>service.portal(u)));
  router.get('/dashboard/billing/support',auth,handle(z.object({}).strict(),'query',u=>service.supportHistory(u)));
  router.post('/dashboard/billing/support',auth,writes,handle(billingSupportInput,'body',(u,i)=>service.support(u,i)));
  router.get('/dashboard/billing/invoices/:id/download',auth,async(req,res,next)=>{
    if (!z.uuid().safeParse(req.params.id).success || Object.keys(req.query).length) { res.status(400).json({message:'Choose a valid invoice.'}); return; }
    res.setHeader('Cache-Control','private, no-store');
    try { const invoice=await service.invoice(res.locals.user.id,req.params.id as string);res.type('application/pdf').attachment(`invoice-${invoice.id}.pdf`).send(generateInvoicePdf(invoice)); } catch(error) { next(error); }
  });
  return router;
}
