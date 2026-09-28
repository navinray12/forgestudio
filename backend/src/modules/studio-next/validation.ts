import { z } from 'zod';
import { createHash } from 'node:crypto';
import { domainToASCII } from 'node:url';
import { StudioError } from '../studio/domain.js';
export { StudioError };
export const uuid = z.string().uuid();
export const revision = z.number().int().min(0).max(2147483646);
export const title = z.string().trim().min(1).max(120);
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
export const localeCode = z.string().min(2).max(35).refine(value => {
  try { return Intl.getCanonicalLocales(value)[0] === value; } catch { return false; }
}, 'Use a canonical language tag, for example en, fr, or pt-BR');
export const email = z.string().trim().email().max(254).transform(value => value.toLowerCase());
export const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/).refine(v => !['constructor','prototype','__proto__'].includes(v)),
  name: title, type: z.enum(['TEXT','RICH_TEXT','NUMBER','BOOLEAN','DATE','EMAIL','URL','IMAGE','COLOR','OPTION','REFERENCE','MULTI_REFERENCE']),
  required: z.boolean().default(false), options: z.array(z.string().min(1).max(100)).max(100).optional(),
  referenceCollection: uuid.optional(),
}).strict();
export const fieldsSchema = z.array(fieldSchema).max(50).refine(fields => new Set(fields.map(f => f.key)).size === fields.length, 'Field keys must be unique').superRefine((fields, ctx) => {
  for (const [i, field] of fields.entries()) {
    if (field.type === 'OPTION' && (!field.options?.length || new Set(field.options).size !== field.options.length)) ctx.addIssue({code:'custom', path:[i,'options'], message:'Options must be nonempty and unique'});
    if (['REFERENCE','MULTI_REFERENCE'].includes(field.type) && !field.referenceCollection) ctx.addIssue({code:'custom',path:[i,'referenceCollection'],message:'A reference collection is required'});
  }
});
export type Field = z.infer<typeof fieldSchema>;
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new StudioError(result.error.issues.slice(0,5).map(i => `${i.path.join('.') || 'request'}: ${i.message}`).join('; '));
  return result.data;
}
export function jsonObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new StudioError('Expected a JSON object');
  const serialized = JSON.stringify(input);
  if (Buffer.byteLength(serialized) > 1_000_000) throw new StudioError('Content exceeds 1 MB');
  let count = 0;
  const walk = (v: unknown, depth: number): void => {
    if (++count > 20000 || depth > 40) throw new StudioError('Content is too deeply nested or complex');
    if (Array.isArray(v)) return v.forEach(x => walk(x, depth + 1));
    if (v && typeof v === 'object') for (const [k,x] of Object.entries(v)) {
      if (['__proto__','constructor','prototype'].includes(k)) throw new StudioError('Reserved object key');
      walk(x, depth + 1);
    }
    if (typeof v === 'number' && !Number.isFinite(v)) throw new StudioError('Invalid number');
  };
  walk(input,0);
  return input as Record<string, unknown>;
}
export function validateFields(fields: Field[], input: unknown, publishing = false): Record<string, unknown> {
  const values = jsonObject(input);
  const keys = new Set(fields.map(f=>f.key));
  if (Object.keys(values).some(k => !keys.has(k))) throw new StudioError('Unknown collection field');
  for (const field of fields) {
    const value = values[field.key];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) { if (publishing && field.required) throw new StudioError(`${field.name} is required to publish`); continue; }
    let valid = true;
    switch (field.type) {
      case 'NUMBER': valid = typeof value === 'number' && Number.isFinite(value); break;
      case 'BOOLEAN': valid = typeof value === 'boolean'; break;
      case 'DATE': valid = typeof value === 'string' && /^\d{4}-\d\d-\d\d(?:T.*Z)?$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value.slice(0,10); break;
      case 'EMAIL': valid = email.safeParse(value).success; break;
      case 'COLOR': valid = typeof value === 'string' && /^#[\da-f]{6}([\da-f]{2})?$/i.test(value); break;
      case 'OPTION': valid = typeof value === 'string' && !!field.options?.includes(value); break;
      case 'REFERENCE': valid = uuid.safeParse(value).success; break;
      case 'MULTI_REFERENCE': valid = Array.isArray(value) && value.length <= 100 && new Set(value).size === value.length && value.every(x=>uuid.safeParse(x).success); break;
      case 'URL': case 'IMAGE':
        try { const u = new URL(String(value)); valid = typeof value === 'string' && ['https:','http:'].includes(u.protocol) && !u.username && !u.password && value.length < 2000; } catch { valid=false; } break;
      default: valid = typeof value === 'string' && value.length <= (field.type === 'RICH_TEXT' ? 100000 : 20000);
    }
    if (!valid) throw new StudioError(`${field.name} has an invalid ${field.type.toLowerCase()} value`);
  }
  return values;
}
export function hostname(input: unknown): string {
  const raw = parse(z.string().trim().min(3).max(253),input);
  if (/[/:?#@\s\\]/.test(raw)) throw new StudioError('Enter a hostname only, not a URL');
  const h = domainToASCII(raw.toLowerCase());
  if (!h || h.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h) || /\.(local|localhost|test|invalid|internal|example)$/.test(h)) throw new StudioError('Enter a public DNS hostname');
  return h;
}
const DESIGN_KEYS = ['version','elements','pages','pageSettings','homePageId','siteParts','breakpoints','globalSettings','globalStyles','globalVariables','globalClasses','popups','pageCss','designTokens','components','interactions','fonts'];
export function designOnly(input: unknown): Record<string, unknown> {
  const value = jsonObject(input);
  return Object.fromEntries(DESIGN_KEYS.filter(k => value[k] !== undefined).map(k => [k,value[k]]));
}
export function digest(value: unknown): string {
  const stable = (v: any): any => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])) : v;
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
export function checkRevision(actual: number, expected: number): void {
  if (actual !== expected) throw new StudioError('Another session changed this record. Reload before saving.',409,'REVISION_CONFLICT');
}
