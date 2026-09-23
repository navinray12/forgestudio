/**
 * @file Json envelope test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { describe, expect, it } from 'vitest';
import { validateJsonEnvelope } from '../../src/platform/http/validate-json-envelope.js';
import { validateLegacyDocument } from '../../src/modules/pages/validate-legacy-document.js';
describe('untrusted draft envelope limits', () => {
  it('rejects duplicate escaped-equivalent keys', () => {
    expect(() => validateJsonEnvelope(Buffer.from('{"name":1,"na\\u006de":2}'))).toThrow('Duplicate JSON');
  });
  it('allows the same key in independent nested objects', () => {
    expect(() => validateJsonEnvelope(Buffer.from('{"left":{"id":1},"right":{"id":2},"quoted":"\\\"{}"}'))).not.toThrow();
  });
  it('rejects invalid UTF-8 and excessive nesting before schema recursion', () => {
    expect(() => validateJsonEnvelope(Buffer.from([0x7b, 0xff, 0x7d]))).toThrow('UTF-8');
    expect(() => validateJsonEnvelope(Buffer.from('['.repeat(101) + '0' + ']'.repeat(101)))).toThrow('100 levels');
  });
  it('preserves unknown widget data and rejects duplicate node IDs', () => {
    const source = { elements: [{ id: 'opaque', type: 'future-widget', futureProperty: { preserve: true } }] };
    const original = structuredClone(source);
    validateLegacyDocument(source);
    expect(source).toEqual(original);
    expect(() => validateLegacyDocument({ elements: [...source.elements, ...source.elements] })).toThrow('unique');
  });
  it('rejects oversized or excessively deep element trees', () => {
    expect(() => validateLegacyDocument({ elements: Array.from({ length: 5001 }, (_, index) => ({ id: String(index), type: 'heading' })) })).toThrow('5,000');
    let node: Record<string, unknown> = { id: 'leaf', type: 'heading' };
    for (let index = 0; index < 50; index++) node = { id: String(index), type: 'container', children: [node] };
    expect(() => validateLegacyDocument({ elements: [node] })).toThrow('50 nesting');
  });
});
