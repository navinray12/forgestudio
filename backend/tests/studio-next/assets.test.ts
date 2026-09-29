import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import type {ImageGenerationProvider} from '../../src/modules/studio-next/assets.js';

if(!url)test('asset generation integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,user:TestActor,siteId:string,filename:string|undefined;
  const png=()=>{const b=Buffer.alloc(24);b.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);b.writeUInt32BE(1,16);b.writeUInt32BE(1,20);return b;};
  const provider:ImageGenerationProvider={async generate(input){return {bytes:png(),mimeType:'image/png',provider:'fixture-image',model:input.model,usage:{inputUnits:12,outputUnits:34}};}};
  async function send(method:string,p:string,body?:unknown,expected=200){
    const r=await fetch(base+p,{method,headers:{Cookie:`forge_session=${user.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${p}: ${JSON.stringify(value)}`);return value;
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';
    pool=testPool();await install(pool);const db=new Database(pool);user=await actor(pool);siteId=await site(pool,user,undefined,'DRAFT');
    await pool.query(`INSERT INTO studio.ai_model_routes(feature,provider,model,fallback_models,timeout_ms,max_output_tokens,enabled)
      VALUES('IMAGE','openai','fixture-image','[]'::jsonb,30000,2000,true)
      ON CONFLICT(feature) DO UPDATE SET provider='openai',model='fixture-image',fallback_models='[]'::jsonb,timeout_ms=30000,max_output_tokens=2000,enabled=true`);
    ({server}=serverFor(db,{imageProvider:provider,requestLimit:100000}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;
  });
  after(async()=>{
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    if(filename)await fs.unlink(path.join(process.cwd(),'uploads','images',filename)).catch(()=>undefined);
    await pool.query('DELETE FROM public.users WHERE id=$1',[user.id]);await pool.query("DELETE FROM studio.ai_model_routes WHERE feature='IMAGE'");await pool.end();
  });

  test('AI image generation persists provenance and auditable run accounting',async()=>{
    const status=await send('GET',`/sites/${siteId}/assets/generation-status`);assert.equal(status.enabled,true);assert.equal(status.configured,true);assert.equal(status.route.model,'fixture-image');
    const generated=await send('POST',`/sites/${siteId}/assets/generate`,{prompt:'A simple geometric product illustration',altText:'Geometric product illustration',size:'1024x1024',quality:'medium',outputFormat:'png'},201);
    filename=generated.asset.filename;assert.equal(generated.asset.provenance,'GENERATED');assert.equal(generated.asset.providerName,'fixture-image');assert.equal(generated.asset.modelId,'fixture-image');assert.equal(generated.asset.width,1);assert.equal(generated.asset.height,1);
    const row=await pool.query('SELECT provenance,"providerName","modelId","promptHash" FROM public.media_assets WHERE id=$1',[generated.asset.id]);assert.equal(row.rows[0].provenance,'GENERATED');assert.equal(row.rows[0].providerName,'fixture-image');assert.equal(row.rows[0].promptHash.length,64);
    const run=await pool.query("SELECT feature,input_units,output_units,image_count,status FROM studio.ai_runs WHERE id=$1",[generated.runId]);assert.deepEqual(run.rows[0],{feature:'IMAGE_GENERATION',input_units:12,output_units:34,image_count:1,status:'SUCCEEDED'});
  });

  test('AI image feature switch blocks provider execution without breaking asset reads',async()=>{
    await send('PUT',`/sites/${siteId}/governance/features`,{feature:'AI_IMAGES',enabled:false});
    await send('POST',`/sites/${siteId}/assets/generate`,{prompt:'Do not generate this image'},403);
    const status=await send('GET',`/sites/${siteId}/assets/generation-status`);assert.equal(status.enabled,false);assert.equal(status.configured,false);
    await send('PUT',`/sites/${siteId}/governance/features`,{feature:'AI_IMAGES',enabled:true});
  });
}
