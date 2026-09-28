import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import {Webhooks,verifyWebhookSignature,type WebhookTransport} from '../../src/modules/studio-next/webhooks.js';

if(!url)test('webhook integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,db:Database,server:Server,base:string,owner:TestActor,other:TestActor,siteId:string,secret='',lastBody='',lastSignature='',fail=false;
  const key=Buffer.alloc(32,7);
  const transport:WebhookTransport=async input=>{lastBody=input.body;lastSignature=input.headers['X-ForgeStudio-Signature'];return fail?{status:500,body:'temporary'}:{status:204,body:''};};
  const config={masterKey:key,transport,resolveHost:async()=>['93.184.216.34'],maxAttempts:2};
  async function send(method:string,path:string,a:TestActor,body?:unknown,expected=200){
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${a.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';pool=testPool();await install(pool);db=new Database(pool);owner=await actor(pool);other=await actor(pool);
    siteId=await site(pool,owner,{version:1,pages:[{id:'home',name:'Home',slug:'/',isHome:true,elements:[{id:'hook-heading',type:'heading',content:'Hook'}],pageSettings:{title:'Home'}}],homePageId:'home'},'DRAFT');
    ({server}=serverFor(db,{requestLimit:100000,webhooks:config}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;
  });
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[owner.id,other.id]]);await pool.end();});

  test('endpoint creation returns a secret once and stores only encrypted material',async()=>{
    const created=await send('POST',`/sites/${siteId}/webhooks`,owner,{url:'https://hooks.example.com/inbound',events:['release.activated','cms.item.published']},201);secret=created.secret;assert.match(secret,/^[a-f0-9]{64}$/);
    const list=await send('GET',`/sites/${siteId}/webhooks`,owner);assert.equal(list.endpoints.length,1);assert.equal('secret' in list.endpoints[0],false);
    const stored=(await pool.query('SELECT secret_ciphertext,secret_iv FROM studio.webhook_endpoints WHERE id=$1',[created.id])).rows[0];
    assert.ok(Buffer.isBuffer(stored.secret_ciphertext));assert.equal(stored.secret_ciphertext.includes(Buffer.from(secret)),false);assert.equal(stored.secret_iv.length,12);
  });
  test('unsafe webhook destinations and cross-tenant access fail safely',async()=>{
    await send('POST',`/sites/${siteId}/webhooks`,owner,{url:'https://127.0.0.1/hook',events:['release.activated']},400);
    await send('GET',`/sites/${siteId}/webhooks`,other,undefined,404);
  });
  test('verified release activation is delivered with a valid HMAC signature',async()=>{
    const design=await send('GET',`/sites/${siteId}/design`,owner),prepared=await send('POST',`/sites/${siteId}/releases`,owner,{baseHash:design.hash,operationId:randomUUID()},201);
    await send('POST',`/sites/${siteId}/releases/${prepared.releaseId}/publish`,owner,{});
    const worker=new Webhooks(db,config),result=await worker.deliverDue();assert.equal(result.delivered,1);assert.equal(JSON.parse(lastBody).type,'release.activated');assert.equal(verifyWebhookSignature(lastBody,lastSignature,secret),true);
    const list=await send('GET',`/sites/${siteId}/webhooks`,owner);assert.equal(list.deliveries[0].state,'DELIVERED');assert.equal(list.deliveries[0].responseStatus,204);
  });
  test('CMS publication emits after the transaction and delivers the signed live event',async()=>{
    const collection=await send('POST',`/sites/${siteId}/collections`,owner,{name:'Hook Posts',slug:'hook-posts',fields:[{key:'body',name:'Body',type:'TEXT',required:true}]},201);
    const item=await send('POST',`/sites/${siteId}/collections/${collection.id}/items`,owner,{name:'One',slug:'one',fields:{body:'Live'},locale:'en'},201);
    await send('POST',`/sites/${siteId}/items/${item.id}/actions`,owner,{action:'PUBLISH',revision:0});
    const worker=new Webhooks(db,config),result=await worker.deliverDue();assert.ok(result.delivered>=1);assert.equal(JSON.parse(lastBody).type,'cms.item.published');assert.equal(verifyWebhookSignature(lastBody,lastSignature,secret),true);
  });
  test('failed deliveries retry, dead-letter, and can be manually redelivered',async()=>{
    const list=await send('GET',`/sites/${siteId}/webhooks`,owner),endpoint=list.endpoints[0];fail=true;
    const queued=await send('POST',`/sites/${siteId}/webhooks/${endpoint.id}/test`,owner,{},202),worker=new Webhooks(db,config);
    let result=await worker.deliverDue();assert.equal(result.retried,1);
    await pool.query('UPDATE studio.webhook_deliveries SET next_attempt_at=now()-interval \'1 second\' WHERE id=$1',[queued.deliveryId]);
    result=await worker.deliverDue();assert.equal(result.dead,1);
    let row=(await pool.query('SELECT state,attempts FROM studio.webhook_deliveries WHERE id=$1',[queued.deliveryId])).rows[0];assert.equal(row.state,'DEAD');assert.equal(row.attempts,2);
    await send('POST',`/sites/${siteId}/webhook-deliveries/${queued.deliveryId}/redeliver`,owner,{},202);fail=false;
    result=await worker.deliverDue();assert.equal(result.delivered,1);row=(await pool.query('SELECT state FROM studio.webhook_deliveries WHERE id=$1',[queued.deliveryId])).rows[0];assert.equal(row.state,'DELIVERED');
  });
}
