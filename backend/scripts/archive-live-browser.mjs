// Real browser + running API + PostgreSQL smoke test. Uses and removes only UUID-scoped fixtures.
// Run from backend: node scripts/archive-live-browser.mjs --run
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.argv.includes('--run')) throw new Error('Pass --run to create disposable test fixtures against the configured local API/database');
const api = process.env.ARCHIVE_SMOKE_API || 'http://localhost:5000';
const origin = process.env.ARCHIVE_SMOKE_FRONTEND || 'http://localhost:5173';
const debug = process.env.CHROME_DEBUG_URL || 'http://127.0.0.1:9227';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(api).hostname), 'Use a local API');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use a local frontend');
const pool = new pg.Pool({ connectionString: process.env.ARCHIVE_SMOKE_DATABASE_URL || process.env.DATABASE_URL, connectionTimeoutMillis: 4000 });
const owner = randomUUID(), collaborator = randomUUID(), outsider = randomUUID();
const primary = randomUUID(), legacy = randomUUID(), team = randomUUID(), other = randomUUID();
const published = randomUUID(), alias = randomUUID(), teamSite = randomUUID(), personalSite = randomUUID(), hiddenSite = randomUUID();
const users = [owner, collaborator, outsider], workspaceIds = [primary, legacy, team, other], siteIds = [published, alias, teamSite, personalSite, hiddenSite];
const tokens = new Map(users.map(id => [id, randomBytes(32).toString('hex')]));
const content = { version: 1, elements: [{ id: 'archive-heading', type: 'heading', content: 'Archive smoke published content', styles: {} }], pages: [{ id: 'home', name: 'Home', slug: '', isHome: true, elements: [{ id: 'heading', type: 'heading', content: 'Archive smoke published content', styles: {} }] }], homePageId: 'home', siteSettings: { title: 'Archive smoke' } };
const passed = []; let socket; let send; let sequence = 0; const pending = new Map(); const exceptions = []; const responses = []; let failMutation = false; let failList = false; let delayList = false;
const output = new URL('../../.integration-review/archive-e2e/', import.meta.url);
await mkdir(output, { recursive: true });
const protectedData = async () => (await pool.query(`SELECT id, to_jsonb(w) AS data FROM websites w WHERE NOT (id = ANY($1::uuid[])) ORDER BY id`, [siteIds])).rows;
const protectedBefore = await protectedData();
async function request(path, { actor = owner, body, method = body === undefined ? 'GET' : 'PATCH' } = {}) {
  const r = await fetch(api + path, { method, headers: { ...(actor ? { cookie: `forge_session=${tokens.get(actor)}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  return { status: r.status, data: await r.json() };
}
const list = async (workspace, include = true, actor = owner) => request(`/api/dashboard/sites?workspaceId=${workspace}&includeArchived=${include}`, { actor });
const archive = async (id, workspaceId, archived, actor = owner) => request(`/api/dashboard/sites/${id}/archive`, { actor, body: { workspaceId, archived } });
const ids = result => result.data.websites.map(site => site.id).sort();
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [index, id] of users.entries()) {
      await client.query('INSERT INTO users(id,"fullName",email,"emailVerified","updatedAt") VALUES ($1,$2,$3,true,now())', [id, `Archive Smoke ${index}`, `archive-smoke-${id}@example.invalid`]);
      await client.query('INSERT INTO sessions(id,"userId","tokenHash","expiresAt") VALUES ($1,$2,$3,now()+interval \'20 minutes\')', [randomUUID(), id, createHash('sha256').update(tokens.get(id)).digest('hex')]);
    }
    for (const [id, name, slug, ownedBy] of [[primary, 'Archive smoke primary', `personal-ws-${owner}`, owner], [legacy, 'Archive smoke alias', `personal-default-${owner}`, owner], [team, 'Archive smoke team', `archive-smoke-team-${team}`, owner], [other, 'Archive smoke other', `archive-smoke-other-${other}`, outsider]]) {
      await client.query('INSERT INTO workspaces(id,name,slug,"ownerId") VALUES ($1,$2,$3,$4)', [id, name, slug, ownedBy]);
      await client.query('INSERT INTO workspace_members(id,"workspaceId","userId",role) VALUES ($1,$2,$3,\'OWNER\')', [randomUUID(), id, ownedBy]);
    }
    for (const workspace of [primary, team]) await client.query('INSERT INTO workspace_members(id,"workspaceId","userId",role) VALUES ($1,$2,$3,\'ADMIN\')', [randomUUID(), workspace, collaborator]);
    for (const [id, name, workspace, userId, status] of [[published, 'Archive smoke published', primary, owner, 'PUBLISHED'], [alias, 'Archive smoke alias site', legacy, owner, 'DRAFT'], [teamSite, 'Archive smoke team site', team, owner, 'DRAFT'], [personalSite, 'Archive smoke personal site', null, owner, 'DRAFT'], [hiddenSite, 'Archive smoke hidden site', primary, collaborator, 'DRAFT']])
      await client.query('INSERT INTO websites(id,"userId","workspaceId",name,slug,status,"editorData") VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, userId, workspace, name, `archive-smoke-${id}`, status, content]);
    await client.query('INSERT INTO website_collaborators(id,"websiteId","userId",permission,"updatedAt") VALUES ($1,$2,$3,\'EDITOR\',now())', [randomUUID(), published, collaborator]);
    await client.query('INSERT INTO website_revisions(id,"websiteId",version,data,"createdBy") VALUES ($1,$2,1,$3,$4)', [randomUUID(), published, content, owner]);
    await client.query('INSERT INTO deployments(id,"websiteId",version,status,"createdBy",metadata) VALUES ($1,$2,1,\'SUCCESS\',$3,$4)', [randomUUID(), published, owner, { preserve: true }]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  const relations = async () => (await pool.query(`SELECT 'revision' AS kind, to_jsonb(r) AS data FROM website_revisions r WHERE "websiteId"=$1
    UNION ALL SELECT 'deployment', to_jsonb(d) FROM deployments d WHERE "websiteId"=$1`, [published])).rows;
  const relationsBefore = await relations();
  assert.equal((await list(primary)).status, 200);
  assert.deepEqual(ids(await list(primary)), [published, alias].sort());
  assert.deepEqual(ids(await list(legacy)), [published, alias].sort());
  assert.deepEqual(ids(await list(team)), [teamSite]);
  assert.deepEqual(ids(await list('personal')), [personalSite]);
  assert.equal((await list(primary, true, null)).status, 401);
  assert.equal((await list(primary, true, outsider)).status, 404);
  assert.equal((await archive(published, team, true)).status, 404);
  assert.equal((await archive(hiddenSite, primary, true)).status, 404);
  assert.equal((await archive(published, primary, true, collaborator)).status, 403);
  assert.equal((await request(`/api/dashboard/sites/${published}/archive`, { body: { workspaceId: primary, archived: 'true' } })).status, 400);
  await pool.query('UPDATE workspace_members SET role=\'MEMBER\' WHERE "workspaceId"=$1 AND "userId"=$2', [primary, collaborator]);
  assert.equal((await archive(hiddenSite, primary, true, collaborator)).status, 403);
  await pool.query('UPDATE workspace_members SET role=\'ADMIN\' WHERE "workspaceId"=$1 AND "userId"=$2', [primary, collaborator]);
  passed.push('Real session authentication, owner/read-only restrictions, site visibility, personal/team/legacy-alias workspace isolation');
  const publicBefore = await request(`/api/v1/websites/public/${published}`, { actor: null }); assert.equal(publicBefore.status, 200);
  const archived = await archive(published, primary, true); assert.equal(archived.status, 200); assert.equal(archived.data.changed, true);
  const archivedDate = (await pool.query('SELECT "archivedAt" FROM websites WHERE id=$1', [published])).rows[0].archivedAt;
  assert.ok(archivedDate);
  assert.deepEqual(ids(await list(primary, false)), [alias]);
  assert.equal((await archive(published, primary, true)).data.changed, false);
  assert.equal((await pool.query('SELECT "archivedAt" FROM websites WHERE id=$1', [published])).rows[0].archivedAt.toISOString(), archivedDate.toISOString());
  assert.deepEqual((await request(`/api/v1/websites/public/${published}`, { actor: null })), publicBefore);
  assert.equal((await request(`/api/v1/websites/${published}`)).status, 200);
  assert.equal((await archive(published, legacy, false)).status, 200);
  assert.equal((await archive(published, primary, false)).data.changed, false);
  passed.push('Persistent idempotent archive/restore, editor access, published-site API availability');

  const target = await (await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' })).json();
  assert.ok(target.webSocketDebuggerUrl, 'Start disposable Chrome on CHROME_DEBUG_URL');
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  socket.addEventListener('message', async event => {
    const message = JSON.parse(event.data);
    if (message.id) { const task = pending.get(message.id); pending.delete(message.id); if (task) message.error ? task.reject(message.error) : task.resolve(message.result); return; }
    if (message.method === 'Page.javascriptDialogOpening') { await send('Page.handleJavaScriptDialog', { accept: message.params.type === 'prompt', promptText: 'Archive test folder' }); return; }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.responseReceived' && message.params.response.url.includes('/api/dashboard/sites')) responses.push({ status: message.params.response.status, url: message.params.response.url });
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request: req } = message.params;
      if ((failMutation && req.method === 'PATCH') || (failList && req.method === 'GET')) { await send('Fetch.failRequest', { requestId, errorReason: 'ConnectionFailed' }).catch(() => {}); return; }
      if (delayList && req.method === 'GET' && req.url.includes(`workspaceId=${primary}`)) await new Promise(resolve => setTimeout(resolve, 750));
      await send('Fetch.continueRequest', { requestId }).catch(() => {});
    }
  });
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const until = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 150)); } throw new Error(`Browser timeout: ${expression}`); };
  const click = text => evaluate(`(() => { const button = Array.from(document.querySelectorAll('button')).find(el => el.textContent.trim() === ${JSON.stringify(text)} && !el.disabled); if (!button) throw Error('Button not found: '+${JSON.stringify(text)}); button.click(); })()`);
  const select = async id => {
    const optionName = (await request("/api/v1/workspaces")).data.workspaces.find(item => item.id === id)?.name || "Personal sites";
    await evaluate(`document.querySelector('[aria-label="Dashboard workspace"]').click()`);
    await until(`!!document.querySelector('#workspace-picker-menu')`);
    await evaluate(`Array.from(document.querySelectorAll('#workspace-picker-menu [role="menuitemradio"]')).find(item=>item.textContent.includes(${JSON.stringify(optionName)})).click()`);
  };
  const siteCount = async () => Number(await evaluate(`document.querySelector('.sites-heading .count-badge')?.textContent`));
  const openMenu = name => evaluate(`document.querySelector('[aria-label="More options for '+${JSON.stringify(name)}+'"]').click()`);
  const waitCards = count => until(`!document.querySelector('[aria-label="Loading sites"]') && document.querySelectorAll('.site-card').length===${count} && !document.querySelector('.dashboard-error')`);
  const screenshot = async name => { const result = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(new URL(name + '.png', output), Buffer.from(result.data, 'base64')); };
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Network.setCookie', { name: 'forge_session', value: tokens.get(owner), url: api, httpOnly: true, sameSite: 'Lax' });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.origin === ${JSON.stringify(origin)}) localStorage.setItem('forgestudio.workspace.${owner}', '${primary}');` });
  await send('Page.navigate', { url: origin + '/dashboard' });
  await waitCards(2); assert.equal(await siteCount(), 2); await screenshot('all-sites');
  await evaluate(`document.querySelector('[aria-label="Favorite Archive smoke published"]').click()`);
  await click('New folder');
  await until(`document.querySelector('.folder-tabs').textContent.includes('Archive test folder')`);
  await openMenu('Archive smoke published');
  await evaluate(`(() => { const select=document.querySelector('[aria-label="Folder for Archive smoke published"]'); select.value='Archive test folder'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await openMenu('Archive smoke published');
  await openMenu('Archive smoke published'); await click('Archive site'); await waitCards(1); assert.equal(await siteCount(), 1);
  assert.equal(Number(await evaluate(`document.querySelector('.folder-tabs .count-badge').textContent`)), 1);
  await click('Archive'); await waitCards(1); assert.equal(await siteCount(), 1);
  assert.equal(await evaluate(`document.querySelector('.site-meta h3').textContent`), 'Archive smoke published');
  await screenshot('archive');
  await send('Page.reload'); await waitCards(1); await click('Archive'); await waitCards(1);
  assert.equal(await evaluate(`document.querySelector('.site-meta h3').textContent`), 'Archive smoke published');
  await select(team); await waitCards(0); assert.ok(await evaluate(`document.body.innerText.includes('Your archive is empty')`));
  await click('Sites'); await waitCards(1); assert.equal(await evaluate(`document.querySelector('.site-meta h3').textContent`), 'Archive smoke team site');
  await select(primary); await waitCards(1); await click('Archive'); await waitCards(1);
  await openMenu('Archive smoke published'); await click('Restore site'); await waitCards(0); assert.equal(await siteCount(), 0);
  await click('Sites'); await waitCards(2); assert.equal(await siteCount(), 2);
  assert.equal(await evaluate(`document.querySelector('[aria-label="Favorite Archive smoke published"]').getAttribute('aria-pressed')`), 'true');
  const savedFolders = await evaluate(`JSON.parse(localStorage.getItem('forgestudio.dashboard.folders.${owner}.${primary}'))`);
  assert.equal(savedFolders.assignments[published], 'Archive test folder');
  await evaluate(`document.querySelector('[aria-label="List view"]').click()`);
  assert.equal(await evaluate(`!!document.querySelector('.site-grid.is-list')`), true);
  await evaluate(`document.querySelector('[aria-label="Grid view"]').click()`);
  passed.push('Browser: All Sites and Archive load, card actions, counts, reload persistence, workspace switching, restore, folder/favorite preservation and list view');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*api/dashboard/sites*', requestStage: 'Request' }] });
  failMutation = true; await openMenu('Archive smoke published'); await click('Archive site');
  await until(`!!document.querySelector('.dashboard-error') && !Array.from(document.querySelectorAll('button')).some(el=>el.textContent==='Updating...')`);
  assert.equal(await siteCount(), 2); assert.equal(await evaluate(`document.querySelectorAll('.site-card').length`), 2);
  assert.equal((await pool.query('SELECT "archivedAt" FROM websites WHERE id=$1', [published])).rows[0].archivedAt, null);
  failMutation = false; await click('Dismiss'); await click('Archive site'); await waitCards(1);
  await click('Archive'); await waitCards(1); await openMenu('Archive smoke published'); await click('Restore site'); await waitCards(0); await click('Sites'); await waitCards(2);
  failList = true;
  await evaluate(`document.querySelector('[aria-label="Refresh sites"]').click()`);
  await until(`!!document.querySelector('.dashboard-error') && document.querySelectorAll('.site-card').length === 0`);
  failList = false; await click('Try again'); await waitCards(2);
  delayList = true; await evaluate(`document.querySelector('[aria-label="Refresh sites"]').click()`); await select(team); await waitCards(1);
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal(await evaluate(`document.querySelector('.site-meta h3').textContent`), 'Archive smoke team site');
  delayList = false; await select(primary); await waitCards(2);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelector('[aria-label="Toggle navigation"]').click()`); await click('Archive'); await waitCards(0);
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= 390`)); await screenshot('archive-mobile');
  passed.push('Browser: failed mutation preserves cards/counts, load failure retry works, delayed responses cannot leak another workspace, mobile Archive works');
  assert.deepEqual(exceptions, []);
  assert.ok(responses.length > 10); assert.ok(responses.every(response => response.status === 200 || response.status === 204));
  assert.deepEqual(await relations(), relationsBefore);
  const saved = (await pool.query('SELECT status,"editorData","archivedAt" FROM websites WHERE id=$1', [published])).rows[0];
  assert.equal(saved.status, 'PUBLISHED'); assert.deepEqual(saved.editorData, content); assert.equal(saved.archivedAt, null);
  assert.deepEqual(await protectedData(), protectedBefore);
  passed.push('Existing websites untouched; fixture editor content, publication status, revisions and deployments preserved; no browser runtime exceptions');
  await writeFile(new URL('report.json', output), JSON.stringify({ passed, dashboardResponses: responses.length, mockedBackendResponses: false, existingWebsitesPreserved: protectedBefore.length }, null, 2));
  console.log(JSON.stringify({ passed, dashboardResponses: responses.length, existingWebsitesPreserved: protectedBefore.length }, null, 2));
} catch (error) {
  await writeFile(new URL('failure.json', output), JSON.stringify({ message: error.message, stack: error.stack, passed, exceptions, responses }, null, 2));
  if (send) { try { const result = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(new URL('failure.png', output), Buffer.from(result.data, 'base64')); } catch {} }
  throw error;
} finally {
  if (send) { try { await send('Network.deleteCookies', { name: 'forge_session', url: api }); await send('Page.close'); } catch {} }
  socket?.close();
  // Only disposable IDs generated by this invocation can be removed; no user website is selected.
  const cleanup = await pool.connect();
  try {
    await cleanup.query('BEGIN');
    await cleanup.query('DELETE FROM websites WHERE id = ANY($1::uuid[]) AND "userId" = ANY($2::uuid[])', [siteIds, users]);
    await cleanup.query('DELETE FROM workspaces WHERE id = ANY($1::uuid[]) AND "ownerId" = ANY($2::uuid[])', [workspaceIds, users]);
    await cleanup.query('DELETE FROM users WHERE id = ANY($1::uuid[]) AND email LIKE \'archive-smoke-%@example.invalid\'', [users]);
    await cleanup.query('COMMIT');
  } catch (error) { await cleanup.query('ROLLBACK'); throw error; } finally { cleanup.release(); await pool.end(); }
}
