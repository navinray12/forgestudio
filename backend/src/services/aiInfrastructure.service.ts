import {z} from 'zod';
import {pgPool} from '../config/prisma.js';
import {recordAuditLog} from './audit.service.js';

const FEATURES=['PLANNER','EDITOR','COPY','CODE','REVIEWER','VISION','IMAGE','EMBEDDING'] as const;
const PROVIDERS=['openai','anthropic'] as const;
const routeSchema=z.object({
  provider:z.enum(PROVIDERS),
  model:z.string().trim().min(1).max(160),
  fallbackModels:z.array(z.string().trim().min(1).max(200)).max(8).default([]),
  enabled:z.boolean().default(true),
  timeoutMs:z.number().int().min(1000).max(180000).default(45000),
  maxOutputTokens:z.number().int().min(128).max(64000).default(4000),
  dailyBudgetUnits:z.number().int().min(1000).max(1_000_000_000).nullable().default(null),
  workspaceRestrictions:z.array(z.string().uuid()).max(500).default([]),
}).strict();

function envModels(provider:string){
  const raw=process.env[`STUDIO_APPROVED_${provider.toUpperCase()}_MODELS`]||'';
  const configured=FEATURES.map(feature=>process.env[`AI_MODEL_${feature}`]).filter((x):x is string=>!!x);
  return [...new Set([...raw.split(',').map(x=>x.trim()).filter(Boolean),...configured])];
}
function providerCredentialConfigured(provider:string){
  return provider==='openai'?!!process.env.OPENAI_API_KEY:provider==='anthropic'?!!process.env.ANTHROPIC_API_KEY:false;
}
function envRoute(feature:string){
  const provider=(process.env[`AI_PROVIDER_${feature}`]||process.env.AI_PROVIDER_DEFAULT||'').toLowerCase();
  const model=process.env[`AI_MODEL_${feature}`]||'';
  const fallbackModels=(process.env[`AI_FALLBACK_MODELS_${feature}`]||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!PROVIDERS.includes(provider as any)||!model)return null;
  return {feature,provider,model,fallbackModels,enabled:true,timeoutMs:45000,maxOutputTokens:4000,dailyBudgetUnits:null,workspaceRestrictions:[],source:'environment'};
}
export async function getAiInfrastructure(){
  const db=await pgPool.query(`SELECT feature,provider,model,fallback_models AS "fallbackModels",enabled,timeout_ms AS "timeoutMs",max_output_tokens AS "maxOutputTokens",daily_budget_units AS "dailyBudgetUnits",workspace_restrictions AS "workspaceRestrictions",updated_at AS "updatedAt" FROM studio.ai_model_routes ORDER BY feature`);
  const byFeature=new Map(db.rows.map(row=>[row.feature,row]));
  const health=await pgPool.query(`SELECT provider,status,latency_ms AS "latencyMs",error_code AS "errorCode",checked_at AS "checkedAt" FROM studio.ai_provider_health`);
  const healthMap=new Map(health.rows.map(row=>[row.provider,row]));
  const providers=PROVIDERS.map(provider=>({provider,credentialConfigured:providerCredentialConfigured(provider),approvedModels:envModels(provider),health:healthMap.get(provider)??{provider,status:providerCredentialConfigured(provider)?'UNKNOWN':'UNCONFIGURED',latencyMs:null,errorCode:null,checkedAt:null}}));
  const routes=FEATURES.map(feature=>{const stored=byFeature.get(feature);return stored?{...stored,source:'database'}:envRoute(feature);});
  const usage=await pgPool.query(`SELECT provider,model_resolved AS model,count(*)::int AS requests,COALESCE(sum(COALESCE(input_units,0)+COALESCE(output_units,0)),0)::bigint AS units,round(avg(latency_ms))::int AS "avgLatencyMs",count(*) FILTER (WHERE status='SUCCEEDED')::int AS succeeded,count(*) FILTER (WHERE status='FAILED')::int AS failed FROM studio.ai_runs WHERE created_at>=now()-interval '24 hours' GROUP BY provider,model_resolved ORDER BY requests DESC LIMIT 100`);
  return {providers,routes,usage24h:usage.rows,features:FEATURES};
}
export async function updateAiRoute(adminUserId:string,feature:string,input:unknown){
  if(!FEATURES.includes(feature as any))throw Object.assign(new Error('Unsupported AI feature role'),{statusCode:400,code:'VALIDATION_ERROR'});
  const b=routeSchema.parse(input),approved=envModels(b.provider);
  if(!approved.includes(b.model))throw Object.assign(new Error('Model is not in the deployment-approved registry'),{statusCode:400,code:'MODEL_NOT_APPROVED'});
  for(const entry of b.fallbackModels){const [provider,model]=entry.includes(':')?entry.split(':',2):[b.provider,entry];if(!PROVIDERS.includes(provider as any)||!envModels(provider).includes(model))throw Object.assign(new Error(`Fallback model is not approved: ${entry}`),{statusCode:400,code:'MODEL_NOT_APPROVED'});}
  const r=await pgPool.query(`INSERT INTO studio.ai_model_routes(feature,provider,model,fallback_models,enabled,timeout_ms,max_output_tokens,daily_budget_units,workspace_restrictions,updated_by)
    VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9::jsonb,$10)
    ON CONFLICT(feature) DO UPDATE SET provider=EXCLUDED.provider,model=EXCLUDED.model,fallback_models=EXCLUDED.fallback_models,enabled=EXCLUDED.enabled,timeout_ms=EXCLUDED.timeout_ms,max_output_tokens=EXCLUDED.max_output_tokens,daily_budget_units=EXCLUDED.daily_budget_units,workspace_restrictions=EXCLUDED.workspace_restrictions,updated_by=EXCLUDED.updated_by,updated_at=now()
    RETURNING feature,provider,model,fallback_models AS "fallbackModels",enabled,timeout_ms AS "timeoutMs",max_output_tokens AS "maxOutputTokens",daily_budget_units AS "dailyBudgetUnits",workspace_restrictions AS "workspaceRestrictions",updated_at AS "updatedAt"`,
    [feature,b.provider,b.model,JSON.stringify(b.fallbackModels),b.enabled,b.timeoutMs,b.maxOutputTokens,b.dailyBudgetUnits,JSON.stringify(b.workspaceRestrictions),adminUserId]);
  await recordAuditLog({userId:adminUserId,action:'AI_MODEL_ROUTE_UPDATED',targetResource:`ai-route:${feature}`,details:{feature,provider:b.provider,model:b.model,enabled:b.enabled,fallbackCount:b.fallbackModels.length,timeoutMs:b.timeoutMs,maxOutputTokens:b.maxOutputTokens,dailyBudgetUnits:b.dailyBudgetUnits,workspaceRestrictionCount:b.workspaceRestrictions.length}});
  return r.rows[0];
}
async function probe(provider:'openai'|'anthropic'){
  const configured=providerCredentialConfigured(provider);if(!configured)return {status:'UNCONFIGURED' as const,latencyMs:null,errorCode:null};
  const start=Date.now();
  try{
    const url=provider==='openai'?'https://api.openai.com/v1/models':'https://api.anthropic.com/v1/models?limit=1';
    const headers=provider==='openai'?{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`}:{'x-api-key':String(process.env.ANTHROPIC_API_KEY),'anthropic-version':'2023-06-01'};
    const r=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(8000),headers});
    const latencyMs=Date.now()-start;
    if(r.ok)return {status:'HEALTHY' as const,latencyMs,errorCode:null};
    return {status:r.status>=500?'UNAVAILABLE' as const:'DEGRADED' as const,latencyMs,errorCode:`HTTP_${r.status}`};
  }catch(error){return {status:'UNAVAILABLE' as const,latencyMs:Date.now()-start,errorCode:(error as any)?.code||'PROBE_FAILED'};}
}
export async function checkAiProvider(adminUserId:string,provider:string){
  if(!PROVIDERS.includes(provider as any))throw Object.assign(new Error('Unsupported AI provider'),{statusCode:400,code:'VALIDATION_ERROR'});
  const result=await probe(provider as any);
  await pgPool.query(`INSERT INTO studio.ai_provider_health(provider,status,latency_ms,error_code,checked_by) VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(provider) DO UPDATE SET status=EXCLUDED.status,latency_ms=EXCLUDED.latency_ms,error_code=EXCLUDED.error_code,checked_by=EXCLUDED.checked_by,checked_at=now()`,[provider,result.status,result.latencyMs,result.errorCode,adminUserId]);
  await recordAuditLog({userId:adminUserId,action:'AI_PROVIDER_HEALTH_CHECK',targetResource:`ai-provider:${provider}`,details:{provider,status:result.status,latencyMs:result.latencyMs,errorCode:result.errorCode}});
  return {provider,...result};
}
