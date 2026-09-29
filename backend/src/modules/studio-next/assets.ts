import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import {FeaturePolicy,AiGovernance} from './governance.js';
import {resolveAIRoute} from './ai-control.js';
import {parse,StudioError} from './validation.js';
import {createMediaAsset,extractImageDimensions} from '../../services/media.service.js';

const inputSchema=z.object({
  prompt:z.string().trim().min(3).max(4000),
  altText:z.string().trim().max(500).optional(),
  size:z.enum(['1024x1024','1024x1536','1536x1024','auto']).default('1024x1024'),
  quality:z.enum(['low','medium','high','xhigh','max','auto']).default('auto'),
  outputFormat:z.enum(['png','webp','jpeg']).default('png'),
}).strict();

export interface GeneratedImage {
  bytes:Buffer;
  mimeType:'image/png'|'image/webp'|'image/jpeg';
  provider:string;
  model:string;
  usage?:{inputUnits?:number;outputUnits?:number};
}
export interface ImageGenerationProvider {
  generate(input:{model:string;prompt:string;size:string;quality:string;outputFormat:'png'|'webp'|'jpeg';timeoutMs:number}):Promise<GeneratedImage>;
}

export class OpenAIImageGenerationProvider implements ImageGenerationProvider{
  constructor(private apiKey:string){}
  async generate(input:{model:string;prompt:string;size:string;quality:string;outputFormat:'png'|'webp'|'jpeg';timeoutMs:number}):Promise<GeneratedImage>{
    const response=await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(input.timeoutMs),
      headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:input.model,prompt:input.prompt,size:input.size,quality:input.quality,output_format:input.outputFormat}),
    });
    const payload:any=await response.json().catch(()=>({}));
    if(!response.ok)throw new StudioError('Image provider rejected the request',502,'AI_IMAGE_PROVIDER_ERROR');
    const encoded=payload?.data?.[0]?.b64_json;
    if(typeof encoded!=='string'||encoded.length<32)throw new StudioError('Image provider returned no image data',502,'AI_IMAGE_PROVIDER_ERROR');
    const bytes=Buffer.from(encoded,'base64');
    if(bytes.length<32||bytes.length>20*1024*1024)throw new StudioError('Generated image size is invalid',502,'AI_IMAGE_PROVIDER_ERROR');
    const mimeType=input.outputFormat==='jpeg'?'image/jpeg':input.outputFormat==='webp'?'image/webp':'image/png';
    return {bytes,mimeType,provider:'openai',model:input.model,usage:{inputUnits:Number(payload?.usage?.input_tokens||0),outputUnits:Number(payload?.usage?.output_tokens||0)}};
  }
}

export function configuredImageGenerationProvider():ImageGenerationProvider|null{
  return process.env.OPENAI_API_KEY?new OpenAIImageGenerationProvider(process.env.OPENAI_API_KEY):null;
}

export class Assets{
  constructor(private db:Database,private features:FeaturePolicy,private governance:AiGovernance,private provider:ImageGenerationProvider|null=configuredImageGenerationProvider()){}
  async generationStatus(actor:Actor,siteId:string){
    await this.db.tx(async c=>{await this.db.site(c,actor,siteId,'VIEW');});
    const route=await resolveAIRoute(this.db,'IMAGE'),enabled=await this.features.effective(siteId,'AI_IMAGES');
    return {enabled,configured:enabled&&!!route&&!!this.provider,route:route?{provider:route.provider,model:route.model,source:route.source}:null};
  }
  async generate(actor:Actor,siteId:string,input:unknown){
    const body=parse(inputSchema,input);
    await this.features.assert(siteId,'AI_IMAGES');
    const site=await this.db.tx(async c=>this.db.site(c,actor,siteId,'EDIT_CONTENT'));
    const route=await resolveAIRoute(this.db,'IMAGE');
    if(!route||!this.provider)throw new StudioError('AI image generation is not configured',503,'AI_NOT_CONFIGURED');
    if(route.provider!=='openai')throw new StudioError('Configured image provider is not supported by this deployment',503,'AI_NOT_CONFIGURED');
    const reservation=await this.governance.reserve(actor,siteId,'IMAGE_GENERATION',12000),started=Date.now(),runId=randomUUID(),promptHash=createHash('sha256').update(body.prompt).digest('hex');
    try{
      const generated=await this.provider.generate({model:route.model,prompt:body.prompt,size:body.size,quality:body.quality,outputFormat:body.outputFormat,timeoutMs:Math.min(route.timeoutMs,120000)});
      const extension=generated.mimeType==='image/jpeg'?'jpg':generated.mimeType==='image/webp'?'webp':'png';
      const filename=`ai_${Date.now()}_${randomBytes(6).toString('hex')}.${extension}`,dir=path.join(process.cwd(),'uploads','images');
      await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,filename),generated.bytes,{flag:'wx'});
      const dimensions=extractImageDimensions(generated.bytes,generated.mimeType),asset=await createMediaAsset({
        userId:actor.id,websiteId:siteId,filename,originalName:`AI generated ${filename}`,mimeType:generated.mimeType,sizeBytes:generated.bytes.length,
        url:`/uploads/images/${filename}`,width:dimensions.width,height:dimensions.height,altText:body.altText,
        provenance:'GENERATED',providerName:generated.provider,modelId:generated.model,promptHash,generatedAt:new Date(),
        metadata:{size:body.size,quality:body.quality,outputFormat:body.outputFormat},
      });
      const inputUnits=generated.usage?.inputUnits??0,outputUnits=generated.usage?.outputUnits??0;
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,input_units,output_units,image_count,latency_ms,status)
        VALUES($1,$2,$3,$4,'IMAGE_GENERATION',$5,$6,$7,'image-v1',$8,$9,$10,1,$11,'SUCCEEDED')`,
        [runId,siteId,site.workspaceId,actor.id,generated.provider,route.model,generated.model,promptHash,inputUnits||null,outputUnits||null,Date.now()-started]);
      await this.governance.reconcile(reservation,inputUnits+outputUnits||reservation?.reservedUnits||1);
      await this.db.tx(async c=>{const locked=await this.db.site(c,actor,siteId,'EDIT_CONTENT');await this.db.audit(c,actor,locked,'asset.ai_generated',asset.id);});
      return {asset:{...asset,provenance:'GENERATED',providerName:generated.provider,modelId:generated.model,promptHash},runId};
    }catch(error){
      await this.governance.release(reservation);
      await this.db.pool.query(`INSERT INTO studio.ai_runs(id,site_id,workspace_id,user_id,feature,provider,model_requested,model_resolved,prompt_version,context_hash,image_count,latency_ms,status,error_code)
        VALUES($1,$2,$3,$4,'IMAGE_GENERATION',$5,$6,$6,'image-v1',$7,0,$8,'FAILED',$9)`,
        [runId,siteId,site.workspaceId,actor.id,route.provider,route.model,promptHash,Date.now()-started,String((error as any)?.code||'AI_IMAGE_FAILED').slice(0,80)]).catch(()=>undefined);
      throw error;
    }
  }
}
