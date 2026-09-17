/**
 * @file Protect IPv4 and dotted JSON-path handling during source path migrations.
 * DNS and HTTP are mocked; these checks make no external network requests.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const lookup = vi.hoisted(() => vi.fn());
vi.mock('node:dns/promises', () => ({ default: { lookup } }));
import { IntegrationService } from '../../src/modules/integrations/integration.service.js';

beforeEach(() => {
  lookup.mockReset();
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

it('rejects private IPv4 targets before DNS or HTTP is used', async () => {
  await expect(IntegrationService.fetchDynamicData('http://10.20.30.40/private'))
    .rejects.toThrow('Private or local integration targets are not allowed');
  expect(lookup).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it('selects a nested response field using dot-separated property names', async () => {
  lookup.mockResolvedValue([{ address: '203.0.113.10', family: 4 }]);
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ profile: { title: 'Example' } })));
  const result = await IntegrationService.fetchDynamicData('https://203.0.113.10/nested-data', 'profile.title');
  expect(result).toMatchObject({ success: true, value: 'Example', jsonPath: 'profile.title' });
});
