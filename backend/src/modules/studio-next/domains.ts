import { Resolver } from 'node:dns/promises';
import { randomBytes,randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database, type Actor } from './database.js';
import { parse, uuid, hostname, StudioError } from './validation.js';
import {configuredDomainProvider,type DomainProvider} from './domain-provider.js';
export type TxtResolver = (host:string)=>Promise<string[][]>;
export class Domains {
  private resolve:TxtResolver;
  constructor(private db:Database,resolve?:TxtResolver,private provider:DomainProvider|null=configuredDomainProvider()){
    const resolver=new Resolver({timeout:5000,tries:1});this.resolve=resolve||((host)=>resolver.resolveTxt(host));
  }
  async list(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');const r=await c.query(`SELECT id,hostname,challenge,state,checked_at AS "checkedAt",verified_at AS "verifiedAt",hosting_state AS "hostingState",tls_state AS "tlsState",provider_ref AS "providerRef",canonical,redirect_to_canonical AS "redirectToCanonical",hosting_checked_at AS "hostingCheckedAt",hosting_error AS "hostingError" FROM studio.verified_domains WHERE site_id=$1 ORDER BY created_at DESC`,[siteId]);
      return {domains:r.rows,hostingProviderConfigured:!!this.provider,message:this.provider?'DNS ownership and hosting are separate. Provision only a verified hostname and rely on provider health before treating it as active.':'DNS ownership verification is available, but custom-domain routing/TLS provisioning is disabled until a backend domain provider is configured.'};
    });
  }
  async add(actor:Actor,siteId:string,input:unknown){
    const b=parse(z.object({hostname:z.string()}).strict(),input);const host=hostname(b.hostname);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      const count=await c.query('SELECT count(*)::int AS count FROM studio.verified_domains WHERE site_id=$1',[siteId]);if(count.rows[0].count>=20)throw new StudioError('Domain limit reached',409);
      const id=randomUUID(),challenge=`forgestudio=${randomBytes(24).toString('hex')}`;
      await c.query('INSERT INTO studio.verified_domains(id,site_id,hostname,challenge) VALUES($1,$2,$3,$4)',[id,siteId,host,challenge]);
      await this.db.audit(c,actor,site,'domain.challenge_created',host);return {id,record:{type:'TXT',name:`_forgestudio.${host}`,value:challenge}};
    });
  }
  async verify(actor:Actor,siteId:string,domainId:string){
    const record=await this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');const r=await c.query('SELECT * FROM studio.verified_domains WHERE id=$1 AND site_id=$2',[parse(uuid,domainId),siteId]);
      if(!r.rows[0])throw new StudioError('Domain not found',404);if(r.rows[0].checked_at && new Date(r.rows[0].checked_at).getTime()>Date.now()-15000)throw new StudioError('Wait 15 seconds before checking DNS again',429);return r.rows[0];
    });
    let found=false;
    try {const rows=await this.resolve(`_forgestudio.${record.hostname}`);found=rows.some(chunks=>chunks.join('')===record.challenge);}
    catch(e){if(!['ENODATA','ENOTFOUND','ESERVFAIL'].includes((e as any)?.code))throw new StudioError('DNS lookup failed. Retry after checking DNS availability.',503,'DNS_UNAVAILABLE');}
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      const r=await c.query(`UPDATE studio.verified_domains SET checked_at=now(),state=$3::varchar,verified_at=CASE WHEN $3::varchar='VERIFIED' THEN now() ELSE NULL END WHERE id=$1 AND site_id=$2 AND challenge=$4 RETURNING id`,[domainId,siteId,found?'VERIFIED':'PENDING',record.challenge]);
      if(!r.rowCount)throw new StudioError('Domain changed during verification',409);
      await this.db.audit(c,actor,site,found?'domain.ownership_verified':'domain.verification_pending',record.hostname);
      return {verified:found,hostingStatus:'NOT_PROVISIONED'};
    });
  }
  async provision(actor:Actor,siteId:string,domainId:string,input:unknown){
    if(!this.provider)throw new StudioError('Custom-domain provisioning is not configured',503,'DOMAIN_PROVIDER_NOT_CONFIGURED');
    const b=parse(z.object({canonical:z.boolean().default(false),redirectToCanonical:z.boolean().default(true)}).strict(),input);
    const record=await this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true),r=await c.query('SELECT * FROM studio.verified_domains WHERE id=$1 AND site_id=$2 FOR UPDATE',[parse(uuid,domainId),siteId]);const d=r.rows[0];
      if(!d)throw new StudioError('Domain not found',404);if(d.state!=='VERIFIED')throw new StudioError('Verify domain ownership before provisioning hosting',409,'DOMAIN_NOT_VERIFIED');
      if(d.hosting_state==='ACTIVE')return {...d,alreadyActive:true};
      if(b.canonical)await c.query('UPDATE studio.verified_domains SET canonical=false WHERE site_id=$1',[siteId]);
      await c.query("UPDATE studio.verified_domains SET hosting_state='PROVISIONING',tls_state='PENDING',canonical=$3,redirect_to_canonical=$4,hosting_error=NULL WHERE id=$1 AND site_id=$2",[domainId,siteId,b.canonical,b.redirectToCanonical]);
      await this.db.audit(c,actor,site,'domain.provision_started',d.hostname);return {...d,canonical:b.canonical,redirect_to_canonical:b.redirectToCanonical};
    });
    if(record.alreadyActive)return {hostingState:'ACTIVE',tlsState:record.tls_state,alreadyActive:true};
    try{
      const deployed=await this.provider.provision({siteId,hostname:record.hostname,canonical:record.canonical,redirectToCanonical:record.redirect_to_canonical});
      await this.db.pool.query("UPDATE studio.verified_domains SET provider_ref=$3,tls_state=$4,hosting_checked_at=now() WHERE id=$1 AND site_id=$2",[domainId,siteId,deployed.reference,deployed.tlsState]);
      return await this.refreshHosting(actor,siteId,domainId);
    }catch(error){
      await this.db.pool.query("UPDATE studio.verified_domains SET hosting_state='FAILED',tls_state='FAILED',hosting_error=$3,hosting_checked_at=now() WHERE id=$1 AND site_id=$2",[domainId,siteId,String((error as any)?.code||'PROVISION_FAILED').slice(0,120)]).catch(()=>undefined);throw error;
    }
  }
  async refreshHosting(actor:Actor,siteId:string,domainId:string){
    if(!this.provider)throw new StudioError('Custom-domain provisioning is not configured',503,'DOMAIN_PROVIDER_NOT_CONFIGURED');
    const record=await this.db.tx(async c=>{await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');const r=await c.query('SELECT * FROM studio.verified_domains WHERE id=$1 AND site_id=$2',[parse(uuid,domainId),siteId]);if(!r.rows[0])throw new StudioError('Domain not found',404);if(!r.rows[0].provider_ref)throw new StudioError('Domain has not been provisioned',409,'DOMAIN_NOT_PROVISIONED');return r.rows[0];});
    const health=await this.provider.status({siteId,hostname:record.hostname,reference:record.provider_ref});
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      await c.query('UPDATE studio.verified_domains SET hosting_state=$3,tls_state=$4,hosting_error=$5,hosting_checked_at=now() WHERE id=$1 AND site_id=$2',[domainId,siteId,health.hostingState,health.tlsState,health.errorCode??null]);
      await this.db.audit(c,actor,site,'domain.hosting_checked',`${record.hostname}: ${health.hostingState}/${health.tlsState}`);
      return {hostingState:health.hostingState,tlsState:health.tlsState,active:health.hostingState==='ACTIVE'&&health.tlsState==='ACTIVE',errorCode:health.errorCode??null};
    });
  }
  async remove(actor:Actor,siteId:string,domainId:string){
    const record=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);const r=await c.query('SELECT * FROM studio.verified_domains WHERE id=$1 AND site_id=$2 FOR UPDATE',[parse(uuid,domainId),siteId]);if(!r.rows[0])throw new StudioError('Domain not found',404);await this.db.audit(c,actor,site,'domain.removal_requested',r.rows[0].hostname);return r.rows[0];});
    if(record.provider_ref){
      if(!this.provider)throw new StudioError('The domain has provider state but no provider is configured to remove it safely',503,'DOMAIN_PROVIDER_NOT_CONFIGURED');
      await this.provider.remove({siteId,hostname:record.hostname,reference:record.provider_ref});
    }
    return this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);const r=await c.query('DELETE FROM studio.verified_domains WHERE id=$1 AND site_id=$2 RETURNING hostname',[domainId,siteId]);if(!r.rowCount)throw new StudioError('Domain not found',404);await this.db.audit(c,actor,site,'domain.claim_removed',r.rows[0].hostname);return {};});
  }
}
