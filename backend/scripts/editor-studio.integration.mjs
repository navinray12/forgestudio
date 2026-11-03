import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';
import ts from '../../frontend/node_modules/typescript/lib/typescript.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const owner = randomUUID(), token = randomBytes(32).toString('hex');
const api = process.env.EDITOR_TEST_API || 'http://localhost:5000';
const origin = process.env.EDITOR_TEST_ORIGIN || 'http://localhost:5173';
const request = async (path, method = 'GET', body) => {
  const res = await fetch(api + path, {method, headers: {cookie: 'forge_session=' + token, 'Content-Type': 'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});
  const data = await res.json();
  assert.equal(res.ok, true, `${method} ${path}: ${res.status} ${JSON.stringify(data)}`);
  return data;
};
try {
  await pool.query('INSERT INTO users(id,"fullName",email,"emailVerified","updatedAt") VALUES($1,$2,$3,true,now())', [owner, 'Editor test', `editor-${owner}@example.invalid`]);
  await pool.query('INSERT INTO sessions(id,"userId","tokenHash","expiresAt") VALUES($1,$2,$3,now()+interval \'15 minutes\')', [randomUUID(), owner, createHash('sha256').update(token).digest('hex')]);
  const source = await readFile(new URL('../../frontend/src/pages/editor/defaults/summerLanding.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
  const {createSummerLanding} = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
  const elements = createSummerLanding(randomUUID);
  const created = await request('/api/websites', 'POST', {name: 'Editor PDF integration test'});
  const site = created.website || created.data?.website || created.data;
  assert.ok(site?.id, 'Website creation returns an ID');
  const heading = elements[2].children[1];
  heading.styles.color = '#FF4ED8';
  heading.styles.paddingLeft = '24px';
  heading.responsiveStyles.mobile.fontSize = '32px';
  const editorData = {version: 1, elements, pages: [{id: 'home', name: 'Home', slug: '/', isHome: true, elements, pageSettings: {title: 'Summer Sale Landing', path: '/'}}], homePageId: 'home', pageSettings: {title: 'Summer Sale Landing', path: '/'}};
  await request(`/api/websites/${site.id}`, 'PUT', {editorData});
  const loaded = (await request(`/api/websites/${site.id}`)).website;
  assert.deepEqual(loaded.editorData.elements, elements);
  assert.equal(loaded.editorData.pages[0].elements[2].children[1].styles.color, '#FF4ED8');
  assert.equal(loaded.editorData.pages[0].elements[2].children[1].responsiveStyles.mobile.fontSize, '32px');
  assert.equal(elements[3].children[1].formActions.saveToDb, true);
  if (process.argv.includes('--browser')) {
    const target = await (await fetch('http://127.0.0.1:9228/json/new?about:blank', {method: 'PUT'})).json();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, {once: true}));
    let seq = 0;
    const pending = new Map(), errors = [];
    const send = (method, params = {}) => new Promise((resolve,reject) => {const id = ++seq; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params}));});
    socket.addEventListener('message', e => {const m = JSON.parse(e.data); if(m.id) {const p = pending.get(m.id); pending.delete(m.id); m.error ? p?.reject(m.error) : p?.resolve(m.result);} else if(m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);});
    const evaluate = async expression => {const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}); if(r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value;};
    const until = async expression => {for(let i=0;i<200;i++) {if(await evaluate(expression)) return; await new Promise(r=>setTimeout(r,250));} throw Error('Browser timeout: '+expression);};
    try {
      await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
      await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1049,deviceScaleFactor:1,mobile:false});
      await send('Network.setCookie',{name:'forge_session',value:token,url:api,httpOnly:true,sameSite:'Lax'});
      await send('Page.navigate',{url:`${origin}/editor/${site.id}`});
      await until(`!!document.querySelector('.studio-header')`);
      await evaluate(`document.querySelector('.studio-layer').click()`);
      await until(`!!document.querySelector('input[aria-label="Width"]')`);
      assert.equal(await evaluate(`document.querySelectorAll('.studio-page-list>button').length >= 2`),true);
      assert.equal(await evaluate(`document.querySelector('.studio-page').textContent.includes('Gear up for')`),true);
      await evaluate(`Array.from(document.querySelectorAll('.studio-layer')).find(el => el.textContent.includes('Gear up for')).click()`);
      await until(`document.querySelector('.studio-element-type')?.textContent.includes('heading')`);
      await evaluate(`(()=>{const el=document.querySelector('input[aria-label="Color"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'#ee77cc');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await evaluate(`Array.from(document.querySelectorAll('.studio-actions>button')).find(el=>el.textContent==='Save').click()`);
      await until(`document.querySelector('.studio-save-status')?.textContent==='Saved to server'`);
      const savedFromBrowser = (await request(`/api/websites/${site.id}`)).website.editorData;
      assert.equal(savedFromBrowser.elements[2].children[1].styles.color, '#ee77cc');
      const output = new URL('../../.integration-review/editor-studio/',import.meta.url);
      await mkdir(output,{recursive:true});
      await writeFile(new URL('desktop.png',output),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
      await evaluate(`document.querySelector('[aria-label="mobile viewport"]').click()`);
      await until(`document.querySelector('.studio-page').style.width==='380px'`);
      await evaluate(`document.querySelector('[aria-label="desktop viewport"]').click()`);
      if (process.argv.includes('--blocks')) {
        await evaluate(`Array.from(document.querySelectorAll('.studio-rail button')).find(el=>el.textContent==='Blocks').click()`);
        await until(`document.querySelectorAll('.studio-block-card').length===18`);
        const blocksOutput = new URL('../../.integration-review/editor-blocks/',import.meta.url);
        await mkdir(blocksOutput,{recursive:true});
        await writeFile(new URL('desktop.png',blocksOutput),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
        const fillSearch = value => evaluate(`(()=>{const el=document.querySelector('[aria-label="Search blocks"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await fillSearch('date');
        await until(`document.querySelectorAll('.studio-block-card').length===1`);
        assert.equal(await evaluate(`document.querySelector('.studio-block-card').dataset.blockId`),'date-picker');
        await fillSearch('no-such-block');
        await until(`document.querySelector('.studio-block-notice')?.textContent.includes('No blocks found')`);
        await fillSearch('');
        await until(`document.querySelectorAll('.studio-block-card').length===18`);
        const ids = await evaluate(`Array.from(document.querySelectorAll('.studio-block-card')).map(el=>el.dataset.blockId)`);
        for (const id of ids) {
          await evaluate(`document.querySelector('[data-studio-canvas]').click()`);
          await evaluate(`document.querySelector('[data-block-id="${id}"]').click()`);
        }
        // Drag a composed grid onto the root canvas; child IDs/layout must survive persistence.
        await evaluate(`(()=>{const data=new DataTransfer();document.querySelector('[data-block-id="grid"]').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:data}));document.querySelector('[data-studio-canvas]').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data,clientY:100}));})()`);
        await evaluate(`Array.from(document.querySelectorAll('.studio-actions>button')).find(el=>el.textContent==='Save').click()`);
        await until(`document.querySelector('.studio-save-status')?.textContent==='Saved to server'`);
        const saved = (await request(`/api/websites/${site.id}`)).website.editorData;
        const flatten = items => items.flatMap(item=>[item,...flatten(item.children||[])]);
        const all = flatten(saved.elements);
        assert.ok(all.length > flatten(elements).length + 18);
        assert.ok(all.filter(item=>item.content==='Grid' && item.layout?.layoutType==='grid').length >= 2);
        assert.ok(all.some(item=>item.content==='Columns' && item.children?.length===2 && item.layout.direction==='row'));
        assert.ok(all.some(item=>item.content==='Date Picker' && item.formFields[0].type==='date'));
        const datePicker=all.find(item=>item.content==='Date Picker');
        const fields={[datePicker.formFields[0].id]:'2026-11-15'};
        const submitted=await request('/api/forms/submit','POST',{websiteId:site.id,formId:datePicker.id,formName:'Date picker integration',fields,actions:{activeActions:['database']}});
        assert.equal(submitted.success,true);
        const submissions=(await request(`/api/forms/${site.id}/submissions`)).submissions;
        assert.ok(submissions.some(item=>item.formId===datePicker.id&&item.data[datePicker.formFields[0].id]==='2026-11-15'));
        assert.ok(all.some(item=>item.content==='List' && item.iconListItems?.length===3));
        assert.equal(new Set(all.map(item=>item.id)).size,all.length);
        await send('Page.reload');
        await until(`!!document.querySelector('.studio-header')`);
        await evaluate(`Array.from(document.querySelectorAll('.studio-rail button')).find(el=>el.textContent==='Blocks').click()`);
        await until(`document.querySelectorAll('.studio-block-card').length===18`);
        assert.ok(await evaluate(`document.querySelector('.studio-page').textContent.includes('Choose a date')`));
        await evaluate(`document.querySelector('.studio-block-template').click()`);
        await until(`!document.querySelector('.studio-blocks') && !!document.querySelector('.studio-library')`);
        // Return to the pages panel for the existing assets-tab check below.
        await evaluate(`Array.from(document.querySelectorAll('.studio-rail button')).find(el=>el.textContent==='Pages').click()`);
        await until(`!!document.querySelector('.studio-pages')`);
        console.log('PASS: Blocks PDF layout, all 18 insert actions, search/empty state, grid drag/drop, unique nested IDs, database persistence, reload and template-library navigation.');
      }
      await evaluate(`document.querySelector('.studio-panel-tabs button:last-child').click()`);
      await until(`!!document.querySelector('.studio-assets')`);
      await evaluate(`document.querySelector('.studio-asset-categories>button').click()`);
      await until(`!!document.querySelector('[role="dialog"]')`);
      assert.equal(errors.length,0,errors.join('\n'));
      console.log('PASS: browser rendered PDF shell, saved template, selectable layer/style inspector, responsive viewport and asset library. Screenshot: .integration-review/editor-studio/desktop.png');
    } finally {socket.close();}
  }
  console.log('PASS: authenticated PDF template save/load, page data, nested layers, style changes, responsive overrides and form configuration round-trip through the existing backend.');
} finally {
  await pool.query('DELETE FROM websites WHERE "userId"=$1', [owner]);
  await pool.query('DELETE FROM users WHERE id=$1', [owner]);
  await pool.end();
}

