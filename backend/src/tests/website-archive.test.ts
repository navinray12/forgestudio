import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createDashboardServices } from '../services/dashboard.service.js';
import { createDashboardRouter } from '../routes/dashboard.routes.js';

test('archive/restore preserve content, scope, ownership and are idempotent', async () => {
  const site: any = { id: 'site', userId: 'owner', workspaceId: 'workspace', archivedAt: null, status: 'PUBLISHED', editorData: { elements: [{ content: 'Keep me' }] } };
  const content = JSON.stringify(site.editorData);
  let role = 'OWNER'; let fail = false; let lastUpdate: any;
  const service = createDashboardServices({
    workspace: { findMany: async () => [{ id: 'workspace', ownerId: 'owner', name: 'Team', slug: 'team', owner: { fullName: 'Owner' }, _count: { members: 2 } }] },
    workspaceMember: { findUnique: async ({ where }: any) => where.workspaceId_userId.workspaceId === 'workspace' ? { role } : null },
    website: {
      findMany: async ({ where }: any) => {
        const scope = typeof where.workspaceId === 'object' && where.workspaceId ? where.workspaceId.in.includes(site.workspaceId) : where.workspaceId === site.workspaceId;
        return scope && (!('archivedAt' in where) || site.archivedAt === null) ? [{ ...site }] : [];
      },
      updateMany: async (input: any) => {
        lastUpdate = input;
        if (fail) throw new Error('Database unavailable');
        if ((input.where.archivedAt === null) !== (site.archivedAt === null)) return { count: 0 };
        Object.assign(site, input.data); return { count: 1 };
      },
    },
  }, async () => null);
  assert.equal((await service.listDashboardSites('owner', 'workspace')).length, 1);
  await assert.rejects(service.setDashboardSiteArchived('owner', 'site', 'other', true), /access denied/);
  await assert.rejects(service.setDashboardSiteArchived('owner', 'site', 'personal', true), /access denied/);
  await assert.rejects(service.setDashboardSiteArchived('collaborator', 'site', 'workspace', true), /Only the owner/);
  role = 'MEMBER';
  await assert.rejects(service.setDashboardSiteArchived('owner', 'site', 'workspace', true), /read only/);
  role = 'OWNER';
  assert.equal((await service.setDashboardSiteArchived('owner', 'site', 'workspace', true)).changed, true);
  assert.equal((await service.listDashboardSites('owner', 'workspace')).length, 0);
  assert.equal((await service.listDashboardSites('owner', 'workspace', true)).length, 1);
  assert.deepEqual(Object.keys(lastUpdate.data), ['archivedAt']);
  const timestamp = site.archivedAt;
  assert.equal((await service.setDashboardSiteArchived('owner', 'site', 'workspace', true)).changed, false);
  assert.equal(site.archivedAt, timestamp);
  assert.equal((await service.setDashboardSiteArchived('owner', 'site', 'workspace', false)).changed, true);
  assert.equal((await service.setDashboardSiteArchived('owner', 'site', 'workspace', false)).changed, false);
  assert.equal((await service.listDashboardSites('owner', 'workspace')).length, 1);
  assert.equal(site.status, 'PUBLISHED'); assert.equal(JSON.stringify(site.editorData), content);
  fail = true;
  await assert.rejects(service.setDashboardSiteArchived('owner', 'site', 'workspace', true), /Database unavailable/);
  assert.equal(site.archivedAt, null);
});

test('archive API requires auth and validates explicit boolean, UUID and workspace', async () => {
  const calls: any[] = []; const id = 'f0000000-0000-4000-8000-000000000001';
  const app = express(); app.use(express.json());
  app.use(createDashboardRouter({
    requireAuth: (req, res, next) => { if (!req.headers.authorization) { res.sendStatus(401); return; } res.locals.user = { id: 'owner' }; next(); },
    listWorkspaces: async () => ({ workspaces: [], personalSiteCount: 0 }),
    listSites: async (...args) => { calls.push(args); return []; }, createSite: async () => null, updateProfile: async () => null,
    setSiteArchived: async (...args) => { calls.push(args); if (args[2] !== 'personal') throw Object.assign(new Error('Forbidden'), { statusCode: 403 }); return { archived: args[3] }; },
  }));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.statusCode || 500).json({ message: error.message }));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const patch = (body: any, auth = true, siteId = id) => fetch(`${base}/dashboard/sites/${siteId}/archive`, { method: 'PATCH', headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'session' } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await patch({ workspaceId: 'personal', archived: true }, false)).status, 401);
    for (const body of [{ archived: true }, { workspaceId: 'personal', archived: 'false' }, { workspaceId: 'invalid', archived: true }, { workspaceId: 'personal', archived: true, editorData: {} }]) assert.equal((await patch(body)).status, 400);
    assert.equal((await patch({ workspaceId: 'personal', archived: true }, true, 'bad')).status, 400);
    assert.equal(calls.length, 0);
    assert.equal((await patch({ workspaceId: 'personal', archived: true })).status, 200);
    assert.deepEqual(calls.at(-1), ['owner', id, 'personal', true]);
    assert.equal((await patch({ workspaceId: 'personal', archived: false })).status, 200);
    assert.deepEqual(calls.at(-1), ['owner', id, 'personal', false]);
    assert.equal((await patch({ workspaceId: id, archived: true })).status, 403);
    assert.equal((await fetch(`${base}/dashboard/sites?includeArchived=oops`, { headers: { authorization: 'session' } })).status, 400);
    assert.equal((await fetch(`${base}/dashboard/sites?includeArchived=true`, { headers: { authorization: 'session' } })).status, 200);
    assert.deepEqual(calls.at(-1), ['owner', 'personal', true]);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('missing archive migration returns an actionable service error instead of an unexplained 500', async () => {
  const service = createDashboardServices({ website: { findMany: async () => { throw Object.assign(new Error('Column websites.archivedAt does not exist'), { code: 'P2022', meta: { column: 'websites.archivedAt' } }); } } }, async () => null);
  await assert.rejects(service.listDashboardSites('owner', 'personal', true), (error: any) => error.statusCode === 503 && error.code === 'ARCHIVE_STORAGE_NOT_READY' && /archive migration/.test(error.message));
});
