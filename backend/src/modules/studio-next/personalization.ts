import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import {FeaturePolicy} from './governance.js';
import {parse,uuid,title,revision,checkRevision,StudioError} from './validation.js';

const pathValue=z.string().min(1).max(300).regex(/^\/(?!\/)[^?#\s]*$/);
const condition=z.discriminatedUnion('attribute',[
  z.object({attribute:z.literal('path'),operator:z.enum(['EQ','PREFIX']),value:pathValue}).strict(),
  z.object({attribute:z.literal('country'),operator:z.literal('EQ'),value:z.string().regex(/^[A-Z]{2}$/)}).strict(),
  z.object({attribute:z.literal('trafficSource'),operator:z.literal('EQ'),value:z.string().trim().min(1).max(120)}).strict(),
  z.object({attribute:z.literal('utmCampaign'),operator:z.literal('EQ'),value:z.string().trim().min(1).max(120)}).strict(),
  z.object({attribute:z.literal('deviceCategory'),operator:z.literal('EQ'),value:z.enum(['desktop','tablet','mobile'])}).strict(),
  z.object({attribute:z.literal('returningVisitor'),operator:z.literal('EQ'),value:z.boolean()}).strict(),
]);
const conditions=z.array(condition).max(12);
const variant=z.object({
  text:z.string().max(5000).optional(),
  styles:z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,79}$/),z.union([z.string().max(500),z.number(),z.null()])).optional(),
  attributes:z.record(z.string().regex(/^[a-zA-Z_:][a-zA-Z0-9_:.-]{0,79}$/),z.string().max(1000)).optional(),
}).strict().refine(v=>v.text!==undefined||v.styles!==undefined||v.attributes!==undefined,'Variant must change text, styles, or attributes');
const createInput=z.object({name:title,priority:z.number().int().min(0).max(100000).default(100),conditions, targetElementId:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,149}$/),variant}).strict();
const updateInput=createInput.extend({revision}).strict();
const stateInput=z.object({state:z.enum(['RUNNING','PAUSED']),revision}).strict();
const evalInput=z.object({
  path:pathValue,
  context:z.object({
    country:z.string().regex(/^[A-Z]{2}$/).optional(),
    trafficSource:z.string().max(120).optional(),
    utmCampaign:z.string().max(120).optional(),
    deviceCategory:z.enum(['desktop','tablet','mobile']).optional(),
    returningVisitor:z.boolean().optional(),
  }).strict().default({}),
}).strict();

