import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database,type Actor,type Client } from './database.js';
import { parse,uuid,title,revision,checkRevision,StudioError } from './validation.js';

export type StripeTransport=(account:string,path:string,method:'GET'|'POST',body?:URLSearchParams,key?:string)=>Promise<any>;
export interface CommerceConfig { accounts:Record<string,string>; origin:string; webhookSecret?:string; transport?:StripeTransport }

export function stripeTransport(secret:string):StripeTransport {
  return async(account,path,method,body,key)=>{
    const r=await fetch(`https://api.stripe.com/v1/${path}`,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${secret}`,...(account!=='platform'?{'Stripe-Account':account}:{}),...(key?{'Idempotency-Key':key}:{}),...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(body?{body:body.toString()}:{})});
    const payload=await r.json().catch(()=>({}));
    if(!r.ok)throw new StudioError('Payment provider rejected the request. Check the configured account and price.',502,'PAYMENT_PROVIDER_ERROR');
    return payload;
  };
}
export function verifyStripe(raw:Buffer,header:string|undefined,secret:string,now=Date.now()):any{
  if(!Buffer.isBuffer(raw)||!header||raw.length>262144)throw new StudioError('A signed raw webhook is required',400,'INVALID_SIGNATURE');
  const parts=header.split(',').map(v=>v.trim().split('=')),timestamps=parts.filter(([k])=>k==='t'),stamp=timestamps[0]?.[1];
  if(timestamps.length!==1||!stamp||!/^\d+$/.test(stamp)||Math.abs(now/1000-Number(stamp))>300)throw new StudioError('Webhook timestamp is missing or expired',400,'INVALID_SIGNATURE');
  const expected=createHmac('sha256',secret).update(stamp+'.').update(raw).digest();
  const match=parts.filter(([k])=>k==='v1').some(([,v])=>!!v&&/^[\da-f]{64}$/i.test(v)&&timingSafeEqual(expected,Buffer.from(v,'hex')));
  if(!match)throw new StudioError('Invalid webhook signature',400,'INVALID_SIGNATURE');
  try{return JSON.parse(raw.toString('utf8'));}catch{throw new StudioError('Invalid webhook JSON');}
}

const productInput=z.object({
  name:title,description:z.string().max(10000).default(''),priceMinor:z.number().int().min(1).max(100000000),
  currency:z.enum(['usd','eur','gbp','inr']),stripePriceId:z.string().regex(/^price_[a-zA-Z0-9]+$/).max(120),active:z.boolean().default(false),
  billingType:z.enum(['ONE_TIME','RECURRING']).default('ONE_TIME'),billingInterval:z.enum(['month','year']).nullable().optional(),
  inventoryQuantity:z.number().int().min(0).max(100000000).nullable().default(null),
}).strict().superRefine((v,ctx)=>{if(v.billingType==='RECURRING'&&!v.billingInterval)ctx.addIssue({code:'custom',message:'Recurring products require a billing interval',path:['billingInterval']});if(v.billingType==='ONE_TIME'&&v.billingInterval)ctx.addIssue({code:'custom',message:'One-time products cannot use a billing interval',path:['billingInterval']});});
const cartInput=z.object({items:z.array(z.object({productId:uuid,quantity:z.number().int().min(1).max(20)}).strict()).min(1).max(20),operationId:uuid}).strict()
  .superRefine((v,ctx)=>{const ids=v.items.map(x=>x.productId);if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Combine duplicate products before checkout',path:['items']});});
const refundInput=z.object({orderId:uuid,amountMinor:z.number().int().min(1),operationId:uuid}).strict();

export class Commerce {
  constructor(private db:Database,private config:CommerceConfig){}
  configured(siteId:string){return !!this.config.transport&&!!this.config.accounts[siteId]&&!!this.config.webhookSecret&&!!this.config.origin;}

  async products(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');
      const r=await c.query(`SELECT id,name,description,price_minor AS "priceMinor",currency,stripe_price_id AS "stripePriceId",active,revision,billing_type AS "billingType",billing_interval AS "billingInterval",inventory_quantity AS "inventoryQuantity" FROM studio.products WHERE site_id=$1 ORDER BY created_at DESC LIMIT 200`,[siteId]);
      const orders=await c.query(`SELECT o.id,o.quantity,o.total_minor AS "totalMinor",o.currency,o.state,o.checkout_mode AS "checkoutMode",o.provider_subscription AS "providerSubscription",o.provider_payment_intent AS "providerPaymentIntent",o.created_at AS "createdAt",
        GREATEST(0,o.total_minor-COALESCE((SELECT sum(r.amount_minor) FROM studio.refunds r WHERE r.order_id=o.id AND r.state IN ('REQUESTED','SUCCEEDED')),0))::int AS "refundableMinor",
        COALESCE(json_agg(json_build_object('productId',i.product_id,'name',i.product_name,'quantity',i.quantity,'unitMinor',i.unit_minor,'totalMinor',i.total_minor)) FILTER (WHERE i.id IS NOT NULL),'[]') AS items
        FROM studio.checkout_orders o LEFT JOIN studio.checkout_order_items i ON i.order_id=o.id WHERE o.site_id=$1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`,[siteId]);
      const entitlements=await c.query(`SELECT e.id,e.order_id AS "orderId",e.product_id AS "productId",p.name,e.state,e.provider_subscription AS "providerSubscription",e.current_period_end AS "currentPeriodEnd",e.updated_at AS "updatedAt" FROM studio.entitlements e JOIN studio.products p ON p.id=e.product_id WHERE e.site_id=$1 ORDER BY e.updated_at DESC LIMIT 200`,[siteId]);
      const refunds=await c.query(`SELECT id,order_id AS "orderId",amount_minor AS "amountMinor",state,provider_ref AS "providerRef",created_at AS "createdAt" FROM studio.refunds WHERE site_id=$1 ORDER BY created_at DESC LIMIT 100`,[siteId]);
      return {products:r.rows,orders:orders.rows,entitlements:entitlements.rows,refunds:refunds.rows,checkoutConfigured:this.configured(siteId),scope:'Hosted Stripe cart checkout supports one-time or recurring products per checkout, inventory reservations, subscription entitlement reconciliation and explicit refunds. Tax/shipping calculation still depends on external provider configuration.'};
    });
  }

  async saveProduct(actor:Actor,siteId:string,input:unknown,productId?:string){
    const b=productId?parse(productInput.extend({revision}).strict(),input):parse(productInput,input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true),id=productId?parse(uuid,productId):randomUUID();
      if(productId){const r=await c.query('SELECT revision FROM studio.products WHERE id=$1 AND site_id=$2 FOR UPDATE',[id,siteId]);if(!r.rows[0])throw new StudioError('Product not found',404);checkRevision(r.rows[0].revision,(b as any).revision);}
      await c.query(`INSERT INTO studio.products(id,site_id,name,description,price_minor,currency,stripe_price_id,active,billing_type,billing_interval,inventory_quantity)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,price_minor=excluded.price_minor,currency=excluded.currency,stripe_price_id=excluded.stripe_price_id,active=excluded.active,billing_type=excluded.billing_type,billing_interval=excluded.billing_interval,inventory_quantity=excluded.inventory_quantity,revision=studio.products.revision+1`,
        [id,siteId,b.name,b.description,b.priceMinor,b.currency,b.stripePriceId,b.active,b.billingType,b.billingType==='RECURRING'?b.billingInterval:null,b.inventoryQuantity]);
      await this.db.audit(c,actor,site,'commerce.product_saved',b.name);return {id};
    });
  }

  async catalog(siteId:string){
    parse(uuid,siteId);
    const r=await this.db.pool.query(`SELECT p.id,p.name,p.description,p.price_minor AS "priceMinor",p.currency,p.billing_type AS "billingType",p.billing_interval AS "billingInterval",p.inventory_quantity AS "inventoryQuantity"
      FROM studio.products p JOIN public.websites w ON w.id=p.site_id WHERE p.site_id=$1 AND p.active AND w.status='PUBLISHED' AND (p.inventory_quantity IS NULL OR p.inventory_quantity>0) ORDER BY p.created_at DESC LIMIT 200`,[siteId]);
    return {products:r.rows,checkoutConfigured:this.configured(siteId)};
  }

  async checkout(siteId:string,input:unknown){
    const b=parse(z.object({productId:uuid,quantity:z.number().int().min(1).max(20),operationId:uuid}).strict(),input);
    return this.checkoutCart(siteId,{items:[{productId:b.productId,quantity:b.quantity}],operationId:b.operationId});
  }

  private async restoreInventory(c:Client,orderId:string){
    const order=await c.query('SELECT inventory_reserved FROM studio.checkout_orders WHERE id=$1 FOR UPDATE',[orderId]);
    if(!order.rows[0]?.inventory_reserved)return;
    const items=await c.query('SELECT product_id,quantity FROM studio.checkout_order_items WHERE order_id=$1',[orderId]);
    for(const item of items.rows)await c.query('UPDATE studio.products SET inventory_quantity=CASE WHEN inventory_quantity IS NULL THEN NULL ELSE inventory_quantity+$2 END WHERE id=$1',[item.product_id,item.quantity]);
    await c.query('UPDATE studio.checkout_orders SET inventory_reserved=false WHERE id=$1',[orderId]);
  }

  async checkoutCart(siteId:string,input:unknown){
    parse(uuid,siteId);const b=parse(cartInput,input);
    if(!this.configured(siteId))throw new StudioError('Hosted checkout is not configured for this site',503,'PAYMENTS_NOT_CONFIGURED');
    const account=this.config.accounts[siteId]!,requested=new Map(b.items.map(x=>[x.productId,x.quantity]));
    const order=await this.db.tx(async c=>{
      await c.query('SELECT id FROM public.websites WHERE id=$1 AND status=\'PUBLISHED\' FOR UPDATE',[siteId]);
      const existing=await c.query('SELECT * FROM studio.checkout_orders WHERE id=$1 FOR UPDATE',[b.operationId]);
      if(existing.rows[0]){
        const lines=await c.query('SELECT product_id,quantity FROM studio.checkout_order_items WHERE order_id=$1',[b.operationId]);
        const same=lines.rows.length===requested.size&&lines.rows.every(x=>requested.get(x.product_id)===x.quantity);
        if(existing.rows[0].site_id!==siteId||!same)throw new StudioError('Checkout request key already used',409,'IDEMPOTENCY_CONFLICT');
        if(['PAID','EXPIRED','FAILED'].includes(existing.rows[0].state))throw new StudioError('This checkout has finished. Start a new order.',409,'CHECKOUT_FINISHED');
        return existing.rows[0];
      }
      const ids=[...requested.keys()],result=await c.query(`SELECT p.* FROM studio.products p JOIN public.websites w ON w.id=p.site_id WHERE p.id=ANY($1::uuid[]) AND p.site_id=$2 AND p.active AND w.status='PUBLISHED' FOR UPDATE OF p`,[ids,siteId]);
      if(result.rows.length!==ids.length)throw new StudioError('One or more products are unavailable',404);
      const currencies=new Set(result.rows.map(p=>p.currency)),billing=new Set(result.rows.map(p=>p.billing_type));
      if(currencies.size!==1)throw new StudioError('All cart products must use one currency',409,'CART_CURRENCY_MISMATCH');
      if(billing.size!==1)throw new StudioError('One-time and recurring products must use separate checkouts',409,'CART_BILLING_MISMATCH');
      const mode=result.rows[0].billing_type==='RECURRING'?'subscription':'payment',currency=result.rows[0].currency;
      if(mode==='subscription'&&new Set(result.rows.map(p=>p.billing_interval)).size!==1)throw new StudioError('Recurring cart products must share one billing interval',409,'CART_INTERVAL_MISMATCH');
      let total=0,totalQty=0,reserved=false;
      for(const p of result.rows){
        const quantity=requested.get(p.id)!;total+=Number(p.price_minor)*quantity;totalQty+=quantity;
        if(p.inventory_quantity!==null){
          if(Number(p.inventory_quantity)<quantity)throw new StudioError(`${p.name} does not have enough inventory`,409,'OUT_OF_STOCK');
          await c.query('UPDATE studio.products SET inventory_quantity=inventory_quantity-$2 WHERE id=$1',[p.id,quantity]);reserved=true;
        }
      }
      const recent=await c.query(`SELECT count(*)::int AS n FROM studio.checkout_orders WHERE site_id=$1 AND created_at>now()-interval '1 hour'`,[siteId]);if(recent.rows[0].n>=1000)throw new StudioError('Site checkout rate limit reached',429);
      const single=result.rows.length===1?result.rows[0]:null;
      const created=await c.query(`INSERT INTO studio.checkout_orders(id,site_id,product_id,quantity,total_minor,currency,stripe_account,price_id,checkout_mode,inventory_reserved)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[b.operationId,siteId,single?.id??null,totalQty,total,currency,account,single?.stripe_price_id??'',mode,reserved]);
      for(const p of result.rows){const quantity=requested.get(p.id)!;await c.query(`INSERT INTO studio.checkout_order_items(id,order_id,product_id,product_name,price_id,quantity,unit_minor,total_minor) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[randomUUID(),b.operationId,p.id,p.name,p.stripe_price_id,quantity,p.price_minor,Number(p.price_minor)*quantity]);}
      return created.rows[0];
    });
    if(order.checkout_url&&order.state==='CHECKOUT')return {url:order.checkout_url,orderId:order.id,mode:order.checkout_mode};
    try{
      const lines=await this.db.pool.query(`SELECT i.*,p.billing_type,p.billing_interval FROM studio.checkout_order_items i JOIN studio.products p ON p.id=i.product_id WHERE i.order_id=$1 ORDER BY i.created_at`,[order.id]);
      for(const line of lines.rows){
        const price=await this.config.transport!(order.stripe_account,`prices/${encodeURIComponent(line.price_id)}`,'GET'),expected=line.billing_type==='RECURRING'?'recurring':'one_time';
        if(!price.active||price.type!==expected||price.currency!==order.currency||Number(price.unit_amount)!==Number(line.unit_minor))throw new StudioError('Provider price does not match the configured product. Correct the product before checkout.',409,'PRICE_MISMATCH');
        if(expected==='recurring'&&price.recurring?.interval!==line.billing_interval)throw new StudioError('Provider recurring interval does not match the configured product.',409,'PRICE_MISMATCH');
      }
      const body=new URLSearchParams({mode:order.checkout_mode,'metadata[studio_order_id]':order.id,'metadata[studio_site_id]':siteId,client_reference_id:order.id,success_url:`${this.config.origin}/shop/${siteId}?checkout=returned`,cancel_url:`${this.config.origin}/shop/${siteId}?checkout=cancelled`});
      lines.rows.forEach((line:any,index:number)=>{body.set(`line_items[${index}][price]`,line.price_id);body.set(`line_items[${index}][quantity]`,String(line.quantity));});
      if(order.checkout_mode==='subscription'){body.set('subscription_data[metadata][studio_order_id]',order.id);body.set('subscription_data[metadata][studio_site_id]',siteId);}
      const result=await this.config.transport!(order.stripe_account,'checkout/sessions','POST',body,`studio-${order.id}`),url=typeof result.url==='string'?new URL(result.url):null;
      if(!url||url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||!/^cs_[A-Za-z0-9_]+$/.test(result.id))throw new StudioError('Invalid checkout response from provider',502,'PAYMENT_PROVIDER_ERROR');
      await this.db.pool.query(`UPDATE studio.checkout_orders SET provider_session=$2,checkout_url=$3,state=CASE WHEN state='PAID' THEN state ELSE 'CHECKOUT' END,updated_at=now() WHERE id=$1 AND (provider_session IS NULL OR provider_session=$2)`,[order.id,result.id,result.url]);
      return {url:result.url,orderId:order.id,mode:order.checkout_mode};
    }catch(error){
      await this.db.tx(async c=>{await this.restoreInventory(c,order.id);await c.query("UPDATE studio.checkout_orders SET state=CASE WHEN state='PAID' THEN state ELSE 'FAILED' END,updated_at=now() WHERE id=$1",[order.id]);}).catch(()=>undefined);
      throw error;
    }
  }

  async refund(actor:Actor,siteId:string,input:unknown){
    const b=parse(refundInput,input);
    if(!this.configured(siteId))throw new StudioError('Payments are not configured',503,'PAYMENTS_NOT_CONFIGURED');
    const account=this.config.accounts[siteId]!;
    const state=await this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      const replay=await c.query('SELECT * FROM studio.refunds WHERE operation_id=$1',[b.operationId]);if(replay.rows[0])return {site,refund:replay.rows[0],replayed:true};
      const order=await c.query('SELECT * FROM studio.checkout_orders WHERE id=$1 AND site_id=$2 FOR UPDATE',[b.orderId,siteId]);if(!order.rows[0]||order.rows[0].state!=='PAID')throw new StudioError('Only paid orders can be refunded',409,'REFUND_STATE');
      if(!order.rows[0].provider_payment_intent)throw new StudioError('Payment intent is unavailable for this order',409,'REFUND_UNAVAILABLE');
      const prior=await c.query("SELECT COALESCE(sum(amount_minor),0)::bigint AS total FROM studio.refunds WHERE order_id=$1 AND state IN ('REQUESTED','SUCCEEDED')",[b.orderId]),remaining=Number(order.rows[0].total_minor)-Number(prior.rows[0].total);
      if(b.amountMinor>remaining)throw new StudioError('Refund exceeds the remaining paid amount',409,'REFUND_AMOUNT');
      const id=randomUUID();await c.query(`INSERT INTO studio.refunds(id,site_id,order_id,operation_id,amount_minor,created_by) VALUES($1,$2,$3,$4,$5,$6)`,[id,siteId,b.orderId,b.operationId,b.amountMinor,actor.id]);return {site,refund:{id},replayed:false,order:order.rows[0]};
    });
    if(state.replayed)return {refundId:state.refund.id,state:state.refund.state,providerRef:state.refund.provider_ref,replayed:true};
    try{
      const body=new URLSearchParams({payment_intent:state.order.provider_payment_intent,amount:String(b.amountMinor)});
      body.set('metadata[studio_order_id]',b.orderId);body.set('metadata[studio_refund_id]',state.refund.id);
      const result=await this.config.transport!(account,'refunds','POST',body,`studio-refund-${b.operationId}`);
      if(typeof result.id!=='string'||!/^re_[A-Za-z0-9_]+$/.test(result.id))throw new StudioError('Invalid refund response from provider',502,'PAYMENT_PROVIDER_ERROR');
      await this.db.pool.query("UPDATE studio.refunds SET state='SUCCEEDED',provider_ref=$2,updated_at=now() WHERE id=$1",[state.refund.id,result.id]);
      await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');await this.db.audit(c,actor,site,'commerce.refund_succeeded',state.refund.id);});
      return {refundId:state.refund.id,state:'SUCCEEDED',providerRef:result.id,replayed:false};
    }catch(error){await this.db.pool.query("UPDATE studio.refunds SET state='FAILED',updated_at=now() WHERE id=$1",[state.refund.id]).catch(()=>undefined);throw error;}
  }

  async webhook(raw:Buffer,signature:string|undefined){
    if(!this.config.webhookSecret)throw new StudioError('Webhook not configured',503,'PAYMENTS_NOT_CONFIGURED');
    const event=verifyStripe(raw,signature,this.config.webhookSecret);
    if(typeof event.id!=='string'||!/^evt_[A-Za-z0-9]+$/.test(event.id))throw new StudioError('Invalid provider event');
    const accepted=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired','customer.subscription.updated','customer.subscription.deleted'];
    if(!accepted.includes(event.type))return {ignored:true};
    const data=event.data?.object;
    if(event.type.startsWith('customer.subscription.')){
      const orderId=data?.metadata?.studio_order_id;if(!uuid.safeParse(orderId).success)return {ignored:true};
      return this.db.tx(async c=>{
        const replay=await c.query('INSERT INTO studio.payment_events(provider_event) VALUES($1) ON CONFLICT DO NOTHING RETURNING provider_event',[event.id]);if(!replay.rowCount)return {duplicate:true};
        const order=await c.query('SELECT * FROM studio.checkout_orders WHERE id=$1 FOR UPDATE',[orderId]);if(!order.rows[0])return {ignored:true};
        if((event.account||'platform')!==order.rows[0].stripe_account||data.id!==order.rows[0].provider_subscription)throw new StudioError('Subscription event does not match this order',409,'PAYMENT_MISMATCH');
        const mapped=event.type==='customer.subscription.deleted'?'CANCELED':data.status==='active'||data.status==='trialing'?'ACTIVE':data.status==='past_due'?'PAST_DUE':'CANCELED';
        await c.query('UPDATE studio.entitlements SET state=$2,current_period_end=CASE WHEN $3::bigint>0 THEN to_timestamp($3) ELSE current_period_end END,updated_at=now() WHERE order_id=$1',[orderId,mapped,Number(data.current_period_end||0)]);
        return {received:true};
      });
    }
    const orderId=data?.metadata?.studio_order_id;if(!uuid.safeParse(orderId).success)return {ignored:true};
    if(typeof data.id!=='string'||!/^cs_[A-Za-z0-9_]+$/.test(data.id))throw new StudioError('Invalid checkout event');
    return this.db.tx(async c=>{
      const replay=await c.query('INSERT INTO studio.payment_events(provider_event) VALUES($1) ON CONFLICT DO NOTHING RETURNING provider_event',[event.id]);if(!replay.rowCount)return {duplicate:true};
      const r=await c.query('SELECT * FROM studio.checkout_orders WHERE id=$1 FOR UPDATE',[orderId]),order=r.rows[0];if(!order)return {ignored:true};
      if((event.account||'platform')!==order.stripe_account||data.metadata.studio_site_id!==order.site_id||(order.provider_session&&data.id!==order.provider_session)||data.client_reference_id!==order.id||data.mode!==order.checkout_mode)throw new StudioError('Payment event does not match this order',409,'PAYMENT_MISMATCH');
      if(event.type==='checkout.session.expired'){
        await this.restoreInventory(c,orderId);await c.query(`UPDATE studio.checkout_orders SET state=CASE WHEN state='PAID' THEN state ELSE 'EXPIRED' END,updated_at=now() WHERE id=$1`,[orderId]);return {received:true};
      }
      if(!['paid','no_payment_required'].includes(String(data.payment_status)))return {awaitingPayment:true};
      if(data.amount_total!==null&&data.amount_total!==undefined&&Number(data.amount_total)!==Number(order.total_minor))throw new StudioError('Payment amount does not match the order',409,'PAYMENT_MISMATCH');
      if(data.currency&&data.currency!==order.currency)throw new StudioError('Payment currency does not match the order',409,'PAYMENT_MISMATCH');
      await c.query(`UPDATE studio.checkout_orders SET state='PAID',provider_session=$2,provider_subscription=$3,provider_payment_intent=$4,provider_customer=$5,inventory_reserved=false,updated_at=now() WHERE id=$1`,[orderId,data.id,data.subscription||null,data.payment_intent||null,data.customer||null]);
      if(order.checkout_mode==='subscription'){
        if(typeof data.subscription!=='string')throw new StudioError('Subscription checkout is missing provider subscription',409,'PAYMENT_MISMATCH');
        const items=await c.query('SELECT product_id FROM studio.checkout_order_items WHERE order_id=$1',[orderId]);
        for(const item of items.rows)await c.query(`INSERT INTO studio.entitlements(id,site_id,order_id,product_id,provider_subscription,state) VALUES($1,$2,$3,$4,$5,'ACTIVE') ON CONFLICT(order_id,product_id) DO UPDATE SET provider_subscription=EXCLUDED.provider_subscription,state='ACTIVE',updated_at=now()`,[randomUUID(),order.site_id,orderId,item.product_id,data.subscription]);
      }
      return {received:true};
    });
  }
}
