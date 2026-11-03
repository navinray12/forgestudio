import {z} from 'zod';
export const apiKeyInput = z.object({name:z.string().trim().min(1).max(50),scopes:z.array(z.enum(['websites:read','websites:write','publish:write'])).min(1).max(3).refine(s=>new Set(s).size===s.length)}).strict();
