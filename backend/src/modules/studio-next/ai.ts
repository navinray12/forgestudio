import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database,type Actor } from './database.js';
import { DomainCommands } from './commands.js';
import { CmsCommands } from './cms-commands.js';
import { FeaturePolicy,AiGovernance,type Feature,type UsageReservation } from './governance.js';
import { parse,uuid,digest,designOnly,StudioError,fieldsSchema } from './validation.js';
import { DatabaseRoutedProvider } from './ai-control.js';
import { COPY_EDIT_PROMPT,SECTION_PROMPT,PAGE_PROMPT,SITE_PLAN_PROMPT,SITE_BUILD_PROMPT,CMS_PROMPT } from './ai-prompts.js';

export interface AIUsage { inputUnits?:number; outputUnits?:number; }
export interface AIResult { value:unknown; usage?:AIUsage; provider?:string; modelResolved?:string; }
export interface AIProvider {
  readonly name:string;
  readonly model:string;
  generateStructured(input:{system:string;user:string;timeoutMs:number;maxOutputTokens?:number}):Promise<AIResult>;
}
function textFromOpenAI(payload:any):string{
  if(typeof payload?.output_text==='string')return payload.output_text;
  for(const item of payload?.output??[])for(const part of item?.content??[])if(typeof part?.text==='string')return part.text;
  throw new Error('Provider returned no text output');
}
function parseJsonText(text:string):unknown{
  const trimmed=text.trim().replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'');
  return JSON.parse(trimmed);
}
export class OpenAIProvider implements AIProvider{
  readonly name='openai';
  constructor(readonly model:string,private apiKey:string){}
  async generateStructured(input:{system:string;user:string;timeoutMs:number;maxOutputTokens?:number}):Promise<AIResult>{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',redirect:'error',signal:AbortSignal.timeout(input.timeoutMs),headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:this.model,input:[{role:'system',content:[{type:'input_text',text:input.system}]},{role:'user',content:[{type:'input_text',text:input.user}]}],max_output_tokens:input.maxOutputTokens??800})});
    const p=await r.json().catch(()=>({}));
    if(!r.ok)throw new StudioError('AI provider rejected the request',502,'AI_PROVIDER_ERROR');
    return {value:parseJsonText(textFromOpenAI(p)),usage:{inputUnits:p.usage?.input_tokens,outputUnits:p.usage?.output_tokens}};
  }
}
export class AnthropicProvider implements AIProvider{
  readonly name='anthropic';
  constructor(readonly model:string,private apiKey:string){}
  async generateStructured(input:{system:string;user:string;timeoutMs:number;maxOutputTokens?:number}):Promise<AIResult>{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',redirect:'error',signal:AbortSignal.timeout(input.timeoutMs),headers:{'x-api-key':this.apiKey,'anthropic-version':'2023-06-01','Content-Type':'application/json'},body:JSON.stringify({model:this.model,max_tokens:input.maxOutputTokens??800,system:input.system,messages:[{role:'user',content:input.user}]})});
    const p=await r.json().catch(()=>({}));
    if(!r.ok)throw new StudioError('AI provider rejected the request',502,'AI_PROVIDER_ERROR');
    const text=(p.content??[]).filter((x:any)=>x?.type==='text').map((x:any)=>x.text).join('');
    return {value:parseJsonText(text),usage:{inputUnits:p.usage?.input_tokens,outputUnits:p.usage?.output_tokens}};
  }
}

