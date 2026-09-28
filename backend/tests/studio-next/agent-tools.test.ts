import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,grant,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';

if(!url)test('agent tool integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,owner:TestActor,editor:TestActor,outsider:TestActor,siteId:string;
  async function send(method:string,path:string,a:TestActor,body?:unknown,expected=200){
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${a.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';
    pool=testPool();await install(pool);const db=new Database(pool);
    owner=await actor(pool);editor=await actor(pool);outsider=await actor(pool);
    siteId=await site(pool,owner,{version:1,elements:[{id:'heading',type:'heading',content:'Agent editable',styles:{}}]},'DRAFT');
    await grant(pool,siteId,editor,'CONTENT_EDITOR');
    ({server}=serverFor(db,{requestLimit:100000}));
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;
  });
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[owner.id,editor.id,outsider.id]]);await pool.end();});

  test('tool catalog is scoped to the signed-in human capabilities',async()=>{
    const ownerTools=await send('GET',`/sites/${siteId}/agent/tools`,owner);
    assert.ok(ownerTools.tools.some((x:any)=>x.name==='design.apply_commands'));
    assert.ok(ownerTools.tools.some((x:any)=>x.name==='release.publish'));
    const editorTools=await send('GET',`/sites/${siteId}/agent/tools`,editor);
    assert.ok(editorTools.tools.some((x:any)=>x.name==='site.read_context'));
    assert.ok(editorTools.tools.some((x:any)=>x.name==='design.apply_commands'));
    assert.equal(editorTools.tools.some((x:any)=>x.name==='release.publish'),false);
  });

  test('agent Designer mutations use the human permission boundary and shared command layer',async()=>{
    let d=await send('GET',`/sites/${siteId}/design`,editor);
    const edit=await send('POST',`/sites/${siteId}/agent/tools/design.apply_commands/execute`,editor,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_ELEMENT_TEXT',elementId:'heading',field:'content',value:'Edited through agent tool'}]});
    assert.equal(edit.effect,'SAFE_MUTATION');assert.equal(edit.result.replayed,false);
    d=await send('GET',`/sites/${siteId}/design`,editor);assert.equal(d.website.editorData.elements[0].content,'Edited through agent tool');
    await send('POST',`/sites/${siteId}/agent/tools/design.apply_commands/execute`,editor,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'ADD_ELEMENT',parentId:null,afterId:null,element:{id:'forbidden-section',type:'section'}}]},403);
  });

  test('tenant authorization happens before MCP feature lookup',async()=>{
    await send('PUT',`/sites/${siteId}/governance/features`,owner,{feature:'MCP',enabled:false});
    await send('GET',`/sites/${siteId}/agent/tools`,owner,undefined,403);
    await send('GET',`/sites/${siteId}/agent/tools`,outsider,undefined,404);
    await send('PUT',`/sites/${siteId}/governance/features`,owner,{feature:'MCP',enabled:true});
  });

  test('agent publish requires explicit confirmation and uses verified release flow',async()=>{
    const d=await send('GET',`/sites/${siteId}/design`,owner);
    const prepared=await send('POST',`/sites/${siteId}/agent/tools/release.prepare/execute`,owner,{baseHash:d.hash,operationId:randomUUID()});
    const releaseId=prepared.result.releaseId;assert.ok(releaseId);
    await send('POST',`/sites/${siteId}/agent/tools/release.publish/execute`,owner,{releaseId},400);
    const published=await send('POST',`/sites/${siteId}/agent/tools/release.publish/execute`,owner,{releaseId,confirm:true});
    assert.equal(published.result.status,'ACTIVE');
    const releases=await send('POST',`/sites/${siteId}/agent/tools/release.list/execute`,owner,{});
    assert.equal(releases.result.activeReleaseId,releaseId);
  });
}
