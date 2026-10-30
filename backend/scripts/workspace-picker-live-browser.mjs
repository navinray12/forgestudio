// Live workspace integration: real dashboard, session auth, API and PostgreSQL. No mocked success responses.
// Run from backend after starting local API/Vite and disposable Chrome: node scripts/workspace-picker-live-browser.mjs --run
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';
if (!process.argv.includes('--run')) throw new Error('Pass --run to create and remove disposable UUID-scoped fixtures');
const api = process.env.WORKSPACE_SMOKE_API || 'http://localhost:5000';
const origin = process.env.WORKSPACE_SMOKE_FRONTEND || 'http://localhost:5173';
const debug = process.env.CHROME_DEBUG_URL || 'http://127.0.0.1:9227';
assert.ok(['localhost','127.0.0.1'].includes(new URL(api).hostname)); assert.ok(['localhost','127.0.0.1'].includes(new URL(origin).hostname));
const pool = new pg.Pool({ connectionString: process.env.WORKSPACE_SMOKE_DATABASE_URL || process.env.DATABASE_URL, connectionTimeoutMillis: 4000 });
const owner = randomUUID(), member = randomUUID(), outsider = randomUUID(), primary = randomUUID(), legacy = randomUUID();
const users = [owner, member, outsider]; const tokens = new Map(users.map(id => [id, randomBytes(32).toString('hex')]));
const passed = [], errors = [], responses = [];
let socket, send, failCreate = false, failList = false, dropCreateResponse = false;
let sequence = 0; const pending = new Map();
const output = new URL('../../.integration-review/workspace-picker-e2e/', import.meta.url); await mkdir(output, {recursive:true});
const protectedData = async () => ({
  websites: (await pool.query('SELECT id,to_jsonb(w) AS data FROM websites w WHERE NOT ("userId"=ANY($1::uuid[])) ORDER BY id',[users])).rows,
  workspaces: (await pool.query('SELECT id,to_jsonb(w) AS data FROM workspaces w WHERE NOT ("ownerId"=ANY($1::uuid[])) ORDER BY id',[users])).rows,
});
const before = await protectedData();
async function request(path, {actor=owner, body, method=body===undefined?'GET':'POST', key=randomUUID(), intent=true} = {}) {
  const response = await fetch(api+path, {method, headers: {...(actor?{cookie:`forge_session=${tokens.get(actor)}`} : {}), ...(body===undefined?{}:{'content-type':'application/json','Idempotency-Key':key,...(intent?{'X-Forge-Intent':'workspace-command'}:{})})}, body:body===undefined?undefined:JSON.stringify(body), signal:AbortSignal.timeout(15000)});
  return {status:response.status,data:await response.json()};
}
const list = async actor => request('/api/dashboard/workspaces',{actor:actor||owner});
const create = (name,workspaceType,key=randomUUID()) => request('/api/dashboard/workspaces',{body:{name,workspaceType},key});
const rename = (id,name,updatedAt,actor=owner) => request(`/api/dashboard/workspaces/${id}`,{body:{name,expectedUpdatedAt:updatedAt},method:'PATCH',actor});
try {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [index,id] of users.entries()) {
      await client.query('INSERT INTO users(id,"fullName",email,"emailVerified","updatedAt") VALUES ($1,$2,$3,true,now())',[id,index===0?'Workspace Tester':`Workspace Tester ${index}`,`workspace-picker-smoke-${id}@example.invalid`]);
      await client.query('INSERT INTO sessions(id,"userId","tokenHash","expiresAt") VALUES ($1,$2,$3,now()+interval \'30 minutes\')',[randomUUID(),id,createHash('sha256').update(tokens.get(id)).digest('hex')]);
    }
    for (const [id,slug] of [[primary,`personal-ws-${owner}`],[legacy,`personal-default-${owner}`]]) {
      await client.query('INSERT INTO workspaces(id,"ownerId",name,slug,settings) VALUES ($1,$2,\'Personal workspace\',$3,$4)',[id,owner,slug,{locale:'en',timeZone:'Asia/Calcutta'}]);
      await client.query('INSERT INTO workspace_members(id,"workspaceId","userId",role) VALUES ($1,$2,$3,\'OWNER\')',[randomUUID(),id,owner]);
    }
    await client.query('INSERT INTO workspace_members(id,"workspaceId","userId",role) VALUES ($1,$2,$3,\'MEMBER\')',[randomUUID(),primary,member]);
    const home=randomUUID();
    await client.query('INSERT INTO websites(id,"userId","workspaceId",name,slug,"editorData") VALUES ($1,$2,$3,\'Workspace picker existing site\',$4,$5)',[home,owner,primary,`workspace-picker-${home}`,{version:1,elements:[{id:'preserve',type:'heading',content:'Preserve existing site'}]}]);
    await client.query('COMMIT');
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
  assert.equal((await request('/api/dashboard/workspaces',{actor:null})).status,401);
  assert.equal((await request('/api/dashboard/workspaces',{body:{name:'Denied',workspaceType:'STANDARD'},intent:false})).status,403);
  assert.equal((await request('/api/dashboard/workspaces',{body:{name:'  ',workspaceType:'STANDARD'}})).status,400);
  const initial=await list(); assert.equal(initial.status,200); assert.equal(initial.data.workspaces.length,1); assert.equal(initial.data.workspaces[0].siteCount,1);
  const key=randomUUID();
  const [one,two]=await Promise.all([create('API standard workspace','STANDARD',key),create('API standard workspace','STANDARD',key)]);
  assert.equal(one.status,201); assert.equal(two.status,201); assert.equal(one.data.workspace.id,two.data.workspace.id);
  const standard=one.data.workspace;
  assert.equal((await create('Conflicting name','STANDARD',key)).status,409);
  const dev=await create('API developer workspace','DEVELOPER'); assert.equal(dev.status,201);
  const developer=dev.data.workspace;
  assert.equal((await pool.query('SELECT settings FROM workspaces WHERE id=$1',[developer.id])).rows[0].settings.workspaceType,'DEVELOPER');
  assert.equal((await pool.query('SELECT role FROM workspace_members WHERE "workspaceId"=$1 AND "userId"=$2',[developer.id,owner])).rows[0].role,'OWNER');
  let primaryRow=(await list()).data.workspaces.find(row=>row.id===primary);
  assert.equal((await rename(primary,'Denied member rename',primaryRow.updatedAt,member)).status,403);
  assert.equal((await rename(primary,'Denied outsider rename',primaryRow.updatedAt,outsider)).status,404);
  assert.equal((await rename(primary,'Custom personal workspace',primaryRow.updatedAt)).status,200);
  assert.equal((await rename(primary,'Stale rename',primaryRow.updatedAt)).status,409);
  const settings=(await pool.query('SELECT settings FROM workspaces WHERE id=$1',[primary])).rows[0].settings;
  assert.equal(settings.locale,'en'); assert.equal(settings.timeZone,'Asia/Calcutta');
  assert.equal((await list()).data.workspaces.find(row=>row.id===primary).name,'Custom personal workspace');
  assert.equal((await list(outsider)).data.workspaces.length,0);
  const memberDev = await request('/api/dashboard/workspaces', {actor:member,body:{name:'Member developer sandbox',workspaceType:'DEVELOPER'}});
  assert.equal(memberDev.status,201);
  const createdSite = await request('/api/dashboard/sites', {actor:member,body:{name:'Developer sandbox site',workspaceId:memberDev.data.workspace.id}});
  assert.equal(createdSite.status,201);
  const developerSite=createdSite.data.website;
  assert.equal(developerSite.workspaceId,memberDev.data.workspace.id);assert.equal(developerSite.status,'DRAFT');
  const archiveDeveloperSite=archived=>request(`/api/dashboard/sites/${developerSite.id}/archive`,{actor:member,method:'PATCH',body:{workspaceId:memberDev.data.workspace.id,archived}});
  assert.equal((await archiveDeveloperSite(true)).status,200);
  const archivedSummary=(await list(member)).data.workspaces.find(row=>row.id===memberDev.data.workspace.id);
  assert.equal(archivedSummary.siteCount,0);assert.equal(archivedSummary.archivedSiteCount,1);
  assert.equal((await request(`/api/dashboard/sites?workspaceId=${memberDev.data.workspace.id}`,{actor:member})).data.websites.length,0);
  assert.equal((await archiveDeveloperSite(false)).status,200);
  assert.equal((await request(`/api/dashboard/sites?workspaceId=${memberDev.data.workspace.id}`,{actor:member})).data.websites.length,1);
  assert.equal((await request(`/api/dashboard/sites?workspaceId=${memberDev.data.workspace.id}`)).status,404);
  passed.push('Developer workspace creates a real draft site, supports archive/restore, and keeps sites private to its memberships');
  passed.push('Authenticated API validation, standard/developer persistence, atomic owner membership, concurrent create idempotency, member/outsider isolation, rename revision checks and settings preservation');

  const target=await (await fetch(`${debug}/json/new?about:blank`,{method:'PUT'})).json();
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  socket.addEventListener('message',async event=>{
    const message=JSON.parse(event.data);
    if(message.id){const task=pending.get(message.id);pending.delete(message.id);if(task)message.error?task.reject(message.error):task.resolve(message.result);return;}
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
    if(message.method==='Network.responseReceived'&&message.params.response.url.includes('/api/dashboard/workspaces'))responses.push(message.params.response.status);
    if(message.method==='Fetch.requestPaused'){
      const {requestId,request:req}=message.params;
      if ((failCreate&&req.method==='POST')||(failList&&req.method==='GET')) {await send('Fetch.failRequest',{requestId,errorReason:'ConnectionFailed'}).catch(()=>{});return;}
      if(dropCreateResponse&&req.method==='POST'){
        dropCreateResponse=false;
        const headers=Object.fromEntries(Object.entries(req.headers).filter(([name])=>!['content-length','host','cookie'].includes(name.toLowerCase())));
        headers.cookie=`forge_session=${tokens.get(owner)}`;
        const result=await fetch(req.url,{method:'POST',headers,body:req.postData});assert.equal(result.status,201);await result.json();
        await send('Fetch.failRequest',{requestId,errorReason:'ConnectionFailed'}).catch(()=>{});return;
      }
      await send('Fetch.continueRequest',{requestId}).catch(()=>{});
    }
  });
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,150));}throw new Error(`Browser timeout: ${expression}`);};
  const click=text=>evaluate(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(el=>el.textContent.trim()===${JSON.stringify(text)}&&!el.disabled);if(!button)throw Error('Button missing: '+${JSON.stringify(text)});button.click();})()`);
  const fill=(selector,value)=>evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const openPicker=async()=>{await until(`!!document.querySelector('[aria-label="Dashboard workspace"]:not(:disabled)')`);await evaluate(`document.querySelector('[aria-label="Dashboard workspace"]').click()`);await until(`!!document.querySelector('#workspace-picker-menu')`);};
  const choose=async name=>{await openPicker();await evaluate(`Array.from(document.querySelectorAll('#workspace-picker-menu [role="menuitemradio"]')).find(el=>el.textContent.includes(${JSON.stringify(name)})).click()`);};
  const waitWorkspace=name=>until(`document.querySelector('[aria-label="Dashboard workspace"]')?.textContent?.includes(${JSON.stringify(name)})&&!document.querySelector('[aria-label="Loading sites"]')&&!document.querySelector('.dashboard-error')`);
  const openManage=async()=>{await openPicker();await click('Manage Workspaces');await until(`!!document.querySelector('.workspace-manager-row')&&!Array.from(document.querySelectorAll('[role="status"]')).some(el=>el.textContent==='Loading workspaces...')`);};
  const closeDialog=()=>evaluate(`document.querySelector('[aria-label="Close workspace dialog"]').click()`);
  const screenshot=async name=>{const result=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL(name+'.png',output),Buffer.from(result.data,'base64'));};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Network.setCookie',{name:'forge_session',value:tokens.get(owner),url:api,httpOnly:true,sameSite:'Lax'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(origin)}&&!localStorage.getItem('forgestudio.workspace.${owner}'))localStorage.setItem('forgestudio.workspace.${owner}','${primary}');`});
  await send('Page.navigate',{url:origin+'/dashboard'});await waitWorkspace('Custom personal workspace');
  assert.equal(await evaluate(`document.querySelector('.site-meta h3').textContent`),'Workspace picker existing site');
  await openPicker();await screenshot('workspace-dropdown');
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-checked')`),'true');
  await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}))`);
  assert.equal(await evaluate(`document.activeElement.textContent.trim()`),'Manage Workspaces');
  await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))`);
  assert.equal(await evaluate(`document.activeElement.getAttribute('role')`),'menuitemradio');
  await evaluate(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert.equal(await evaluate(`!!document.querySelector('#workspace-picker-menu')`),false);
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Dashboard workspace');
  await openPicker();await click('Create Workspace');await until(`document.querySelector('dialog[open] h2')?.textContent==='Create Workspace'`);
  await fill('[aria-label="Workspace name"]','Browser team workspace');await click('Create workspace');
  await until(`!document.querySelector('dialog[open]')`);await waitWorkspace('Browser team workspace');
  assert.equal(await evaluate(`document.querySelectorAll('.site-card').length`),0);
  await send('Page.reload');await waitWorkspace('Browser team workspace');
  await openPicker();await click('Create developer workspace');await fill('[aria-label="Workspace name"]','Browser developer lab');await click('Create workspace');
  await until(`!document.querySelector('dialog[open]')`);await waitWorkspace('Browser developer lab');
  assert.equal(await evaluate(`!!document.querySelector('.workspace-picker-trigger .is-developer')`),true);
  await openManage();await screenshot('manage-workspaces');
  const browserDev=(await list()).data.workspaces.find(row=>row.name==='Browser developer lab');assert.equal(browserDev.workspaceType,'DEVELOPER');
  await evaluate(`document.querySelector('[aria-label="Rename Browser developer lab"]').click()`);await fill('[aria-label="Rename workspace"]','Renamed developer lab');await click('Save name');
  await until(`document.querySelector('.workspace-dialog-notice')?.textContent==='Workspace name updated.'`);await until(`document.querySelector('.workspace-manager-list').textContent.includes('Renamed developer lab')`);
  await closeDialog();await waitWorkspace('Renamed developer lab');await send('Page.reload');await waitWorkspace('Renamed developer lab');
  await choose('API standard workspace');await waitWorkspace('API standard workspace');
  await openManage();
  await evaluate(`(()=>{const row=Array.from(document.querySelectorAll('.workspace-manager-row')).find(row=>row.querySelector('strong').textContent==='Custom personal workspace');Array.from(row.querySelectorAll('button')).find(button=>button.textContent==='Open').click();})()`);
  await until(`!document.querySelector('dialog[open]')`);await waitWorkspace('Custom personal workspace');assert.equal(await evaluate(`document.querySelector('.site-meta h3').textContent`),'Workspace picker existing site');
  passed.push('Browser dropdown matches the requested actions, keyboard Escape/focus, standard/developer create, automatic selection, reload persistence, manager rename, developer icon and isolated site switching');

  await send('Fetch.enable',{patterns:[{urlPattern:'*api/dashboard/workspaces*',requestStage:'Request'}]});
  failCreate=true;await openPicker();await click('Create Workspace');await fill('[aria-label="Workspace name"]','Retry test workspace');await click('Create workspace');
  await until(`!!document.querySelector('.workspace-dialog-error')&&!document.querySelector('[aria-label="Workspace name"]').disabled`);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Workspace name"]').value`),'Retry test workspace');
  failCreate=false;await click('Create workspace');await until(`!document.querySelector('dialog[open]')`);await waitWorkspace('Retry test workspace');
  await openPicker();await click('Create Workspace');await fill('[aria-label="Workspace name"]','Lost response workspace');
  dropCreateResponse=true;await click('Create workspace');await until(`!!document.querySelector('.workspace-dialog-error')&&!document.querySelector('[aria-label="Workspace name"]').disabled`);
  assert.equal((await list()).data.workspaces.filter(row=>row.name==='Lost response workspace').length,1);
  await click('Create workspace');await until(`!document.querySelector('dialog[open]')`);await waitWorkspace('Lost response workspace');
  assert.equal((await list()).data.workspaces.filter(row=>row.name==='Lost response workspace').length,1);
  failList=true;await openPicker();await click('Manage Workspaces');await until(`!!document.querySelector('.workspace-dialog-error')`);
  failList=false;await click('Refresh workspaces');await until(`!!document.querySelector('.workspace-manager-row')&&!document.querySelector('.workspace-dialog-error')`);
  await closeDialog();
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.querySelector('[aria-label="Toggle navigation"]').click()`);await openPicker();await screenshot('workspace-dropdown-mobile');
  await click('Manage Workspaces');await until(`!!document.querySelector('.workspace-manager-row')`);
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=390`));await screenshot('manage-workspaces-mobile');await closeDialog();
  passed.push('Browser failed-create input retention/retry, lost-response idempotent retry, manager load recovery, mobile dropdown and management with no horizontal overflow');
  assert.deepEqual(errors,[]);
  assert.ok(responses.every(status=>[200,201,204].includes(status)));
  assert.deepEqual(await protectedData(),before);
  passed.push('No browser runtime exceptions; all original workspaces and website content unchanged');
  const report={passed,mockedSuccessResponses:false,existingWebsitesPreserved:before.websites.length,existingWorkspacesPreserved:before.workspaces.length};
  await writeFile(new URL('report.json',output),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} catch(error) {
  await writeFile(new URL('failure.json',output),JSON.stringify({message:error.message,stack:error.stack,passed,errors,responses},null,2));
  if(send){try{const result=await send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('failure.png',output),Buffer.from(result.data,'base64'));}catch{}}
  throw error;
} finally {
  if(send){try{await send('Network.deleteCookies',{name:'forge_session',url:api});await send('Page.close');}catch{}}socket?.close();
  const cleanup=await pool.connect();
  try {
    await cleanup.query('BEGIN');
    await cleanup.query('DELETE FROM websites WHERE "userId"=ANY($1::uuid[])',[users]);
    await cleanup.query('DELETE FROM audit_logs WHERE "userId"=ANY($1::uuid[])',[users]);
    await cleanup.query('DELETE FROM workspaces WHERE "ownerId"=ANY($1::uuid[])',[users]);
    await cleanup.query('DELETE FROM users WHERE id=ANY($1::uuid[]) AND email LIKE \'workspace-picker-smoke-%@example.invalid\'',[users]);
    await cleanup.query('COMMIT');
  } catch(error){await cleanup.query('ROLLBACK');throw error;}finally{cleanup.release();await pool.end();}
}