export type AIFeature='PLANNER'|'EDITOR'|'COPY'|'CODE'|'REVIEWER'|'VISION'|'IMAGE'|'EMBEDDING';
export interface AIModelConfig {
  feature:AIFeature; provider:'openai'|'anthropic'; model:string; enabled:boolean;
  modalities:string[]; structuredOutput:boolean; toolSupport:boolean; contextLimit?:number;
  inputMicrousdPerMillion?:number; outputMicrousdPerMillion?:number; fallbackModels:string[];
}
function modelEnv(feature:AIFeature){return process.env[`AI_MODEL_${feature}`]||'';}
function providerEnv(feature:AIFeature){return (process.env[`AI_PROVIDER_${feature}`]||process.env.AI_PROVIDER_DEFAULT||'').toLowerCase();}
function fallbackEnv(feature:AIFeature){return (process.env[`AI_FALLBACK_MODELS_${feature}`]||'').split(',').map(x=>x.trim()).filter(Boolean);}
export class AIModelRegistry {
  readonly models:AIModelConfig[];
  constructor(models?:AIModelConfig[]){
    this.models=models??(['PLANNER','EDITOR','COPY','CODE','REVIEWER','VISION','IMAGE','EMBEDDING'] as AIFeature[]).flatMap(feature=>{
      const provider=providerEnv(feature),model=modelEnv(feature);
      if(!model||!['openai','anthropic'].includes(provider))return [];
      return [{feature,provider:provider as 'openai'|'anthropic',model,enabled:true,modalities:['text'],structuredOutput:true,toolSupport:false,fallbackModels:fallbackEnv(feature)}];
    });
  }
  forFeature(feature:AIFeature){return this.models.filter(x=>x.feature===feature&&x.enabled);}
  publicStatus(){return this.models.map(({feature,provider,model,enabled,modalities,structuredOutput,toolSupport,contextLimit,fallbackModels})=>({feature,provider,model,enabled,modalities,structuredOutput,toolSupport,contextLimit,fallbackModels}));}
}
function providerFor(provider:string,model:string):AIProvider|null{
  if(provider==='openai'&&process.env.OPENAI_API_KEY)return new OpenAIProvider(model,process.env.OPENAI_API_KEY);
  if(provider==='anthropic'&&process.env.ANTHROPIC_API_KEY)return new AnthropicProvider(model,process.env.ANTHROPIC_API_KEY);
  return null;
}
class FallbackStructuredProvider implements AIProvider{
  readonly name:string; readonly model:string;
  constructor(private candidates:AIProvider[]){this.name=candidates[0]?.name??'unconfigured';this.model=candidates[0]?.model??'unconfigured';}
  async generateStructured(input:{system:string;user:string;timeoutMs:number;maxOutputTokens?:number}):Promise<AIResult>{
    let last:unknown;
    for(let index=0;index<this.candidates.length;index++){
      const candidate=this.candidates[index];
      try{const value=await candidate.generateStructured(input);return {...value,provider:candidate.name,modelResolved:candidate.model};}
      catch(error){last=error;const code=(error as any)?.code;if(index===this.candidates.length-1||!['AI_PROVIDER_ERROR','UND_ERR_CONNECT_TIMEOUT','ETIMEDOUT','ECONNRESET'].includes(String(code)))throw error;}
    }
    throw last;
  }
}
export function configuredProvider(feature:AIFeature,registry=new AIModelRegistry()):AIProvider|null{
  const config=registry.forFeature(feature)[0];if(!config)return null;
  const primary=providerFor(config.provider,config.model);if(!primary)return null;
  const fallbacks=config.fallbackModels.map(spec=>{const [provider,model]=spec.includes(':')?spec.split(':',2):[config.provider,spec];return providerFor(provider,model);}).filter((x):x is AIProvider=>!!x);
  return new FallbackStructuredProvider([primary,...fallbacks]);
}
export function databaseConfiguredProvider(db:Database,feature:AIFeature):AIProvider{
  return new DatabaseRoutedProvider(db,feature,providerFor);
}
export function configuredCopyProvider():AIProvider|null{return configuredProvider('COPY');}
const proposalInput=z.object({
  elementId:z.string().min(1).max(150),
  field:z.enum(['content','text','alt']).default('content'),
  instruction:z.string().trim().min(2).max(2000),
}).strict();
const providerOutput=z.object({replacement:z.string().max(20000),rationale:z.string().max(1000).default('')}).strict();
const sectionInput=z.object({instruction:z.string().trim().min(3).max(3000),afterId:z.string().min(1).max(150).nullable().default(null)}).strict();
const sectionOutput=z.object({section:z.object({id:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,149}$/),type:z.literal('section'),children:z.array(z.record(z.string(),z.unknown())).max(30).default([]),styles:z.record(z.string(),z.union([z.string(),z.number(),z.null()])).optional(),attributes:z.record(z.string(),z.string()).optional()}).strict(),rationale:z.string().max(1000).default('')}).strict();
const generatedPage=z.object({
  id:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,149}$/),name:z.string().trim().min(1).max(120),
  slug:z.string().min(1).max(180).regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/),
  elements:z.array(z.record(z.string(),z.unknown())).max(500),pageSettings:z.record(z.string(),z.unknown()).default({}),
  customCss:z.string().max(50000).optional(),
}).strict();
const pageInput=z.object({instruction:z.string().trim().min(3).max(4000)}).strict();
const pageOutput=z.object({page:generatedPage,rationale:z.string().max(1000).default('')}).strict();
const siteInput=z.object({instruction:z.string().trim().min(3).max(5000)}).strict();
const sitePlanOutput=z.object({
  siteName:z.string().trim().min(1).max(120),
  pages:z.array(z.object({id:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,149}$/),name:z.string().trim().min(1).max(120),slug:z.string().min(1).max(180).regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/),purpose:z.string().max(500)}).strict()).min(2).max(8),
  designSystem:z.object({variables:z.array(z.record(z.string(),z.unknown())).max(100),classes:z.array(z.record(z.string(),z.unknown())).max(100)}).strict(),
}).strict();
const siteBuildOutput=z.object({pages:z.array(generatedPage).min(2).max(8)}).strict();
const cmsInput=z.object({instruction:z.string().trim().min(3).max(4000)}).strict();
const cmsOutput=z.object({
  collection:z.object({name:z.string().trim().min(1).max(120),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),fields:fieldsSchema}).strict(),
  items:z.array(z.object({name:z.string().trim().min(1).max(200),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),locale:z.string().default('en'),fields:z.record(z.string(),z.unknown())}).strict()).max(20).default([]),
  rationale:z.string().max(1000).default(''),
}).strict();
const seoOutput=z.object({
  title:z.string().trim().min(1).max(70),
  description:z.string().trim().min(1).max(200),
  canonical:z.string().url().max(2000).nullable().default(null),
  robotsIndex:z.boolean().default(true),
  robotsFollow:z.boolean().default(true),
  openGraph:z.object({title:z.string().max(100).default(''),description:z.string().max(250).default(''),image:z.string().url().max(2000).nullable().default(null)}).strict().default({title:'',description:'',image:null}),
  twitter:z.object({title:z.string().max(100).default(''),description:z.string().max(250).default(''),image:z.string().url().max(2000).nullable().default(null)}).strict().default({title:'',description:'',image:null}),
  structuredData:z.record(z.string(),z.unknown()).nullable().default(null),
  rationale:z.string().max(1000).default('')
}).strict();



