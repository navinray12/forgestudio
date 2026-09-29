import {z} from 'zod';
import type {Database} from './database.js';
import {parse,StudioError} from './validation.js';
import type {AIFeature,AIProvider,AIResult} from './ai.js';

export const AI_FEATURES=['PLANNER','EDITOR','COPY','CODE','REVIEWER','VISION','IMAGE','EMBEDDING'] as const;
const routeInput=z.object({
  feature:z.enum(AI_FEATURES),
  provider:z.enum(['openai','anthropic']),
  model:z.string().trim().min(1).max(160),
  fallbackModels:z.array(z.string().trim().min(1).max(200)).max(5).default([]),
  timeoutMs:z.number().int().min(1000).max(180000).default(30000),
  maxOutputTokens:z.number().int().min(64).max(100000).default(2000),
  enabled:z.boolean().default(true),
  dailyBudgetUnits:z.number().int().min(1000).max(1_000_000_000).nullable().default(null),
  workspaceRestrictions:z.array(z.string().uuid()).max(500).default([]),
}).strict();

function envProvider(feature:AIFeature){return (process.env[`AI_PROVIDER_${feature}`]||process.env.AI_PROVIDER_DEFAULT||'').toLowerCase();}
function envModel(feature:AIFeature){return process.env[`AI_MODEL_${feature}`]||'';}
function envFallbacks(feature:AIFeature){return (process.env[`AI_FALLBACK_MODELS_${feature}`]||'').split(',').map(v=>v.trim()).filter(Boolean);}
export function approvedModels(provider:string){
  const explicit=(process.env[`STUDIO_APPROVED_${provider.toUpperCase()}_MODELS`]||'').split(',').map(v=>v.trim()).filter(Boolean);
  const configured=AI_FEATURES.filter(feature=>envProvider(feature)===provider).map(feature=>envModel(feature)).filter(Boolean);
  return [...new Set([...explicit,...configured])];
}
export function credentialConfigured(provider:string){
  return provider==='openai'?!!process.env.OPENAI_API_KEY:provider==='anthropic'?!!process.env.ANTHROPIC_API_KEY:false;
}
export interface ResolvedAIRoute{
  feature:AIFeature;provider:'openai'|'anthropic';model:string;fallbackModels:string[];timeoutMs:number;maxOutputTokens:number;enabled:boolean;
  dailyBudgetUnits:number|null;workspaceRestrictions:string[];source:'DATABASE'|'ENVIRONMENT';
}
export async function resolveAIRoute(db:Database,feature:AIFeature):Promise<ResolvedAIRoute|null>{
  const result=await db.pool.query(`SELECT feature,provider,model,fallback_models AS "fallbackModels",timeout_ms AS "timeoutMs",max_output_tokens AS "maxOutputTokens",enabled,
    daily_budget_units AS "dailyBudgetUnits",workspace_restrictions AS "workspaceRestrictions"
    FROM studio.ai_model_routes WHERE feature=$1`,[feature]);
  const row=result.rows[0];
  if(row){
    if(!row.enabled)return null;
    return {feature,provider:row.provider,model:row.model,fallbackModels:Array.isArray(row.fallbackModels)?row.fallbackModels:[],timeoutMs:Number(row.timeoutMs),maxOutputTokens:Number(row.maxOutputTokens),enabled:true,dailyBudgetUnits:row.dailyBudgetUnits===null?null:Number(row.dailyBudgetUnits),workspaceRestrictions:Array.isArray(row.workspaceRestrictions)?row.workspaceRestrictions:[],source:'DATABASE'};
  }
  const provider=envProvider(feature),model=envModel(feature);
  if(!model||!['openai','anthropic'].includes(provider))return null;
  return {feature,provider:provider as 'openai'|'anthropic',model,fallbackModels:envFallbacks(feature),timeoutMs:30000,maxOutputTokens:2000,enabled:true,dailyBudgetUnits:null,workspaceRestrictions:[],source:'ENVIRONMENT'};
}

