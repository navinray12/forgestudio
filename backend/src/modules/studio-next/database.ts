import type { Pool, PoolClient } from 'pg';
import type { RequestHandler } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { StudioError, parse, uuid } from './validation.js';
export interface Actor { id: string; email: string | null; emailVerified: boolean; fullName: string | null }
export type Client = PoolClient;
export const ROLE_CAPS: Record<string,string[]> = {
  OWNER:['VIEW','EDIT_DESIGN','EDIT_CONTENT','PUBLISH','COMMENT','MANAGE_SETTINGS','MANAGE_PERMISSIONS','VIEW_ANALYTICS'],
  ADMIN:['VIEW','EDIT_DESIGN','EDIT_CONTENT','PUBLISH','COMMENT','MANAGE_SETTINGS','MANAGE_PERMISSIONS','VIEW_ANALYTICS'],
  DESIGNER:['VIEW','EDIT_DESIGN','EDIT_CONTENT','PUBLISH','COMMENT'], DEVELOPER:['VIEW','EDIT_DESIGN','EDIT_CONTENT','COMMENT'],
  CONTENT_EDITOR:['VIEW','EDIT_CONTENT','COMMENT'], CLIENT:['VIEW','EDIT_CONTENT','COMMENT'],
  SEO_MANAGER:['VIEW','EDIT_CONTENT','COMMENT','VIEW_ANALYTICS'], REVIEWER:['VIEW','COMMENT'], VIEWER:['VIEW'],
};
export class Database {
  constructor(readonly pool: Pool) {}
  async tx<T>(run: (c: Client)=>Promise<T>): Promise<T> {
    const c=await this.pool.connect();
    try { await c.query('BEGIN'); await c.query("SET LOCAL statement_timeout='10s'"); const result=await run(c); await c.query('COMMIT'); return result; }
    catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
  async site(c: Client, actor: Actor, siteId: string, capability='VIEW', lock=false) {
    parse(uuid,siteId);
    const r=await c.query(`SELECT w.id,w.name,w.status,w."userId",w."workspaceId",w."editorData",w."updatedAt",CASE WHEN w."userId"=$2 THEN 'OWNER' ELSE co.permission END AS role
      FROM public.websites w LEFT JOIN public.website_collaborators co ON co."websiteId"=w.id AND co."userId"=$2
      WHERE w.id=$1 ${lock ? 'FOR UPDATE OF w' : ''}`, [siteId,actor.id]);
    const site=r.rows[0];
    if(!site?.role) throw new StudioError('Site not found',404,'NOT_FOUND');
    const role=site.role==='PROJECT_OWNER'?'OWNER':site.role==='PROJECT_ADMIN'?'ADMIN':site.role;
    const overrides=await c.query(`SELECT capability,effect FROM public.granular_permissions WHERE "websiteId"=$1 AND "userId"=$2 AND "resourceId"='*'`,[siteId,actor.id]);
    const caps = new Set(ROLE_CAPS[role] || []);
    if(site.userId!==actor.id) for(const p of overrides.rows) { if(p.effect==='DENY')caps.delete(p.capability); else if(p.effect==='ALLOW')caps.add(p.capability); }
    if(!caps.has('VIEW')) throw new StudioError('Site not found',404,'NOT_FOUND');
    if(!caps.has(capability)) throw new StudioError(`Missing permission: ${capability}`,403,'FORBIDDEN');
    return {...site, capabilities:[...caps]};
  }
  async workspace(c:Client,actor:Actor,workspaceId:string,manage=false) {
    parse(uuid,workspaceId);
    const r=await c.query(`SELECT w.id,w.name,w."ownerId",CASE WHEN w."ownerId"=$2 THEN 'OWNER' ELSE m.role END AS role FROM public.workspaces w
      LEFT JOIN public.workspace_members m ON m."workspaceId"=w.id AND m."userId"=$2 WHERE w.id=$1 FOR UPDATE OF w`,[workspaceId,actor.id]);
    const w=r.rows[0];
    if(!w?.role)throw new StudioError('Workspace not found',404,'NOT_FOUND');
    if(manage && !['OWNER','ADMIN'].includes(w.role))throw new StudioError('Workspace administration is required',403,'FORBIDDEN');
    return w;
  }
  async audit(c:Client, actor:Actor, site:any, action:string,label:string) {
    await c.query(`INSERT INTO studio.events(id,actor_id,workspace_id,site_id,action,label) VALUES($1,$2,$3,$4,$5,$6)`,[randomUUID(),actor.id,site?.workspaceId || null,site?.id || null,action,label.slice(0,255)]);
  }
  auth(): RequestHandler {
    return async(req,res,next)=> {
      try {
        const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('forge_session='))?.slice('forge_session='.length);
        if(!cookie || cookie.length>512)throw new StudioError('Authentication required',401,'UNAUTHORIZED');
        let decoded:string;try{decoded=decodeURIComponent(cookie);}catch{throw new StudioError('Invalid session cookie',401,'UNAUTHORIZED');}
        const hash=createHash('sha256').update(decoded).digest('hex');
        const r=await this.pool.query(`SELECT u.id,u.email,u."emailVerified",u."fullName" FROM public.sessions s JOIN public.users u ON u.id=s."userId"
          WHERE s."tokenHash"=$1 AND s."revokedAt" IS NULL AND s."expiresAt">now() AND u.status='ACTIVE'`,[hash]);
        if(!r.rows[0])throw new StudioError('Session is invalid, expired, or inactive',401,'UNAUTHORIZED');
        res.locals.actor=r.rows[0];next();
      }catch(e){next(e);}
    };
  }
}
