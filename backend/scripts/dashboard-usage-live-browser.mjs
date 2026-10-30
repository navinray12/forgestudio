// PDF Usage page smoke test against the real local frontend, API, authentication and PostgreSQL.
// Run from backend: node scripts/dashboard-usage-live-browser.mjs --run
import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import pg from 'pg';
import {PrismaClient} from '../src/generated/prisma/client.js';
import {PrismaPg} from '@prisma/adapter-pg';
import {createAiCreditUsageRecorder} from '../dist/services/dashboard-usage.service.js';
if(!process.argv.includes('--run'))throw new Error('Pass --run to create/remove disposable UUID-scoped usage fixtures');
const api=process.env.USAGE_SMOKE_API||'http://localhost:5000',origin=process.env.USAGE_SMOKE_FRONTEND||'http://localhost:5173',debug=process.env.CHROME_DEBUG_URL||'http://127.0.0.1:9227';
assert.ok(['localhost','127.0.0.1'].includes(new URL(api).hostname));assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const pool=new pg.Pool({connectionString:process.env.USAGE_SMOKE_DATABASE_URL||process.env.DATABASE_URL,connectionTimeoutMillis:4000});
const db=new PrismaClient({adapter:new PrismaPg(pool)});
const owner=randomUUID(),member=randomUUID(),outsider=randomUUID(),primary=randomUUID(),legacy=randomUUID(),second=randomUUID();
const siteA=randomUUID(),siteB=randomUUID(),siteC=randomUUID(),hidden=randomUUID();
const users=[owner,member,outsider],sites=[siteA,siteB,siteC,hidden],workspaces=[primary,legacy,second];
const tokens=new Map(users.map(id=>[id,randomBytes(32).toString('hex')]));const passed=[],errors=[];let socket,send,sequence=0,failLoad=false,delayPrimary=false;const pending=new Map();
const output=new URL('../../.integration-review/usage-e2e/',import.meta.url);await mkdir(output,{recursive:true});
await writeFile(new URL('fixtures.json',output),JSON.stringify({users,sites,workspaces},null,2));
const now=new Date(),cycleStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)),cycleEnd=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1));
const today=now.toISOString().slice(0,10),oldDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-2,5)).toISOString().slice(0,10);
const preserved=async()=>({websites:(await pool.query('SELECT to_jsonb(w) AS data FROM websites w WHERE NOT (id=ANY($1::uuid[])) ORDER BY id',[sites])).rows,workspaces:(await pool.query('SELECT to_jsonb(w) AS data FROM workspaces w WHERE NOT (id=ANY($1::uuid[])) ORDER BY id',[workspaces])).rows,users:(await pool.query('SELECT to_jsonb(u) AS data FROM users u WHERE NOT (id=ANY($1::uuid[])) ORDER BY id',[users])).rows,history:(await pool.query('SELECT md5(string_agg(to_jsonb(m)::text,\'\' ORDER BY id)) AS fingerprint FROM _prisma_migrations m')).rows});
const before=await preserved();
async function request(path,actor=owner){const response=await fetch(api+path,{headers:actor?{cookie:`forge_session=${tokens.get(actor)}`}:{},signal:AbortSignal.timeout(15000)});return{status:response.status,data:await response.json()};}
const usage=(workspace=primary,extra='',actor=owner)=>request(`/api/dashboard/usage?workspaceId=${workspace}${extra}`,actor);
try{
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  for(const[index,id]of users.entries()){
   await c.query('INSERT INTO users(id,"fullName",email,"emailVerified","optimizationCredits","updatedAt") VALUES($1,$2,$3,true,$4,now())',[id,index===0?'Usage Tester':index===1?'Usage Contributor':'Usage Outsider',`usage-smoke-${id}@example.invalid`,index===0?248:250]);
   await c.query('INSERT INTO sessions(id,"userId","tokenHash","expiresAt") VALUES($1,$2,$3,now()+interval \'30 minutes\')',[randomUUID(),id,createHash('sha256').update(tokens.get(id)).digest('hex')]);
  }
  for(const[id,name,slug]of[[primary,'Usage primary',`personal-ws-${owner}`],[legacy,'Usage alias',`personal-default-${owner}`],[second,'Usage second workspace',`usage-second-${second}`]]){
   await c.query('INSERT INTO workspaces(id,name,slug,"ownerId") VALUES($1,$2,$3,$4)',[id,name,slug,owner]);
   await c.query('INSERT INTO workspace_members(id,"workspaceId","userId",role) VALUES($1,$2,$3,\'OWNER\')',[randomUUID(),id,owner]);
  }
  for(const workspace of[primary,second])await c.query('INSERT INTO workspace_members(id,"workspaceId","userId",role) VALUES($1,$2,$3,\'MEMBER\')',[randomUUID(),workspace,member]);
  for(const[id,name,workspace,account,archived]of[[siteA,'Usage Alpha',primary,owner,false],[siteB,'Usage Archived',legacy,owner,true],[siteC,'Usage Beta',second,owner,false],[hidden,'Usage Hidden',primary,outsider,false]])await c.query('INSERT INTO websites(id,"userId","workspaceId",name,slug,status,"editorData","archivedAt") VALUES($1,$2,$3,$4,$5,\'PUBLISHED\',$6,$7)',[id,account,workspace,name,`usage-smoke-${id}`,{version:1,elements:[{id:'heading',type:'heading',content:'Usage test content'}]},archived?new Date():null]);
  await c.query('INSERT INTO website_collaborators(id,"websiteId","userId",permission,"updatedAt") VALUES($1,$2,$3,\'EDITOR\',now())',[randomUUID(),siteA,member]);
  const plan=(await c.query('SELECT id FROM subscription_plans WHERE slug=\'agency\'')).rows[0];assert.ok(plan,'Existing agency plan required');
  await c.query('INSERT INTO user_subscriptions(id,"userId","planId",status,"currentPeriodStart","currentPeriodEnd","updatedAt") VALUES($1,$2,$3,\'ACTIVE\',$4,$5,now())',[randomUUID(),owner,plan.id,cycleStart.toISOString(),cycleEnd.toISOString()]);
  for(const[site,size]of[[siteA,1048576],[siteC,2097152]])await c.query('INSERT INTO media_assets(id,"userId","websiteId",filename,"originalName","mimeType","sizeBytes",url) VALUES($1,$2,$3,\'fixture.png\',\'fixture.png\',\'image/png\',$4,\'/usage-fixture.png\')',[randomUUID(),owner,site,size]);
  await c.query('INSERT INTO media_optimization_assets(id,"websiteId","originalUrl","optimizedUrl","originalBytes","optimizedBytes") VALUES($1,$2,\'/usage-fixture.png\',\'/usage-fixture.webp\',1048576,524288)',[randomUUID(),siteA]);
  for(let i=0;i<2;i++)await c.query('INSERT INTO optimization_credit_ledgers(id,"userId","websiteId","creditsUsed","actionType") VALUES($1,$2,$3,1,\'IMAGE_OPTIMIZE\')',[randomUUID(),owner,siteA]);
  const license=randomUUID(),expired=randomUUID();
  for(const[id,expires]of[[license,new Date(+now+86400000*40)],[expired,new Date(+now-86400000)]])await c.query('INSERT INTO licenses(id,key,"userId","planSlug",status,"expiresAt") VALUES($1,$2,$3,\'agency\',\'ACTIVE\',$4)',[id,`usage-smoke-${id}`,owner,expires]);
  for(const[id,isLocal]of[[license,false],[license,true],[expired,false]])await c.query('INSERT INTO license_activations(id,"licenseId","siteUrl","siteDomain","isLocalhost") VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,isLocal?'http://localhost:4000':'https://usage.example.invalid',isLocal?'localhost:4000':'usage.example.invalid',isLocal]);
  await c.query('COMMIT');
 }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
 const record=createAiCreditUsageRecorder(db),key=randomUUID();
 const recordA={accountId:owner,actorId:owner,websiteId:siteA,credits:12,feature:'AI_TEXT',requestKey:key};
 const [first,replay]=await Promise.all([record(recordA),record(recordA)]);assert.equal(first.id,replay.id);assert.equal([first.created,replay.created].filter(Boolean).length,1);
 await assert.rejects(record({...recordA,credits:13}),(error)=>error.code==='IDEMPOTENCY_CONFLICT');
 await record({accountId:owner,actorId:member,websiteId:siteA,credits:8,feature:'AI_TEXT',requestKey:randomUUID()});
 await record({accountId:owner,actorId:owner,websiteId:siteB,credits:5,feature:'AI_IMAGE',requestKey:randomUUID()});
 await record({accountId:owner,actorId:owner,websiteId:siteC,credits:17,feature:'AI_TEXT',requestKey:randomUUID()});
 const historical=await record({accountId:owner,actorId:owner,websiteId:siteA,credits:9,feature:'AI_TEXT',requestKey:randomUUID()});await pool.query('UPDATE dashboard_ai_credit_usage SET "createdAt"=$1 WHERE id=$2',[`${oldDate}T12:00:00.000Z`,historical.id]);
 await assert.rejects(record({accountId:owner,actorId:outsider,websiteId:siteA,credits:1,feature:'AI_TEXT',requestKey:randomUUID()}),(error)=>error.statusCode===404);
 assert.equal((await usage(primary,'',null)).status,401);assert.equal((await usage(primary,'',outsider)).status,404);
 for(const extra of['&range=bad','&range=custom','&range=custom&start=2020-01-01&end=2026-10-28','&accountId='+outsider])assert.equal((await usage(primary,extra)).status,400);
 let result=await usage();assert.equal(result.status,200,JSON.stringify(result.data));const data=result.data;
 assert.equal(data.quotas.websites.used,3);assert.equal(data.quotas.websites.limit,50);assert.equal(data.quotas.storage.usedBytes,3670016);assert.equal(data.quotas.storage.limitMb,50000);
 assert.equal(data.quotas.optimization.remaining,248);assert.equal(data.quotas.optimization.operations,2);assert.deepEqual(data.quotas.licenses,{active:1,production:1,development:1});
 assert.equal(data.quotas.aiCredits.used,42);assert.equal(data.quotas.aiCredits.limit,5000);assert.equal(data.activity.usedCredits,25);assert.equal(data.activity.breakdown.length,3);
 assert.equal((await usage(legacy)).data.activity.usedCredits,25);assert.equal((await usage(second)).data.activity.usedCredits,17);
 assert.equal((await usage(primary,`&range=custom&start=${oldDate}&end=${oldDate}`)).data.activity.usedCredits,9);
 assert.equal((await usage('personal')).data.activity.usedCredits,0);
 const memberReport=await usage(primary,'',member);assert.equal(memberReport.status,200);assert.equal(memberReport.data.activity.usedCredits,0);assert.equal(memberReport.data.quotas.aiCredits.limit,0);assert.equal(memberReport.data.quotas.licenses.active,0);
 assert.equal((await pool.query('SELECT count(*)::int AS count FROM user_subscriptions WHERE "userId"=$1',[member])).rows[0].count,0);
 passed.push('Real account quotas, media plus optimized storage, optimization credits, expired-license filtering, current-cycle credits, workspace/alias isolation, archived sites, date boundaries, contributor attribution and read-only fallback');
 passed.push('Persistent AI activity recording is concurrent/idempotent, rejects key conflicts and unauthorized actors, and does not alter optimization balances');
 const target=await(await fetch(`${debug}/json/new?about:blank`,{method:'PUT'})).json();socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
 send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 socket.addEventListener('message',async event=>{const message=JSON.parse(event.data);if(message.id){const task=pending.get(message.id);pending.delete(message.id);if(task)message.error?task.reject(message.error):task.resolve(message.result);return;}if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(message.method==='Fetch.requestPaused'){const{requestId,request:req}=message.params;if(failLoad){await send('Fetch.failRequest',{requestId,errorReason:'ConnectionFailed'}).catch(()=>{});return;}if(delayPrimary&&req.url.includes(`workspaceId=${primary}`))await new Promise(resolve=>setTimeout(resolve,700));await send('Fetch.continueRequest',{requestId}).catch(()=>{});}});
 const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,150));}throw new Error(`Browser timeout: ${expression}`);};
 const click=text=>evaluate(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(el=>el.textContent.trim()===${JSON.stringify(text)}&&!el.disabled);if(!button)throw Error('Missing button '+${JSON.stringify(text)});button.click();})()`);
 const choose=async name=>{await until(`!!document.querySelector('[aria-label="Dashboard workspace"]:not(:disabled)')`);await evaluate(`document.querySelector('[aria-label="Dashboard workspace"]').click()`);await until(`!!document.querySelector('#workspace-picker-menu')`);await evaluate(`Array.from(document.querySelectorAll('#workspace-picker-menu [role="menuitemradio"]')).find(el=>el.textContent.includes(${JSON.stringify(name)})).click()`);};
 const select=(selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const dateInput=(selector,value)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const loaded=()=>until(`!!document.querySelector('.usage-stat-grid')&&!document.querySelector('.usage-error')&&!document.querySelector('.usage-loading')`);
 const screenshot=async name=>{const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(new URL(name+'.png',output),Buffer.from(result.data,'base64'));};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1160,deviceScaleFactor:1,mobile:false});
 await send('Network.setCookie',{name:'forge_session',value:tokens.get(owner),url:api,httpOnly:true,sameSite:'Lax'});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(origin)})localStorage.setItem('forgestudio.workspace.${owner}','${primary}');`});
 await send('Page.navigate',{url:origin+'/dashboard'});await until(`!!document.querySelector('.sidebar-link')`);await click('Usage');await loaded();
 assert.equal(await evaluate(`document.querySelectorAll('.usage-stat').length`),4);assert.equal(await evaluate(`document.querySelector('.usage-features-value').textContent`),'25');
 assert.equal(await evaluate(`document.querySelector('.usage-stat.is-purple .usage-stat-value strong').textContent`),'3.5 MB');
 assert.equal(await evaluate(`!!document.querySelector('.usage-chart-plot svg rect[fill="#7665ff"]')`),true);await screenshot('usage-populated-desktop');
 await click('View details');assert.equal(await evaluate(`document.querySelectorAll('.usage-page tbody tr').length`),3);assert.ok(await evaluate(`document.querySelector('.usage-table-wrap').textContent.includes('Usage Contributor')`));
 await select('[aria-label="Usage date range"]','custom');await dateInput('[aria-label="Usage start date"]',oldDate);await dateInput('[aria-label="Usage end date"]',oldDate);await click('Apply dates');await loaded();assert.equal(await evaluate(`document.querySelector('.usage-features-value').textContent`),'9');
 await select('[aria-label="Credit chart date range"]','current_cycle');await loaded();assert.equal(await evaluate(`document.querySelector('.usage-features-value').textContent`),'25');
 await choose('Usage second workspace');await loaded();await until(`document.querySelector('.usage-features-value').textContent==='17'`);assert.equal(await evaluate(`document.querySelector('.usage-stat.is-blue strong').textContent`),'3');
 await select('[aria-label="Usage date range"]','previous_cycle');await loaded();assert.equal(await evaluate(`document.querySelector('.usage-features-value').textContent`),'0');await click('Hide details');await screenshot('usage-empty-desktop');
 await select('[aria-label="Usage date range"]','current_cycle');await loaded();
 await send('Fetch.enable',{patterns:[{urlPattern:'*api/dashboard/usage*',requestStage:'Request'}]});delayPrimary=true;await choose("Usage Tester's Workspace");await choose('Usage second workspace');await loaded();await new Promise(resolve=>setTimeout(resolve,900));assert.equal(await evaluate(`document.querySelector('.usage-features-value').textContent`),'17');delayPrimary=false;
 failLoad=true;await evaluate(`document.querySelector('[aria-label="Refresh usage"]').click()`);await until(`!!document.querySelector('.usage-error')`);assert.equal(await evaluate(`document.querySelectorAll('.usage-stat').length`),0);failLoad=false;await click('Try again');await loaded();
 assert.equal(await evaluate(`document.querySelector('.usage-add-credits').getAttribute('href')`),'/subscriptions');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.ok(await evaluate(`document.documentElement.scrollWidth<=390`));await screenshot('usage-mobile');
 await evaluate(`document.querySelector('[aria-label="Toggle navigation"]').click()`);await click('Sites');await until(`!!document.querySelector('.sites-heading')`);await evaluate(`document.querySelector('[aria-label="Toggle navigation"]').click()`);await click('Usage');await loaded();assert.equal(await evaluate(`document.querySelector('.usage-features-value').textContent`),'17');
 passed.push('Browser matches the PDF layout: cards, balance, chart, breakdown; date filters/details, workspace switching, stale-response protection, failure/retry, plan link, mobile and return navigation');
 assert.deepEqual(errors,[]);assert.deepEqual(await preserved(),before);
 passed.push('No browser runtime exceptions; original website, workspace, user and migration records preserved');
 const report={passed,mockedSuccessResponses:false,existingWebsitesPreserved:before.websites.length,existingWorkspacesPreserved:before.workspaces.length};await writeFile(new URL('report.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await writeFile(new URL('failure.json',output),JSON.stringify({message:error.message,stack:error.stack,passed,errors},null,2));if(send){try{const result=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('failure.png',output),Buffer.from(result.data,'base64'));}catch{}}throw error;}
finally{
 if(send){try{await send('Network.deleteCookies',{name:'forge_session',url:api});await send('Page.close');}catch{}}socket?.close();
 const c=await pool.connect();try{await c.query('BEGIN');await c.query('DELETE FROM dashboard_ai_credit_usage WHERE "accountId"=ANY($1::uuid[])',[users]);await c.query('DELETE FROM media_assets WHERE \"userId\"=ANY($1::uuid[])',[users]);await c.query('DELETE FROM websites WHERE id=ANY($1::uuid[]) AND "userId"=ANY($2::uuid[])',[sites,users]);await c.query('DELETE FROM workspaces WHERE id=ANY($1::uuid[]) AND "ownerId"=$2',[workspaces,owner]);await c.query('DELETE FROM users WHERE id=ANY($1::uuid[]) AND email LIKE \'usage-smoke-%@example.invalid\'',[users]);await c.query('COMMIT');}catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();await db.$disconnect();await pool.end();}
}
