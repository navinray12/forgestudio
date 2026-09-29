import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import type {CommerceConfig,StripeTransport} from '../../src/modules/studio-next/commerce.js';

if(!url)test('commerce expansion requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,owner:TestActor,siteId:string;
  const signing='commerce-expansion-secret',accounts:Record<string,string>={},calls:Array<{path:string;method:string;body?:URLSearchParams}>=[];
  const prices:Record<string,any>={
    price_one_a:{active:true,type:'one_time',currency:'usd',unit_amount:1000},
    price_one_b:{active:true,type:'one_time',currency:'usd',unit_amount:2500},
    price_sub_a:{active:true,type:'recurring',currency:'usd',unit_amount:500,recurring:{interval:'month'}},
    price_sub_b:{active:true,type:'recurring',currency:'usd',unit_amount:800,recurring:{interval:'month'}},
  };
  const transport:StripeTransport=async(_account,path,method,body)=>{
    calls.push({path,method,body});
    if(path.startsWith('prices/'))return prices[path.slice(7)];
    if(path==='checkout/sessions')return {id:`cs_${body!.get('client_reference_id')!.replaceAll('-','')}`,url:'https://checkout.stripe.com/c/pay/cs_cart_fixture'};
    if(path==='refunds')return {id:`re_${String(body!.get('metadata[studio_refund_id]')).replaceAll('-','')}`};
    throw new Error('unexpected provider path '+path);
  };
  const commerce:CommerceConfig={origin:'http://localhost:5173',webhookSecret:signing,accounts,transport};
  async function send(method:string,path:string,body?:unknown,expected=200){
    const authenticated=!path.startsWith('/public/')&&!path.startsWith('/payments/');
    const r=await fetch(base+path,{method,headers:{...(authenticated?{Cookie:`forge_session=${owner.token}`}:{}),Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  }
  async function product(input:{name:string;priceMinor:number;stripePriceId:string;billingType?:'ONE_TIME'|'RECURRING';billingInterval?:'month'|'year';inventoryQuantity?:number|null}){
    return (await send('POST',`/sites/${siteId}/products`,{description:'Fixture',currency:'usd',active:true,billingType:'ONE_TIME',inventoryQuantity:null,...input},201)).id as string;
  }
  async function signedEvent(type:string,object:any,account='platform',expected=200){
    const event={id:`evt_${randomUUID().replaceAll('-','')}`,type,account,data:{object}},raw=JSON.stringify(event),stamp=Math.floor(Date.now()/1000),signature=createHmac('sha256',signing).update(`${stamp}.${raw}`).digest('hex');
    const r=await fetch(base+'/payments/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':`t=${stamp},v1=${signature}`},body:raw});const value=await r.json();assert.equal(r.status,expected,JSON.stringify(value));return value;
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';pool=testPool();await install(pool);const db=new Database(pool);owner=await actor(pool);siteId=await site(pool,owner,{version:1,elements:[{id:'shop',type:'section'}]},'PUBLISHED');accounts[siteId]='platform';
    ({server}=serverFor(db,{commerce,requestLimit:100000}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;
  });
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=$1',[owner.id]);await pool.end();});

  test('multi-item carts snapshot server prices and reserve inventory',async()=>{
    const a=await product({name:'A',priceMinor:1000,stripePriceId:'price_one_a',inventoryQuantity:5}),b=await product({name:'B',priceMinor:2500,stripePriceId:'price_one_b',inventoryQuantity:4}),operationId=randomUUID();
    const result=await send('POST',`/public/sites/${siteId}/checkout-cart`,{items:[{productId:a,quantity:2},{productId:b,quantity:1}],operationId},201);
    assert.equal(result.mode,'payment');
    const order=await pool.query('SELECT total_minor,quantity,state,inventory_reserved FROM studio.checkout_orders WHERE id=$1',[operationId]);assert.equal(order.rows[0].total_minor,4500);assert.equal(order.rows[0].quantity,3);assert.equal(order.rows[0].state,'CHECKOUT');assert.equal(order.rows[0].inventory_reserved,true);
    const lines=await pool.query('SELECT product_id,quantity,unit_minor FROM studio.checkout_order_items WHERE order_id=$1 ORDER BY unit_minor',[operationId]);assert.deepEqual(lines.rows.map(x=>[x.product_id,x.quantity,x.unit_minor]),[[a,2,1000],[b,1,2500]]);
    const inventory=await pool.query('SELECT id,inventory_quantity FROM studio.products WHERE id=ANY($1::uuid[]) ORDER BY price_minor',[[a,b]]);assert.deepEqual(inventory.rows.map(x=>x.inventory_quantity),[3,3]);
    await signedEvent('checkout.session.expired',{id:`cs_${operationId.replaceAll('-','')}`,mode:'payment',payment_status:'unpaid',metadata:{studio_order_id:operationId,studio_site_id:siteId},client_reference_id:operationId,amount_total:4500,currency:'usd'});
    const restored=await pool.query('SELECT inventory_quantity FROM studio.products WHERE id=ANY($1::uuid[]) ORDER BY price_minor',[[a,b]]);assert.deepEqual(restored.rows.map(x=>x.inventory_quantity),[5,4]);
  });

  test('recurring cart checkout creates and reconciles product entitlements',async()=>{
    const a=await product({name:'Monthly A',priceMinor:500,stripePriceId:'price_sub_a',billingType:'RECURRING',billingInterval:'month'}),b=await product({name:'Monthly B',priceMinor:800,stripePriceId:'price_sub_b',billingType:'RECURRING',billingInterval:'month'}),operationId=randomUUID(),session=`cs_${operationId.replaceAll('-','')}`;
    const result=await send('POST',`/public/sites/${siteId}/checkout-cart`,{items:[{productId:a,quantity:1},{productId:b,quantity:1}],operationId},201);assert.equal(result.mode,'subscription');
    await signedEvent('checkout.session.completed',{id:session,mode:'subscription',payment_status:'paid',metadata:{studio_order_id:operationId,studio_site_id:siteId},client_reference_id:operationId,amount_total:1300,currency:'usd',subscription:'sub_fixture',payment_intent:'pi_fixture',customer:'cus_fixture'});
    let entitlements=await pool.query('SELECT product_id,state FROM studio.entitlements WHERE order_id=$1 ORDER BY product_id',[operationId]);assert.equal(entitlements.rows.length,2);assert.ok(entitlements.rows.every(x=>x.state==='ACTIVE'));
    await signedEvent('customer.subscription.deleted',{id:'sub_fixture',status:'canceled',metadata:{studio_order_id:operationId,studio_site_id:siteId},current_period_end:Math.floor(Date.now()/1000)});
    entitlements=await pool.query('SELECT state FROM studio.entitlements WHERE order_id=$1',[operationId]);assert.ok(entitlements.rows.every(x=>x.state==='CANCELED'));
  });

  test('paid one-time orders can be refunded idempotently but never above the remaining amount',async()=>{
    const p=await product({name:'Refundable',priceMinor:1000,stripePriceId:'price_one_a'}),operationId=randomUUID(),session=`cs_${operationId.replaceAll('-','')}`;
    await send('POST',`/public/sites/${siteId}/checkout-cart`,{items:[{productId:p,quantity:1}],operationId},201);
    await signedEvent('checkout.session.completed',{id:session,mode:'payment',payment_status:'paid',metadata:{studio_order_id:operationId,studio_site_id:siteId},client_reference_id:operationId,amount_total:1000,currency:'usd',payment_intent:'pi_refundable',customer:'cus_refund'});
    const refundId=randomUUID(),first=await send('POST',`/sites/${siteId}/refunds`,{orderId:operationId,amountMinor:600,operationId:refundId},201),replay=await send('POST',`/sites/${siteId}/refunds`,{orderId:operationId,amountMinor:600,operationId:refundId},201);
    assert.equal(first.state,'SUCCEEDED');assert.equal(replay.replayed,true);
    await send('POST',`/sites/${siteId}/refunds`,{orderId:operationId,amountMinor:500,operationId:randomUUID()},409);
    const rows=await pool.query('SELECT amount_minor,state FROM studio.refunds WHERE order_id=$1',[operationId]);assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].amount_minor,600);
  });
}
