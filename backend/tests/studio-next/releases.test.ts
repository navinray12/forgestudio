import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,grant,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';

if(!url)test('release integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,owner:TestActor,reviewer:TestActor,siteId:string;
  async function send(method:string,path:string,a:TestActor,body?:unknown,expected=200){
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${a.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';
    pool=testPool();await install(pool);const db=new Database(pool);owner=await actor(pool);reviewer=await actor(pool);
    siteId=await site(pool,owner,{version:1,pages:[{id:'home',name:'Home',slug:'/',isHome:true,elements:[{id:'release-heading',type:'heading',content:'Release one'}],pageSettings:{title:'Home'}}],homePageId:'home'},'DRAFT');
    await grant(pool,siteId,reviewer,'REVIEWER');({server}=serverFor(db,{requestLimit:100000}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;
  });
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[owner.id,reviewer.id]]);await pool.end();});

  test('release preparation is idempotent and does not change the live site',async()=>{
    const d=await send('GET',`/sites/${siteId}/design`,owner),operationId=randomUUID();
    const first=await send('POST',`/sites/${siteId}/releases`,owner,{baseHash:d.hash,operationId},201);
    const replay=await send('POST',`/sites/${siteId}/releases`,owner,{baseHash:d.hash,operationId},201);
    assert.equal(first.releaseId,replay.releaseId);assert.equal(replay.replayed,true);
    const row=(await pool.query('SELECT status,"editorData" FROM public.websites WHERE id=$1',[siteId])).rows[0];
    assert.equal(row.status,'DRAFT');assert.equal(row.editorData.publishedData,undefined);
    await send('POST',`/sites/${siteId}/releases`,owner,{baseHash:d.hash,operationId:randomUUID()},201);
  });

  test('verified publishing activates an immutable artifact and later authoring stays isolated',async()=>{
    let d=await send('GET',`/sites/${siteId}/design`,owner);
    const prepared=await send('POST',`/sites/${siteId}/releases`,owner,{baseHash:d.hash,operationId:randomUUID()},201);
    const published=await send('POST',`/sites/${siteId}/releases/${prepared.releaseId}/publish`,owner,{});
    assert.equal(published.status,'ACTIVE');
    let row=(await pool.query('SELECT status,"editorData" FROM public.websites WHERE id=$1',[siteId])).rows[0];
    assert.equal(row.status,'PUBLISHED');assert.equal(row.editorData.publishedData.pages[0].elements[0].content,'Release one');
    const list=await send('GET',`/sites/${siteId}/releases`,owner);assert.equal(list.activeReleaseId,prepared.releaseId);
    d=await send('GET',`/sites/${siteId}/design`,owner);
    await send('POST',`/sites/${siteId}/design/commands`,owner,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_ELEMENT_TEXT',elementId:'release-heading',field:'content',value:'Release two draft'}]});
    row=(await pool.query('SELECT "editorData" FROM public.websites WHERE id=$1',[siteId])).rows[0];assert.equal(row.editorData.publishedData.pages[0].elements[0].content,'Release one');
  });

  test('publishing a second release supersedes the first and rollback redeploys the stored first artifact',async()=>{
    const history=await send('GET',`/sites/${siteId}/releases`,owner);const first=history.releases.find((x:any)=>x.status==='ACTIVE');assert.ok(first);
    const d=await send('GET',`/sites/${siteId}/design`,owner),second=await send('POST',`/sites/${siteId}/releases`,owner,{baseHash:d.hash,operationId:randomUUID()},201);
    await send('POST',`/sites/${siteId}/releases/${second.releaseId}/publish`,owner,{});
    let list=await send('GET',`/sites/${siteId}/releases`,owner);assert.equal(list.activeReleaseId,second.releaseId);assert.equal(list.releases.find((x:any)=>x.id===first.id).status,'SUPERSEDED');
    const rollback=await send('POST',`/sites/${siteId}/releases/${first.id}/rollback`,owner,{},201);assert.equal(rollback.restoredFromReleaseId,first.id);assert.notEqual(rollback.releaseId,first.id);
    const row=(await pool.query('SELECT "editorData" FROM public.websites WHERE id=$1',[siteId])).rows[0];assert.equal(row.editorData.publishedData.pages[0].elements[0].content,'Release one');
    list=await send('GET',`/sites/${siteId}/releases`,owner);assert.equal(list.activeReleaseId,rollback.releaseId);
  });

  test('publish permission is server enforced and empty sites cannot be released',async()=>{
    const d=await send('GET',`/sites/${siteId}/design`,reviewer);await send('POST',`/sites/${siteId}/releases`,reviewer,{baseHash:d.hash,operationId:randomUUID()},403);
    const empty=await site(pool,owner,{version:1,elements:[],pages:[]},'DRAFT'),e=await send('GET',`/sites/${empty}/design`,owner);
    await send('POST',`/sites/${empty}/releases`,owner,{baseHash:e.hash,operationId:randomUUID()},409);
  });
}
