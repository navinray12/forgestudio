import {z} from 'zod';
import * as acorn from 'acorn';
export const snippetFields=z.object({
 templateId:z.string().max(80).optional(),title:z.string().trim().min(1).max(150),language:z.enum(['JS','CSS','HTML']),code:z.string().min(1).max(200000).refine(v=>v.trim().length>0),
 placement:z.enum(['HEAD','BODY_START','BODY_END','BODY_TOP','BODY_BOTTOM']),scope:z.enum(['GLOBAL','PAGE']).optional(),pageId:z.string().max(150).nullable().optional(),
 conditions:z.union([z.record(z.string(),z.unknown()),z.array(z.unknown()),z.string().max(10000)]).nullable().optional(),priority:z.number().int().min(-2147483648).max(2147483647).optional(),
 status:z.enum(['DRAFT','PUBLISHED','SCHEDULED']).optional(),scheduledFor:z.string().max(50).refine(v=>Number.isFinite(Date.parse(v))).nullable().optional(),isActive:z.boolean().optional(),expectedUpdatedAt:z.iso.datetime().optional()
}).strict();
export const snippetCreate=snippetFields;
export const snippetUpdate=snippetFields.partial().refine(v=>Object.keys(v).some(k=>k!=='expectedUpdatedAt'));
export function javascriptError(language:string,code:string){if(language!=='JS')return null;try{acorn.parse(code,{ecmaVersion:'latest',sourceType:'script'});return null;}catch(e){return 'Syntax error in JavaScript: '+(e as Error).message;}}