export class DatabaseRoutedProvider implements AIProvider{
  readonly name='routed';
  readonly model:string;
  constructor(private db:Database,private feature:AIFeature,private createProvider:(provider:string,model:string)=>AIProvider|null){this.model=feature;}
  async configured(){
    const route=await resolveAIRoute(this.db,this.feature);
    return !!route&&credentialConfigured(route.provider);
  }
  async describe(){
    const route=await resolveAIRoute(this.db,this.feature);
    return route?{...route,credentialConfigured:credentialConfigured(route.provider)}:{feature:this.feature,configured:false};
  }
  async generateStructured(input:{system:string;user:string;timeoutMs:number;maxOutputTokens?:number}):Promise<AIResult>{
    const route=await resolveAIRoute(this.db,this.feature);
    if(!route)throw new StudioError(`AI ${this.feature.toLowerCase()} routing is not configured`,503,'AI_NOT_CONFIGURED');
    const specs=[`${route.provider}:${route.model}`,...route.fallbackModels];
    let last:unknown;
    for(let i=0;i<specs.length;i++){
      const spec=specs[i],split=spec.indexOf(':'),provider=split>0?spec.slice(0,split):route.provider,model=split>0?spec.slice(split+1):spec;
      const candidate=this.createProvider(provider,model);
      if(!candidate){last=new StudioError(`Credential for ${provider} is not configured`,503,'AI_NOT_CONFIGURED');continue;}
      try{
        const value=await candidate.generateStructured({system:input.system,user:input.user,timeoutMs:Math.min(input.timeoutMs,route.timeoutMs),maxOutputTokens:Math.min(input.maxOutputTokens??route.maxOutputTokens,route.maxOutputTokens)});
        return {...value,provider:candidate.name,modelResolved:candidate.model};
      }catch(error){
        last=error;const code=String((error as any)?.code||'');
        if(i===specs.length-1||!['AI_PROVIDER_ERROR','UND_ERR_CONNECT_TIMEOUT','ETIMEDOUT','ECONNRESET'].includes(code))throw error;
      }
    }
    throw last??new StudioError('No configured AI provider is available',503,'AI_NOT_CONFIGURED');
  }
}

export async function getAIInfrastructure(){
  const {prisma}=await import('../../config/prisma.js');
  const rows=await prisma.$queryRawUnsafe<any[]>(`SELECT feature,provider,model,fallback_models AS "fallbackModels",timeout_ms AS "timeoutMs",max_output_tokens AS "maxOutputTokens",enabled,daily_budget_units AS "dailyBudgetUnits",workspace_restrictions AS "workspaceRestrictions",updated_at AS "updatedAt" FROM studio.ai_model_routes ORDER BY feature`);
  const healthRows=await prisma.$queryRawUnsafe<any[]>(`SELECT provider,status,latency_ms AS "latencyMs",error_code AS "errorCode",checked_at AS "checkedAt" FROM studio.ai_provider_health`);
  const health=new Map(healthRows.map(row=>[row.provider,row]));
  const map=new Map(rows.map(row=>[row.feature,row]));
  return {
    providers:[
      {provider:'openai',credentialConfigured:!!process.env.OPENAI_API_KEY,approvedModels:approvedModels('openai'),health:health.get('openai')??{status:process.env.OPENAI_API_KEY?'UNKNOWN':'UNCONFIGURED',latencyMs:null,errorCode:null,checkedAt:null}},
      {provider:'anthropic',credentialConfigured:!!process.env.ANTHROPIC_API_KEY,approvedModels:approvedModels('anthropic'),health:health.get('anthropic')??{status:process.env.ANTHROPIC_API_KEY?'UNKNOWN':'UNCONFIGURED',latencyMs:null,errorCode:null,checkedAt:null}},
    ],
    routes:AI_FEATURES.map(feature=>{
      const row=map.get(feature),provider=(row?.provider??envProvider(feature))||null,model=(row?.model??envModel(feature))||null;
      return {
        feature,
        provider,model,
        enabled:row?.enabled??!!model,
        fallbackModels:row?.fallbackModels??envFallbacks(feature),
        timeoutMs:Number(row?.timeoutMs??30000),
        maxOutputTokens:Number(row?.maxOutputTokens??2000),
        dailyBudgetUnits:row?.dailyBudgetUnits===null||row?.dailyBudgetUnits===undefined?null:Number(row.dailyBudgetUnits),
        workspaceRestrictions:Array.isArray(row?.workspaceRestrictions)?row.workspaceRestrictions:[],
        source:row?'DATABASE':'ENVIRONMENT',
        credentialConfigured:provider?credentialConfigured(provider):false,
      };
    }),
  };
}

