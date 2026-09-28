import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import {parse,StudioError} from './validation.js';

export const FEATURES=['AI_COPY','AI_SECTION_GENERATION','AI_PAGE_GENERATION','AI_SITE_GENERATION','AI_CMS','AI_IMAGES','AI_CODE_COMPONENTS','LOCALIZATION','COMMERCE','ANALYTICS','EXPERIMENTS','PERSONALIZATION','CUSTOM_CODE','MCP','WEBHOOKS'] as const;
export type Feature=typeof FEATURES[number];
const featureSchema=z.enum(FEATURES);
const featureInput=z.object({feature:featureSchema,enabled:z.boolean()}).strict();
const budgetInput=z.object({monthlyUnitLimit:z.number().int().min(1000).max(1_000_000_000).nullable(),warningPercent:z.number().int().min(50).max(99).default(80)}).strict();

function globalEnabled(feature:Feature){
  const raw=process.env[`STUDIO_FEATURE_${feature}`];return raw===undefined?!feature.startsWith('AI_')||true:!['0','false','off','disabled'].includes(raw.toLowerCase());
}
export class FeaturePolicy{
  constructor(private db:Database){}
  async effective(siteId:string,feature:Feature){
    if(!globalEnabled(feature))return false;
    const r=await this.db.pool.query('SELECT enabled FROM studio.feature_flags WHERE site_id=$1 AND feature=$2',[siteId,feature]);
    return r.rows[0]?.enabled??true;
  }
  async assert(siteId:string,feature:Feature){
    if(!await this.effective(siteId,feature))throw new StudioError(`${feature} is disabled for this site`,403,'FEATURE_DISABLED');
  }
  async list(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');
      const r=await c.query('SELECT feature,enabled,updated_at AS "updatedAt" FROM studio.feature_flags WHERE site_id=$1',[siteId]),map=new Map(r.rows.map(x=>[x.feature,x]));
      return {features:FEATURES.map(feature=>({feature,globalEnabled:globalEnabled(feature),siteEnabled:map.get(feature)?.enabled??true,effective:globalEnabled(feature)&&(map.get(feature)?.enabled??true),updatedAt:map.get(feature)?.updatedAt??null}))};
    });
  }
  async set(actor:Actor,siteId:string,input:unknown){
    const b=parse(featureInput,input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      await c.query(`INSERT INTO studio.feature_flags(site_id,feature,enabled,updated_by) VALUES($1,$2,$3,$4)
        ON CONFLICT(site_id,feature) DO UPDATE SET enabled=EXCLUDED.enabled,updated_by=EXCLUDED.updated_by,updated_at=now()`,[siteId,b.feature,b.enabled,actor.id]);
      await this.db.audit(c,actor,site,'feature.updated',`${b.feature}=${b.enabled}`);
      return {feature:b.feature,siteEnabled:b.enabled,globalEnabled:globalEnabled(b.feature),effective:b.enabled&&globalEnabled(b.feature)};
    });
  }
}

