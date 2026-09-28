import { randomUUID,createHash,createHmac,timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { Database,type Actor } from './database.js';
import { parse,uuid,title,slug,revision,checkRevision,StudioError } from './validation.js';
const pathSchema=z.string().min(1).max(300).regex(/^\/(?!\/)[^?#\s]*$/);
const variantsSchema=z.array(z.object({id:slug,label:title,weight:z.number().int().min(1).max(99),text:z.string().max(2000)}).strict()).min(2).max(5).refine(v=>v.reduce((n,x)=>n+x.weight,0)===100&&new Set(v.map(x=>x.id)).size===v.length,'Variant IDs must be unique and weights must total 100');
const experimentSchema=z.object({name:title,path:pathSchema,targetElementId:z.string().min(1).max(150),variants:variantsSchema}).strict();
interface Ticket {siteId:string;visitorHash:string;path:string;expires:number;experimentId:string|null;variant:string|null}
export class Analytics {
  constructor(private db:Database,private secret:string|undefined){}
  configured(){return !!this.secret&&this.secret.length>=32;}
  async settings(actor:Actor,siteId:string,input?:unknown){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,input?'MANAGE_SETTINGS':'VIEW_ANALYTICS',!!input);
      if(input){const b=parse(z.object({enabled:z.boolean()}).strict(),input);if(b.enabled&&!this.configured())throw new StudioError('Set a strong STUDIO_ANALYTICS_SECRET before enabling analytics',503,'ANALYTICS_NOT_CONFIGURED');await c.query('INSERT INTO studio.analytics_settings(site_id,enabled) VALUES($1,$2) ON CONFLICT(site_id) DO UPDATE SET enabled=excluded.enabled',[siteId,b.enabled]);}
      const r=await c.query('SELECT enabled FROM studio.analytics_settings WHERE site_id=$1',[siteId]);return {enabled:r.rows[0]?.enabled||false,configured:this.configured(),retentionDays:30};
    });
  }
  async report(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'VIEW_ANALYTICS');
      const daily=await c.query(`SELECT (created_at AT TIME ZONE 'UTC')::date AS day,count(*) FILTER(WHERE event='PAGEVIEW')::int AS views,count(*) FILTER(WHERE event='CONVERSION')::int AS conversions,count(DISTINCT visitor_hash)::int AS visitors FROM studio.analytics_events WHERE site_id=$1 AND created_at>now()-interval '30 days' GROUP BY day ORDER BY day`,[siteId]);
      const pages=await c.query(`SELECT path,count(*) FILTER(WHERE event='PAGEVIEW')::int AS views FROM studio.analytics_events WHERE site_id=$1 AND created_at>now()-interval '30 days' GROUP BY path ORDER BY views DESC LIMIT 100`,[siteId]);
      const variants=await c.query(`SELECT experiment_id AS "experimentId",variant,count(DISTINCT visitor_hash) FILTER(WHERE event='PAGEVIEW')::int AS visitors,count(DISTINCT visitor_hash) FILTER(WHERE event='CONVERSION')::int AS conversions FROM studio.analytics_events WHERE site_id=$1 AND experiment_id IS NOT NULL AND created_at>now()-interval '30 days' GROUP BY experiment_id,variant`,[siteId]);
      return {daily:daily.rows,pages:pages.rows,variants:variants.rows,visitorDefinition:'Daily, site-scoped pseudonymous browser identifiers; not unique people. No automatic winner or statistical-significance claim.'};
    });
  }
  async experiments(actor:Actor,siteId:string){
    return this.db.tx(async c=>{await this.db.site(c,actor,siteId,'VIEW_ANALYTICS');const r=await c.query(`SELECT id,name,state,path,target_element_id AS "targetElementId",variants,revision FROM studio.experiments WHERE site_id=$1 ORDER BY created_at DESC LIMIT 100`,[siteId]);return {experiments:r.rows};});
  }
  async createExperiment(actor:Actor,siteId:string,input:unknown){
    const b=parse(experimentSchema,input);
    return this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);const id=randomUUID();await c.query('INSERT INTO studio.experiments(id,site_id,name,path,target_element_id,variants) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[id,siteId,b.name,b.path,b.targetElementId,JSON.stringify(b.variants)]);await this.db.audit(c,actor,site,'experiment.created',b.name);return {id};});
  }
  async changeExperiment(actor:Actor,siteId:string,experimentId:string,input:unknown){
    const b=parse(z.object({state:z.enum(['RUNNING','PAUSED','CONCLUDED']),revision}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);const r=await c.query('SELECT * FROM studio.experiments WHERE id=$1 AND site_id=$2 FOR UPDATE',[parse(uuid,experimentId),siteId]);const experiment=r.rows[0];if(!experiment)throw new StudioError('Experiment not found',404);checkRevision(experiment.revision,b.revision);
      const transitions:Record<string,string[]>={DRAFT:['RUNNING'],RUNNING:['PAUSED','CONCLUDED'],PAUSED:['RUNNING','CONCLUDED'],CONCLUDED:[]};if(!transitions[experiment.state]?.includes(b.state))throw new StudioError('Invalid experiment state transition',409);
      if(b.state==='RUNNING'){const a=await c.query('SELECT enabled FROM studio.analytics_settings WHERE site_id=$1',[siteId]);if(!this.configured()||!a.rows[0]?.enabled)throw new StudioError('Enable configured analytics first',409);}
      await c.query('UPDATE studio.experiments SET state=$2,revision=revision+1 WHERE id=$1',[experimentId,b.state]);await this.db.audit(c,actor,site,'experiment.state_changed',`${experiment.name}: ${b.state}`);return {};
    });
  }
  async publicConfig(siteId:string){
    parse(uuid,siteId);const r=await this.db.pool.query(`SELECT a.enabled FROM studio.analytics_settings a JOIN public.websites w ON w.id=a.site_id WHERE a.site_id=$1 AND w.status='PUBLISHED'`,[siteId]);return {enabled:this.configured()&&!!r.rows[0]?.enabled};
  }
  async assignment(siteId:string,input:unknown){
    const b=parse(z.object({visitorId:uuid,path:pathSchema,consent:z.literal(true)}).strict(),input);
    if(!(await this.publicConfig(siteId)).enabled)throw new StudioError('Analytics is disabled',403,'ANALYTICS_DISABLED');
    const r=await this.db.pool.query(`SELECT * FROM studio.experiments WHERE site_id=$1 AND state='RUNNING' AND path=$2 LIMIT 1`,[siteId,b.path]);
    const experiment=r.rows[0];let chosen:any=null;
    if(experiment){
      const bucket=parseInt(createHmac('sha256',this.secret!).update(`${experiment.id}:${b.visitorId}`).digest('hex').slice(0,8),16)%100;
      let accumulated=0;for(const v of experiment.variants){accumulated+=v.weight;if(bucket<accumulated){chosen=v;break;}}
    }
    const ticket:Ticket={siteId,visitorHash:createHmac('sha256',this.secret!).update(`${siteId}:${new Date().toISOString().slice(0,10)}:${b.visitorId}`).digest('hex'),path:b.path,expires:Math.floor(Date.now()/1000)+1800,experimentId:experiment?.id||null,variant:chosen?.id||null};
    const payload=Buffer.from(JSON.stringify(ticket)).toString('base64url');const signature=createHmac('sha256',this.secret!).update(payload).digest('hex');
    return {ticket:`${payload}.${signature}`,variant:chosen?{id:chosen.id,text:chosen.text,targetElementId:experiment.target_element_id}:null};
  }
  private verify(value:string):Ticket{
    if(!this.configured())throw new StudioError('Analytics is not configured',503);
    const [payload,signature,extra]=value.split('.');if(extra||!payload||!signature||!/^[a-f0-9]{64}$/.test(signature))throw new StudioError('Invalid analytics ticket',403);
    const expected=createHmac('sha256',this.secret!).update(payload).digest();if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw new StudioError('Invalid analytics ticket',403);
    let ticket:any;try{ticket=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{throw new StudioError('Invalid analytics ticket',403);}
    if(ticket.expires<Math.floor(Date.now()/1000))throw new StudioError('Analytics ticket expired',403);
    return ticket;
  }
  async track(siteId:string,input:unknown){
    const b=parse(z.object({id:uuid,ticket:z.string().max(4096),event:z.enum(['PAGEVIEW','CONVERSION'])}).strict(),input);
    const t=this.verify(b.ticket);if(t.siteId!==siteId)throw new StudioError('Analytics ticket belongs to another site',403);
    if(!(await this.publicConfig(siteId)).enabled)throw new StudioError('Analytics is disabled',403);
    if(t.experimentId){const r=await this.db.pool.query(`SELECT 1 FROM studio.experiments WHERE id=$1 AND site_id=$2 AND state='RUNNING'`,[t.experimentId,siteId]);if(!r.rowCount)return {ignored:true};}
    // Conversion events are accepted only after a pageview from the same signed daily identity.
    if(b.event==='CONVERSION'){
      const viewed=await this.db.pool.query(`SELECT 1 FROM studio.analytics_events WHERE site_id=$1 AND visitor_hash=$2 AND path=$3 AND event='PAGEVIEW' AND created_at>now()-interval '1 day' LIMIT 1`,[siteId,t.visitorHash,t.path]);if(!viewed.rowCount)throw new StudioError('Record a pageview before a conversion',409);
    }
    await this.db.pool.query(`INSERT INTO studio.analytics_events(id,site_id,event,path,experiment_id,variant,visitor_hash) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,[b.id,siteId,b.event,t.path,t.experimentId,t.variant,t.visitorHash]);return {};
  }
  async retain(){await this.db.pool.query(`DELETE FROM studio.analytics_events WHERE created_at<now()-interval '30 days'`);}
}
