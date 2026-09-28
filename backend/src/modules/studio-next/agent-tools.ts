import {z} from 'zod';
import {Database,type Actor} from './database.js';
import {DomainCommands} from './commands.js';
import {CmsCommands} from './cms-commands.js';
import {Releases} from './releases.js';
import {FeaturePolicy} from './governance.js';
import {designOnly,digest,parse,uuid,StudioError} from './validation.js';

export type ToolEffect='READ_ONLY'|'SAFE_MUTATION'|'DESTRUCTIVE'|'EXTERNAL_SIDE_EFFECT'|'FINANCIAL';
export interface AgentToolDescriptor {
  name:string;
  description:string;
  capability:string;
  effect:ToolEffect;
  idempotency:'NONE'|'OPERATION_ID'|'RESOURCE_STATE';
  timeoutMs:number;
  inputSchema:Record<string,unknown>;
}

const TOOL_CATALOG:AgentToolDescriptor[]=[
  {name:'site.read_context',description:'Read the authorized site summary, design hash, pages, design-system counts and CMS collection schemas.',capability:'VIEW',effect:'READ_ONLY',idempotency:'NONE',timeoutMs:10000,inputSchema:{type:'object',additionalProperties:false}},
  {name:'design.apply_commands',description:'Apply validated stable-ID Designer commands with optimistic concurrency.',capability:'EDIT_DESIGN',effect:'SAFE_MUTATION',idempotency:'OPERATION_ID',timeoutMs:10000,inputSchema:{type:'object',required:['baseHash','operationId','commands'],properties:{baseHash:{type:'string'},operationId:{type:'string',format:'uuid'},correlationId:{type:'string',format:'uuid'},commands:{type:'array',minItems:1,maxItems:100}},additionalProperties:false}},
  {name:'cms.schema',description:'Read CMS collection schemas and locale information for the authorized site.',capability:'VIEW',effect:'READ_ONLY',idempotency:'NONE',timeoutMs:10000,inputSchema:{type:'object',additionalProperties:false}},
  {name:'release.list',description:'Read immutable release history and the active release pointer.',capability:'VIEW',effect:'READ_ONLY',idempotency:'NONE',timeoutMs:10000,inputSchema:{type:'object',additionalProperties:false}},
  {name:'release.prepare',description:'Prepare an immutable release artifact from the current validated design.',capability:'PUBLISH',effect:'SAFE_MUTATION',idempotency:'OPERATION_ID',timeoutMs:15000,inputSchema:{type:'object',required:['baseHash','operationId'],properties:{baseHash:{type:'string'},operationId:{type:'string',format:'uuid'}},additionalProperties:false}},
  {name:'release.publish',description:'Deploy and verify a previously prepared release. Requires explicit confirmation and publish permission.',capability:'PUBLISH',effect:'EXTERNAL_SIDE_EFFECT',idempotency:'RESOURCE_STATE',timeoutMs:60000,inputSchema:{type:'object',required:['releaseId','confirm'],properties:{releaseId:{type:'string',format:'uuid'},confirm:{const:true}},additionalProperties:false}},
];

const empty=z.object({}).strict();
const publishInput=z.object({releaseId:uuid,confirm:z.literal(true)}).strict();

export class AgentTools{
  constructor(
    private db:Database,
    private commands:DomainCommands,
    private cms:CmsCommands,
    private releases:Releases,
    private features:FeaturePolicy,
  ){}
  private async allowed(actor:Actor,siteId:string){
    await this.features.assert(siteId,'MCP');
    return this.db.tx(async c=>this.db.site(c,actor,siteId,'VIEW'));
  }
  private async audit(actor:Actor,siteId:string,tool:string){
    await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'VIEW');await this.db.audit(c,actor,site,'agent.tool_executed',tool);});
  }
  async catalog(actor:Actor,siteId:string){
    const site=await this.allowed(actor,siteId),caps=new Set(site.capabilities as string[]);
    return {tools:TOOL_CATALOG.filter(tool=>caps.has(tool.capability)).map(tool=>({...tool}))};
  }
  async execute(actor:Actor,siteId:string,toolName:string,input:unknown){
    const site=await this.allowed(actor,siteId);
    const descriptor=TOOL_CATALOG.find(tool=>tool.name===toolName);
    if(!descriptor)throw new StudioError('Agent tool not found',404,'TOOL_NOT_FOUND');
    if(!(site.capabilities as string[]).includes(descriptor.capability))throw new StudioError(`Missing permission: ${descriptor.capability}`,403,'FORBIDDEN');
    let result:Record<string,unknown>;
    if(toolName==='site.read_context'){
      parse(empty,input??{});
      const design=designOnly(site.editorData),cms=await this.cms.context(actor,siteId);
      result={site:{id:site.id,name:site.name,status:site.status,workspaceId:site.workspaceId??null,capabilities:site.capabilities},design:{hash:digest(design),pages:(Array.isArray(design.pages)?design.pages:[]).map((p:any)=>({id:p.id,name:p.name,slug:p.slug})),topLevelElementCount:Array.isArray(design.elements)?design.elements.length:0,designSystem:{variables:Array.isArray(design.globalVariables)?design.globalVariables.length:0,classes:Array.isArray(design.globalClasses)?design.globalClasses.length:0}},cms:{collections:(cms.collections??[]).map((c:any)=>({id:c.id,name:c.name,slug:c.slug,fields:c.fields,revision:c.revision,itemCount:c.itemCount}))}};
    }else if(toolName==='design.apply_commands'){
      result=await this.commands.executeDesignCommands(actor,siteId,input,{source:'AI'});
    }else if(toolName==='cms.schema'){
      parse(empty,input??{});const state=await this.cms.context(actor,siteId);result={collections:state.collections??[],locales:(state as any).locales??[]};
    }else if(toolName==='release.list'){
      parse(empty,input??{});result=await this.releases.list(actor,siteId);
    }else if(toolName==='release.prepare'){
      result=await this.releases.prepare(actor,siteId,input);
    }else if(toolName==='release.publish'){
      const body=parse(publishInput,input);result=await this.releases.publish(actor,siteId,body.releaseId);
    }else throw new StudioError('Agent tool not implemented',501,'TOOL_NOT_IMPLEMENTED');
    await this.audit(actor,siteId,toolName);
    return {tool:toolName,effect:descriptor.effect,result};
  }
}
