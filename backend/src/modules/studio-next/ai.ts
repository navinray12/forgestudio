import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database,type Actor } from './database.js';
import { DomainCommands } from './commands.js';
import { parse,uuid,digest,designOnly,StudioError } from './validation.js';
import { COPY_EDIT_PROMPT,SECTION_PROMPT } from './ai-prompts.js';

export interface AIUsage { inputUnits?:number; outputUnits?:number; }
export interface AIResult { value:unknown; usage?:AIUsage; provider?:string; modelResolved?:string; }
export interface AIProvider {
  readonly name:string;
  readonly model:string;
  generateStructured(input:{system:string;user:string;timeoutMs:number}):Promise<AIResult>;
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
  async generateStructured(input:{system:string;user:string;timeoutMs:number}):Promise<AIResult>{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',redirect:'error',signal:AbortSignal.timeout(input.timeoutMs),headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:this.model,input:[{role:'system',content:[{type:'input_text',text:input.system}]},{role:'user',content:[{type:'input_text',text:input.user}]}],max_output_tokens:800})});
    const p=await r.json().catch(()=>({}));
    if(!r.ok)throw new StudioError('AI provider rejected the request',502,'AI_PROVIDER_ERROR');
    return {value:parseJsonText(textFromOpenAI(p)),usage:{inputUnits:p.usage?.input_tokens,outputUnits:p.usage?.output_tokens}};
  }
}
export class AnthropicProvider implements AIProvider{
  readonly name='anthropic';
  constructor(readonly model:string,private apiKey:string){}
  async generateStructured(input:{system:string;user:string;timeoutMs:number}):Promise<AIResult>{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',redirect:'error',signal:AbortSignal.timeout(input.timeoutMs),headers:{'x-api-key':this.apiKey,'anthropic-version':'2023-06-01','Content-Type':'application/json'},body:JSON.stringify({model:this.model,max_tokens:800,system:input.system,messages:[{role:'user',content:input.user}]})});
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
  async generateStructured(input:{system:string;user:string;timeoutMs:number}):Promise<AIResult>{
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
export function configuredCopyProvider():AIProvider|null{return configuredProvider('COPY');}
const proposalInput=z.object({
  elementId:z.string().min(1).max(150),
  field:z.enum(['content','text','alt']).default('content'),
  instruction:z.string().trim().min(2).max(2000),
}).strict();
const providerOutput=z.object({replacement:z.string().max(20000),rationale:z.string().max(1000).default('')}).strict();
const sectionInput=z.object({instruction:z.string().trim().min(3).max(3000),afterId:z.string().min(1).max(150).nullable().default(null)}).strict();
const sectionOutput=z.object({section:z.object({id:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,149}$/),type:z.literal('section'),children:z.array(z.record(z.string(),z.unknown())).max(30).default([]),styles:z.record(z.string(),z.union([z.string(),z.number(),z.null()])).optional(),attributes:z.record(z.string(),z.string()).optional()}).strict(),rationale:z.string().max(1000).default('')}).strict();

function findUnique(value:any,id:string,result:any[]=[]):any[]{
  if(!value||typeof value!=='object')return result;
  if(value.id===id)result.push(value);
  for(const child of Object.values(value))findUnique(child,id,result);
  return result;
}
export class AiOrchestrator{
  constructor(private db:Database,private commands:DomainCommands,private provider:AIProvider|null,private sectionProvider:AIProvider|null=provider){}
  status(){return {configured:!!this.provider||!!this.sectionProvider,features:{copy:{configured:!!this.provider,provider:this.provider?.name??null,model:this.provider?.model??null},section:{configured:!!this.sectionProvider,provider:this.sectionProvider?.name??null,model:this.sectionProvider?.model??null}},registry:new AIModelRegistry().publicStatus()};}
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
    try{
      const generated=await this.provider.generateStructured({system,user,timeoutMs:30000});
      const output=parse(providerOutput,generated.value),changeSetId=randomUUID();
      const command={type:'SET_ELEMENT_TEXT',elementId:b.elementId,field:b.field,value:output.replacement};
      await this.db.tx(async c=>{
        const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT');
        await c.query(`INSERT INTO studio.change_sets(id,site_id,actor_id,source,name,status,base_hash,commands) VALUES($1,$2,$3,'AI',$4,'PROPOSED',$5,$6::jsonb)`,[changeSetId,siteId,actor.id,`AI copy: ${b.instruction.slice(0,120)}`,digest(context.design),JSON.stringify([command])]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status,changeset_id) VALUES($1,$2,$3,$4,'COPY_EDIT',$5,$6,$7,COPY_EDIT_PROMPT.version,$8,$9,$10,$11,'SUCCEEDED',$12)`,[runId,siteId,site.workspaceId,actor.id,generated.provider??this.provider!.name,this.provider!.model,generated.modelResolved??this.provider!.model,contextHash,generated.usage?.inputUnits??null,generated.usage?.outputUnits??null,Date.now()-started,changeSetId]);
        await this.db.audit(c,actor,site,'ai.copy_proposed',b.elementId);
      });
      return {changeSetId,baseHash:digest(context.design),elementId:b.elementId,field:b.field,current,replacement:output.replacement,rationale:output.rationale,provider:generated.provider??this.provider.name,model:generated.modelResolved??this.provider.model};
    }catch(error){
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,latency_ms,status,error_code) VALUES($1,$2,$3,$4,'COPY_EDIT',$5,$6,$6,COPY_EDIT_PROMPT.version,$7,$8,'FAILED',$9)`,[runId,siteId,context.site.workspaceId,actor.id,this.provider.name,this.provider.model,contextHash,Date.now()-started,(error as any)?.code||'AI_FAILED']).catch(()=>undefined);
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
    try{
      const generated=await this.sectionProvider.generateStructured({system,user,timeoutMs:45000}),output=parse(sectionOutput,generated.value),changeSetId=randomUUID();
      const command={type:'ADD_ELEMENT',parentId:null,afterId:b.afterId,element:output.section};
      await this.db.tx(async c=>{
        const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');
        await c.query(`INSERT INTO studio.change_sets(id,site_id,actor_id,source,name,status,base_hash,commands) VALUES($1,$2,$3,'AI',$4,'PROPOSED',$5,$6::jsonb)`,[changeSetId,siteId,actor.id,`AI section: ${b.instruction.slice(0,120)}`,digest(context.design),JSON.stringify([command])]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status,changeset_id) VALUES($1,$2,$3,$4,'SECTION_GENERATION',$5,$6,$7,SECTION_PROMPT.version,$8,$9,$10,$11,'SUCCEEDED',$12)`,[runId,siteId,site.workspaceId,actor.id,generated.provider??this.sectionProvider!.name,this.sectionProvider!.model,generated.modelResolved??this.sectionProvider!.model,contextHash,generated.usage?.inputUnits??null,generated.usage?.outputUnits??null,Date.now()-started,changeSetId]);
        await this.db.audit(c,actor,site,'ai.section_proposed',output.section.id);
      });
      return {changeSetId,baseHash:digest(context.design),section:output.section,rationale:output.rationale,provider:generated.provider??this.sectionProvider.name,model:generated.modelResolved??this.sectionProvider.model};
    }catch(error){
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,latency_ms,status,error_code) VALUES($1,$2,$3,$4,'SECTION_GENERATION',$5,$6,$6,SECTION_PROMPT.version,$7,$8,'FAILED',$9)`,[runId,siteId,context.site.workspaceId,actor.id,this.sectionProvider.name,this.sectionProvider.model,contextHash,Date.now()-started,(error as any)?.code||'AI_FAILED']).catch(()=>undefined);throw error;
    }
  }
  async reject(actor:Actor,siteId:string,changeSetId:string){
    parse(uuid,changeSetId);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT',true);
      const r=await c.query("UPDATE studio.change_sets SET status='REJECTED' WHERE id=$1 AND site_id=$2 AND status='PROPOSED' RETURNING id",[changeSetId,siteId]);
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
      await this.db.site(c,actor,siteId,'EDIT_CONTENT');
      const r=await c.query('SELECT * FROM studio.change_sets WHERE id=$1 AND site_id=$2',[changeSetId,siteId]);
      if(!r.rows[0])throw new StudioError('Changeset not found',404);
      if(r.rows[0].status==='APPLIED')return {...r.rows[0],alreadyApplied:true};
      if(r.rows[0].status!=='PROPOSED')throw new StudioError('Changeset is no longer applicable',409,'CHANGESET_STATE');
      return r.rows[0];
    });
    if(change.alreadyApplied)return {alreadyApplied:true,hash:change.result_hash};
    const read=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT');return {design:designOnly(site.editorData),site};});
    if(digest(read.design)!==change.base_hash)throw new StudioError('The design changed after this AI proposal. Generate a new proposal.',409,'DESIGN_CONFLICT');
    const commands=Array.isArray(change.commands)?change.commands:JSON.parse(change.commands);
    if(!Array.isArray(commands)||commands.length<1||commands.length>100)throw new StudioError('Unsupported changeset commands',400,'INVALID_CHANGESET');
    const applied=await this.commands.executeDesignCommands(actor,siteId,{baseHash:change.base_hash,commands,operationId:changeSetId,correlationId:randomUUID()},{source:'AI'});
    await this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT');
      await c.query(`UPDATE studio.change_sets SET status='APPLIED',result_hash=$3,applied_at=now() WHERE id=$1 AND site_id=$2`,[changeSetId,siteId,applied.hash]);
      const run=await c.query('SELECT id FROM studio.ai_runs WHERE changeset_id=$1 ORDER BY created_at DESC LIMIT 1',[changeSetId]);
      if(run.rows[0])await c.query(`INSERT INTO studio.ai_tool_calls(id,run_id,tool,arguments_hash,duration_ms,status,result_metadata) VALUES($1,$2,'design.save',$3,0,'SUCCEEDED',$4::jsonb)`,[randomUUID(),run.rows[0].id,digest(commands),JSON.stringify({hash:applied.hash,commandCount:commands.length})]);
      await this.db.audit(c,actor,site,'ai.changeset_applied',changeSetId);
    });
    return {alreadyApplied:false,hash:applied.hash,operationId:applied.operationId};
  }
}
