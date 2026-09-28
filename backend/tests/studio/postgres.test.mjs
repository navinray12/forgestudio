import { before, after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { StudioRepository } from '../../.studio-test-build/repository.js';
import { siteQuery } from '../../.studio-test-build/domain.js';

const connectionString = process.env.STUDIO_TEST_DATABASE_URL;
if (connectionString && new URL(connectionString).pathname !== '/forgestudio_studio_test') throw new Error('Only the dedicated forgestudio_studio_test database is allowed');

describe('Studio PostgreSQL integration', { skip: !connectionString }, () => {
  const pool = new pg.Pool({ connectionString });
  const repository = new StudioRepository(pool);
  const actors = [];
  async function actor() {
    const actorId = randomUUID(); actors.push(actorId);
    await pool.query('INSERT INTO public.users(id,status) VALUES ($1,\'ACTIVE\')', [actorId]);
    return actorId;
  }
  const create = (actorId, name, workspaceId = null, folderId = null, source = null, key = randomUUID()) => repository.createSite(actorId, name, workspaceId, folderId, source, key);
  before(async () => {
    // Minimal legacy contract fixture, not a claim that the full legacy migration chain is qualified.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.users(id uuid PRIMARY KEY,status text NOT NULL,"fullName" text,email text);
      CREATE TABLE IF NOT EXISTS public.workspaces(id uuid PRIMARY KEY,"ownerId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name text,slug text UNIQUE,settings jsonb,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS public.workspace_members(id uuid PRIMARY KEY,"workspaceId" uuid REFERENCES workspaces(id) ON DELETE CASCADE,"userId" uuid REFERENCES users(id) ON DELETE CASCADE,role text,UNIQUE("workspaceId","userId"));
      CREATE TABLE IF NOT EXISTS public.websites(id uuid PRIMARY KEY,"userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name text,slug text,status text,"editorData" jsonb,"workspaceId" uuid REFERENCES workspaces(id) ON DELETE SET NULL,"createdAt" timestamptz DEFAULT now(),"updatedAt" timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS public.website_collaborators(id uuid PRIMARY KEY,"websiteId" uuid REFERENCES websites(id) ON DELETE CASCADE,"userId" uuid REFERENCES users(id) ON DELETE CASCADE,permission text,UNIQUE("websiteId","userId"));
      CREATE TABLE IF NOT EXISTS public.granular_permissions(id uuid PRIMARY KEY,"websiteId" uuid REFERENCES websites(id) ON DELETE CASCADE,"userId" uuid REFERENCES users(id) ON DELETE CASCADE,"resourceId" text,capability text,effect text);
      CREATE TABLE IF NOT EXISTS public.deployments(id uuid PRIMARY KEY,"websiteId" uuid REFERENCES websites(id) ON DELETE CASCADE,environment text,status text,"completedAt" timestamptz);
      CREATE TABLE IF NOT EXISTS public.subscription_plans(id uuid PRIMARY KEY,name text,"websiteLimit" int);
      CREATE TABLE IF NOT EXISTS public.user_subscriptions(id uuid PRIMARY KEY,"userId" uuid REFERENCES users(id) ON DELETE CASCADE,"planId" uuid REFERENCES subscription_plans(id),status text,"currentPeriodEnd" timestamptz);
    `);
    const existing = await pool.query("SELECT to_regclass('studio.site_state') AS name");
    if (!existing.rows[0].name) await pool.query(await readFile(new URL('../../prisma/migrations/20260928150000_studio_dashboard/migration.sql', import.meta.url), 'utf8'));
  });
  after(async () => { await pool.query('DELETE FROM public.users WHERE id = ANY($1::uuid[])', [actors]); await pool.end(); });

  test('personal site queries cannot enumerate another owner', async () => {
    const a = await actor(), b = await actor();
    await create(a, 'Visible'); await create(b, 'Private');
    const result = await repository.list(a, siteQuery({}));
    assert.deepEqual(result.sites.map(site => site.name), ['Visible']);
    assert.equal(result.total, 1);
  });
  test('creation retries return the same committed site', async () => {
    const a = await actor(), key = randomUUID();
    const first = await create(a, 'Retry safe', null, null, null, key);
    const second = await create(a, 'Retry safe', null, null, null, key);
    assert.equal(first.id, second.id);
    await assert.rejects(() => create(a, 'Different', null, null, null, key), error => error.code === 'IDEMPOTENCY_CONFLICT');
  });
  test('concurrent Studio creates do not exceed the two-site fallback quota', async () => {
    const a = await actor();
    const results = await Promise.allSettled(Array.from({length: 5}, (_, i) => create(a, `Concurrent ${i}`)));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 2);
    assert.equal((await repository.list(a, siteQuery({}))).total, 2);
  });
  test('stale revisions cannot overwrite a newer change', async () => {
    const a = await actor(); const site = await create(a, 'Before');
    const result = await repository.patchSite(a, site.id, { revision: 0, name: 'After' });
    assert.equal(result.revision, 1);
    await assert.rejects(() => repository.patchSite(a, site.id, { revision: 0, name: 'Stale' }), error => error.code === 'REVISION_CONFLICT');
    assert.equal((await repository.list(a, siteQuery({}))).sites[0].name, 'After');
  });
  test('database rejects a cross-owner folder even when HTTP is bypassed', async () => {
    const a = await actor(), b = await actor();
    const folder = await repository.createFolder(b, null, 'Private folder');
    const site = await create(a, 'A site');
    await assert.rejects(() => pool.query('UPDATE studio.site_state SET folder_id = $2 WHERE site_id = $1', [site.id, folder.id]), error => error.code === '23514');
  });
  test('deleting folders preserves sites and invalidates stale metadata revisions', async () => {
    const a = await actor(), folder = await repository.createFolder(a, null, 'Temporary');
    const site = await create(a, 'Keep me', null, folder.id);
    await repository.changeFolder(a, folder.id, null, null);
    const result = await repository.list(a, siteQuery({}));
    assert.equal(result.sites[0].id, site.id); assert.equal(result.sites[0].folderId, null); assert.equal(result.sites[0].revision, 1);
  });
  test('archiving does not change publishing state or erase editor data', async () => {
    const a = await actor(), site = await create(a, 'Live');
    await pool.query('UPDATE public.websites SET status=\'PUBLISHED\' WHERE id=$1', [site.id]);
    await repository.patchSite(a, site.id, { revision: 0, archived: true });
    assert.equal((await repository.list(a, siteQuery({}))).total, 0);
    const archived = (await repository.list(a, siteQuery({view:'archived'}))).sites[0];
    assert.equal(archived.status, 'PUBLISHED');
    await repository.patchSite(a, site.id, { revision: archived.revision, archived: false });
    assert.equal((await repository.list(a, siteQuery({}))).total, 1);
  });
  test('bookmarks are private and inaccessible sites cannot be bookmarked', async () => {
    const a = await actor(), b = await actor(), site = await create(a, 'Shared');
    await assert.rejects(() => repository.bookmark(b, site.id, true), error => error.status === 404);
    await pool.query('INSERT INTO public.website_collaborators(id,"websiteId","userId",permission) VALUES ($1,$2,$3,\'VIEWER\')', [randomUUID(), site.id, b]);
    await repository.bookmark(b, site.id, true);
    assert.equal((await repository.list(a, siteQuery({view:'favorites'}))).total, 0);
    assert.equal((await repository.list(b, siteQuery({view:'shared'}))).sites[0].favorite, true);
  });
  test('explicit VIEW denial prevents listing and count leakage', async () => {
    const a = await actor(), b = await actor(), site = await create(a, 'Denied');
    await pool.query('INSERT INTO public.website_collaborators(id,"websiteId","userId",permission) VALUES ($1,$2,$3,\'VIEWER\')', [randomUUID(),site.id,b]);
    await pool.query('INSERT INTO public.granular_permissions(id,"websiteId","userId","resourceId",capability,effect) VALUES ($1,$2,$3,\'*\',\'VIEW\',\'DENY\')', [randomUUID(),site.id,b]);
    assert.equal((await repository.list(b, siteQuery({view:'shared'}))).total, 0);
  });
  test('literal percent search does not match every site', async () => {
    const a = await actor(); await create(a, '100% Studio'); await create(a, 'Other');
    assert.equal((await repository.list(a, siteQuery({q:'%'}))).total, 1);
  });
  test('workspace members do not inherit administrative mutations', async () => {
    const a = await actor(), b = await actor();
    const workspace = await repository.createWorkspace(a, 'Team', randomUUID());
    await pool.query('INSERT INTO public.workspace_members(id,"workspaceId","userId",role) VALUES ($1,$2,$3,\'MEMBER\')', [randomUUID(),workspace.id,b]);
    await assert.rejects(() => repository.createFolder(b, workspace.id, 'Forbidden'), error => error.status === 403);
  });
  test('workspace create retries are idempotent', async () => {
    const a = await actor(), key = randomUUID();
    assert.equal((await repository.createWorkspace(a, 'Team', key)).id, (await repository.createWorkspace(a, 'Team', key)).id);
  });
  test('legacy site transfers detach old folder assignments', async () => {
    const a = await actor(), b = await actor();
    const folder = await repository.createFolder(a, null, 'Old owner'); const site = await create(a, 'Transferred', null, folder.id);
    await pool.query('UPDATE public.websites SET "userId"=$2 WHERE id=$1', [site.id,b]);
    const result = await repository.list(b, siteQuery({})); assert.equal(result.sites[0].folderId,null);
  });
  test('design duplication does not copy operational settings', async () => {
    const a = await actor(), source = await create(a, 'Source');
    await pool.query('UPDATE public.websites SET "editorData"=$2 WHERE id=$1', [source.id,JSON.stringify({elements:[{content:'Keep'}],hostingConfig:{password:'Never copy'},publishedData:{elements:[]}})]);
    const copy = await create(a, 'Copy', null, null, source.id);
    const result = await pool.query('SELECT "editorData",status FROM public.websites WHERE id=$1', [copy.id]);
    assert.deepEqual(result.rows[0].editorData.elements,[{content:'Keep'}]); assert.equal(result.rows[0].editorData.hostingConfig,undefined); assert.equal(result.rows[0].status,'DRAFT');
  });
});