function parseFallback(spec:string,defaultProvider:string){const split=spec.indexOf(':');return split>0?{provider:spec.slice(0,split),model:spec.slice(split+1)}:{provider:defaultProvider,model:spec};}
export async function checkAIProvider(actorId:string,provider:string){
  if(!['openai','anthropic'].includes(provider))throw new StudioError('Unsupported AI provider',400,'VALIDATION_ERROR');
  const configured=credentialConfigured(provider),started=Date.now();
  let status:'UNCONFIGURED'|'HEALTHY'|'DEGRADED'|'UNAVAILABLE'=configured?'UNAVAILABLE':'UNCONFIGURED',errorCode:string|null=null;
  if(configured){
    try{
      const url=provider==='openai'?'https://api.openai.com/v1/models':'https://api.anthropic.com/v1/models?limit=1';
      const headers=provider==='openai'?{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`}:{'x-api-key':String(process.env.ANTHROPIC_API_KEY),'anthropic-version':'2023-06-01'};
      const response=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(8000),headers});
      status=response.ok?'HEALTHY':response.status>=500?'UNAVAILABLE':'DEGRADED';if(!response.ok)errorCode=`HTTP_${response.status}`;
    }catch(error){status='UNAVAILABLE';errorCode=String((error as any)?.code||'PROBE_FAILED').slice(0,80);}
  }
  const latencyMs=configured?Date.now()-started:null,{prisma}=await import('../../config/prisma.js');
  await prisma.$executeRawUnsafe(`INSERT INTO studio.ai_provider_health(provider,status,latency_ms,error_code,checked_by) VALUES($1,$2,$3,$4,$5::uuid)
    ON CONFLICT(provider) DO UPDATE SET status=EXCLUDED.status,latency_ms=EXCLUDED.latency_ms,error_code=EXCLUDED.error_code,checked_by=EXCLUDED.checked_by,checked_at=now()`,provider,status,latencyMs,errorCode,actorId);
  await prisma.$executeRawUnsafe(`INSERT INTO studio.ai_control_audit(id,actor_id,action,target,details) VALUES(gen_random_uuid(),$1::uuid,'AI_PROVIDER_HEALTH_CHECK',$2,$3::jsonb)`,actorId,provider,JSON.stringify({status,latencyMs,errorCode}));
  return {provider,status,latencyMs,errorCode};
}
export async function setAIInfrastructureRoute(actorId:string,input:unknown){
  const b=parse(routeInput,input);
  if(!approvedModels(b.provider).includes(b.model))throw new StudioError('Model is not in the deployment-approved registry',400,'MODEL_NOT_APPROVED');
  for(const spec of b.fallbackModels){const parsed=parseFallback(spec,b.provider);if(!['openai','anthropic'].includes(parsed.provider)||!approvedModels(parsed.provider).includes(parsed.model))throw new StudioError(`Fallback model is not approved: ${spec}`,400,'MODEL_NOT_APPROVED');}
  const {prisma}=await import('../../config/prisma.js');
  await prisma.$transaction(async tx=>{
    await tx.$executeRawUnsafe(`INSERT INTO studio.ai_model_routes(feature,provider,model,fallback_models,timeout_ms,max_output_tokens,enabled,daily_budget_units,workspace_restrictions,updated_by)
      VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9::jsonb,$10::uuid)
      ON CONFLICT(feature) DO UPDATE SET provider=EXCLUDED.provider,model=EXCLUDED.model,fallback_models=EXCLUDED.fallback_models,timeout_ms=EXCLUDED.timeout_ms,max_output_tokens=EXCLUDED.max_output_tokens,enabled=EXCLUDED.enabled,daily_budget_units=EXCLUDED.daily_budget_units,workspace_restrictions=EXCLUDED.workspace_restrictions,updated_by=EXCLUDED.updated_by,updated_at=now()`,
      b.feature,b.provider,b.model,JSON.stringify(b.fallbackModels),b.timeoutMs,b.maxOutputTokens,b.enabled,b.dailyBudgetUnits,JSON.stringify(b.workspaceRestrictions),actorId);
    await tx.$executeRawUnsafe(`INSERT INTO studio.ai_control_audit(id,actor_id,action,target,details) VALUES(gen_random_uuid(),$1::uuid,'AI_ROUTE_UPDATED',$2,$3::jsonb)`,
      actorId,b.feature,JSON.stringify({provider:b.provider,model:b.model,fallbackModels:b.fallbackModels,timeoutMs:b.timeoutMs,maxOutputTokens:b.maxOutputTokens,enabled:b.enabled,dailyBudgetUnits:b.dailyBudgetUnits,workspaceRestrictionCount:b.workspaceRestrictions.length}));
  });
  return {route:b,credentialConfigured:credentialConfigured(b.provider)};
}
