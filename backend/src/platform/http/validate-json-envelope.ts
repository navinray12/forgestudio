/**
 * @file HTTP infrastructure: validate json envelope. Shared request, response and error handling for the API.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { AppError } from './app-error.js';

/** Bound nesting and reject ambiguous duplicate keys before recursive schemas run.
 * @param bytes Bytes supplied to this operation (type: Buffer).
 */
export function validateJsonEnvelope(bytes: Buffer) {
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new AppError('JSON must use valid UTF-8.', 400, 'INVALID_JSON_ENCODING'); }
  const stack: Array<Set<string> | null> = [];
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      const start = index++;
      for (; index < text.length; index++) {
        if (text[index] === '\\') { index++; continue; }
        if (text[index] === '"') break;
      }
      let next = index + 1;
      while (/\s/.test(text[next] ?? '') && next < text.length) next++;
      if (text[next] === ':' && stack.at(-1) instanceof Set) {
        let key: string;
        try { key = JSON.parse(text.slice(start, index + 1)); }
        catch { throw new AppError('Invalid JSON string.', 400, 'INVALID_JSON'); }
        const keys = stack.at(-1)!;
        if (keys.has(key)) throw new AppError('Duplicate JSON object keys are not accepted.', 400, 'DUPLICATE_JSON_KEY');
        keys.add(key);
      }
    } else if (character === '{' || character === '[') {
      stack.push(character === '{' ? new Set() : null);
      if (stack.length > 100) throw new AppError('JSON nesting exceeds 100 levels.', 422, 'DOCUMENT_TOO_DEEP');
    } else if (character === '}' || character === ']') stack.pop();
  }
}
