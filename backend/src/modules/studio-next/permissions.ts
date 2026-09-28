import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database,type Actor,ROLE_CAPS } from './database.js';
import { parse,uuid,StudioError } from './validation.js';
const capabilities=['VIEW','EDIT_DESIGN','EDIT_CONTENT','PUBLISH','COMMENT','MANAGE_SETTINGS','MANAGE_PERMISSIONS','VIEW_ANALYTICS'] as const;
export class Permissions {
  constructor(private db:Database){}
  async list(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_PERMISSIONS');
      const people=await c.query(`SELECT u.id,u."fullName",u.email,co.permission AS role FROM public.website_collaborators co JOIN public.users u ON u.id=co."userId" WHERE co."websiteId"=$1 ORDER BY u.email`,[siteId]);
      const overrides=await c.query(`SELECT "userId",capability,effect FROM public.granular_permissions WHERE "websiteId"=$1 AND "resourceId"='*'`,[siteId]);
      return {people:people.rows,overrides:overrides.rows,capabilities,defaults:ROLE_CAPS,canManage:site.userId===actor.id};
    });
  }
  async set(actor:Actor,siteId:string,input:unknown){
    const b=parse(z.object({userId:uuid,capability:z.enum(capabilities),effect:z.enum(['ALLOW','DENY','INHERIT'])}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_PERMISSIONS',true);
      if(site.userId!==actor.id||b.userId===site.userId)throw new StudioError('Only the owner can change collaborator overrides; owner rights are immutable',403);
      const member=await c.query('SELECT 1 FROM public.website_collaborators WHERE "websiteId"=$1 AND "userId"=$2',[siteId,b.userId]);if(!member.rowCount)throw new StudioError('Invite this person to the site before setting permissions',404);
      if(b.effect==='INHERIT')await c.query('DELETE FROM public.granular_permissions WHERE "websiteId"=$1 AND "userId"=$2 AND "resourceId"=\'*\' AND capability=$3',[siteId,b.userId,b.capability]);
      else await c.query(`INSERT INTO public.granular_permissions(id,"websiteId","userId","resourceId",capability,effect,"createdAt","updatedAt") VALUES($1,$2,$3,'*',$4,$5,now(),now()) ON CONFLICT("websiteId","userId","resourceId",capability) DO UPDATE SET effect=excluded.effect,"updatedAt"=now()`,[randomUUID(),siteId,b.userId,b.capability,b.effect]);
      await this.db.audit(c,actor,site,'permission.override_changed',`${b.userId}: ${b.capability} ${b.effect}`);return {};
    });
  }
}