type Condition=z.infer<typeof condition>;
function matches(c:Condition,path:string,ctx:z.infer<typeof evalInput>['context']){
  switch(c.attribute){
    case 'path': return c.operator==='EQ'?path===c.value:path.startsWith(c.value);
    case 'country': return ctx.country===c.value;
    case 'trafficSource': return ctx.trafficSource===c.value;
    case 'utmCampaign': return ctx.utmCampaign===c.value;
    case 'deviceCategory': return ctx.deviceCategory===c.value;
    case 'returningVisitor': return ctx.returningVisitor===c.value;
  }
}
export class Personalization{
  constructor(private db:Database,private features:FeaturePolicy){}
  async list(actor:Actor,siteId:string){
    return this.db.tx(async c=>{await this.db.site(c,actor,siteId,'VIEW_ANALYTICS');const r=await c.query(`SELECT id,name,state,priority,conditions,target_element_id AS "targetElementId",variant,revision,created_at AS "createdAt",updated_at AS "updatedAt" FROM studio.personalization_rules WHERE site_id=$1 ORDER BY priority,id LIMIT 500`,[siteId]);return {rules:r.rows,enabled:await this.features.effective(siteId,'PERSONALIZATION')};});
  }
  async create(actor:Actor,siteId:string,input:unknown){
    const b=parse(createInput,input);
    return this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true),id=randomUUID();await c.query(`INSERT INTO studio.personalization_rules(id,site_id,name,priority,conditions,target_element_id,variant,created_by) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8)`,[id,siteId,b.name,b.priority,JSON.stringify(b.conditions),b.targetElementId,JSON.stringify(b.variant),actor.id]);await this.db.audit(c,actor,site,'personalization.created',b.name);return {id};});
  }
  async update(actor:Actor,siteId:string,ruleId:string,input:unknown){
    const b=parse(updateInput,input);parse(uuid,ruleId);
    return this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true),r=await c.query('SELECT revision FROM studio.personalization_rules WHERE id=$1 AND site_id=$2 FOR UPDATE',[ruleId,siteId]);if(!r.rows[0])throw new StudioError('Personalization rule not found',404,'NOT_FOUND');checkRevision(r.rows[0].revision,b.revision);await c.query(`UPDATE studio.personalization_rules SET name=$3,priority=$4,conditions=$5::jsonb,target_element_id=$6,variant=$7::jsonb,revision=revision+1,updated_at=now() WHERE id=$1 AND site_id=$2`,[ruleId,siteId,b.name,b.priority,JSON.stringify(b.conditions),b.targetElementId,JSON.stringify(b.variant)]);await this.db.audit(c,actor,site,'personalization.updated',b.name);return {};});
  }
  async state(actor:Actor,siteId:string,ruleId:string,input:unknown){
    const b=parse(stateInput,input);parse(uuid,ruleId);
    if(b.state==='RUNNING')await this.features.assert(siteId,'PERSONALIZATION');
    return this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true),r=await c.query('SELECT name,state,revision FROM studio.personalization_rules WHERE id=$1 AND site_id=$2 FOR UPDATE',[ruleId,siteId]);if(!r.rows[0])throw new StudioError('Personalization rule not found',404,'NOT_FOUND');checkRevision(r.rows[0].revision,b.revision);await c.query('UPDATE studio.personalization_rules SET state=$3,revision=revision+1,updated_at=now() WHERE id=$1 AND site_id=$2',[ruleId,siteId,b.state]);await this.db.audit(c,actor,site,'personalization.state_changed',`${r.rows[0].name}: ${b.state}`);return {};});
  }
  async remove(actor:Actor,siteId:string,ruleId:string){
    parse(uuid,ruleId);
    return this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true),r=await c.query('SELECT name,state FROM studio.personalization_rules WHERE id=$1 AND site_id=$2 FOR UPDATE',[ruleId,siteId]);if(!r.rows[0])throw new StudioError('Personalization rule not found',404,'NOT_FOUND');if(r.rows[0].state==='RUNNING')throw new StudioError('Pause a running rule before deleting it',409,'PERSONALIZATION_RUNNING');await c.query('DELETE FROM studio.personalization_rules WHERE id=$1',[ruleId]);await this.db.audit(c,actor,site,'personalization.deleted',r.rows[0].name);return {};});
  }
  async evaluate(siteId:string,input:unknown){
    parse(uuid,siteId);const b=parse(evalInput,input);
    if(!await this.features.effective(siteId,'PERSONALIZATION'))return {variants:[]};
    const published=await this.db.pool.query('SELECT 1 FROM public.websites WHERE id=$1 AND status=\'PUBLISHED\'',[siteId]);if(!published.rowCount)throw new StudioError('Published site not found',404,'NOT_FOUND');
    const r=await this.db.pool.query(`SELECT id,name,priority,conditions,target_element_id AS "targetElementId",variant FROM studio.personalization_rules WHERE site_id=$1 AND state='RUNNING' ORDER BY priority,id LIMIT 500`,[siteId]);
    const selected=new Map<string,any>();
    for(const rule of r.rows){
      if(selected.has(rule.targetElementId))continue;
      const cs=Array.isArray(rule.conditions)?rule.conditions:[];if(cs.every((c:any)=>matches(c,b.path,b.context)))selected.set(rule.targetElementId,{ruleId:rule.id,name:rule.name,targetElementId:rule.targetElementId,variant:rule.variant});
    }
    return {variants:[...selected.values()],deterministic:true};
  }
}
