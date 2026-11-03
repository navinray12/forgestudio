import { Router, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../utils/app-error.js";
import type { createDashboardForumService } from "../services/dashboard-forum.service.js";
const listing = z.object({ filter: z.enum(['latest','popular','unanswered','solved']).default('latest'), categoryId: z.uuid().optional(), page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();
export const forumTopicInput = z.object({ id: z.uuid(), categoryId: z.uuid(), title: z.string().trim().min(5).max(180), content: z.string().trim().min(10).max(20000) }).strict();
export const forumReplyInput = z.object({ id: z.uuid(), content: z.string().trim().min(1).max(20000) }).strict();
export function createDashboardForumRouter(auth: RequestHandler, service: ReturnType<typeof createDashboardForumService>) {
  const router = Router();
  const writes = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Please wait a minute before posting again.' } });
  const handle = (schema: z.ZodType, action: (user: string, id: string, input: any) => Promise<any>, source: 'query'|'body') : RequestHandler => async (req,res,next) => {
    const parsed = schema.safeParse(source === 'query' ? req.query : req.body);
    const id = req.params.id as string;
    if (!parsed.success || id && !z.uuid().safeParse(id).success) { res.status(400).json({message:'Check the discussion fields and try again.'}); return; }
    try { res.setHeader('Cache-Control','private, no-store'); res.json(await action(res.locals.user.id,id,parsed.data)); } catch(error: any) {
      if (['42P01','42703'].includes(error?.meta?.code || error?.code)) next(new AppError('Community storage needs setup. Apply the dashboard forum migration and retry.',503,'FORUM_STORAGE_NOT_READY'));
      else next(error);
    }
  };
  router.get('/dashboard/forum', auth, handle(listing,(u,_id,i)=>service.read(u,i),'query'));
  router.get('/dashboard/forum/:id', auth, handle(z.object({}).strict(),(u,id)=>service.detail(u,id),'query'));
  router.post('/dashboard/forum', auth, writes, handle(forumTopicInput,(u,_id,i)=>service.create(u,i),'body'));
  router.post('/dashboard/forum/:id/replies', auth, writes, handle(forumReplyInput,(u,id,i)=>service.reply(u,id,i),'body'));
  router.patch('/dashboard/forum/:id/solved', auth, writes, handle(z.object({solved:z.boolean()}).strict(),(u,id,i)=>service.solve(u,id,i.solved),'body'));
  return router;
}
