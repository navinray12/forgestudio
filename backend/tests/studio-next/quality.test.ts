import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import type {VisualValidationProvider} from '../../src/modules/studio-next/quality.js';

if(!url)test('quality integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,user:TestActor,siteId:string;
  const visual:VisualValidationProvider={name:'fixture-browser',async inspect(){return {provider:'fixture-browser',findings:[{code:'MOBILE_OVERFLOW',severity:'WARNING',message:'Fixture overflow warning',viewport:390}],screenshots:{mobile:'https://example.test/mobile.png'}};}};
  async function send(method:string,path:string,body?:unknown,expected=200){
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${user.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';pool=testPool();await install(pool);const db=new Database(pool);user=await actor(pool);
    siteId=await site(pool,user,{version:1,elements:[{id:'hero-image',type:'image',src:'https://example.test/a.png',styles:{width:'1600px'}},{id:'cta',type:'button',content:'Go',href:'/safe'}]},'DRAFT');
    ({server}=serverFor(db,{requestLimit:100000,visualValidation:visual}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;
  });
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=$1',[user.id]);await pool.end();});

  test('deterministic quality inspection reports accessibility and mobile risks',async()=>{
    const q=await send('GET',`/sites/${siteId}/quality`);assert.equal(q.blocking,0);assert.ok(q.deterministic.some((x:any)=>x.code==='IMAGE_ALT_MISSING'));assert.ok(q.deterministic.some((x:any)=>x.code==='FIXED_WIDTH_OVERFLOW_RISK'));
  });
  test('isolated visual provider findings are exposed only when explicitly executed',async()=>{
    const q=await send('GET',`/sites/${siteId}/quality?visual=true`);assert.equal(q.visual.executed,true);assert.equal(q.visual.provider,'fixture-browser');assert.equal(q.visual.findings[0].viewport,390);
  });
  test('release preparation blocks deterministic critical findings',async()=>{
    let d=await send('GET',`/sites/${siteId}/design`);d.website.editorData.elements[1].href='javascript:alert(1)';
    await send('PUT',`/sites/${siteId}/design`,{baseHash:d.hash,editorData:d.website.editorData,operationId:randomUUID()});
    d=await send('GET',`/sites/${siteId}/design`);
    await send('POST',`/sites/${siteId}/releases`,{baseHash:d.hash,operationId:randomUUID()},409);
    const releases=await send('GET',`/sites/${siteId}/releases`);assert.equal(releases.releases.length,0);
  });
}
