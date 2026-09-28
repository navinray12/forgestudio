import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import type {EventOutbox} from './webhooks.js';
import {designOnly,digest,jsonObject,parse,uuid,StudioError} from './validation.js';

export interface ReleaseArtifact extends Record<string,unknown>{
  publishing:{releaseId:string;preparedAt:string;provider:string};
}
export interface ProviderDeployment {reference:string}
export interface ProviderStatus {healthy:boolean;checksum?:string}
export interface PublishingProvider{
  readonly name:string;
  deploy(input:{siteId:string;releaseId:string;artifact:ReleaseArtifact;checksum:string}):Promise<ProviderDeployment>;
  status(input:{siteId:string;releaseId:string;reference:string;checksum:string}):Promise<ProviderStatus>;
}
export class InternalPublishingProvider implements PublishingProvider{
  readonly name='internal';
  constructor(private db:Database){}
  async deploy(input:{siteId:string;releaseId:string;artifact:ReleaseArtifact;checksum:string}):Promise<ProviderDeployment>{
    await this.db.tx(async c=>{
      const row=await c.query('SELECT "editorData" FROM public.websites WHERE id=$1 FOR UPDATE',[input.siteId]);
      if(!row.rows[0])throw new StudioError('Site not found',404,'NOT_FOUND');
      const editor=jsonObject(row.rows[0].editorData||{});
      const next={...editor,publishedData:input.artifact,publishing:{status:'PUBLISHED',releaseId:input.releaseId,artifactChecksum:input.checksum,publishedAt:new Date().toISOString()}};
      await c.query('UPDATE public.websites SET status=\'PUBLISHED\',"editorData"=$2::jsonb,"updatedAt"=now() WHERE id=$1',[input.siteId,JSON.stringify(next)]);
    });
    return {reference:`/site/${input.siteId}`};
  }
  async status(input:{siteId:string;releaseId:string;reference:string;checksum:string}):Promise<ProviderStatus>{
    const r=await this.db.pool.query('SELECT status,"editorData" FROM public.websites WHERE id=$1',[input.siteId]);
    if(!r.rows[0])return {healthy:false};
    const editor=jsonObject(r.rows[0].editorData||{}),published=editor.publishedData;
    if(!published||typeof published!=='object'||Array.isArray(published))return {healthy:false};
    const checksum=digest(published);
    return {healthy:r.rows[0].status==='PUBLISHED'&&checksum===input.checksum,checksum};
  }
}

const prepareInput=z.object({baseHash:z.string().regex(/^[a-f0-9]{64}$/),operationId:uuid}).strict();
function validateArtifact(design:Record<string,unknown>){
  const pages=Array.isArray(design.pages)?design.pages:[];
  const elements=Array.isArray(design.elements)?design.elements:[];
  if(!pages.length&&!elements.length)throw new StudioError('The site has no publishable pages or elements',409,'EMPTY_RELEASE');
  if(pages.length){
    const slugs=new Set<string>(),ids=new Set<string>();let roots=0;
    for(const page of pages as any[]){
      if(!page||typeof page.id!=='string'||typeof page.slug!=='string'||!Array.isArray(page.elements))throw new StudioError('Release contains an invalid page',400,'INVALID_RELEASE');
      if(ids.has(page.id)||slugs.has(page.slug))throw new StudioError('Release contains duplicate page IDs or routes',409,'INVALID_RELEASE');
      ids.add(page.id);slugs.add(page.slug);if(page.slug==='/')roots++;
    }
    if(roots!==1)throw new StudioError('A multi-page release requires exactly one root route',409,'INVALID_RELEASE');
  }
}

