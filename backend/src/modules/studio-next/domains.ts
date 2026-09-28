import { Resolver } from 'node:dns/promises';
import { randomBytes,randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database, type Actor } from './database.js';
import { parse, uuid, hostname, StudioError } from './validation.js';
export type TxtResolver = (host:string)=>Promise<string[][]>;
export class Domains {
  private resolve:TxtResolver;
  constructor(private db:Database,resolve?:TxtResolver){
    const resolver=new Resolver({timeout:5000,tries:1});this.resolve=resolve||((host)=>resolver.resolveTxt(host));
  }
  async list(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');const r=await c.query(`SELECT id,hostname,challenge,state,checked_at AS "checkedAt",verified_at AS "verifiedAt" FROM studio.verified_domains WHERE site_id=$1 ORDER BY created_at DESC`,[siteId]);
      return {domains:r.rows,hostingStatus:'NOT_PROVISIONED',message:'DNS verification establishes ownership only. It does not provision TLS, a CDN, or production hosting.'};
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
  async remove(actor:Actor,siteId:string,domainId:string){
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);const r=await c.query('DELETE FROM studio.verified_domains WHERE id=$1 AND site_id=$2 RETURNING hostname',[parse(uuid,domainId),siteId]);if(!r.rowCount)throw new StudioError('Domain not found',404);
      await this.db.audit(c,actor,site,'domain.claim_removed',r.rows[0].hostname);return {};
    });
  }
}
