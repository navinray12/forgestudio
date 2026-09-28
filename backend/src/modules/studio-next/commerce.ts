import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database,type Actor } from './database.js';
import { parse,uuid,title,revision,checkRevision,StudioError } from './validation.js';
export type StripeTransport=(account:string,path:string,method:'GET'|'POST',body?:URLSearchParams,key?:string)=>Promise<any>;
export interface CommerceConfig { accounts:Record<string,string>; origin:string; webhookSecret?:string; transport?:StripeTransport }
export function stripeTransport(secret:string):StripeTransport {
  return async(account,path,method,body,key)=>{
    const r=await fetch(`https://api.stripe.com/v1/${path}`,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${secret}`,...(account!=='platform'?{'Stripe-Account':account}:{}),...(key?{'Idempotency-Key':key}:{}),...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(body?{body:body.toString()}:{})});
    const payload=await r.json().catch(()=>({}));
    if(!r.ok)throw new StudioError('Payment provider rejected the request. Check the configured account and price.',502,'PAYMENT_PROVIDER_ERROR');return payload;
  };
}
export function verifyStripe(raw:Buffer,header:string|undefined,secret:string,now=Date.now()):any{
  if(!Buffer.isBuffer(raw)||!header||raw.length>262144)throw new StudioError('A signed raw webhook is required',400,'INVALID_SIGNATURE');
  const parts=header.split(',').map(v=>v.trim().split('='));
  const timestamps=parts.filter(([k])=>k==='t');
  const stamp=timestamps[0]?.[1];
  if(timestamps.length!==1||!stamp||!/^\d+$/.test(stamp)||Math.abs(now/1000-Number(stamp))>300)throw new StudioError('Webhook timestamp is missing or expired',400,'INVALID_SIGNATURE');
  const expected=createHmac('sha256',secret).update(stamp+'.').update(raw).digest();
  const match=parts.filter(([k])=>k==='v1').some(([,v])=>!!v&&/^[\da-f]{64}$/i.test(v)&&timingSafeEqual(expected,Buffer.from(v,'hex')));
  if(!match)throw new StudioError('Invalid webhook signature',400,'INVALID_SIGNATURE');
  try{return JSON.parse(raw.toString('utf8'));}catch{throw new StudioError('Invalid webhook JSON');}
}
const productInput=z.object({name:title,description:z.string().max(10000).default(''),priceMinor:z.number().int().min(1).max(100000000),currency:z.enum(['usd','eur','gbp','inr']),stripePriceId:z.string().regex(/^price_[a-zA-Z0-9]+$/).max(120),active:z.boolean().default(false)}).strict();
export class Commerce {
  constructor(private db:Database,private config:CommerceConfig){}
  configured(siteId:string){return !!this.config.transport&&!!this.config.accounts[siteId]&&!!this.config.webhookSecret&&!!this.config.origin;}
  async products(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');
      const r=await c.query(`SELECT id,name,description,price_minor AS "priceMinor",currency,stripe_price_id AS "stripePriceId",active,revision FROM studio.products WHERE site_id=$1 ORDER BY created_at DESC LIMIT 200`,[siteId]);
      const orders=await c.query(`SELECT o.id,p.name,o.quantity,o.total_minor AS "totalMinor",o.currency,o.state,o.created_at AS "createdAt" FROM studio.checkout_orders o JOIN studio.products p ON p.id=o.product_id WHERE o.site_id=$1 ORDER BY o.created_at DESC LIMIT 100`,[siteId]);
      return {products:r.rows,orders:orders.rows,checkoutConfigured:this.configured(siteId),scope:'One-product hosted checkout. No inventory, tax, shipping, refunds, or subscription billing is implied.'};
    });
  }
  async saveProduct(actor:Actor,siteId:string,input:unknown,productId?:string){
    const b=productId?parse(productInput.extend({revision}).strict(),input):parse(productInput,input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);const id=productId?parse(uuid,productId):randomUUID();
      if(productId){const r=await c.query('SELECT revision FROM studio.products WHERE id=$1 AND site_id=$2 FOR UPDATE',[id,siteId]);if(!r.rows[0])throw new StudioError('Product not found',404);checkRevision(r.rows[0].revision,(b as any).revision);}
      await c.query(`INSERT INTO studio.products(id,site_id,name,description,price_minor,currency,stripe_price_id,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,price_minor=excluded.price_minor,currency=excluded.currency,stripe_price_id=excluded.stripe_price_id,active=excluded.active,revision=studio.products.revision+1`,[id,siteId,b.name,b.description,b.priceMinor,b.currency,b.stripePriceId,b.active]);
      await this.db.audit(c,actor,site,'commerce.product_saved',b.name);return {id};
    });
  }
  async catalog(siteId:string){
    parse(uuid,siteId);
    const r=await this.db.pool.query(`SELECT p.id,p.name,p.description,p.price_minor AS "priceMinor",p.currency FROM studio.products p JOIN public.websites w ON w.id=p.site_id WHERE p.site_id=$1 AND p.active AND w.status='PUBLISHED' ORDER BY p.created_at DESC LIMIT 200`,[siteId]);
    return {products:r.rows,checkoutConfigured:this.configured(siteId)};
  }
  async checkout(siteId:string,input:unknown){
    parse(uuid,siteId);
    const b=parse(z.object({productId:uuid,quantity:z.number().int().min(1).max(20),operationId:uuid}).strict(),input);
    if(!this.configured(siteId))throw new StudioError('Hosted checkout is not configured for this site',503,'PAYMENTS_NOT_CONFIGURED');
    const account=this.config.accounts[siteId]!;
    // Record immutable amount/account before the provider call. Never trust an amount from the browser.
    const order=await this.db.tx(async c=>{
      await c.query('SELECT id FROM public.websites WHERE id=$1 FOR UPDATE',[siteId]);
      const existing=await c.query('SELECT * FROM studio.checkout_orders WHERE id=$1 FOR UPDATE',[b.operationId]);
      if(existing.rows[0]){
        const o=existing.rows[0];if(o.site_id!==siteId||o.product_id!==b.productId||o.quantity!==b.quantity)throw new StudioError('Checkout request key already used',409,'IDEMPOTENCY_CONFLICT');
        if(o.state==='PAID'||o.state==='EXPIRED')throw new StudioError('This checkout has finished. Start a new order.',409);
        return o;
      }
      const r=await c.query(`SELECT p.* FROM studio.products p JOIN public.websites w ON w.id=p.site_id WHERE p.id=$1 AND p.site_id=$2 AND p.active AND w.status='PUBLISHED'`,[b.productId,siteId]);
      const p=r.rows[0];if(!p)throw new StudioError('Product not available',404);
      const recent=await c.query(`SELECT count(*)::int AS n FROM studio.checkout_orders WHERE site_id=$1 AND created_at>now()-interval '1 hour'`,[siteId]);if(recent.rows[0].n>=1000)throw new StudioError('Site checkout rate limit reached',429);
      const created=await c.query(`INSERT INTO studio.checkout_orders(id,site_id,product_id,quantity,total_minor,currency,stripe_account,price_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[b.operationId,siteId,p.id,b.quantity,p.price_minor*b.quantity,p.currency,account,p.stripe_price_id]);return created.rows[0];
    });
    if(order.checkout_url && order.state==='CHECKOUT')return {url:order.checkout_url,orderId:order.id};
    const price=await this.config.transport!(order.stripe_account,`prices/${encodeURIComponent(order.price_id)}`,'GET');
    if(!price.active||price.type!=='one_time'||price.currency!==order.currency||price.unit_amount*order.quantity!==order.total_minor)throw new StudioError('Provider price does not match the configured product. Correct the product before checkout.',409,'PRICE_MISMATCH');
    const body=new URLSearchParams({mode:'payment','line_items[0][price]':order.price_id,'line_items[0][quantity]':String(order.quantity),'metadata[studio_order_id]':order.id,'metadata[studio_site_id]':siteId,client_reference_id:order.id,success_url:`${this.config.origin}/shop/${siteId}?checkout=returned`,cancel_url:`${this.config.origin}/shop/${siteId}?checkout=cancelled`});
    const result=await this.config.transport!(order.stripe_account,'checkout/sessions','POST',body,`studio-${order.id}`);
    const url=typeof result.url==='string'?new URL(result.url):null;
    if(!url||url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||!/^cs_[A-Za-z0-9_]+$/.test(result.id))throw new StudioError('Invalid checkout response from provider',502,'PAYMENT_PROVIDER_ERROR');
    await this.db.pool.query(`UPDATE studio.checkout_orders SET provider_session=$2,checkout_url=$3,state=CASE WHEN state='PAID' THEN state ELSE 'CHECKOUT' END,updated_at=now() WHERE id=$1 AND (provider_session IS NULL OR provider_session=$2)`,[order.id,result.id,result.url]);
    return {url:result.url,orderId:order.id};
  }
  async webhook(raw:Buffer,signature:string|undefined){
    if(!this.config.webhookSecret)throw new StudioError('Webhook not configured',503,'PAYMENTS_NOT_CONFIGURED');
    const event=verifyStripe(raw,signature,this.config.webhookSecret);
    if(typeof event.id!=='string'||!/^evt_[A-Za-z0-9]+$/.test(event.id))throw new StudioError('Invalid provider event');
    const accepted=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired'];
    if(!accepted.includes(event.type))return {ignored:true};
    const data=event.data?.object,orderId=data?.metadata?.studio_order_id;
    if(!uuid.safeParse(orderId).success)return {ignored:true};
    if(typeof data.id!=='string'||!/^cs_[A-Za-z0-9_]+$/.test(data.id)||data.mode!=='payment')throw new StudioError('Invalid checkout event');
    return this.db.tx(async c=>{
      const replay=await c.query('INSERT INTO studio.payment_events(provider_event) VALUES($1) ON CONFLICT DO NOTHING RETURNING provider_event',[event.id]);
      if(!replay.rowCount)return {duplicate:true};
      const r=await c.query('SELECT * FROM studio.checkout_orders WHERE id=$1 FOR UPDATE',[orderId]);const order=r.rows[0];
      if(!order)return {ignored:true};
      if((event.account||'platform')!==order.stripe_account||data.metadata.studio_site_id!==order.site_id||(order.provider_session&&data.id!==order.provider_session)||data.client_reference_id!==order.id)throw new StudioError('Payment event does not match this order',409,'PAYMENT_MISMATCH');
      if(event.type==='checkout.session.expired'){
        await c.query(`UPDATE studio.checkout_orders SET state=CASE WHEN state='PAID' THEN state ELSE 'EXPIRED' END,updated_at=now() WHERE id=$1`,[orderId]);return {received:true};
      }
      if(data.payment_status!=='paid')return {awaitingPayment:true};
      if(data.amount_total!==order.total_minor||data.currency!==order.currency)throw new StudioError('Payment amount does not match the order',409,'PAYMENT_MISMATCH');
      await c.query(`UPDATE studio.checkout_orders SET state='PAID',provider_session=$2,updated_at=now() WHERE id=$1`,[orderId,data.id]);return {received:true};
    });
  }
}
