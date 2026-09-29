import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,randomUUID,sign} from 'node:crypto';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,workspace,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import type {OidcTransport} from '../../src/modules/studio-next/enterprise.js';

if(!url)test('enterprise identity requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,owner:TestActor,admin:TestActor,workspaceId:string,otherWorkspaceId:string,currentNonce='';
  const keys=generateKeyPairSync('rsa',{modulusLength:2048}),publicJwk=keys.publicKey.export({format:'jwk'}) as any,kid='enterprise-fixture';
  const jwt=(claims:any)=>{const header=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid})).toString('base64url'),payload=Buffer.from(JSON.stringify(claims)).toString('base64url'),signature=sign('RSA-SHA256',Buffer.from(`${header}.${payload}`),keys.privateKey).toString('base64url');return `${header}.${payload}.${signature}`;};
  const oidcTransport:OidcTransport=async(url,init)=>{
    if(url==='https://id.example.test/.well-known/openid-configuration')return {status:200,async json(){return {issuer:'https://id.example.test',authorization_endpoint:'https://id.example.test/authorize',token_endpoint:'https://id.example.test/token',jwks_uri:'https://id.example.test/jwks'};},async text(){return '';}};
    if(url==='https://id.example.test/jwks')return {status:200,async json(){return {keys:[{...publicJwk,kid,use:'sig',alg:'RS256'}]};},async text(){return '';}};
    if(url==='https://id.example.test/token'){
      const body=new URLSearchParams(String(init?.body||''));assert.equal(body.get('client_secret'),'fixture-oidc-secret');assert.ok(body.get('code_verifier'));
      const now=Math.floor(Date.now()/1000),id_token=jwt({iss:'https://id.example.test',aud:'forge-client',sub:'subject-1',email:'sso-user@example.test',email_verified:true,name:'SSO Person',nonce:currentNonce,iat:now,exp:now+600});
      return {status:200,async json(){return {id_token,access_token:'not-used',token_type:'Bearer'};},async text(){return '';}};
    }
    throw new Error('Unexpected OIDC transport URL '+url);
  };
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
    process.env.TEST_OIDC_SECRET='fixture-oidc-secret';
    ({server}=serverFor(db,{requestLimit:100000,oidcTransport}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;process.env.STUDIO_PUBLIC_API_URL=base.replace('/api/v1/studio-next','');
  });
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[owner.id,admin.id]]);await pool.end();});

  test('workspace owner stores OIDC references but secret-manager paths are never returned',async()=>{
    await send('PUT',`/workspaces/${workspaceId}/enterprise-identity`,admin,{oidcEnabled:false,issuer:null,clientId:null,clientSecretRef:null,allowedEmailDomain:'example.test'},403);
    const saved=await send('PUT',`/workspaces/${workspaceId}/enterprise-identity`,owner,{oidcEnabled:true,issuer:'https://id.example.test',clientId:'forge-client',clientSecretRef:'secret/prod/forge/oidc',allowedEmailDomain:'example.test'});
    assert.equal(saved.clientSecretConfigured,true);assert.equal(Object.hasOwn(saved,'clientSecretRef'),false);
    const read=await send('GET',`/workspaces/${workspaceId}/enterprise-identity`,owner);assert.equal(read.configuration.oidcEnabled,true);assert.equal(read.configuration.clientSecretConfigured,true);assert.equal(Object.hasOwn(read.configuration,'clientSecretRef'),false);
  });

  test('OIDC PKCE login validates signed identity and issues a normal ForgeStudio session',async()=>{
    await send('PUT',`/workspaces/${workspaceId}/enterprise-identity`,owner,{oidcEnabled:true,issuer:'https://id.example.test',clientId:'forge-client',clientSecretRef:'env:TEST_OIDC_SECRET',allowedEmailDomain:'example.test'});
    const start=await fetch(`${base}/oidc/${workspaceId}/start?returnTo=%2Fdashboard`,{redirect:'manual'});assert.equal(start.status,302);
    const authorization=new URL(start.headers.get('location')||'');assert.equal(authorization.origin,'https://id.example.test');assert.equal(authorization.searchParams.get('code_challenge_method'),'S256');
    const state=authorization.searchParams.get('state')!;assert.ok(state);currentNonce=(await pool.query('SELECT nonce FROM studio.oidc_login_states WHERE id=$1',[state])).rows[0].nonce;
    const setCookie=start.headers.get('set-cookie')||'',match=/forge_oidc_pkce=([^;]+)/.exec(setCookie);assert.ok(match);
    const callback=await fetch(`${base}/oidc/${workspaceId}/callback?state=${encodeURIComponent(state)}&code=fixture-code`,{redirect:'manual',headers:{Cookie:`forge_oidc_pkce=${match![1]}`}});
    assert.equal(callback.status,302);assert.equal(callback.headers.get('location'),'http://localhost:5173/dashboard');assert.match(callback.headers.get('set-cookie')||'',/forge_session=/);
    const user=await pool.query('SELECT id,"emailVerified",status FROM public.users WHERE email=$1',['sso-user@example.test']);assert.equal(user.rows[0].emailVerified,true);assert.equal(user.rows[0].status,'ACTIVE');
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM public.workspace_members WHERE "workspaceId"=$1 AND "userId"=$2',[workspaceId,user.rows[0].id])).rows[0].n,1);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM studio.oidc_login_states WHERE id=$1 AND used_at IS NOT NULL',[state])).rows[0].n,1);
    const replay=await fetch(`${base}/oidc/${workspaceId}/callback?state=${encodeURIComponent(state)}&code=fixture-code`,{redirect:'manual',headers:{Cookie:`forge_oidc_pkce=${match![1]}`}});assert.equal(replay.status,401);
    await pool.query('DELETE FROM public.users WHERE id=$1',[user.rows[0].id]);
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
