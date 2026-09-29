import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database, type Actor, type Client } from './database.js';
import { parse, uuid, title, slug, revision, localeCode, fieldsSchema, validateFields, checkRevision, StudioError, type Field } from './validation.js';
import type {EventOutbox} from './webhooks.js';
const collectionInput=z.object({name:title,slug,fields:fieldsSchema}).strict();
const itemInput=z.object({name:z.string().trim().min(1).max(200),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),fields:z.record(z.string(),z.unknown()),locale:localeCode.default('en'),groupId:uuid.optional()}).strict();
const itemPatch=itemInput.omit({locale:true,groupId:true}).extend({revision}).strict();
const actionInput=z.object({action:z.enum(['PUBLISH','UNPUBLISH','ARCHIVE','RESTORE','READY','SCHEDULE','CANCEL_SCHEDULE']),revision,scheduledAt:z.string().datetime({offset:true}).optional()}).strict();
const projection=`i.id,i.collection_id AS "collectionId",i.group_id AS "groupId",i.locale,i.name,i.slug,i.draft AS fields,i.revision,i.live_revision AS "liveRevision",i.archived,i.ready,i.scheduled_at AS "scheduledAt",i.published_at AS "publishedAt",i.updated_at AS "updatedAt",(i.live IS NOT NULL) AS "isLive"`;
export class Cms {
  constructor(readonly db:Database,private outbox?:EventOutbox){}
  private async collection(c:Client,siteId:string,collectionId:string){
    const r=await c.query('SELECT * FROM studio.collections WHERE id=$1 AND site_id=$2',[parse(uuid,collectionId),siteId]);
    if(!r.rows[0])throw new StudioError('Collection not found',404,'NOT_FOUND');return r.rows[0];
  }
  private async locale(c:Client,siteId:string,locale:string){
    const r=await c.query('SELECT 1 FROM studio.site_locales WHERE site_id=$1 AND code=$2',[siteId,locale]);
    if(!r.rowCount)throw new StudioError('Add this locale to the site first');
  }
  async references(c:Client,siteId:string,fields:Field[],data:Record<string,unknown>,publishing:boolean,locale:string){
    for(const field of fields){
      if(!['REFERENCE','MULTI_REFERENCE'].includes(field.type))continue;
      const collection=await c.query('SELECT 1 FROM studio.collections WHERE id=$1 AND site_id=$2',[field.referenceCollection,siteId]);
      if(!collection.rowCount)throw new StudioError(`Reference collection for ${field.name} must belong to this site`);
      const value=data[field.key];if(!value || (Array.isArray(value)&&!value.length))continue;
      const groups=Array.isArray(value)?value:[value];
      // Publishing requires a matching live variant, with explicit primary-locale fallback.
      const found=await c.query(`SELECT DISTINCT group_id FROM studio.content_items WHERE site_id=$1 AND collection_id=$2 AND group_id=ANY($3::uuid[]) AND NOT archived
        AND ($4::boolean=false OR (live IS NOT NULL AND locale IN ($5,'en') AND EXISTS(SELECT 1 FROM studio.site_locales l WHERE l.site_id=$1 AND l.code=studio.content_items.locale AND l.enabled)))`,[siteId,field.referenceCollection,groups,publishing,locale]);
      if(found.rowCount!==groups.length)throw new StudioError(`${field.name}: a referenced item is missing${publishing?' or unpublished':''}`);
    }
  }
  async collections(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId);
      const r=await c.query(`SELECT c.id,c.name,c.slug,c.fields,c.revision,(SELECT count(*)::int FROM studio.content_items i WHERE i.collection_id=c.id) AS "itemCount" FROM studio.collections c WHERE site_id=$1 ORDER BY name,id`,[siteId]);
      const locales=await c.query('SELECT code,name,enabled FROM studio.site_locales WHERE site_id=$1 ORDER BY (code=\'en\') DESC,code',[siteId]);
      return {site:{id:site.id,name:site.name,status:site.status,capabilities:site.capabilities},collections:r.rows,locales:locales.rows};
    });
  }
  async saveCollection(actor:Actor,siteId:string,input:unknown,collectionId?:string){
    const body=collectionId?parse(collectionInput.extend({revision}).strict(),input):parse(collectionInput,input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN',true);
      const id=collectionId || randomUUID();
      if(collectionId){
        const current=await this.collection(c,siteId,id);checkRevision(current.revision,(body as any).revision);
        const count=await c.query('SELECT 1 FROM studio.content_items WHERE collection_id=$1 LIMIT 1',[id]);
        if(count.rowCount){
          for(const field of current.fields as Field[]){const next=body.fields.find(f=>f.key===field.key);if(!next||next.type!==field.type||next.referenceCollection!==field.referenceCollection||JSON.stringify(next.options)!==JSON.stringify(field.options))throw new StudioError('A populated collection cannot remove fields or change field types, references, or options. Create a new field and migrate explicitly.',409,'SCHEMA_IN_USE');}
        }
      }
      for(const f of body.fields.filter(f=>f.referenceCollection)){
        if(f.referenceCollection!==id)await this.collection(c,siteId,f.referenceCollection!);
      }
      if(collectionId)await c.query('UPDATE studio.collections SET name=$2,slug=$3,fields=$4::jsonb,revision=revision+1,updated_at=now() WHERE id=$1',[id,body.name,body.slug,JSON.stringify(body.fields)]);
      else await c.query('INSERT INTO studio.collections(id,site_id,name,slug,fields) VALUES($1,$2,$3,$4,$5::jsonb)',[id,siteId,body.name,body.slug,JSON.stringify(body.fields)]);
      if(this.outbox)await this.outbox.emit(c,siteId,collectionId?'cms.collection.updated':'cms.collection.created',{collectionId:id,name:body.name,slug:body.slug,revision:collectionId?(body as any).revision+1:0});
      await this.db.audit(c,actor,site,collectionId?'cms.schema_updated':'cms.collection_created',body.name);return {id};
    });
  }
  async removeCollection(actor:Actor,siteId:string,collectionId:string){
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN',true);const collection=await this.collection(c,siteId,collectionId);
      const count=await c.query('SELECT 1 FROM studio.content_items WHERE collection_id=$1 LIMIT 1',[collectionId]);
      if(count.rowCount)throw new StudioError('Only empty collections can be deleted',409,'COLLECTION_NOT_EMPTY');
      const refs=await c.query(`SELECT 1 FROM studio.collections WHERE site_id=$1 AND id<>$2 AND fields @> $3::jsonb LIMIT 1`,[siteId,collectionId,JSON.stringify([{referenceCollection:collectionId}])]);
      if(refs.rowCount)throw new StudioError('This collection is referenced by another schema',409,'COLLECTION_REFERENCED');
      await c.query('DELETE FROM studio.collections WHERE id=$1',[collectionId]);await this.db.audit(c,actor,site,'cms.collection_deleted',collection.name);return {};
    });
  }
  async items(actor:Actor,siteId:string,collectionId:string,raw:unknown){
    const q=parse(z.object({locale:localeCode.default('en'),q:z.string().max(120).default(''),offset:z.coerce.number().int().min(0).max(100000).default(0),limit:z.coerce.number().int().min(1).max(100).default(25)}).strict(),raw);
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId);await this.collection(c,siteId,collectionId);
      const values=[siteId,collectionId,q.locale,`%${q.q.replace(/[\\%_]/g,'\\$&')}%`];
      const r=await c.query(`SELECT ${projection} FROM studio.content_items i WHERE i.site_id=$1 AND i.collection_id=$2 AND i.locale=$3 AND i.name ILIKE $4 ORDER BY i.updated_at DESC,i.id LIMIT $5 OFFSET $6`,[...values,q.limit,q.offset]);
      const total=await c.query('SELECT count(*)::int AS count FROM studio.content_items i WHERE i.site_id=$1 AND i.collection_id=$2 AND i.locale=$3 AND i.name ILIKE $4',values);
      return {items:r.rows,total:total.rows[0].count,offset:q.offset,limit:q.limit};
    });
  }
  async referenceOptions(actor:Actor,siteId:string,collectionId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId);await this.collection(c,siteId,collectionId);
      const r=await c.query(`SELECT DISTINCT ON(group_id) group_id AS id,name FROM studio.content_items WHERE collection_id=$1 AND site_id=$2 AND NOT archived ORDER BY group_id,(locale='en') DESC LIMIT 500`,[collectionId,siteId]);
      return {options:r.rows,limit:500};
    });
  }
  private async snapshot(c:Client,itemId:string,rev:number,name:string,slugValue:string,data:unknown,actorId:string){
    await c.query('INSERT INTO studio.content_revisions(id,item_id,revision,snapshot,author_id) VALUES($1,$2,$3,$4::jsonb,$5)',[randomUUID(),itemId,rev,JSON.stringify({name,slug:slugValue,fields:data}),actorId]);
  }
  private async insertItem(c:Client,actor:Actor,siteId:string,collection:any,b:z.infer<typeof itemInput>){
    await this.locale(c,siteId,b.locale);
    const data=validateFields(collection.fields,b.fields);
    await this.references(c,siteId,collection.fields,data,false,b.locale);
    if(b.groupId){
      const group=await c.query('SELECT 1 FROM studio.content_items WHERE site_id=$1 AND collection_id=$2 AND group_id=$3',[siteId,collection.id,b.groupId]);
      if(!group.rowCount)throw new StudioError('Source translation group not found',404);
    }
    const id=randomUUID();
    await c.query('INSERT INTO studio.content_items(id,site_id,collection_id,group_id,locale,name,slug,draft) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',[id,siteId,collection.id,b.groupId || randomUUID(),b.locale,b.name,b.slug,JSON.stringify(data)]);
    await this.snapshot(c,id,0,b.name,b.slug,data,actor.id);return id;
  }
  async createCollectionWithDrafts(actor:Actor,siteId:string,input:unknown){
    const b=parse(z.object({collection:collectionInput,items:z.array(itemInput).max(20).default([])}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN',true);await this.db.site(c,actor,siteId,'EDIT_CONTENT');
      const id=randomUUID();
      for(const f of b.collection.fields.filter(f=>f.referenceCollection))if(f.referenceCollection!==id)await this.collection(c,siteId,f.referenceCollection!);
      await c.query('INSERT INTO studio.collections(id,site_id,name,slug,fields) VALUES($1,$2,$3,$4,$5::jsonb)',[id,siteId,b.collection.name,b.collection.slug,JSON.stringify(b.collection.fields)]);
      const collection={id,site_id:siteId,name:b.collection.name,slug:b.collection.slug,fields:b.collection.fields,revision:0};
      const ids:string[]=[];for(const item of b.items)ids.push(await this.insertItem(c,actor,siteId,collection,item));
      if(this.outbox){await this.outbox.emit(c,siteId,'cms.collection.created',{collectionId:id,name:b.collection.name,slug:b.collection.slug,revision:0});if(ids.length)await this.outbox.emit(c,siteId,'cms.items.drafted',{collectionId:id,itemIds:ids,count:ids.length});}
      await this.db.audit(c,actor,site,'cms.ai_collection_drafts_created',`${b.collection.name}: ${ids.length} drafts`);
      return {collectionId:id,itemIds:ids,count:ids.length};
    });
  }
  async createItem(actor:Actor,siteId:string,collectionId:string,input:unknown){
    const b=parse(itemInput,input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT',true);const collection=await this.collection(c,siteId,collectionId);
      const id=await this.insertItem(c,actor,siteId,collection,b);if(this.outbox)await this.outbox.emit(c,siteId,'cms.item.drafted',{itemId:id,collectionId,name:b.name,slug:b.slug,locale:b.locale});await this.db.audit(c,actor,site,'cms.item_created',b.name);return {id};
    });
  }
  async importItems(actor:Actor,siteId:string,collectionId:string,input:unknown){
    const b=parse(z.object({items:z.array(itemInput).min(1).max(100)}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT',true);const collection=await this.collection(c,siteId,collectionId);
      const ids=[];for(const item of b.items)ids.push(await this.insertItem(c,actor,siteId,collection,item));
      await this.db.audit(c,actor,site,'cms.items_imported',`${ids.length} items`);return {ids,count:ids.length};
    });
  }
  async updateItem(actor:Actor,siteId:string,itemId:string,input:unknown){
    const b=parse(itemPatch,input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT',true);const item=await this.getItem(c,siteId,itemId);
      checkRevision(item.revision,b.revision);const collection=await this.collection(c,siteId,item.collection_id);
      const data=validateFields(collection.fields,b.fields);await this.references(c,siteId,collection.fields,data,false,item.locale);
      await c.query(`UPDATE studio.content_items SET name=$2,slug=$3,draft=$4::jsonb,revision=revision+1,ready=false,scheduled_at=NULL,scheduled_revision=NULL,scheduled_by=NULL,updated_at=now() WHERE id=$1`,[itemId,b.name,b.slug,JSON.stringify(data)]);
      await this.snapshot(c,itemId,item.revision+1,b.name,b.slug,data,actor.id);await this.db.audit(c,actor,site,'cms.draft_saved',b.name);return {revision:item.revision+1};
    });
  }
  async getItem(c:Client,siteId:string,itemId:string){
    const r=await c.query('SELECT * FROM studio.content_items WHERE site_id=$1 AND id=$2 FOR UPDATE',[siteId,parse(uuid,itemId)]);
    if(!r.rows[0])throw new StudioError('Item not found',404,'NOT_FOUND');return r.rows[0];
  }
  async publish(c:Client,actor:Actor,siteId:string,item:any){
    if(item.archived)throw new StudioError('Restore the archived item before publishing',409,'ITEM_ARCHIVED');
    const collection=await this.collection(c,siteId,item.collection_id);
    const data=validateFields(collection.fields,item.draft,true);await this.references(c,siteId,collection.fields,data,true,item.locale);
    const snapshot={id:item.id,groupId:item.group_id,name:item.name,slug:item.slug,locale:item.locale,fields:data};
    await c.query(`UPDATE studio.content_items SET live=$2::jsonb,live_revision=revision+1,revision=revision+1,ready=false,published_at=now(),scheduled_at=NULL,scheduled_revision=NULL,scheduled_by=NULL WHERE id=$1`,[item.id,JSON.stringify(snapshot)]);
    await this.snapshot(c,item.id,item.revision+1,item.name,item.slug,data,actor.id);
    if(this.outbox)await this.outbox.emit(c,siteId,'cms.item.published',{itemId:item.id,collectionId:item.collection_id,slug:item.slug,locale:item.locale,revision:item.revision+1});
  }
  async action(actor:Actor,siteId:string,itemId:string,input:unknown){
    const b=parse(actionInput,input);
    return this.db.tx(async c=>{
      const privileged=['PUBLISH','UNPUBLISH','ARCHIVE','SCHEDULE','CANCEL_SCHEDULE'].includes(b.action);
      const site=await this.db.site(c,actor,siteId,privileged?'PUBLISH':'EDIT_CONTENT',true);
      const item=await this.getItem(c,siteId,itemId);checkRevision(item.revision,b.revision);
      if(b.action==='PUBLISH')await this.publish(c,actor,siteId,item);
      else if(b.action==='UNPUBLISH'||b.action==='ARCHIVE')await c.query(`UPDATE studio.content_items SET live=NULL,live_revision=NULL,published_at=NULL,archived=$2,ready=false,scheduled_at=NULL,scheduled_revision=NULL,scheduled_by=NULL WHERE id=$1`,[itemId,b.action==='ARCHIVE']);
      else if(b.action==='RESTORE')await c.query(`UPDATE studio.content_items SET archived=false WHERE id=$1`,[itemId]);
      else if(b.action==='READY'){
        if(item.archived)throw new StudioError('Restore the item first',409);
        const collection=await this.collection(c,siteId,item.collection_id);validateFields(collection.fields,item.draft,true);
        await c.query('UPDATE studio.content_items SET ready=true WHERE id=$1',[itemId]);
      }else if(b.action==='SCHEDULE'){
        if(item.archived)throw new StudioError('Restore the item first',409);
        const when=b.scheduledAt?new Date(b.scheduledAt):null;
        if(!when||when.getTime()<=Date.now()+30000||when.getTime()>Date.now()+366*86400000)throw new StudioError('Schedule from 30 seconds to one year ahead');
        const collection=await this.collection(c,siteId,item.collection_id);validateFields(collection.fields,item.draft,true);
        await c.query('UPDATE studio.content_items SET scheduled_at=$2,scheduled_revision=revision+1,scheduled_by=$3 WHERE id=$1',[itemId,when,actor.id]);
      }else await c.query('UPDATE studio.content_items SET scheduled_at=NULL,scheduled_revision=NULL,scheduled_by=NULL WHERE id=$1',[itemId]);
      if(b.action!=='PUBLISH'){
        await c.query('UPDATE studio.content_items SET revision=revision+1,updated_at=now() WHERE id=$1',[itemId]);
        await this.snapshot(c,itemId,item.revision+1,item.name,item.slug,item.draft,actor.id);
      }
      await this.db.audit(c,actor,site,`cms.item_${b.action.toLowerCase()}`,item.name);return {revision:item.revision+1};
    });
  }
  async revisions(actor:Actor,siteId:string,itemId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId);await this.getItem(c,siteId,itemId);
      const r=await c.query(`SELECT r.id,r.revision,r.snapshot,r.created_at AS "createdAt",u."fullName" AS author FROM studio.content_revisions r LEFT JOIN public.users u ON u.id=r.author_id WHERE r.item_id=$1 ORDER BY r.revision DESC LIMIT 50`,[itemId]);return {revisions:r.rows};
    });
  }
  async restoreRevision(actor:Actor,siteId:string,itemId:string,input:unknown){
    const b=parse(z.object({revision,targetRevision:revision}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT',true);const item=await this.getItem(c,siteId,itemId);checkRevision(item.revision,b.revision);
      const r=await c.query('SELECT snapshot FROM studio.content_revisions WHERE item_id=$1 AND revision=$2',[itemId,b.targetRevision]);
      if(!r.rows[0])throw new StudioError('Revision not found',404);
      const snapshot=r.rows[0].snapshot;const collection=await this.collection(c,siteId,item.collection_id);validateFields(collection.fields,snapshot.fields);
      await c.query(`UPDATE studio.content_items SET name=$2,slug=$3,draft=$4::jsonb,revision=revision+1,ready=false,scheduled_at=NULL,scheduled_revision=NULL,scheduled_by=NULL,updated_at=now() WHERE id=$1`,[itemId,snapshot.name,snapshot.slug,JSON.stringify(snapshot.fields)]);
      await this.snapshot(c,itemId,item.revision+1,snapshot.name,snapshot.slug,snapshot.fields,actor.id);
      await this.db.audit(c,actor,site,'cms.revision_restored',item.name);return {revision:item.revision+1};
    });
  }
  async resolveBindings(siteId:string,locale:string,input:unknown){
    parse(uuid,siteId);parse(localeCode,locale);
    const body=parse(z.object({bindings:z.array(z.object({elementId:z.string().min(1).max(150),collectionId:uuid,field:z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),target:z.enum(['content','src','alt','href']),itemSlug:slug.optional()}).strict()).min(1).max(100)}).strict(),input);
    const site=await this.db.pool.query(`SELECT 1 FROM public.websites w JOIN studio.site_locales l ON l.site_id=w.id AND l.code=$2 WHERE w.id=$1 AND w.status='PUBLISHED' AND l.enabled`,[siteId,locale]);
    if(!site.rowCount)throw new StudioError('Site or locale not published',404,'NOT_FOUND');
    const values:Record<string,Record<string,unknown>>={};
    for(const binding of body.bindings){
      const row=await this.db.pool.query(`SELECT c.fields AS schema,i.live FROM studio.collections c
        LEFT JOIN LATERAL (
          SELECT live FROM studio.content_items
          WHERE site_id=$1 AND collection_id=c.id AND locale=$2 AND live IS NOT NULL AND NOT archived
            AND ($4::text IS NULL OR live->>'slug'=$4)
          ORDER BY published_at DESC,id LIMIT 1
        ) i ON true
        WHERE c.site_id=$1 AND c.id=$3`,[siteId,locale,binding.collectionId,binding.itemSlug||null]);
      if(!row.rows[0])throw new StudioError('CMS binding collection not found',404,'NOT_FOUND');
      const field=(Array.isArray(row.rows[0].schema)?row.rows[0].schema:[]).find((f:any)=>f?.key===binding.field);
      if(!field)throw new StudioError('CMS binding field not found',404,'NOT_FOUND');
      const live=row.rows[0].live,value=live?.fields?.[binding.field];
      if(value===undefined||value===null)continue;
      if(!values[binding.elementId])values[binding.elementId]={};
      values[binding.elementId][binding.target]=value;
    }
    return {values};
  }

  async publicItems(siteId:string,collectionSlug:string,locale='en',itemSlug?:string){
    parse(uuid,siteId);parse(slug,collectionSlug);parse(localeCode,locale);
    const r=await this.db.pool.query(`SELECT i.live,c.name AS "collectionName",c.fields AS schema FROM studio.content_items i JOIN studio.collections c ON c.id=i.collection_id
      JOIN public.websites w ON w.id=i.site_id JOIN studio.site_locales l ON l.site_id=i.site_id AND l.code=i.locale
      WHERE i.site_id=$1 AND c.slug=$2 AND i.locale=$3 AND i.live IS NOT NULL AND NOT i.archived AND w.status='PUBLISHED' AND l.enabled
      AND ($4::text IS NULL OR i.live->>'slug'=$4) ORDER BY i.published_at DESC,i.id LIMIT 100`,[siteId,collectionSlug,locale,itemSlug||null]);
    if(!r.rows.length && itemSlug)throw new StudioError('Published item not found',404,'NOT_FOUND');
    return {items:r.rows.map(r=>r.live),schema:r.rows[0]?.schema||[],collectionName:r.rows[0]?.collectionName||collectionSlug,limit:100};
  }
  /** One worker iteration. Authorization and reference validity are rechecked at execution time. */
  async publishDue():Promise<{published:number;cancelled:number}>{
    const candidates=await this.db.pool.query(`SELECT id,site_id,scheduled_by FROM studio.content_items WHERE scheduled_at<=now() ORDER BY scheduled_at LIMIT 20`);
    let published=0,cancelled=0;
    for(const candidate of candidates.rows){
      const outcome=await this.db.tx(async c=>{
        await c.query('SELECT id FROM public.websites WHERE id=$1 FOR UPDATE',[candidate.site_id]);
        const item=await this.getItem(c,candidate.site_id,candidate.id);
        if(!item.scheduled_at||new Date(item.scheduled_at)>new Date())return 'none';
        const users=await c.query(`SELECT id,email,"emailVerified","fullName" FROM public.users WHERE id=$1 AND status='ACTIVE'`,[item.scheduled_by]);
        const actor=users.rows[0] as Actor|undefined;
        try {
          if(!actor||item.revision!==item.scheduled_revision)throw new StudioError('Schedule invalidated',409);
          const site=await this.db.site(c,actor,candidate.site_id,'PUBLISH');await this.publish(c,actor,candidate.site_id,item);
          await this.db.audit(c,actor,site,'cms.scheduled_published',item.name);return 'published';
        }catch(error){
          if(!(error instanceof StudioError))throw error;
          await c.query('UPDATE studio.content_items SET scheduled_at=NULL,scheduled_revision=NULL,scheduled_by=NULL WHERE id=$1',[item.id]);
          if(actor)await this.db.audit(c,actor,{id:candidate.site_id},'cms.schedule_cancelled',`${item.name}: ${error.message}`);return 'cancelled';
        }
      });
      if(outcome==='published')published++;if(outcome==='cancelled')cancelled++;
    }
    return {published,cancelled};
  }
}
