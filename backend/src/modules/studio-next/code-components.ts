import {createHash,randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import {FeaturePolicy,AiGovernance} from './governance.js';
import type {AIProvider} from './ai.js';
import {CODE_COMPONENT_PROMPT} from './ai-prompts.js';
import {parse,designOnly,digest,StudioError} from './validation.js';

const requestSchema=z.object({instruction:z.string().trim().min(3).max(4000),afterId:z.string().min(1).max(150).nullable().default(null)}).strict();
const outputSchema=z.object({
  name:z.string().trim().min(1).max(120),
  instanceId:z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,149}$/),
  source:z.string().min(20).max(50000),
  rationale:z.string().max(1000).default(''),
}).strict();

export interface SandboxBuildResult{
  artifactId:string;previewUrl:string;screenshotUrl?:string;
  compileSucceeded:boolean;browserTestPassed:boolean;originIsolated:boolean;networkRestricted:boolean;
  accessibilityCriticalCount:number;diagnostics?:unknown;
}
export interface CodeSandboxProvider{
  readonly name:string;
  build(input:{name:string;source:string;sourceHash:string;timeoutMs:number}):Promise<SandboxBuildResult>;
}
function privateHost(host:string){
  const h=host.toLowerCase();if(h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal'))return true;
  if(isIP(h)){if(h==='127.0.0.1'||h==='::1'||h.startsWith('10.')||h.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[01])\./.test(h)||h.startsWith('169.254.'))return true;}
  return false;
}
function safeHttpsUrl(raw:string,label:string){
  let url:URL;try{url=new URL(raw);}catch{throw new Error(`${label} must be a valid HTTPS URL`);}
  if(url.protocol!=='https:'||url.username||url.password||privateHost(url.hostname))throw new Error(`${label} must use a public HTTPS origin`);
  return url;
}
export class HttpCodeSandboxProvider implements CodeSandboxProvider{
  readonly name='http-isolated-sandbox';private endpoint:URL;
  constructor(baseUrl:string,private token:string){this.endpoint=new URL('/v1/builds',safeHttpsUrl(baseUrl,'STUDIO_CODE_SANDBOX_URL'));}
  async build(input:{name:string;source:string;sourceHash:string;timeoutMs:number}):Promise<SandboxBuildResult>{
    const response=await fetch(this.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(input.timeoutMs),headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:JSON.stringify({
      name:input.name,source:input.source,sourceHash:input.sourceHash,framework:'react',
      policy:{network:'deny',filesystem:'ephemeral-readonly',packageInstall:'deny',secrets:'none',cpuMillis:5000,memoryMb:256,executionTimeoutMs:5000},
      checks:{compile:true,browser:true,screenshot:true,accessibility:true},
    })});
    const payload:any=await response.json().catch(()=>({}));
    if(!response.ok)throw new StudioError('Code sandbox rejected the build',502,'CODE_SANDBOX_ERROR');
    return payload as SandboxBuildResult;
  }
}
export function configuredCodeSandboxProvider():CodeSandboxProvider|null{
  const url=process.env.STUDIO_CODE_SANDBOX_URL,token=process.env.STUDIO_CODE_SANDBOX_TOKEN;
  if(!url||!token)return null;
  try{return new HttpCodeSandboxProvider(url,token);}catch{return null;}
}
function staticPolicy(source:string){
  const forbidden:Array<[RegExp,string]>=[
    [/\b(?:eval|Function)\s*\(/,'dynamic evaluation'],
    [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/,'network APIs'],
    [/\b(?:localStorage|sessionStorage|indexedDB|document\.cookie)\b/,'browser storage'],
    [/\b(?:process|require|module\.exports|child_process|fs\b|net\b|dgram\b)\b/,'Node APIs'],
    [/\bimport\s*(?:\(|[{'"])|\brequire\s*\(/,'imports or dependencies'],
    [/<script\b/i,'script elements'],
    [/javascript\s*:/i,'javascript URLs'],
  ];
  for(const [pattern,label] of forbidden)if(pattern.test(source))throw new StudioError(`Generated component violates sandbox policy: ${label}`,400,'UNSAFE_GENERATED_CODE');
  if(!/export\s+default\s+(?:function|class|\(?[A-Za-z_$])/.test(source))throw new StudioError('Generated component must have a default export',400,'INVALID_GENERATED_CODE');
  return {forbiddenChecks:forbidden.length,bytes:Buffer.byteLength(source)};
}
function checkedPreview(raw:string){
  const url=safeHttpsUrl(raw,'Sandbox preview URL'),front=process.env.FRONTEND_URL;
  if(front){try{if(new URL(front).origin===url.origin)throw new StudioError('Sandbox preview must use a separate origin',502,'CODE_SANDBOX_ISOLATION_FAILED');}catch(error){if(error instanceof StudioError)throw error;}}
  return url.toString();
}

export class CodeComponents{
  constructor(private db:Database,private ai:AIProvider|null,private sandbox:CodeSandboxProvider|null,private features:FeaturePolicy,private governance:AiGovernance){}
  async status(actor:Actor,siteId:string){
    await this.db.tx(async c=>{await this.db.site(c,actor,siteId,'VIEW');});
    const enabled=await this.features.effective(siteId,'AI_CODE_COMPONENTS');
    return {enabled,configured:enabled&&!!this.ai&&!!this.sandbox,sandboxProvider:this.sandbox?.name??null,model:this.ai?.model??null};
  }
  async propose(actor:Actor,siteId:string,input:unknown){
    const body=parse(requestSchema,input);await this.features.assert(siteId,'AI_CODE_COMPONENTS');
    if(!this.ai||!this.sandbox)throw new StudioError('AI code-component sandbox is not configured',503,'AI_NOT_CONFIGURED');
    const context=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');return {site,design:designOnly(site.editorData)};});
    if(body.afterId){
      const exists=(value:any):boolean=>Array.isArray(value)?value.some(exists):!!value&&typeof value==='object'&&(value.id===body.afterId||Object.values(value).some(exists));
      if(!exists(context.design))throw new StudioError('Insertion anchor not found',404,'ELEMENT_NOT_FOUND');
    }
    const reservation=await this.governance.reserve(actor,siteId,'CODE_COMPONENT',18000),started=Date.now(),runId=randomUUID();
    try{
      const generated=await this.ai.generateStructured({system:CODE_COMPONENT_PROMPT.system,user:JSON.stringify({instruction:body.instruction,designSystem:{variables:(context.design.globalVariables as any[]|undefined)?.slice(0,100)??[],classes:(context.design.globalClasses as any[]|undefined)?.slice(0,100)??[]}}),timeoutMs:60000,maxOutputTokens:8000});
      const output=parse(outputSchema,generated.value),policy=staticPolicy(output.source),sourceHash=createHash('sha256').update(output.source).digest('hex');
      const built=await this.sandbox.build({name:output.name,source:output.source,sourceHash,timeoutMs:120000});
      if(!built.compileSucceeded||!built.browserTestPassed||!built.originIsolated||!built.networkRestricted||built.accessibilityCriticalCount!==0)throw new StudioError('Generated code failed the required isolated sandbox quality gate',400,'CODE_SANDBOX_QUALITY_FAILED');
      const previewUrl=checkedPreview(built.previewUrl),screenshotUrl=built.screenshotUrl?checkedPreview(built.screenshotUrl):undefined,artifactId=randomUUID(),changeSetId=randomUUID();
      const element={id:output.instanceId,type:'code-component',content:output.name,sandboxUrl:previewUrl,sandboxArtifactId:artifactId,codeSourceHash:sourceHash,styles:{width:'100%',minHeight:'320px'}};
      const command={type:'ADD_ELEMENT',parentId:null,afterId:body.afterId,element};
      await this.db.tx(async c=>{
        const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN');
        await c.query(`INSERT INTO studio.code_component_artifacts(id,site_id,actor_id,name,source_hash,provider,model,sandbox_provider,sandbox_artifact_id,preview_url,screenshot_url,status,findings)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'VALIDATED',$12::jsonb)`,[artifactId,siteId,actor.id,output.name,sourceHash,generated.provider??this.ai!.name,generated.modelResolved??this.ai!.model,this.sandbox!.name,built.artifactId,previewUrl,screenshotUrl??null,JSON.stringify({policy,diagnostics:built.diagnostics??null,accessibilityCriticalCount:built.accessibilityCriticalCount})]);
        await c.query(`INSERT INTO studio.change_sets(id,site_id,actor_id,source,name,status,base_hash,commands) VALUES($1,$2,$3,'AI',$4,'PROPOSED',$5,$6::jsonb)`,[changeSetId,siteId,actor.id,`AI code component: ${output.name}`,digest(context.design),JSON.stringify([command])]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status,changeset_id)
          VALUES($1,$2,$3,$4,'CODE_COMPONENT',$5,$6,$7,$8,$9,$10,$11,$12,'SUCCEEDED',$13)`,[runId,siteId,site.workspaceId,actor.id,generated.provider??this.ai!.name,this.ai!.model,generated.modelResolved??this.ai!.model,CODE_COMPONENT_PROMPT.version,digest({siteId,instruction:body.instruction,sourceHash}),generated.usage?.inputUnits??null,generated.usage?.outputUnits??null,Date.now()-started,changeSetId]);
        await this.db.audit(c,actor,site,'ai.code_component_proposed',output.name);
      });
      await this.governance.reconcile(reservation,(generated.usage?.inputUnits??0)+(generated.usage?.outputUnits??0)||reservation?.reservedUnits||1);
      return {changeSetId,artifactId,name:output.name,instanceId:output.instanceId,previewUrl,screenshotUrl,rationale:output.rationale,sandbox:{provider:this.sandbox.name,compileSucceeded:true,browserTestPassed:true,accessibilityCriticalCount:0}};
    }catch(error){
      await this.governance.release(reservation);throw error;
    }
  }
}
