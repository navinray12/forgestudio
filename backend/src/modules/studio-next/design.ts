import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Database, type Actor } from './database.js';
import { parse, title, uuid, designOnly, digest, jsonObject, StudioError } from './validation.js';
const textKeys=new Set(['content','text','alt']);
/** Content-only changes preserve every node, style, position, page and component boundary. */
export function contentOnly(current:any,next:any,key=''):any {
  if(textKeys.has(key) && typeof current==='string' && typeof next==='string')return next;
  if(Array.isArray(current)){
    if(!Array.isArray(next)||current.length!==next.length)throw new StudioError('Content editors cannot change the document structure',403,'DESIGN_RESTRICTED');
    return current.map((v,i)=>contentOnly(v,next[i],String(i)));
  }
  if(current && typeof current==='object'){
    if(!next||typeof next!=='object'||Array.isArray(next))throw new StudioError('Content editors cannot replace design objects',403,'DESIGN_RESTRICTED');
    if(Object.keys(next).some(k=>!(k in current)))throw new StudioError('Content editors cannot add design properties',403,'DESIGN_RESTRICTED');
    return Object.fromEntries(Object.entries(current).map(([k,v])=>[k,contentOnly(v,next[k]===undefined?v:next[k],k)]));
  }
  if(current!==next)throw new StudioError('Content editors may change text, not design settings',403,'DESIGN_RESTRICTED');return current;
}
function nodes(value:any,result=new Map<string,any>()):Map<string,any>{
  if(Array.isArray(value))value.forEach(v=>nodes(v,result));
  else if(value&&typeof value==='object'){if(typeof value.id==='string' && value.isProtected)result.set(value.id,value);Object.values(value).forEach(v=>nodes(v,result));}
  return result;
}
function findAllById(value:any,id:string,result:any[]=[]):any[]{
  if(!value||typeof value!=='object')return result;
  if(value.id===id)result.push(value);
  for(const child of Object.values(value))findAllById(child,id,result);
  return result;
}
export class Design {
  constructor(private db:Database){}
  async read(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId);const design=designOnly(site.editorData);
      return {website:{id:site.id,name:site.name,status:site.status,userPermission:site.role,editorData:design},hash:digest(design),capabilities:site.capabilities};
    });
  }
  async save(actor:Actor,siteId:string,input:unknown){
    const b=parse(z.object({baseHash:z.string().regex(/^[a-f0-9]{64}$/),editorData:z.record(z.string(),z.unknown())}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'VIEW',true);
      if(!site.capabilities.includes('EDIT_DESIGN')&&!site.capabilities.includes('EDIT_CONTENT'))throw new StudioError('Editing is not permitted',403);
      const current=designOnly(site.editorData);
      if(digest(current)!==b.baseHash)throw new StudioError('Another session changed this design. Your local copy was kept; reload and reconcile before saving.',409,'DESIGN_CONFLICT');
      let incoming={...current,...designOnly(b.editorData)};
      if(!site.capabilities.includes('EDIT_DESIGN'))incoming=contentOnly(current,incoming);
      if(site.userId!==actor.id){
        for(const id of nodes(current).keys())if(digest(findAllById(incoming,id))!==digest(findAllById(current,id)))throw new StudioError('A protected component cannot be changed from this editor',403,'PROTECTED_COMPONENT');
      }
      if(incoming.elements!==undefined&&!Array.isArray(incoming.elements))throw new StudioError('Elements must be an array');
      if(incoming.pages!==undefined&&(!Array.isArray(incoming.pages)||incoming.pages.some((p:any)=>!p||typeof p.id!=='string'||!Array.isArray(p.elements))))throw new StudioError('Each page needs an ID and an elements array');
      const updated={...site.editorData,...incoming};
      // The designer cannot publish, change credentials or overwrite live snapshots through a save payload.
      await c.query('UPDATE public.websites SET "editorData"=$2::jsonb,"updatedAt"=now() WHERE id=$1',[siteId,JSON.stringify(updated)]);
      await this.db.audit(c,actor,site,'designer.saved',site.name);
      return {hash:digest(incoming)};
    });
  }
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