export interface UsageReservation {id:string;reservedUnits:number}
export class AiGovernance{
  constructor(private db:Database){}
  async report(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');
      await c.query("UPDATE studio.ai_usage_reservations SET state='RELEASED' WHERE site_id=$1 AND state='RESERVED' AND expires_at<=now()",[siteId]);
      const budget=await c.query('SELECT monthly_unit_limit AS "monthlyUnitLimit",warning_percent AS "warningPercent",updated_at AS "updatedAt" FROM studio.ai_budgets WHERE site_id=$1',[siteId]);
      const used=await c.query(`SELECT COALESCE(sum(COALESCE(input_units,0)+COALESCE(output_units,0)),0)::bigint AS units,count(*)::int AS runs FROM studio.ai_runs WHERE site_id=$1 AND created_at>=date_trunc('month',now())`,[siteId]);
      const reserved=await c.query(`SELECT COALESCE(sum(reserved_units),0)::bigint AS units FROM studio.ai_usage_reservations WHERE site_id=$1 AND state='RESERVED' AND expires_at>now()`,[siteId]);
      const limit=budget.rows[0]?.monthlyUnitLimit?Number(budget.rows[0].monthlyUnitLimit):null,current=Number(used.rows[0].units),outstanding=Number(reserved.rows[0].units),warning=Number(budget.rows[0]?.warningPercent??80);
      return {budget:limit?{monthlyUnitLimit:limit,warningPercent:warning,updatedAt:budget.rows[0].updatedAt}:null,usage:{monthUnits:current,outstandingReservedUnits:outstanding,runs:used.rows[0].runs,percent:limit?Math.min(100,Math.round((current+outstanding)*10000/limit)/100):null,warning:!!limit&&(current+outstanding)>=limit*warning/100}};
    });
  }
  async setBudget(actor:Actor,siteId:string,input:unknown){
    const b=parse(budgetInput,input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      if(site.userId!==actor.id)throw new StudioError('Only the site owner can change AI spending limits',403,'FORBIDDEN');
      if(b.monthlyUnitLimit===null)await c.query('DELETE FROM studio.ai_budgets WHERE site_id=$1',[siteId]);
      else await c.query(`INSERT INTO studio.ai_budgets(site_id,monthly_unit_limit,warning_percent,updated_by) VALUES($1,$2,$3,$4)
        ON CONFLICT(site_id) DO UPDATE SET monthly_unit_limit=EXCLUDED.monthly_unit_limit,warning_percent=EXCLUDED.warning_percent,updated_by=EXCLUDED.updated_by,updated_at=now()`,[siteId,b.monthlyUnitLimit,b.warningPercent,actor.id]);
      await this.db.audit(c,actor,site,'ai.budget_updated',b.monthlyUnitLimit===null?'unlimited':String(b.monthlyUnitLimit));
      return {monthlyUnitLimit:b.monthlyUnitLimit,warningPercent:b.warningPercent};
    });
  }
  async reserve(actor:Actor,siteId:string,feature:string,estimatedUnits:number):Promise<UsageReservation|null>{
    const units=Math.max(1,Math.min(Math.floor(estimatedUnits),10_000_000));
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'VIEW');
      const budget=await c.query('SELECT monthly_unit_limit FROM studio.ai_budgets WHERE site_id=$1 FOR UPDATE',[siteId]);
      if(!budget.rows[0])return null;
      await c.query("UPDATE studio.ai_usage_reservations SET state='RELEASED' WHERE site_id=$1 AND state='RESERVED' AND expires_at<=now()",[siteId]);
      const used=await c.query(`SELECT COALESCE(sum(COALESCE(input_units,0)+COALESCE(output_units,0)),0)::bigint AS units FROM studio.ai_runs WHERE site_id=$1 AND created_at>=date_trunc('month',now())`,[siteId]);
      const reserved=await c.query(`SELECT COALESCE(sum(reserved_units),0)::bigint AS units FROM studio.ai_usage_reservations WHERE site_id=$1 AND state='RESERVED' AND expires_at>now()`,[siteId]);
      const limit=Number(budget.rows[0].monthly_unit_limit),consumed=Number(used.rows[0].units)+Number(reserved.rows[0].units);
      if(consumed+units>limit)throw new StudioError('This site has reached its monthly AI usage limit',429,'AI_BUDGET_EXCEEDED');
      const id=randomUUID();await c.query(`INSERT INTO studio.ai_usage_reservations(id,site_id,user_id,feature,reserved_units,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')`,[id,siteId,actor.id,feature.slice(0,80),units]);
      return {id,reservedUnits:units};
    });
  }
  async reconcile(reservation:UsageReservation|null|undefined,actualUnits:number){
    if(!reservation)return;
    await this.db.pool.query(`UPDATE studio.ai_usage_reservations SET state='RECONCILED',actual_units=$2,reconciled_at=now() WHERE id=$1 AND state='RESERVED'`,[reservation.id,Math.max(0,Math.min(Math.floor(actualUnits||0),10_000_000))]);
  }
  async release(reservation:UsageReservation|null|undefined){
    if(!reservation)return;await this.db.pool.query("UPDATE studio.ai_usage_reservations SET state='RELEASED' WHERE id=$1 AND state='RESERVED'",[reservation.id]);
  }
}