function pageIds(value:any,result=new Set<string>()):Set<string>{
  if(Array.isArray(value)){for(const child of value)pageIds(child,result);return result;}
  if(!value||typeof value!=='object')return result;
  if(typeof value.id==='string'){if(result.has(value.id))throw new StudioError('Generated content contains duplicate stable IDs',400,'DUPLICATE_ELEMENT_ID');result.add(value.id);}
  for(const child of Object.values(value))pageIds(child,result);return result;
}
function validateGeneratedPages(pages:any[]){
  const ids=new Set<string>(),slugs=new Set<string>();
  for(const page of pages){
    if(ids.has(page.id)||slugs.has(page.slug))throw new StudioError('Generated pages require unique IDs and slugs',400,'DUPLICATE_PAGE');
    ids.add(page.id);slugs.add(page.slug);pageIds(page.elements);
  }
}
function findUnique(value:any,id:string,result:any[]=[]):any[]{
  if(!value||typeof value!=='object')return result;
  if(value.id===id)result.push(value);
  for(const child of Object.values(value))findUnique(child,id,result);
  return result;
}
export class AiOrchestrator{
  constructor(private db:Database,private commands:DomainCommands,private provider:AIProvider|null,private sectionProvider:AIProvider|null=provider,private plannerProvider:AIProvider|null=sectionProvider,private pageProvider:AIProvider|null=sectionProvider,private cmsCommands:CmsCommands|null=null,private featurePolicy?:FeaturePolicy,private governance?:AiGovernance){}
  private async begin(actor:Actor,siteId:string,flag:Feature,feature:string,estimate:number):Promise<UsageReservation|null>{
    if(this.featurePolicy)await this.featurePolicy.assert(siteId,flag);
    return this.governance?await this.governance.reserve(actor,siteId,feature,estimate):null;
  }
  private usage(...values:(AIUsage|undefined)[]){return values.reduce((sum,value)=>sum+(value?.inputUnits??0)+(value?.outputUnits??0),0);}
  private async success(reservation:UsageReservation|null|undefined,...values:(AIUsage|undefined)[]){if(this.governance)await this.governance.reconcile(reservation,this.usage(...values));}
  private async failed(reservation:UsageReservation|null|undefined){if(this.governance)await this.governance.release(reservation);}

