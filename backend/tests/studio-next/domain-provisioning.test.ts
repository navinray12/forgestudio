import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import type {DomainProvider} from '../../src/modules/studio-next/domain-provider.js';

if(!url)test('domain provisioning integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,user:TestActor,siteId:string,challenge='',removed=false,healthCalls=0;
  const provider:DomainProvider={
    name:'fixture-domain',
    async provision(input){assert.equal(input.hostname,'www.customer.testdomain.dev');return {reference:'domain-fixture-1',tlsState:'PENDING'};},
    async status(){healthCalls++;return healthCalls===1?{hostingState:'PROVISIONING',tlsState:'PENDING'}:{hostingState:'ACTIVE',tlsState:'ACTIVE'};},
    async remove(input){assert.equal(input.reference,'domain-fixture-1');removed=true;},
  };
  async function send(method:string,path:string,body?:unknown,expected=200){
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${user.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  }
  before(async()=>{process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';pool=testPool();await install(pool);const db=new Database(pool);user=await actor(pool);siteId=await site(pool,user,{version:1,elements:[{id:'heading',type:'heading',content:'Site'}]},'PUBLISHED');({server}=serverFor(db,{requestLimit:100000,resolveTxt:async()=>[[challenge]],domainProvider:provider}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;});
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=$1',[user.id]);await pool.end();});

  test('custom domain requires verified ownership before provider provisioning',async()=>{
    const added=await send('POST',`/sites/${siteId}/domains`,{hostname:'www.customer.testdomain.dev'},201);challenge=added.record.value;
    await send('POST',`/sites/${siteId}/domains/${added.id}/provision`,{canonical:true,redirectToCanonical:true},409);
    const verified=await send('POST',`/sites/${siteId}/domains/${added.id}/verify`,{});assert.equal(verified.verified,true);
    const provisioning=await send('POST',`/sites/${siteId}/domains/${added.id}/provision`,{canonical:true,redirectToCanonical:true});assert.equal(provisioning.active,false);assert.equal(provisioning.tlsState,'PENDING');
    const active=await send('POST',`/sites/${siteId}/domains/${added.id}/health`,{});assert.equal(active.active,true);assert.equal(active.tlsState,'ACTIVE');
    const state=await send('GET',`/sites/${siteId}/domains`);const domain=state.domains.find((x:any)=>x.id===added.id);assert.equal(domain.hostingState,'ACTIVE');assert.equal(domain.tlsState,'ACTIVE');assert.equal(domain.canonical,true);
    await send('DELETE',`/sites/${siteId}/domains/${added.id}`);assert.equal(removed,true);
    assert.equal((await send('GET',`/sites/${siteId}/domains`)).domains.some((x:any)=>x.id===added.id),false);
  });
}
