import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createStripeBillingProvider } from '../services/dashboard-billing-provider.js';
import { createDashboardBillingRouter, billingQuery, billingSupportInput } from '../routes/dashboard-billing.routes.js';
import { generateInvoicePdf } from '../services/dashboard-invoice-pdf.js';
import { errorMiddleware } from '../middlewares/error.middleware.js';
test('billing inputs reject spoofed identities, oversized search and invalid pages',()=>{
 assert.deepEqual(billingQuery.parse({}),{search:'',status:'all',page:1});
 for(const input of [{userId:'other'},{workspaceId:'other'},{status:'bad'},{page:0},{search:'a'.repeat(101)}])assert.equal(billingQuery.safeParse(input).success,false);
 assert.equal(billingSupportInput.safeParse({id:'dbb02d55-fbfc-479d-83fb-78ec1f112bec',subject:'Billing question',message:'Please help with my invoice.'}).success,true);
 assert.equal(billingSupportInput.safeParse({id:'bad',subject:'x',message:'x'}).success,false);
});
test('Stripe adapter uses only the supplied server identity and returns card display fields',async()=>{
 const calls:any[]=[];const provider=createStripeBillingProvider({STRIPE_SECRET_KEY:'test-only',FRONTEND_URL:'http://localhost:5173'},async(url,options)=>{calls.push({url,options});return Response.json(String(url).includes('billing_portal')?{url:'https://billing.stripe.com/p/session/test'}:{id:'cus_owner',invoice_settings:{default_payment_method:{type:'card',customer:'cus_owner',card:{brand:'visa',last4:'4242',exp_month:12,exp_year:2030},secret:'not-for-browser'}}});});
 assert.deepEqual(await provider.paymentMethod('cus_owner'),{brand:'visa',last4:'4242',expMonth:12,expYear:2030});
 assert.equal(await provider.portal('cus_owner'),'https://billing.stripe.com/p/session/test');
 const body=calls[1].options.body as URLSearchParams;assert.equal(body.get('customer'),'cus_owner');assert.equal(body.get('flow_data[type]'),'payment_method_update');assert.equal(body.get('return_url'),'http://localhost:5173/dashboard?section=billing');
 await assert.rejects(provider.portal('../../customers'),(e:any)=>e.code==='BILLING_CUSTOMER_INVALID');assert.equal(calls.length,2);
});
test('payment provider fails safely when missing, unavailable or returning an unsafe portal',async()=>{
 let calls=0;const unavailable=createStripeBillingProvider({},async()=>{calls++;throw Error('must not call');});assert.equal(unavailable.configured,false);await assert.rejects(unavailable.portal('cus_owner'),(e:any)=>e.statusCode===503);assert.equal(calls,0);
 for(const url of ['javascript:alert(1)','https://billing.stripe.com.evil.invalid','https://user@billing.stripe.com','http://billing.stripe.com']){const provider=createStripeBillingProvider({STRIPE_SECRET_KEY:'test'},async()=>Response.json({url}));await assert.rejects(provider.portal('cus_owner'),(e:any)=>e.code==='BILLING_PORTAL_INVALID');}
 const failed=createStripeBillingProvider({STRIPE_SECRET_KEY:'test'},async()=>{throw Error('secret provider detail');});await assert.rejects(failed.paymentMethod('cus_owner'),(e:any)=>e.statusCode===502&&!e.message.includes('secret'));
 const mismatch=createStripeBillingProvider({STRIPE_SECRET_KEY:'test'},async()=>Response.json({id:'cus_other'}));await assert.rejects(mismatch.paymentMethod('cus_owner'),(e:any)=>e.code==='BILLING_CUSTOMER_INVALID');
});
test('invoice PDF has valid offsets, escaped content and stored amount/status',()=>{
 const bytes=generateInvoicePdf({invoiceNumber:'INV-(test)\\sample',amount:999.5,currency:'INR',status:'PENDING',createdAt:'2026-10-28',billingPeriodStart:'2026-10-01',billingPeriodEnd:'2026-11-01'}),pdf=bytes.toString();
 assert.ok(pdf.startsWith('%PDF-1.4'));assert.ok(pdf.includes('INR 999.50'));assert.ok(pdf.includes('Status: PENDING'));assert.ok(pdf.includes('INV-\\(test\\)\\\\sample'));const offset=Number(pdf.match(/startxref\n(\d+)/)?.[1]);assert.equal(pdf.slice(offset,offset+4),'xref');
});
test('billing routes authenticate each endpoint and do not intercept unrelated public routes',async()=>{
 const calls:any[]=[];const service:any={read:async(u:string,i:any)=>{calls.push([u,i]);return {scope:'account'};}};const app=express();app.use(express.json());app.use('/api',createDashboardBillingRouter((req,res,next)=>{if(!req.headers.authorization){res.sendStatus(401);return;}res.locals.user={id:'owner'};next();},service));app.get('/api/public',(_req,res)=>res.sendStatus(200));app.use(errorMiddleware);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}/api`;
 try{for(const path of ['', '/payment-method','/support','/invoices/not-id/download'])assert.equal((await fetch(base+'/dashboard/billing'+path)).status,401);assert.equal((await fetch(base+'/public')).status,200);const headers={authorization:'test','Content-Type':'application/json'};
  assert.equal((await fetch(base+'/dashboard/billing?userId=other',{headers})).status,400);assert.equal((await fetch(base+'/dashboard/billing/portal',{method:'POST',headers,body:JSON.stringify({customer:'cus_other'})})).status,400);assert.equal(calls.length,0);
  const response=await fetch(base+'/dashboard/billing?status=PAID&page=2',{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(calls,[['owner',{search:'',status:'PAID',page:2}]]);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
