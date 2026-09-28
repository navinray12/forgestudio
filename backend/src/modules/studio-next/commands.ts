import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database,type Actor } from './database.js';
import { parse,designOnly,digest,jsonObject,StudioError } from './validation.js';
import { contentOnly } from './design-policy.js';

export type CommandSource='HUMAN'|'AI'|'SYSTEM';
export interface CommandMetadata { source:CommandSource; operationId?:string; correlationId?:string; timestamp?:string; }
export interface DesignSaveResult extends Record<string,unknown> { hash:string; operationId:string; correlationId:string; replayed:boolean; }
const elementCommand=z.discriminatedUnion('type',[
  z.object({type:z.literal('SET_ELEMENT_TEXT'),elementId:z.string().min(1).max(150),field:z.enum(['content','text','alt']),value:z.string().max(20000)}).strict(),
  z.object({type:z.literal('SET_STYLE'),elementId:z.string().min(1).max(150),property:z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,79}$/),value:z.union([z.string().max(500),z.number(),z.null()])}).strict(),
  z.object({type:z.literal('UNSET_STYLE'),elementId:z.string().min(1).max(150),property:z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,79}$/)}).strict(),
  z.object({type:z.literal('ADD_ELEMENT'),parentId:z.string().min(1).max(150).nullable().default(null),afterId:z.string().min(1).max(150).nullable().default(null),element:z.record(z.string(),z.unknown())}).strict(),
  z.object({type:z.literal('REMOVE_ELEMENT'),elementId:z.string().min(1).max(150)}).strict(),
]);
const commandBatch=z.object({
  baseHash:z.string().regex(/^[a-f0-9]{64}$/),
  commands:z.array(elementCommand).min(1).max(100),
  operationId:z.string().uuid(),
  correlationId:z.string().uuid().optional(),
  timestamp:z.string().datetime().optional(),
}).strict();
export type ElementCommand=z.infer<typeof elementCommand>;

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


function cloneJson<T>(value:T):T{return JSON.parse(JSON.stringify(value));}
function collectIds(value:any,result=new Set<string>()):Set<string>{
  if(!value||typeof value!=='object')return result;
  if(typeof value.id==='string'){if(result.has(value.id))throw new StudioError('Design contains duplicate element IDs',409,'DUPLICATE_ELEMENT_ID');result.add(value.id);}
  for(const child of Object.values(value))collectIds(child,result);return result;
}
function findNodes(value:any,id:string,result:any[]=[]):any[]{
  if(!value||typeof value!=='object')return result;
  if(value.id===id)result.push(value);
  for(const child of Object.values(value))findNodes(child,id,result);return result;
}
function removeNode(container:any,id:string):boolean{
  if(!container||typeof container!=='object')return false;
  for(const key of ['elements','children']){
    const list=container[key];
    if(Array.isArray(list)){
      const index=list.findIndex((x:any)=>x?.id===id);
      if(index>=0){list.splice(index,1);return true;}
      for(const child of list)if(removeNode(child,id))return true;
    }
  }
  if(Array.isArray(container.pages))for(const page of container.pages)if(removeNode(page,id))return true;
  return false;
}
function rootElements(design:any):any[]{if(!Array.isArray(design.elements))design.elements=[];return design.elements;}
function applyElementCommands(design:Record<string,unknown>,commands:ElementCommand[]):Record<string,unknown>{
  const next=cloneJson(design);collectIds(next);
  for(const command of commands){
    if(command.type==='SET_ELEMENT_TEXT'){
      const matches=findNodes(next,command.elementId);if(matches.length!==1)throw new StudioError('Element target is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');
      if(typeof matches[0][command.field]!=='string')throw new StudioError('Target field is not editable text',400,'NOT_TEXT');matches[0][command.field]=command.value;
    } else if(command.type==='SET_STYLE'||command.type==='UNSET_STYLE'){
      const matches=findNodes(next,command.elementId);if(matches.length!==1)throw new StudioError('Element target is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');
      if(!matches[0].styles||typeof matches[0].styles!=='object'||Array.isArray(matches[0].styles))matches[0].styles={};
      if(command.type==='UNSET_STYLE')delete matches[0].styles[command.property];else if(command.value===null)delete matches[0].styles[command.property];else matches[0].styles[command.property]=command.value;
    } else if(command.type==='REMOVE_ELEMENT'){
      if(!removeNode(next,command.elementId))throw new StudioError('Element not found',404,'ELEMENT_NOT_FOUND');
    } else {
      const element=cloneJson(command.element) as any;
      if(typeof element.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9:_-]{0,149}$/.test(element.id)||typeof element.type!=='string')throw new StudioError('New elements require a stable id and type',400,'INVALID_ELEMENT');
      const ids=collectIds(next);if(ids.has(element.id))throw new StudioError('Element ID already exists',409,'DUPLICATE_ELEMENT_ID');
      let list:any[];
      if(command.parentId===null)list=rootElements(next);
      else {const parents=findNodes(next,command.parentId);if(parents.length!==1)throw new StudioError('Parent element is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');if(!Array.isArray(parents[0].children))parents[0].children=[];list=parents[0].children;}
      if(command.afterId===null)list.push(element);
      else {const index=list.findIndex((x:any)=>x?.id===command.afterId);if(index<0)throw new StudioError('Insertion anchor is not a child of the selected parent',409,'INSERTION_ANCHOR_MISSING');list.splice(index+1,0,element);}
    }
  }
  collectIds(next);return next;
}

export class DomainCommands {
  constructor(private db:Database){}
  async executeDesignCommands(actor:Actor,siteId:string,input:unknown,metadata:CommandMetadata={source:'HUMAN'}):Promise<DesignSaveResult>{
    const b=parse(commandBatch,input),commandHash=digest({command:'design.commands',siteId,baseHash:b.baseHash,commands:b.commands});
    const replay=await this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'VIEW');
      const prior=await c.query('SELECT result FROM studio.command_receipts WHERE actor_id=$1 AND idempotency_key=$2',[actor.id,b.operationId]);
      if(!prior.rows[0])return null;
      const saved=jsonObject(prior.rows[0].result);
      if(saved.commandHash!==commandHash)throw new StudioError('Idempotency key was already used for a different command',409,'IDEMPOTENCY_CONFLICT');
      if(typeof saved.hash!=='string')throw new StudioError('Stored command receipt is invalid',503,'COMMAND_RECEIPT_INVALID');
      return {hash:saved.hash,operationId:b.operationId,correlationId:typeof saved.correlationId==='string'?saved.correlationId:(b.correlationId??b.operationId),replayed:true} as DesignSaveResult;
    });
    if(replay)return replay;
    const current=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'VIEW');return designOnly(site.editorData);});
    if(digest(current)!==b.baseHash)throw new StudioError('Another session changed this design. Reload and reconcile before applying commands.',409,'DESIGN_CONFLICT');
    const next=applyElementCommands(current,b.commands);
    const applied=await this.saveDesign(actor,siteId,{baseHash:b.baseHash,editorData:next,operationId:b.operationId,correlationId:b.correlationId,timestamp:b.timestamp},{...metadata,operationId:b.operationId,correlationId:b.correlationId,timestamp:b.timestamp});
    await this.db.tx(async c=>{await c.query(`UPDATE studio.command_receipts SET result=result || $3::jsonb WHERE actor_id=$1 AND idempotency_key=$2`,[actor.id,b.operationId,JSON.stringify({commandHash,correlationId:applied.correlationId})]);});
    return applied;
  }

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
