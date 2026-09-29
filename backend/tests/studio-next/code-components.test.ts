import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import type {AIProvider} from '../../src/modules/studio-next/ai.js';
import type {CodeSandboxProvider} from '../../src/modules/studio-next/code-components.js';

if(!url)test('code sandbox integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,user:TestActor,siteId:string,sandboxCalls=0,badAttestation=false;
  const ai:AIProvider={name:'fixture-code-ai',model:'fixture-code-v1',async generateStructured(input){
    const unsafe=input.user.includes('unsafe');
    return {value:{name:'Safe Calculator',instanceId:unsafe?'unsafe-code-instance':'safe-code-instance',source:unsafe?"export default function Bad(){ fetch('https://evil.example'); return <div>bad</div> }":"export default function Safe(){ return <div role='status'>Safe isolated component</div> }",rationale:'fixture'},usage:{inputUnits:20,outputUnits:30}};
  }};
  const sandbox:CodeSandboxProvider={name:'fixture-sandbox',async build(){
    sandboxCalls++;
    return {artifactId:`artifact-${sandboxCalls}`,previewUrl:`https://sandbox.example.org/build/${sandboxCalls}`,compileSucceeded:true,browserTestPassed:true,originIsolated:!badAttestation,networkRestricted:true,accessibilityCriticalCount:0};
  }};
  async function send(method:string,path:string,body?:unknown,expected=200){
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${user.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';pool=testPool();await install(pool);const db=new Database(pool);user=await actor(pool);siteId=await site(pool,user,undefined,'DRAFT');
    ({server}=serverFor(db,{aiProvider:ai,codeSandbox:sandbox,requestLimit:100000}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;
  });
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=$1',[user.id]);await pool.end();});

  test('validated code stays reviewable until explicit apply and renders as sandbox element metadata',async()=>{
    const before=await send('GET',`/sites/${siteId}/design`),status=await send('GET',`/sites/${siteId}/ai/code/status`);assert.equal(status.configured,true);
    const proposal=await send('POST',`/sites/${siteId}/ai/code/propose`,{instruction:'Build a safe calculator',afterId:'heading'},201);
    assert.equal(proposal.name,'Safe Calculator');assert.equal(proposal.sandbox.compileSucceeded,true);assert.equal(sandboxCalls,1);
    assert.equal((await send('GET',`/sites/${siteId}/design`)).hash,before.hash);
    const artifact=await pool.query('SELECT status,source_hash,preview_url FROM studio.code_component_artifacts WHERE id=$1',[proposal.artifactId]);assert.equal(artifact.rows[0].status,'VALIDATED');assert.equal(artifact.rows[0].source_hash.length,64);
    await send('POST',`/sites/${siteId}/ai/changes/${proposal.changeSetId}/apply`,{});
    const design=await send('GET',`/sites/${siteId}/design`),element=design.website.editorData.elements.find((x:any)=>x.id==='safe-code-instance');assert.equal(element.type,'code-component');assert.equal(element.sandboxUrl,proposal.previewUrl);
    assert.equal((await pool.query('SELECT status FROM studio.code_component_artifacts WHERE id=$1',[proposal.artifactId])).rows[0].status,'APPLIED');
  });

  test('unsafe generated source is rejected before sandbox execution',async()=>{
    const before=sandboxCalls;await send('POST',`/sites/${siteId}/ai/code/propose`,{instruction:'unsafe network component'},400);assert.equal(sandboxCalls,before);
  });

  test('sandbox isolation attestation is mandatory',async()=>{
    badAttestation=true;const before=(await pool.query('SELECT count(*)::int AS n FROM studio.change_sets WHERE site_id=$1',[siteId])).rows[0].n;
    await send('POST',`/sites/${siteId}/ai/code/propose`,{instruction:'Build another safe calculator'},400);badAttestation=false;
    const after=(await pool.query('SELECT count(*)::int AS n FROM studio.change_sets WHERE site_id=$1',[siteId])).rows[0].n;assert.equal(after,before);
  });
}
