import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,workspace,grant,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import type {AIProvider} from '../../src/modules/studio-next/ai.js';

if(!url)test('governance integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,owner:TestActor,admin:TestActor,siteId:string,calls=0;
  let blocker=false,enteredResolve:()=>void=()=>{},gateResolve:()=>void=()=>{},entered=Promise.resolve(),gate=Promise.resolve();
  function armBlock(){blocker=true;entered=new Promise<void>(r=>enteredResolve=r);gate=new Promise<void>(r=>gateResolve=r);}
  const provider:AIProvider={name:'governance-fixture',model:'copy-v1',async generateStructured(input){
    calls++;if(input.user.includes('provider failure')){const e:any=new Error('fixture failure');e.code='AI_PROVIDER_ERROR';throw e;}
    if(blocker){blocker=false;enteredResolve();await gate;}
    return {value:{replacement:'Governed copy',rationale:'fixture'},usage:{inputUnits:10,outputUnits:5}};
  }};
  async function send(method:string,path:string,a:TestActor,body?:unknown,expected=200){
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${a.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';pool=testPool();await install(pool);const db=new Database(pool);owner=await actor(pool);admin=await actor(pool);
    siteId=await site(pool,owner,{version:1,elements:[{id:'heading',type:'heading',content:'Original'}]},'DRAFT');await grant(pool,siteId,admin,'ADMIN');
    ({server}=serverFor(db,{aiProvider:provider,requestLimit:100000}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;
  });
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[owner.id,admin.id]]);await pool.end();});

  test('feature switches are server enforced without breaking ordinary Designer or CMS access',async()=>{
    const initial=await send('GET',`/sites/${siteId}/ai/status`,owner);assert.equal(initial.features.copy.configured,true);
    await send('PUT',`/sites/${siteId}/governance/features`,owner,{feature:'AI_COPY',enabled:false});
    const status=await send('GET',`/sites/${siteId}/ai/status`,owner);assert.equal(status.features.copy.configured,false);
    const before=calls;await send('POST',`/sites/${siteId}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'shorten'},403);assert.equal(calls,before);
    assert.equal((await send('GET',`/sites/${siteId}/design`,owner)).website.editorData.elements[0].content,'Original');
    const collection=await send('POST',`/sites/${siteId}/collections`,owner,{name:'Still Works',slug:'still-works',fields:[]},201);assert.ok(collection.id);
    await send('PUT',`/sites/${siteId}/governance/features`,owner,{feature:'AI_COPY',enabled:true});
    await send('POST',`/sites/${siteId}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'shorten'},201);
  });

  test('only the owner changes AI spend limits and usage is reported from server records',async()=>{
    await send('PUT',`/sites/${siteId}/governance/ai-budget`,admin,{monthlyUnitLimit:3000,warningPercent:80},403);
    await send('PUT',`/sites/${siteId}/governance/ai-budget`,owner,{monthlyUnitLimit:3000,warningPercent:80});
    const report=await send('GET',`/sites/${siteId}/governance/ai-budget`,owner);assert.equal(report.budget.monthlyUnitLimit,3000);assert.ok(report.usage.monthUnits>=15);
  });

  test('concurrent AI reservations cannot overspend the site budget',async()=>{
    await send('PUT',`/sites/${siteId}/governance/ai-budget`,owner,{monthlyUnitLimit:3000,warningPercent:80});
    armBlock();
    const first=send('POST',`/sites/${siteId}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'hold this provider call'},201);
    await entered;
    await send('POST',`/sites/${siteId}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'second concurrent request'},429);
    gateResolve();await first;
    const outstanding=(await send('GET',`/sites/${siteId}/governance/ai-budget`,owner)).usage.outstandingReservedUnits;assert.equal(outstanding,0);
  });

  test('a failed provider call releases its reservation',async()=>{
    await send('PUT',`/sites/${siteId}/governance/ai-budget`,owner,{monthlyUnitLimit:2100,warningPercent:80});
    await send('POST',`/sites/${siteId}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'provider failure'},502);
    const report=await send('GET',`/sites/${siteId}/governance/ai-budget`,owner);assert.equal(report.usage.outstandingReservedUnits,0);
    await send('POST',`/sites/${siteId}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'works after failure'},201);
  });
  test('platform AI route workspace restrictions are enforced before provider execution',async()=>{
    const w=await workspace(pool,owner),restrictedSite=await site(pool,owner,{version:1,elements:[{id:'heading',type:'heading',content:'Restricted'}]},'DRAFT');
    await pool.query('UPDATE public.websites SET "workspaceId"=$2 WHERE id=$1',[restrictedSite,w]);
    const other=randomUUID();
    await pool.query(`INSERT INTO studio.ai_model_routes(feature,provider,model,fallback_models,timeout_ms,max_output_tokens,enabled,workspace_restrictions)
      VALUES('COPY','openai','fixture-model','[]'::jsonb,30000,2000,true,$1::jsonb)
      ON CONFLICT(feature) DO UPDATE SET enabled=true,workspace_restrictions=$1::jsonb,daily_budget_units=NULL`,[JSON.stringify([other])]);
    const before=calls;await send('POST',`/sites/${restrictedSite}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'blocked by workspace policy'},403);assert.equal(calls,before);
    await pool.query("UPDATE studio.ai_model_routes SET workspace_restrictions=$2::jsonb WHERE feature='COPY'",['COPY',JSON.stringify([w])]);
    await send('POST',`/sites/${restrictedSite}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'allowed by workspace policy'},201);
  });

  test('platform daily AI route budget reserves capacity across concurrent requests',async()=>{
    await pool.query("DELETE FROM studio.ai_usage_reservations WHERE feature='COPY_EDIT'");
    await pool.query("DELETE FROM studio.ai_runs WHERE feature='COPY_EDIT'");
    await pool.query(`INSERT INTO studio.ai_model_routes(feature,provider,model,fallback_models,timeout_ms,max_output_tokens,enabled,daily_budget_units,workspace_restrictions)
      VALUES('COPY','openai','fixture-model','[]'::jsonb,30000,2000,true,3000,'[]'::jsonb)
      ON CONFLICT(feature) DO UPDATE SET enabled=true,daily_budget_units=3000,workspace_restrictions='[]'::jsonb`);
    const s=await site(pool,owner,{version:1,elements:[{id:'heading',type:'heading',content:'Budgeted'}]},'DRAFT');
    armBlock();const first=send('POST',`/sites/${s}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'hold route budget'},201);
    await entered;await send('POST',`/sites/${s}/ai/copy/propose`,owner,{elementId:'heading',field:'content',instruction:'must exceed route budget'},429);
    gateResolve();await first;
    const reserved=await pool.query("SELECT count(*)::int AS n FROM studio.ai_usage_reservations WHERE feature='COPY_EDIT' AND state='RESERVED'");assert.equal(reserved.rows[0].n,0);
    await pool.query("UPDATE studio.ai_model_routes SET daily_budget_units=NULL WHERE feature='COPY'");
  });

}
