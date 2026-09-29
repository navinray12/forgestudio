import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,workspace,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';

if(!url)test('enterprise identity requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,owner:TestActor,admin:TestActor,workspaceId:string,otherWorkspaceId:string;
  async function send(method:string,path:string,a:TestActor,body?:unknown,expected=200){
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${a.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  }
  async function scim(method:string,workspace:string,token:string,path='/Users',body?:unknown,expected=200){
    const r=await fetch(`${base}/scim/v2/${workspace}${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} SCIM: ${JSON.stringify(value)}`);return value;
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';pool=testPool();await install(pool);const db=new Database(pool);owner=await actor(pool);admin=await actor(pool);
    workspaceId=await workspace(pool,owner);otherWorkspaceId=await workspace(pool,owner);
    await pool.query('INSERT INTO public.workspace_members(id,"workspaceId","userId",role) VALUES($1,$2,$3,$4)',[randomUUID(),workspaceId,admin.id,'ADMIN']);
    ({server}=serverFor(db,{requestLimit:100000}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;
  });
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[owner.id,admin.id]]);await pool.end();});

  test('workspace owner stores OIDC references but secret-manager paths are never returned',async()=>{
    await send('PUT',`/workspaces/${workspaceId}/enterprise-identity`,admin,{oidcEnabled:false,issuer:null,clientId:null,clientSecretRef:null,allowedEmailDomain:'example.test'},403);
    const saved=await send('PUT',`/workspaces/${workspaceId}/enterprise-identity`,owner,{oidcEnabled:true,issuer:'https://id.example.test',clientId:'forge-client',clientSecretRef:'secret/prod/forge/oidc',allowedEmailDomain:'example.test'});
    assert.equal(saved.clientSecretConfigured,true);assert.equal(Object.hasOwn(saved,'clientSecretRef'),false);
    const read=await send('GET',`/workspaces/${workspaceId}/enterprise-identity`,owner);assert.equal(read.configuration.oidcEnabled,true);assert.equal(read.configuration.clientSecretConfigured,true);assert.equal(Object.hasOwn(read.configuration,'clientSecretRef'),false);
  });

  test('SCIM token is displayed once, stored hashed, and bound to one workspace',async()=>{
    const rotated=await send('POST',`/workspaces/${workspaceId}/enterprise-identity/scim-token`,owner,{});assert.match(rotated.token,/^fscim_/);
    const row=await pool.query('SELECT scim_token_hash FROM studio.enterprise_identity_configs WHERE workspace_id=$1',[workspaceId]);assert.equal(row.rows[0].scim_token_hash,createHash('sha256').update(rotated.token).digest('hex'));assert.notEqual(row.rows[0].scim_token_hash,rotated.token);
    await scim('GET',workspaceId,rotated.token);
    await scim('GET',otherWorkspaceId,rotated.token,'/Users',undefined,401);
  });

  test('SCIM provisions, filters and deprovisions only workspace membership',async()=>{
    const rotated=await send('POST',`/workspaces/${workspaceId}/enterprise-identity/scim-token`,owner,{});
    const created=await scim('POST',workspaceId,rotated.token,'/Users',{externalId:'directory-user-1',userName:'provisioned@example.test',active:true,displayName:'Provisioned Person'},201);
    assert.equal(created.userName,'provisioned@example.test');assert.equal(created.active,true);
    const user=await pool.query('SELECT id,status,"emailVerified" FROM public.users WHERE email=$1',['provisioned@example.test']);assert.equal(user.rows[0].status,'ACTIVE');assert.equal(user.rows[0].emailVerified,true);
    const member=await pool.query('SELECT role FROM public.workspace_members WHERE "workspaceId"=$1 AND "userId"=$2',[workspaceId,user.rows[0].id]);assert.equal(member.rows[0].role,'MEMBER');
    const filtered=await scim('GET',workspaceId,rotated.token,`/Users?filter=${encodeURIComponent('userName eq "provisioned@example.test"')}`);assert.equal(filtered.totalResults,1);
    const patched=await scim('PATCH',workspaceId,rotated.token,'/Users/directory-user-1',{Operations:[{op:'replace',path:'active',value:false}]});assert.equal(patched.active,false);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM public.workspace_members WHERE "workspaceId"=$1 AND "userId"=$2',[workspaceId,user.rows[0].id])).rows[0].n,0);
    assert.equal((await pool.query('SELECT status FROM public.users WHERE id=$1',[user.rows[0].id])).rows[0].status,'ACTIVE');
    await pool.query('DELETE FROM public.users WHERE id=$1',[user.rows[0].id]);
  });
}
