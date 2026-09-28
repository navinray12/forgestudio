import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database, type Actor } from './database.js';
import { parse, uuid, revision, checkRevision, StudioError } from './validation.js';
const content=z.string().trim().min(1).max(4000);
export class Collaboration {
  constructor(private db:Database){}
  async threads(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId);
      const threads=await c.query(`SELECT t.id,t.content,t.page_id AS "pageId",t.element_id AS "elementId",t.resolved,t.revision,t.created_at AS "createdAt",u."fullName" AS author,
        coalesce((SELECT jsonb_agg(x ORDER BY x."createdAt") FROM (SELECT r.id,r.content,r.created_at AS "createdAt",ru."fullName" AS author FROM studio.comment_replies r JOIN public.users ru ON ru.id=r.author_id WHERE r.thread_id=t.id ORDER BY r.created_at LIMIT 100) x),'[]') AS replies
        FROM studio.comment_threads t JOIN public.users u ON u.id=t.author_id WHERE t.site_id=$1 ORDER BY t.created_at DESC LIMIT 100`,[siteId]);return {threads:threads.rows};
    });
  }
  async create(actor:Actor,siteId:string,input:unknown){
    const b=parse(z.object({content,pageId:z.string().max(150).optional(),elementId:z.string().max(150).optional()}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'COMMENT');const id=randomUUID();
      await c.query('INSERT INTO studio.comment_threads(id,site_id,author_id,page_id,element_id,content) VALUES($1,$2,$3,$4,$5,$6)',[id,siteId,actor.id,b.pageId||null,b.elementId||null,b.content]);
      await this.db.audit(c,actor,site,'review.thread_created','Review comment');return {id};
    });
  }
  async change(actor:Actor,siteId:string,threadId:string,input:unknown){
    const b=parse(z.union([z.object({content}).strict(),z.object({resolved:z.boolean(),revision}).strict()]),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'COMMENT');
      const r=await c.query('SELECT * FROM studio.comment_threads WHERE id=$1 AND site_id=$2 FOR UPDATE',[parse(uuid,threadId),siteId]);
      const thread=r.rows[0];if(!thread)throw new StudioError('Thread not found',404);
      if('content' in b){const count=await c.query('SELECT count(*)::int AS count FROM studio.comment_replies WHERE thread_id=$1',[threadId]);if(count.rows[0].count>=100)throw new StudioError('Reply limit reached; open another thread',409);await c.query('INSERT INTO studio.comment_replies(id,thread_id,author_id,content) VALUES($1,$2,$3,$4)',[randomUUID(),threadId,actor.id,b.content]);}
      else {
        if(thread.author_id!==actor.id && !site.capabilities.includes('MANAGE_SETTINGS'))throw new StudioError('Only the author or a site administrator can resolve this thread',403);
        checkRevision(thread.revision,b.revision);await c.query('UPDATE studio.comment_threads SET resolved=$2,revision=revision+1,updated_at=now() WHERE id=$1',[threadId,b.resolved]);
      }
      await this.db.audit(c,actor,site,'review.thread_updated','Review thread');return {};
    });
  }
}
