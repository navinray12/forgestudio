import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database,type Actor } from './database.js';
import { parse,designOnly,digest,jsonObject,StudioError } from './validation.js';
import { contentOnly } from './design-policy.js';

export type CommandSource='HUMAN'|'AI'|'SYSTEM';
export interface CommandMetadata { source:CommandSource; operationId?:string; correlationId?:string; timestamp?:string; }
export interface DesignSaveResult extends Record<string,unknown> { hash:string; operationId:string; correlationId:string; replayed:boolean; }
const saveInput=z.object({
  baseHash:z.string().regex(/^[a-f0-9]{64}$/),
  editorData:z.record(z.string(),z.unknown()),
  operationId:z.string().uuid().optional(),
  correlationId:z.string().uuid().optional(),
  timestamp:z.string().datetime().optional(),
}).strict();

function protectedNodes(value:any,result=new Map<string,any>()):Map<string,any>{
  if(Array.isArray(value))value.forEach(v=>protectedNodes(v,result));
  else if(value&&typeof value==='object'){if(typeof value.id==='string'&&value.isProtected)result.set(value.id,value);Object.values(value).forEach(v=>protectedNodes(v,result));}
  return result;
}
function allById(value:any,id:string,result:any[]=[]):any[]{
  if(!value||typeof value!=='object')return result;
  if(value.id===id)result.push(value);
  for(const child of Object.values(value))allById(child,id,result);
  return result;
}

export class DomainCommands {
  constructor(private db:Database){}
  async saveDesign(actor:Actor,siteId:string,input:unknown,metadata:CommandMetadata={source:'HUMAN'}):Promise<DesignSaveResult>{
    const b=parse(saveInput,input);
    const operationId=metadata.operationId??b.operationId??randomUUID();
    const correlationId=metadata.correlationId??b.correlationId??randomUUID();
    const timestamp=metadata.timestamp??b.timestamp??new Date().toISOString();
    const requested=designOnly(b.editorData);
    const payloadHash=digest({command:'design.save',siteId,baseHash:b.baseHash,editorData:requested});
    return this.db.tx(async c=>{
      const prior=await c.query('SELECT payload_hash,result FROM studio.command_receipts WHERE actor_id=$1 AND idempotency_key=$2 FOR UPDATE',[actor.id,operationId]);
      if(prior.rows[0]){
        if(prior.rows[0].payload_hash!==payloadHash)throw new StudioError('Idempotency key was already used for a different command',409,'IDEMPOTENCY_CONFLICT');
        const saved=jsonObject(prior.rows[0].result);if(typeof saved.hash!=='string')throw new StudioError('Stored command receipt is invalid',503,'COMMAND_RECEIPT_INVALID');
        return {hash:saved.hash,operationId,correlationId,replayed:true};
      }
      const site=await this.db.site(c,actor,siteId,'VIEW',true);
      if(!site.capabilities.includes('EDIT_DESIGN')&&!site.capabilities.includes('EDIT_CONTENT'))throw new StudioError('Editing is not permitted',403,'FORBIDDEN');
      const current=designOnly(site.editorData);
      if(digest(current)!==b.baseHash)throw new StudioError('Another session changed this design. Reload and reconcile before saving.',409,'DESIGN_CONFLICT');
      let incoming={...current,...requested};
      if(!site.capabilities.includes('EDIT_DESIGN'))incoming=contentOnly(current,incoming);
      if(site.userId!==actor.id){
        for(const id of protectedNodes(current).keys())if(digest(allById(incoming,id))!==digest(allById(current,id)))throw new StudioError('A protected component cannot be changed from this editor',403,'PROTECTED_COMPONENT');
      }
      if(incoming.elements!==undefined&&!Array.isArray(incoming.elements))throw new StudioError('Elements must be an array');
      if(incoming.pages!==undefined&&(!Array.isArray(incoming.pages)||incoming.pages.some((p:any)=>!p||typeof p.id!=='string'||!Array.isArray(p.elements))))throw new StudioError('Each page needs an ID and an elements array');
      const updated={...site.editorData,...incoming},result={hash:digest(incoming)};
      await c.query('UPDATE public.websites SET "editorData"=$2::jsonb,"updatedAt"=now() WHERE id=$1',[siteId,JSON.stringify(updated)]);
      await c.query(`INSERT INTO studio.command_receipts(id,actor_id,site_id,command,source,idempotency_key,correlation_id,payload_hash,result)
        VALUES($1,$2,$3,'design.save',$4,$5,$6,$7,$8::jsonb)`,[randomUUID(),actor.id,siteId,metadata.source,operationId,correlationId,payloadHash,JSON.stringify(result)]);
      await this.db.audit(c,actor,site,metadata.source==='AI'?'designer.ai_change_applied':'designer.saved',site.name);
      return {...result,operationId,correlationId,replayed:false};
    });
  }
}