  async status(siteId:string){
    const flags=this.featurePolicy?await this.featurePolicy.snapshot(siteId):{} as any;
    const enabled=(feature:Feature)=>flags[feature]??true;
    const configured=async(provider:AIProvider|null)=>provider?typeof (provider as any).configured==='function'?await (provider as any).configured():true:false;
    const [copyOk,sectionOk,pageOk,plannerOk]=await Promise.all([configured(this.provider),configured(this.sectionProvider),configured(this.pageProvider),configured(this.plannerProvider)]);
    return {configured:(copyOk&&enabled('AI_COPY'))||(sectionOk&&enabled('AI_SECTION_GENERATION'))||(pageOk&&enabled('AI_PAGE_GENERATION'))||(plannerOk&&pageOk&&enabled('AI_SITE_GENERATION'))||(plannerOk&&!!this.cmsCommands&&enabled('AI_CMS'))||(copyOk&&enabled('AI_SEO')),features:{copy:{configured:copyOk&&enabled('AI_COPY'),provider:this.provider?.name??null,model:this.provider?.model??null},section:{configured:sectionOk&&enabled('AI_SECTION_GENERATION'),provider:this.sectionProvider?.name??null,model:this.sectionProvider?.model??null},page:{configured:pageOk&&enabled('AI_PAGE_GENERATION'),provider:this.pageProvider?.name??null,model:this.pageProvider?.model??null},site:{configured:plannerOk&&pageOk&&enabled('AI_SITE_GENERATION'),planner:this.plannerProvider?.model??null,editor:this.pageProvider?.model??null},cms:{configured:plannerOk&&!!this.cmsCommands&&enabled('AI_CMS'),provider:this.plannerProvider?.name??null,model:this.plannerProvider?.model??null},seo:{configured:copyOk&&enabled('AI_SEO'),provider:this.provider?.name??null,model:this.provider?.model??null}},registry:new AIModelRegistry().publicStatus(),flags};
  }
  async listChanges(actor:Actor,siteId:string){
    return this.db.tx(async c=>{await this.db.site(c,actor,siteId,'VIEW');const r=await c.query(`SELECT id,name,status,base_hash AS "baseHash",result_hash AS "resultHash",created_at AS "createdAt",applied_at AS "appliedAt" FROM studio.change_sets WHERE site_id=$1 ORDER BY created_at DESC LIMIT 50`,[siteId]);return {changes:r.rows};});
  }
  async proposeCopy(actor:Actor,siteId:string,input:unknown){
    if(!this.provider)throw new StudioError('AI copy editing is not configured. Configure an approved provider and AI_MODEL_COPY.',503,'AI_NOT_CONFIGURED');
    const b=parse(proposalInput,input),started=Date.now(),runId=randomUUID();
    const context=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT');return {site,design:designOnly(site.editorData)};});
    const matches=findUnique(context.design,b.elementId);
    if(matches.length!==1)throw new StudioError(matches.length?'Element ID is ambiguous':'Element not found',matches.length?409:404,'ELEMENT_NOT_UNIQUE');
    const current=matches[0]?.[b.field];
    if(typeof current!=='string')throw new StudioError(`Selected element does not have editable ${b.field} text`,400,'NOT_TEXT');
    const system=COPY_EDIT_PROMPT.system;
    const user=JSON.stringify({instruction:b.instruction,field:b.field,currentText:current,siteName:context.site.name});
    const contextHash=digest({siteId,elementId:b.elementId,field:b.field,currentText:current,instruction:b.instruction});
    const reservation=await this.begin(actor,siteId,'AI_COPY','COPY_EDIT',2000);
    try{
      const generated=await this.provider.generateStructured({system,user,timeoutMs:30000});
      const output=parse(providerOutput,generated.value),changeSetId=randomUUID();
      const command={type:'SET_ELEMENT_TEXT',elementId:b.elementId,field:b.field,value:output.replacement};
      await this.db.tx(async c=>{
        const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT');
        await c.query(`INSERT INTO studio.change_sets(id,site_id,actor_id,source,name,status,base_hash,commands) VALUES($1,$2,$3,'AI',$4,'PROPOSED',$5,$6::jsonb)`,[changeSetId,siteId,actor.id,`AI copy: ${b.instruction.slice(0,120)}`,digest(context.design),JSON.stringify([command])]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status,changeset_id) VALUES($1,$2,$3,$4,'COPY_EDIT',$5,$6,$7,$8,$9,$10,$11,$12,'SUCCEEDED',$13)`,[runId,siteId,site.workspaceId,actor.id,generated.provider??this.provider!.name,this.provider!.model,generated.modelResolved??this.provider!.model,COPY_EDIT_PROMPT.version,contextHash,generated.usage?.inputUnits??null,generated.usage?.outputUnits??null,Date.now()-started,changeSetId]);
        await this.db.audit(c,actor,site,'ai.copy_proposed',b.elementId);
      });
      await this.success(reservation,generated.usage);
      return {changeSetId,baseHash:digest(context.design),elementId:b.elementId,field:b.field,current,replacement:output.replacement,rationale:output.rationale,provider:generated.provider??this.provider.name,model:generated.modelResolved??this.provider.model};
    }catch(error){
      await this.failed(reservation);
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,latency_ms,status,error_code) VALUES($1,$2,$3,$4,'COPY_EDIT',$5,$6,$6,$7,$8,$9,'FAILED',$10)`,[runId,siteId,context.site.workspaceId,actor.id,this.provider.name,this.provider.model,COPY_EDIT_PROMPT.version,contextHash,Date.now()-started,(error as any)?.code||'AI_FAILED']).catch(()=>undefined);
      if(!(error instanceof StudioError)&&(error as any)?.code==='AI_PROVIDER_ERROR')throw new StudioError('AI provider failed',502,'AI_PROVIDER_ERROR');
      throw error;
    }
  }
  async proposeSection(actor:Actor,siteId:string,input:unknown){
    if(!this.sectionProvider)throw new StudioError('AI section generation is not configured',503,'AI_NOT_CONFIGURED');
    const b=parse(sectionInput,input),started=Date.now(),runId=randomUUID();
    const context=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');return {site,design:designOnly(site.editorData)};});
    if(b.afterId&&findUnique(context.design,b.afterId).length!==1)throw new StudioError('Insertion anchor is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');
    const system=SECTION_PROMPT.system;
    const user=JSON.stringify({instruction:b.instruction,insertionAfter:b.afterId,existingTopLevel:(context.design.elements as any[]|undefined)?.map(x=>({id:x?.id,type:x?.type,styles:x?.styles}))??[]});
    const contextHash=digest({siteId,instruction:b.instruction,afterId:b.afterId,designHash:digest(context.design)});
    const reservation=await this.begin(actor,siteId,'AI_SECTION_GENERATION','SECTION_GENERATION',6000);
    try{
      const generated=await this.sectionProvider.generateStructured({system,user,timeoutMs:45000}),output=parse(sectionOutput,generated.value),changeSetId=randomUUID();
      const command={type:'ADD_ELEMENT',parentId:null,afterId:b.afterId,element:output.section};
      await this.db.tx(async c=>{
        const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');
        await c.query(`INSERT INTO studio.change_sets(id,site_id,actor_id,source,name,status,base_hash,commands) VALUES($1,$2,$3,'AI',$4,'PROPOSED',$5,$6::jsonb)`,[changeSetId,siteId,actor.id,`AI section: ${b.instruction.slice(0,120)}`,digest(context.design),JSON.stringify([command])]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status,changeset_id) VALUES($1,$2,$3,$4,'SECTION_GENERATION',$5,$6,$7,$8,$9,$10,$11,$12,'SUCCEEDED',$13)`,[runId,siteId,site.workspaceId,actor.id,generated.provider??this.sectionProvider!.name,this.sectionProvider!.model,generated.modelResolved??this.sectionProvider!.model,SECTION_PROMPT.version,contextHash,generated.usage?.inputUnits??null,generated.usage?.outputUnits??null,Date.now()-started,changeSetId]);
        await this.db.audit(c,actor,site,'ai.section_proposed',output.section.id);
      });
      await this.success(reservation,generated.usage);
      return {changeSetId,baseHash:digest(context.design),section:output.section,rationale:output.rationale,provider:generated.provider??this.sectionProvider.name,model:generated.modelResolved??this.sectionProvider.model};
    }catch(error){
      await this.failed(reservation);
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,latency_ms,status,error_code) VALUES($1,$2,$3,$4,'SECTION_GENERATION',$5,$6,$6,$7,$8,$9,'FAILED',$10)`,[runId,siteId,context.site.workspaceId,actor.id,this.sectionProvider.name,this.sectionProvider.model,SECTION_PROMPT.version,contextHash,Date.now()-started,(error as any)?.code||'AI_FAILED']).catch(()=>undefined);throw error;
    }
  }
  async proposePage(actor:Actor,siteId:string,input:unknown){
    if(!this.pageProvider)throw new StudioError('AI page generation is not configured',503,'AI_NOT_CONFIGURED');
    const b=parse(pageInput,input),started=Date.now(),runId=randomUUID();
    const context=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');return {site,design:designOnly(site.editorData)};});
    const user=JSON.stringify({instruction:b.instruction,siteName:context.site.name,existingPages:(context.design.pages as any[]|undefined)?.map(p=>({id:p.id,name:p.name,slug:p.slug}))??[],designSystem:{variables:context.design.globalVariables??[],classes:context.design.globalClasses??[]}});
    const contextHash=digest({siteId,instruction:b.instruction,designHash:digest(context.design)});
    const reservation=await this.begin(actor,siteId,'AI_PAGE_GENERATION','PAGE_GENERATION',12000);
    try{
      const generated=await this.pageProvider.generateStructured({system:PAGE_PROMPT.system,user,timeoutMs:60000,maxOutputTokens:5000});
      const output=parse(pageOutput,generated.value);validateGeneratedPages([output.page]);
      const existing=(context.design.pages as any[]|undefined)??[];
      if(existing.some(p=>p.id===output.page.id||p.slug===output.page.slug))throw new StudioError('Generated page conflicts with an existing page',409,'PAGE_CONFLICT');
      const changeSetId=randomUUID(),commands=[{type:'CREATE_PAGE',page:output.page}];
      await this.db.tx(async c=>{
        const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');
        await c.query(`INSERT INTO studio.change_sets(id,site_id,actor_id,source,name,status,base_hash,commands) VALUES($1,$2,$3,'AI',$4,'PROPOSED',$5,$6::jsonb)`,[changeSetId,siteId,actor.id,`AI page: ${output.page.name}`,digest(context.design),JSON.stringify(commands)]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status,changeset_id) VALUES($1,$2,$3,$4,'PAGE_GENERATION',$5,$6,$7,$8,$9,$10,$11,$12,'SUCCEEDED',$13)`,[runId,siteId,site.workspaceId,actor.id,generated.provider??this.pageProvider!.name,this.pageProvider!.model,generated.modelResolved??this.pageProvider!.model,PAGE_PROMPT.version,contextHash,generated.usage?.inputUnits??null,generated.usage?.outputUnits??null,Date.now()-started,changeSetId]);
        await this.db.audit(c,actor,site,'ai.page_proposed',output.page.id);
      });
      await this.success(reservation,generated.usage);
      return {changeSetId,baseHash:digest(context.design),page:output.page,rationale:output.rationale,provider:generated.provider??this.pageProvider.name,model:generated.modelResolved??this.pageProvider.model};
    }catch(error){
      await this.failed(reservation);
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,latency_ms,status,error_code) VALUES($1,$2,$3,$4,'PAGE_GENERATION',$5,$6,$6,$7,$8,$9,'FAILED',$10)`,[runId,siteId,context.site.workspaceId,actor.id,this.pageProvider.name,this.pageProvider.model,PAGE_PROMPT.version,contextHash,Date.now()-started,(error as any)?.code||'AI_FAILED']).catch(()=>undefined);throw error;
    }
  }
  async proposeSite(actor:Actor,siteId:string,input:unknown){
    if(!this.plannerProvider||!this.pageProvider)throw new StudioError('AI site generation requires planner and editor models',503,'AI_NOT_CONFIGURED');
    const b=parse(siteInput,input),started=Date.now(),planRunId=randomUUID(),buildRunId=randomUUID();
    const context=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');return {site,design:designOnly(site.editorData)};});
    const existingPages=(context.design.pages as any[]|undefined)??[];
    if(existingPages.length)throw new StudioError('Full-site generation is available only before pages exist. Generate individual pages for an existing site.',409,'SITE_HAS_PAGES');
    const contextHash=digest({siteId,instruction:b.instruction,designHash:digest(context.design)});
    const reservation=await this.begin(actor,siteId,'AI_SITE_GENERATION','SITE_GENERATION',25000);
    try{
      const planned=await this.plannerProvider.generateStructured({system:SITE_PLAN_PROMPT.system,user:JSON.stringify({instruction:b.instruction,siteName:context.site.name}),timeoutMs:45000,maxOutputTokens:2500});
      const plan=parse(sitePlanOutput,planned.value);
      if(new Set(plan.pages.map(p=>p.id)).size!==plan.pages.length||new Set(plan.pages.map(p=>p.slug)).size!==plan.pages.length||plan.pages.filter(p=>p.slug==='/').length!==1)throw new StudioError('AI site plan contains duplicate pages or an invalid home route',400,'INVALID_SITE_PLAN');
      if(plan.designSystem.variables.some(v=>typeof v.id!=='string')||plan.designSystem.classes.some(v=>typeof v.id!=='string'))throw new StudioError('AI design system entries require stable IDs',400,'INVALID_DESIGN_SYSTEM');
      const built=await this.pageProvider.generateStructured({system:SITE_BUILD_PROMPT.system,user:JSON.stringify({instruction:b.instruction,siteName:plan.siteName,pages:plan.pages,designSystem:plan.designSystem}),timeoutMs:90000,maxOutputTokens:12000});
      const build=parse(siteBuildOutput,built.value);validateGeneratedPages(build.pages);
      const plannedById=new Map(plan.pages.map(p=>[p.id,p]));
      if(build.pages.length!==plan.pages.length||build.pages.some(p=>{const expected=plannedById.get(p.id);return !expected||expected.name!==p.name||expected.slug!==p.slug;}))throw new StudioError('Generated pages do not match the approved site plan',400,'SITE_PLAN_MISMATCH');
      const home=plan.pages.find(p=>p.slug==='/')!,changeSetId=randomUUID();
      const commands:any[]=[{type:'SET_DESIGN_SYSTEM',variables:plan.designSystem.variables,classes:plan.designSystem.classes},...build.pages.map(page=>({type:'CREATE_PAGE',page:{...page,slug:page.id===home.id?'/':page.slug}})),{type:'SET_HOME_PAGE',pageId:home.id}];
      await this.db.tx(async c=>{
        const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');
        await c.query(`INSERT INTO studio.change_sets(id,site_id,actor_id,source,name,status,base_hash,commands) VALUES($1,$2,$3,'AI',$4,'PROPOSED',$5,$6::jsonb)`,[changeSetId,siteId,actor.id,`AI site: ${plan.siteName}`,digest(context.design),JSON.stringify(commands)]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status) VALUES($1,$2,$3,$4,'SITE_PLAN',$5,$6,$7,$8,$9,$10,$11,$12,'SUCCEEDED')`,[planRunId,siteId,site.workspaceId,actor.id,planned.provider??this.plannerProvider!.name,this.plannerProvider!.model,planned.modelResolved??this.plannerProvider!.model,SITE_PLAN_PROMPT.version,contextHash,planned.usage?.inputUnits??null,planned.usage?.outputUnits??null,Date.now()-started]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status,changeset_id) VALUES($1,$2,$3,$4,'SITE_GENERATION',$5,$6,$7,$8,$9,$10,$11,$12,'SUCCEEDED',$13)`,[buildRunId,siteId,site.workspaceId,actor.id,built.provider??this.pageProvider!.name,this.pageProvider!.model,built.modelResolved??this.pageProvider!.model,SITE_BUILD_PROMPT.version,contextHash,built.usage?.inputUnits??null,built.usage?.outputUnits??null,Date.now()-started,changeSetId]);
        await this.db.audit(c,actor,site,'ai.site_proposed',plan.siteName);
      });
      await this.success(reservation,planned.usage,built.usage);
      return {changeSetId,baseHash:digest(context.design),plan:{siteName:plan.siteName,pages:plan.pages,designSystem:{variableCount:plan.designSystem.variables.length,classCount:plan.designSystem.classes.length}},pageCount:build.pages.length};
    }catch(error){
      await this.failed(reservation);
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,latency_ms,status,error_code) VALUES($1,$2,$3,$4,'SITE_GENERATION',$5,$6,$6,$7,$8,$9,'FAILED',$10)`,[buildRunId,siteId,context.site.workspaceId,actor.id,this.pageProvider.name,this.pageProvider.model,SITE_BUILD_PROMPT.version,contextHash,Date.now()-started,(error as any)?.code||'AI_FAILED']).catch(()=>undefined);throw error;
    }
  }
  async proposeCms(actor:Actor,siteId:string,input:unknown){
    if(!this.plannerProvider||!this.cmsCommands)throw new StudioError('AI CMS generation is not configured',503,'AI_NOT_CONFIGURED');
    const b=parse(cmsInput,input),started=Date.now(),runId=randomUUID();
    const site=await this.db.tx(async c=>this.db.site(c,actor,siteId,'EDIT_DESIGN'));
    const context=await this.cmsCommands.context(actor,siteId),baseHash=await this.cmsCommands.stateHash(actor,siteId);
    const contextHash=digest({siteId,instruction:b.instruction,collections:(context.collections??[]).map((x:any)=>({name:x.name,slug:x.slug,fields:x.fields}))});
    const reservation=await this.begin(actor,siteId,'AI_CMS','CMS_GENERATION',8000);
    try{
      const generated=await this.plannerProvider.generateStructured({system:CMS_PROMPT.system,user:JSON.stringify({instruction:b.instruction,existingCollections:(context.collections??[]).map((x:any)=>({name:x.name,slug:x.slug,fields:x.fields}))}),timeoutMs:60000,maxOutputTokens:5000});
      const output=parse(cmsOutput,generated.value);
      if((context.collections??[]).some((x:any)=>x.slug===output.collection.slug))throw new StudioError('Generated collection slug already exists',409,'COLLECTION_CONFLICT');
      const changeSetId=randomUUID(),command={type:'CREATE_CMS_COLLECTION_WITH_DRAFTS',collection:output.collection,items:output.items};
      await this.db.tx(async c=>{
        const current=await this.db.site(c,actor,siteId,'EDIT_DESIGN');
        await c.query(`INSERT INTO studio.change_sets(id,site_id,actor_id,source,name,status,base_hash,commands) VALUES($1,$2,$3,'AI',$4,'PROPOSED',$5,$6::jsonb)`,[changeSetId,siteId,actor.id,`AI CMS: ${output.collection.name}`,baseHash,JSON.stringify([command])]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status,changeset_id) VALUES($1,$2,$3,$4,'CMS_GENERATION',$5,$6,$7,$8,$9,$10,$11,$12,'SUCCEEDED',$13)`,[runId,siteId,current.workspaceId,actor.id,generated.provider??this.plannerProvider!.name,this.plannerProvider!.model,generated.modelResolved??this.plannerProvider!.model,CMS_PROMPT.version,contextHash,generated.usage?.inputUnits??null,generated.usage?.outputUnits??null,Date.now()-started,changeSetId]);
        await this.db.audit(c,actor,current,'ai.cms_proposed',output.collection.name);
      });
      await this.success(reservation,generated.usage);
      return {changeSetId,baseHash,collection:output.collection,itemCount:output.items.length,rationale:output.rationale};
    }catch(error){
      await this.failed(reservation);
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,latency_ms,status,error_code) VALUES($1,$2,$3,$4,'CMS_GENERATION',$5,$6,$6,$7,$8,$9,'FAILED',$10)`,[runId,siteId,site.workspaceId,actor.id,this.plannerProvider.name,this.plannerProvider.model,CMS_PROMPT.version,contextHash,Date.now()-started,(error as any)?.code||'AI_FAILED']).catch(()=>undefined);throw error;
    }
  }
  async reject(actor:Actor,siteId:string,changeSetId:string){
    parse(uuid,changeSetId);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT',true);
      const pending=await c.query("SELECT commands FROM studio.change_sets WHERE id=$1 AND site_id=$2 AND status='PROPOSED' FOR UPDATE",[changeSetId,siteId]);
      const r=await c.query("UPDATE studio.change_sets SET status='REJECTED' WHERE id=$1 AND site_id=$2 AND status='PROPOSED' RETURNING id",[changeSetId,siteId]);
      if(r.rowCount&&pending.rows[0]){
        const commands=Array.isArray(pending.rows[0].commands)?pending.rows[0].commands:JSON.parse(pending.rows[0].commands||'[]');
        for(const command of commands){const artifactId=command?.element?.sandboxArtifactId;if(typeof artifactId==='string'&&uuid.safeParse(artifactId).success)await c.query("UPDATE studio.code_component_artifacts SET status='REJECTED' WHERE id=$1 AND site_id=$2 AND status='VALIDATED'",[artifactId,siteId]);}
      }
      if(!r.rowCount){
        const current=await c.query('SELECT status FROM studio.change_sets WHERE id=$1 AND site_id=$2',[changeSetId,siteId]);
        if(!current.rows[0])throw new StudioError('Changeset not found',404);
        if(current.rows[0].status==='REJECTED')return {alreadyRejected:true};
        throw new StudioError('Only a proposed changeset can be rejected',409,'CHANGESET_STATE');
      }
      await this.db.audit(c,actor,site,'ai.changeset_rejected',changeSetId);
      return {alreadyRejected:false};
    });
  }
  async apply(actor:Actor,siteId:string,changeSetId:string){
    parse(uuid,changeSetId);
    const change=await this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'VIEW');
      const r=await c.query('SELECT * FROM studio.change_sets WHERE id=$1 AND site_id=$2',[changeSetId,siteId]);
      if(!r.rows[0])throw new StudioError('Changeset not found',404);
      if(r.rows[0].status==='APPLIED')return {...r.rows[0],alreadyApplied:true};
      if(r.rows[0].status!=='PROPOSED')throw new StudioError('Changeset is no longer applicable',409,'CHANGESET_STATE');
      return r.rows[0];
    });
    if(change.alreadyApplied)return {alreadyApplied:true,hash:change.result_hash};
    const commands=Array.isArray(change.commands)?change.commands:JSON.parse(change.commands);
    if(!Array.isArray(commands)||commands.length<1||commands.length>100)throw new StudioError('Unsupported changeset commands',400,'INVALID_CHANGESET');
    const cmsOnly=commands.every((x:any)=>x?.type==='CREATE_CMS_COLLECTION_WITH_DRAFTS');
    if(cmsOnly){
      if(!this.cmsCommands||commands.length!==1)throw new StudioError('CMS command executor is unavailable',503,'CMS_COMMANDS_UNAVAILABLE');
      const currentHash=await this.cmsCommands.stateHash(actor,siteId);if(currentHash!==change.base_hash)throw new StudioError('CMS schema changed after this proposal. Generate a new proposal.',409,'CMS_CONFLICT');
      const cmd=commands[0],applied=await this.cmsCommands.createCollectionWithDrafts(actor,siteId,{collection:cmd.collection,items:cmd.items},{source:'AI',operationId:changeSetId,correlationId:randomUUID()});
      const resultHash=await this.cmsCommands.stateHash(actor,siteId);
      await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');await c.query(`UPDATE studio.change_sets SET status='APPLIED',result_hash=$3,applied_at=now() WHERE id=$1 AND site_id=$2`,[changeSetId,siteId,resultHash]);const run=await c.query('SELECT id FROM studio.ai_runs WHERE changeset_id=$1 ORDER BY created_at DESC LIMIT 1',[changeSetId]);if(run.rows[0])await c.query(`INSERT INTO studio.ai_tool_calls(id,run_id,tool,arguments_hash,duration_ms,status,result_metadata) VALUES($1,$2,'cms.create_collection_with_drafts',$3,0,'SUCCEEDED',$4::jsonb)`,[randomUUID(),run.rows[0].id,digest(commands),JSON.stringify({collectionId:applied.collectionId,count:applied.count})]);await this.db.audit(c,actor,site,'ai.changeset_applied',changeSetId);});
      return {alreadyApplied:false,hash:resultHash,operationId:applied.operationId};
    }
    if(commands.some((x:any)=>x?.type==='CREATE_CMS_COLLECTION_WITH_DRAFTS'))throw new StudioError('CMS and design commands cannot be mixed in one changeset',400,'INVALID_CHANGESET');
    const read=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT');return {design:designOnly(site.editorData),site};});
    if(digest(read.design)!==change.base_hash)throw new StudioError('The design changed after this AI proposal. Generate a new proposal.',409,'DESIGN_CONFLICT');
    const structural=new Set(['ADD_ELEMENT','REMOVE_ELEMENT','CREATE_PAGE','UPDATE_PAGE','DELETE_PAGE','REORDER_PAGES','SET_HOME_PAGE','SET_DESIGN_SYSTEM']);
    await this.db.tx(async c=>{await this.db.site(c,actor,siteId,commands.some((x:any)=>structural.has(x?.type))?'EDIT_DESIGN':'EDIT_CONTENT');return {};});
    const applied=await this.commands.executeDesignCommands(actor,siteId,{baseHash:change.base_hash,commands,operationId:changeSetId,correlationId:randomUUID()},{source:'AI'});
    await this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT');
      await c.query(`UPDATE studio.change_sets SET status='APPLIED',result_hash=$3,applied_at=now() WHERE id=$1 AND site_id=$2`,[changeSetId,siteId,applied.hash]);
      const run=await c.query('SELECT id FROM studio.ai_runs WHERE changeset_id=$1 ORDER BY created_at DESC LIMIT 1',[changeSetId]);
      if(run.rows[0])await c.query(`INSERT INTO studio.ai_tool_calls(id,run_id,tool,arguments_hash,duration_ms,status,result_metadata) VALUES($1,$2,'design.save',$3,0,'SUCCEEDED',$4::jsonb)`,[randomUUID(),run.rows[0].id,digest(commands),JSON.stringify({hash:applied.hash,commandCount:commands.length})]);
      for(const command of commands){const artifactId=(command as any)?.element?.sandboxArtifactId;if(typeof artifactId==='string'&&uuid.safeParse(artifactId).success)await c.query("UPDATE studio.code_component_artifacts SET status='APPLIED' WHERE id=$1 AND site_id=$2 AND status='VALIDATED'",[artifactId,siteId]);}
      await this.db.audit(c,actor,site,'ai.changeset_applied',changeSetId);
    });
    return {alreadyApplied:false,hash:applied.hash,operationId:applied.operationId};
  }
}
