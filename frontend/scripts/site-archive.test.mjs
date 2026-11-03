import test from 'node:test';
import assert from 'node:assert/strict';
import { partitionDashboardSites } from '../src/pages/dashboard/site-archive.ts';

test('active and archive counts follow persistent metadata, independent of publication', () => {
  const sites = [{ id: 'draft', archivedAt: null, status: 'DRAFT' }, { id: 'published', archivedAt: null, status: 'PUBLISHED' }, { id: 'archived', archivedAt: '2026-10-28T00:00:00Z', status: 'PUBLISHED' }, { id: 'legacy', status: 'DRAFT' }];
  const before = structuredClone(sites);
  let result = partitionDashboardSites(sites);
  assert.deepEqual(result.websites.map(site => site.id), ['draft', 'published', 'legacy']);
  assert.deepEqual(result.archivedWebsites.map(site => site.id), ['archived']);
  assert.deepEqual(sites, before);
  sites[1].archivedAt = '2026-10-28T00:00:00Z';
  result = partitionDashboardSites(sites);
  assert.equal(result.websites.length, 2); assert.equal(result.archivedWebsites.length, 2);
  sites[1].archivedAt = null;
  result = partitionDashboardSites(sites);
  assert.equal(result.websites.length, 3); assert.equal(result.archivedWebsites.length, 1);
  assert.equal(sites[1].status, 'PUBLISHED');
  assert.deepEqual(partitionDashboardSites([]), { websites: [], archivedWebsites: [] });
});