export class Releases{
  constructor(private db:Database,private provider:PublishingProvider=new InternalPublishingProvider(db),private outbox?:EventOutbox){}
  async list(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'VIEW');
      const r=await c.query(`SELECT r.id,r.source_hash AS "sourceHash",r.artifact_checksum AS "artifactChecksum",r.provider,r.provider_ref AS "providerRef",r.status,r.rollback_of AS "rollbackOf",r.created_at AS "createdAt",r.activated_at AS "activatedAt",u."fullName" AS "createdBy"
        FROM studio.releases r LEFT JOIN public.users u ON u.id=r.created_by WHERE r.site_id=$1 ORDER BY r.created_at DESC LIMIT 50`,[siteId]);
      const pointer=await c.query('SELECT release_id AS "releaseId" FROM studio.release_pointer WHERE site_id=$1',[siteId]);
      return {releases:r.rows,activeReleaseId:pointer.rows[0]?.releaseId??null,provider:this.provider.name};
    });
  }
  async prepare(actor:Actor,siteId:string,input:unknown){
    const b=parse(prepareInput,input),payloadHash=digest({command:'release.prepare',siteId,baseHash:b.baseHash});
    return this.db.tx(async c=>{
      const prior=await c.query('SELECT payload_hash,result,correlation_id FROM studio.command_receipts WHERE actor_id=$1 AND idempotency_key=$2 FOR UPDATE',[actor.id,b.operationId]);
      if(prior.rows[0]){
        if(prior.rows[0].payload_hash!==payloadHash)throw new StudioError('Idempotency key was already used for a different command',409,'IDEMPOTENCY_CONFLICT');
        const saved=jsonObject(prior.rows[0].result);
        if(typeof saved.releaseId!=='string'||typeof saved.artifactChecksum!=='string')throw new StudioError('Stored release receipt is invalid',503,'COMMAND_RECEIPT_INVALID');
        return {releaseId:saved.releaseId,artifactChecksum:saved.artifactChecksum,replayed:true};
      }
      const site=await this.db.site(c,actor,siteId,'PUBLISH',true),design=designOnly(site.editorData),sourceHash=digest(design);
      if(sourceHash!==b.baseHash)throw new StudioError('The design changed. Reload before preparing a release.',409,'DESIGN_CONFLICT');
      validateArtifact(design);
      const releaseId=randomUUID(),preparedAt=new Date().toISOString();
      const artifact={...design,publishing:{releaseId,preparedAt,provider:this.provider.name}} as ReleaseArtifact;
      const checksum=digest(artifact);
      await c.query(`INSERT INTO studio.releases(id,site_id,source_hash,artifact_checksum,artifact,provider,status,created_by) VALUES($1,$2,$3,$4,$5::jsonb,$6,'PREPARED',$7)`,[releaseId,siteId,sourceHash,checksum,JSON.stringify(artifact),this.provider.name,actor.id]);
      await c.query(`INSERT INTO studio.command_receipts(id,actor_id,site_id,command,source,idempotency_key,correlation_id,payload_hash,result)
        VALUES($1,$2,$3,'release.prepare','HUMAN',$4,$4,$5,$6::jsonb)`,[randomUUID(),actor.id,siteId,b.operationId,payloadHash,JSON.stringify({releaseId,artifactChecksum:checksum})]);
      await this.db.audit(c,actor,site,'release.prepared',releaseId);
      return {releaseId,artifactChecksum:checksum,replayed:false};
    });
  }
  private async release(actor:Actor,siteId:string,releaseId:string,forUpdate=false){
    parse(uuid,releaseId);
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'PUBLISH');
      const r=await c.query(`SELECT * FROM studio.releases WHERE id=$1 AND site_id=$2 ${forUpdate?'FOR UPDATE':''}`,[releaseId,siteId]);
      if(!r.rows[0])throw new StudioError('Release not found',404,'NOT_FOUND');return r.rows[0];
    });
  }
  async publish(actor:Actor,siteId:string,releaseId:string){
    const release=await this.release(actor,siteId,releaseId);
    if(release.status==='ACTIVE')return {releaseId,status:'ACTIVE',providerRef:release.provider_ref,alreadyActive:true};
    if(release.status!=='PREPARED')throw new StudioError('Only a prepared release can be published',409,'RELEASE_STATE');
    await this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'PUBLISH',true);
      const locked=await c.query('SELECT status FROM studio.releases WHERE id=$1 AND site_id=$2 FOR UPDATE',[releaseId,siteId]);
      if(locked.rows[0]?.status==='ACTIVE')return;
      if(locked.rows[0]?.status!=='PREPARED')throw new StudioError('Release state changed. Reload before publishing.',409,'RELEASE_STATE');
      await c.query("UPDATE studio.releases SET status='DEPLOYING',error_code=NULL WHERE id=$1",[releaseId]);
      await this.db.audit(c,actor,site,'release.deploy_started',releaseId);
    });
    let deployment:ProviderDeployment|undefined;
    try{
      deployment=await this.provider.deploy({siteId,releaseId,artifact:release.artifact,checksum:release.artifact_checksum});
      await this.db.pool.query("UPDATE studio.releases SET status='VERIFYING',provider_ref=$2 WHERE id=$1",[releaseId,deployment.reference]);
      const verified=await this.provider.status({siteId,releaseId,reference:deployment.reference,checksum:release.artifact_checksum});
      if(!verified.healthy||verified.checksum!==release.artifact_checksum){
        await this.db.pool.query("UPDATE studio.releases SET status='RECONCILIATION_REQUIRED',error_code='PROVIDER_VERIFICATION_FAILED' WHERE id=$1",[releaseId]);
        throw new StudioError('The provider deployment could not be verified. Release requires reconciliation.',503,'RELEASE_VERIFICATION_FAILED');
      }
      return await this.db.tx(async c=>{
        const site=await this.db.site(c,actor,siteId,'PUBLISH',true);
        const locked=await c.query('SELECT status FROM studio.releases WHERE id=$1 AND site_id=$2 FOR UPDATE',[releaseId,siteId]);
        if(locked.rows[0]?.status==='ACTIVE')return {releaseId,status:'ACTIVE',providerRef:deployment!.reference,alreadyActive:true};
        if(locked.rows[0]?.status!=='VERIFYING')throw new StudioError('Release state changed during verification',409,'RELEASE_STATE');
        await c.query("UPDATE studio.releases SET status='SUPERSEDED' WHERE site_id=$1 AND status='ACTIVE'",[siteId]);
        await c.query("UPDATE studio.releases SET status='ACTIVE',activated_at=now(),provider_ref=$2 WHERE id=$1",[releaseId,deployment!.reference]);
        await c.query(`INSERT INTO studio.release_pointer(site_id,release_id) VALUES($1,$2) ON CONFLICT(site_id) DO UPDATE SET release_id=EXCLUDED.release_id,updated_at=now()`,[siteId,releaseId]);
        await this.db.audit(c,actor,site,'release.activated',releaseId);
        if(this.outbox)await this.outbox.emit(c,siteId,'release.activated',{releaseId,provider:this.provider.name,providerRef:deployment!.reference,artifactChecksum:release.artifact_checksum});
        return {releaseId,status:'ACTIVE',providerRef:deployment!.reference,alreadyActive:false};
      });
    }catch(error){
      if(error instanceof StudioError&&error.code==='RELEASE_VERIFICATION_FAILED')throw error;
      await this.db.pool.query(`UPDATE studio.releases SET status=CASE WHEN provider_ref IS NULL THEN 'FAILED' ELSE 'RECONCILIATION_REQUIRED' END,error_code=$2 WHERE id=$1 AND status IN ('DEPLOYING','VERIFYING')`,[releaseId,(error as any)?.code||'DEPLOY_FAILED']).catch(()=>undefined);
      throw error;
    }
  }
  async rollback(actor:Actor,siteId:string,targetReleaseId:string){
    const target=await this.release(actor,siteId,targetReleaseId);
    if(!['ACTIVE','SUPERSEDED'].includes(target.status))throw new StudioError('Rollback target must be a previously active release',409,'RELEASE_STATE');
    const newId=randomUUID();
    await this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'PUBLISH',true);
      await c.query(`INSERT INTO studio.releases(id,site_id,source_hash,artifact_checksum,artifact,provider,status,created_by,rollback_of)
        VALUES($1,$2,$3,$4,$5::jsonb,$6,'PREPARED',$7,$8)`,[newId,siteId,target.source_hash,target.artifact_checksum,JSON.stringify(target.artifact),this.provider.name,actor.id,targetReleaseId]);
      await this.db.audit(c,actor,site,'release.rollback_prepared',targetReleaseId);
    });
    const published=await this.publish(actor,siteId,newId);
    return {...published,restoredFromReleaseId:targetReleaseId};
  }
}
