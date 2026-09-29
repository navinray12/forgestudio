import {z} from 'zod';
import {prisma} from '../../config/prisma.js';
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
}).strict();

function envProvider(feature:AIFeature){return (process.env[`AI_PROVIDER_${feature}`]||process.env.AI_PROVIDER_DEFAULT||'').toLowerCase();}
function envModel(feature:AIFeature){return process.env[`AI_MODEL_${feature}`]||'';}
function envFallbacks(feature:AIFeature){return (process.env[`AI_FALLBACK_MODELS_${feature}`]||'').split(',').map(v=>v.trim()).filter(Boolean);}
export function credentialConfigured(provider:string){
  return provider==='openai'?!!process.env.OPENAI_API_KEY:provider==='anthropic'?!!process.env.ANTHROPIC_API_KEY:false;
}
export interface ResolvedAIRoute{
  feature:AIFeature;provider:'openai'|'anthropic';model:string;fallbackModels:string[];timeoutMs:number;maxOutputTokens:number;enabled:boolean;source:'DATABASE'|'ENVIRONMENT';
}
export async function resolveAIRoute(db:Database,feature:AIFeature):Promise<ResolvedAIRoute|null>{
  const result=await db.pool.query(`SELECT feature,provider,model,fallback_models AS "fallbackModels",timeout_ms AS "timeoutMs",max_output_tokens AS "maxOutputTokens",enabled
    FROM studio.ai_model_routes WHERE feature=$1`,[feature]);
  const row=result.rows[0];
  if(row){
    if(!row.enabled)return null;
    return {feature,provider:row.provider,model:row.model,fallbackModels:Array.isArray(row.fallbackModels)?row.fallbackModels:[],timeoutMs:Number(row.timeoutMs),maxOutputTokens:Number(row.maxOutputTokens),enabled:true,source:'DATABASE'};
  }
  const provider=envProvider(feature),model=envModel(feature);
  if(!model||!['openai','anthropic'].includes(provider))return null;
  return {feature,provider:provider as 'openai'|'anthropic',model,fallbackModels:envFallbacks(feature),timeoutMs:30000,maxOutputTokens:2000,enabled:true,source:'ENVIRONMENT'};
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
  const rows=await prisma.$queryRawUnsafe<any[]>(`SELECT feature,provider,model,fallback_models AS "fallbackModels",timeout_ms AS "timeoutMs",max_output_tokens AS "maxOutputTokens",enabled,updated_at AS "updatedAt" FROM studio.ai_model_routes ORDER BY feature`);
  const map=new Map(rows.map(row=>[row.feature,row]));
  return {
    providers:[
      {provider:'openai',credentialConfigured:!!process.env.OPENAI_API_KEY,health:process.env.OPENAI_API_KEY?'CONFIGURED':'MISSING_CREDENTIAL'},
      {provider:'anthropic',credentialConfigured:!!process.env.ANTHROPIC_API_KEY,health:process.env.ANTHROPIC_API_KEY?'CONFIGURED':'MISSING_CREDENTIAL'},
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
        source:row?'DATABASE':'ENVIRONMENT',
        credentialConfigured:provider?credentialConfigured(provider):false,
      };
    }),
  };
}
export async function setAIInfrastructureRoute(actorId:string,input:unknown){
  const b=parse(routeInput,input);
  await prisma.$transaction(async tx=>{
    await tx.$executeRawUnsafe(`INSERT INTO studio.ai_model_routes(feature,provider,model,fallback_models,timeout_ms,max_output_tokens,enabled,updated_by)
      VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8::uuid)
      ON CONFLICT(feature) DO UPDATE SET provider=EXCLUDED.provider,model=EXCLUDED.model,fallback_models=EXCLUDED.fallback_models,timeout_ms=EXCLUDED.timeout_ms,max_output_tokens=EXCLUDED.max_output_tokens,enabled=EXCLUDED.enabled,updated_by=EXCLUDED.updated_by,updated_at=now()`,
      b.feature,b.provider,b.model,JSON.stringify(b.fallbackModels),b.timeoutMs,b.maxOutputTokens,b.enabled,actorId);
    await tx.$executeRawUnsafe(`INSERT INTO studio.ai_control_audit(id,actor_id,action,target,details) VALUES(gen_random_uuid(),$1::uuid,'AI_ROUTE_UPDATED',$2,$3::jsonb)`,
      actorId,b.feature,JSON.stringify({provider:b.provider,model:b.model,fallbackModels:b.fallbackModels,timeoutMs:b.timeoutMs,maxOutputTokens:b.maxOutputTokens,enabled:b.enabled}));
  });
  return {route:b,credentialConfigured:credentialConfigured(b.provider)};
}
