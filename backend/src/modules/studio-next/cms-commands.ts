import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import {Cms} from './cms.js';
import {parse,uuid,digest,jsonObject,StudioError} from './validation.js';
import type {CommandSource} from './commands.js';

const operationEnvelope=z.object({operationId:uuid.optional(),correlationId:uuid.optional()}).passthrough();
export interface CmsCommandMeta {source:CommandSource;operationId?:string;correlationId?:string}

export class CmsCommands{
  constructor(private db:Database,private cms:Cms){}
  private envelope(input:unknown,meta:CmsCommandMeta){
    const parsed=parse(operationEnvelope,input??{});
    const operationId=meta.operationId??parsed.operationId??randomUUID(),correlationId=meta.correlationId??parsed.correlationId??randomUUID();
    const body={...jsonObject(input??{})};delete body.operationId;delete body.correlationId;
    return {operationId,correlationId,body};
  }
  private async reserve(actor:Actor,siteId:string,command:string,payload:unknown,meta:CmsCommandMeta,capability:string){
    const operationId=meta.operationId??randomUUID(),correlationId=meta.correlationId??randomUUID(),payloadHash=digest({command,siteId,payload});
    const existing=await this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,capability);
      const insert=await c.query(`INSERT INTO studio.command_receipts(id,actor_id,site_id,command,source,idempotency_key,correlation_id,payload_hash,result)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT(actor_id,idempotency_key) DO NOTHING RETURNING id`,
        [randomUUID(),actor.id,siteId,command,meta.source,operationId,correlationId,payloadHash,JSON.stringify({pending:true})]);
      if(insert.rowCount)return null;
      const prior=await c.query('SELECT payload_hash,result,correlation_id FROM studio.command_receipts WHERE actor_id=$1 AND idempotency_key=$2',[actor.id,operationId]);
      if(!prior.rows[0])throw new StudioError('Command reservation failed',503,'COMMAND_RESERVATION_FAILED');
      if(prior.rows[0].payload_hash!==payloadHash)throw new StudioError('Idempotency key was already used for a different command',409,'IDEMPOTENCY_CONFLICT');
      const result=jsonObject(prior.rows[0].result);
      if(result.pending===true)throw new StudioError('The same command is already in progress',409,'COMMAND_IN_PROGRESS');
      return {result,operationId,correlationId:String(prior.rows[0].correlation_id)};
    });
    return {operationId,correlationId,payloadHash,existing};
  }
  private async finish(actor:Actor,operationId:string,result:Record<string,unknown>){
    await this.db.pool.query('UPDATE studio.command_receipts SET result=$3::jsonb WHERE actor_id=$1 AND idempotency_key=$2',[actor.id,operationId,JSON.stringify({...result,pending:false})]);
  }
  private async fail(actor:Actor,operationId:string){
    await this.db.pool.query(`DELETE FROM studio.command_receipts WHERE actor_id=$1 AND idempotency_key=$2 AND result->>'pending'='true'`,[actor.id,operationId]).catch(()=>undefined);
  }
  async context(actor:Actor,siteId:string){return this.cms.collections(actor,siteId);}
  async stateHash(actor:Actor,siteId:string){
    const state=await this.context(actor,siteId);
    return digest({collections:(state.collections??[]).map((c:any)=>({id:c.id,name:c.name,slug:c.slug,fields:c.fields,revision:c.revision}))});
  }
  async createCollection(actor:Actor,siteId:string,input:unknown,meta:CmsCommandMeta={source:'HUMAN'}){
    const env=this.envelope(input,meta),reservation=await this.reserve(actor,siteId,'cms.create_collection',env.body,{...meta,operationId:env.operationId,correlationId:env.correlationId},'EDIT_DESIGN');
    if(reservation.existing)return {...reservation.existing.result,operationId:env.operationId,correlationId:reservation.existing.correlationId,replayed:true};
    try{const result=await this.cms.saveCollection(actor,siteId,env.body);await this.finish(actor,env.operationId,result);return {...result,operationId:env.operationId,correlationId:env.correlationId,replayed:false};}
    catch(error){await this.fail(actor,env.operationId);throw error;}
  }
  async createItem(actor:Actor,siteId:string,collectionId:string,input:unknown,meta:CmsCommandMeta={source:'HUMAN'}){
    parse(uuid,collectionId);const env=this.envelope(input,meta),reservation=await this.reserve(actor,siteId,'cms.create_item',{collectionId,...env.body},{...meta,operationId:env.operationId,correlationId:env.correlationId},'EDIT_CONTENT');
    if(reservation.existing)return {...reservation.existing.result,operationId:env.operationId,correlationId:reservation.existing.correlationId,replayed:true};
    try{const result=await this.cms.createItem(actor,siteId,collectionId,env.body);await this.finish(actor,env.operationId,result);return {...result,operationId:env.operationId,correlationId:env.correlationId,replayed:false};}
    catch(error){await this.fail(actor,env.operationId);throw error;}
  }
  async createCollectionWithDrafts(actor:Actor,siteId:string,input:{collection:unknown;items:unknown[]},meta:CmsCommandMeta){
    const operationId=meta.operationId??randomUUID(),correlationId=meta.correlationId??randomUUID();
    const reservation=await this.reserve(actor,siteId,'cms.create_collection_with_drafts',input,{...meta,operationId,correlationId},'EDIT_DESIGN');
    if(reservation.existing)return {...reservation.existing.result,operationId,correlationId:reservation.existing.correlationId,replayed:true};
    try{
      const result=await this.cms.createCollectionWithDrafts(actor,siteId,input);
      await this.finish(actor,operationId,result);return {...result,operationId,correlationId,replayed:false};
    }catch(error){
      await this.fail(actor,operationId);throw error;
    }
  }
}
