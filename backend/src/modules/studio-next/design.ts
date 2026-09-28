import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Database, type Actor } from './database.js';
import { DomainCommands } from './commands.js';
import { parse, title, uuid, designOnly, digest, jsonObject, StudioError } from './validation.js';
export { contentOnly } from './design-policy.js';
export class Design {
  private commands:DomainCommands;
  constructor(private db:Database,commands?:DomainCommands){this.commands=commands??new DomainCommands(db);}
  async read(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId);const design=designOnly(site.editorData);
      return {website:{id:site.id,name:site.name,status:site.status,userPermission:site.role,editorData:design},hash:digest(design),capabilities:site.capabilities};
    });
  }
  async save(actor:Actor,siteId:string,input:unknown){return this.commands.saveDesign(actor,siteId,input,{source:'HUMAN'});}
  async snapshots(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId);
      const r=await c.query(`SELECT id,name,hash,created_at AS "createdAt" FROM studio.design_snapshots WHERE site_id=$1 ORDER BY created_at DESC LIMIT 100`,[siteId]);return {snapshots:r.rows};
    });
  }
  async capture(actor:Actor,siteId:string,input:unknown){
    const b=parse(z.object({name:title}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN',true);const design=designOnly(site.editorData),id=randomUUID();
      await c.query('INSERT INTO studio.design_snapshots(id,site_id,name,design,hash,author_id) VALUES($1,$2,$3,$4::jsonb,$5,$6)',[id,siteId,b.name,JSON.stringify(design),digest(design),actor.id]);
      await this.db.audit(c,actor,site,'designer.snapshot_created',b.name);return {id};
    });
  }
  async restore(actor:Actor,siteId:string,snapshotId:string,input:unknown){
    const b=parse(z.object({baseHash:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN',true);
      if(site.userId!==actor.id)throw new StudioError('Only the site owner can restore the complete design',403);
      if(digest(designOnly(site.editorData))!==b.baseHash)throw new StudioError('The design changed. Refresh before restoring.',409,'DESIGN_CONFLICT');
      const r=await c.query('SELECT * FROM studio.design_snapshots WHERE id=$1 AND site_id=$2',[parse(uuid,snapshotId),siteId]);if(!r.rows[0])throw new StudioError('Snapshot not found',404);
      // Capture a recovery point before every restore. Publishing state is deliberately untouched.
      const before=designOnly(site.editorData);
      await c.query('INSERT INTO studio.design_snapshots(id,site_id,name,design,hash,author_id) VALUES($1,$2,$3,$4::jsonb,$5,$6)',[randomUUID(),siteId,'Before restore',JSON.stringify(before),digest(before),actor.id]);
      const operational=Object.fromEntries(Object.entries(site.editorData).filter(([k])=>!(k in before)));
      await c.query('UPDATE public.websites SET "editorData"=$2::jsonb,"updatedAt"=now() WHERE id=$1',[siteId,JSON.stringify({...operational,...jsonObject(r.rows[0].design)})]);
      await this.db.audit(c,actor,site,'designer.snapshot_restored',r.rows[0].name);return {hash:digest(r.rows[0].design)};
    });
  }
}
