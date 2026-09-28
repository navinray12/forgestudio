import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import type {AIProvider,AIUsage} from './ai.js';
import {FeaturePolicy,AiGovernance,type UsageReservation} from './governance.js';
import {SEO_PROMPT} from './ai-prompts.js';
import {designOnly,digest,jsonObject,parse,StudioError} from './validation.js';

const inputSchema=z.object({pageId:z.string().min(1).max(150),instruction:z.string().trim().min(2).max(3000)}).strict();
const outputSchema=z.object({
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

function textContext(value:any,out:string[]=[]):string[]{
  if(out.join(' ').length>5000||value===null||value===undefined)return out;
  if(Array.isArray(value)){for(const child of value)textContext(child,out);return out;}
  if(typeof value==='object')for(const [key,child] of Object.entries(value)){if(['content','text','alt'].includes(key)&&typeof child==='string')out.push(child.slice(0,1000));else textContext(child,out);}
  return out;
}
function units(usage?:AIUsage){return (usage?.inputUnits??0)+(usage?.outputUnits??0);}

export class AiSeo{
  constructor(private db:Database,private provider:AIProvider|null,private policy:FeaturePolicy,private governance:AiGovernance){}
  async propose(actor:Actor,siteId:string,input:unknown){
    if(!this.provider)throw new StudioError('AI SEO assistance is not configured',503,'AI_NOT_CONFIGURED');
    const b=parse(inputSchema,input),started=Date.now(),runId=randomUUID();
    const context=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT');return {site,design:designOnly(site.editorData)};});
    await this.policy.assert(siteId,'AI_SEO');
    const page=((context.design.pages as any[]|undefined)??[]).find(p=>p?.id===b.pageId);if(!page)throw new StudioError('Page not found',404,'PAGE_NOT_FOUND');
    const text=textContext(page.elements).join(' ').slice(0,5000),contextHash=digest({siteId,pageId:b.pageId,instruction:b.instruction,pageSettings:page.pageSettings,text});
    let reservation:UsageReservation|null=null;
    try{
      reservation=await this.governance.reserve(actor,siteId,'SEO_ASSIST',3000);
      const generated=await this.provider.generateStructured({system:SEO_PROMPT.system,user:JSON.stringify({instruction:b.instruction,page:{id:page.id,name:page.name,slug:page.slug,pageSettings:page.pageSettings||{},text}}),timeoutMs:30000,maxOutputTokens:1800});
      const output=parse(outputSchema,generated.value);if(output.structuredData)jsonObject(output.structuredData);
      const settings={seoTitle:output.title,seoDescription:output.description,canonicalUrl:output.canonical||'',robotsIndex:output.robotsIndex,robotsFollow:output.robotsFollow,ogTitle:output.openGraph.title||output.title,ogDescription:output.openGraph.description||output.description,ogImage:output.openGraph.image||'',twitterTitle:output.twitter.title||output.title,twitterDescription:output.twitter.description||output.description,twitterImage:output.twitter.image||'',structuredData:output.structuredData};
      const changeSetId=randomUUID(),command={type:'UPDATE_PAGE_SETTINGS',pageId:b.pageId,settings};
      await this.db.tx(async c=>{
        const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT');
        await c.query(`INSERT INTO studio.change_sets(id,site_id,actor_id,source,name,status,base_hash,commands) VALUES($1,$2,$3,'AI',$4,'PROPOSED',$5,$6::jsonb)`,[changeSetId,siteId,actor.id,`AI SEO: ${page.name}`,digest(context.design),JSON.stringify([command])]);
        await c.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,latency_ms,status,changeset_id) VALUES($1,$2,$3,$4,'SEO_ASSIST',$5,$6,$7,$8,$9,$10,$11,$12,'SUCCEEDED',$13)`,[runId,siteId,site.workspaceId,actor.id,generated.provider??this.provider!.name,this.provider!.model,generated.modelResolved??this.provider!.model,SEO_PROMPT.version,contextHash,generated.usage?.inputUnits??null,generated.usage?.outputUnits??null,Date.now()-started,changeSetId]);
        await this.db.audit(c,actor,site,'ai.seo_proposed',b.pageId);
      });
      await this.governance.reconcile(reservation,units(generated.usage));
      return {changeSetId,baseHash:digest(context.design),pageId:b.pageId,settings,rationale:output.rationale,provider:generated.provider??this.provider.name,model:generated.modelResolved??this.provider.model};
    }catch(error){
      await this.governance.release(reservation);
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,latency_ms,status,error_code) VALUES($1,$2,$3,$4,'SEO_ASSIST',$5,$6,$6,$7,$8,$9,'FAILED',$10)`,[runId,siteId,context.site.workspaceId,actor.id,this.provider.name,this.provider.model,SEO_PROMPT.version,contextHash,Date.now()-started,(error as any)?.code||'AI_FAILED']).catch(()=>undefined);
      throw error;
    }
  }
}
