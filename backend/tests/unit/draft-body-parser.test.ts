/**
 * @file Draft body parser test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { describe, expect, it } from 'vitest';
import express from 'express';
import { once } from 'node:events';
import { jsonBodyParser } from '../../src/platform/http/webhook-body.middleware.js';
import { errorMiddleware } from '../../src/platform/http/error.middleware.js';
describe('draft command HTTP decoding', () => {
  it('returns problem details for duplicate keys and malformed JSON', async () => {
    const app = express();
    app.use(jsonBodyParser);
    app.post('/draft-saves', (_req, res) => { res.json({ accepted: true }); });
    app.use(errorMiddleware);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test listener');
    try {
      for (const [body, code] of [['{"key":1,"key":2}', 'DUPLICATE_JSON_KEY'], ['{invalid}', 'INVALID_JSON']]) {
        const response = await fetch(`http://127.0.0.1:${address.port}/draft-saves`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        expect(response.status).toBe(400);
        expect(response.headers.get('content-type')).toContain('application/problem+json');
        expect(await response.json()).toMatchObject({ code, status: 400, success: false });
      }
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
