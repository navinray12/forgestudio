import {createHash,createHmac} from 'node:crypto';
import {compileCanonicalToStaticBundle} from '../../services/destinations/staticCompiler.js';
import type {PublishingProvider,ProviderDeployment,ProviderStatus,ReleaseArtifact} from './releases.js';
import {StudioError} from './validation.js';

export interface ObjectPublishingConfig{
  name:'aws-s3'|'cloudflare-r2';
  endpoint:string;
  region:string;
  bucketPath?:string;
  accessKeyId:string;
  secretAccessKey:string;
  sessionToken?:string;
  publicBaseUrl:string;
  prefix?:string;
}
export type ObjectTransport=(url:string,init:RequestInit)=>Promise<{status:number;headers:Headers;text():Promise<string>}>;
const sha=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
const hmac=(key:Buffer|string,value:string)=>createHmac('sha256',key).update(value).digest();
function amzDate(date:Date){return date.toISOString().replace(/[:-]|\.\d{3}/g,'');}
function encodedPath(path:string){return '/'+path.split('/').filter(Boolean).map(encodeURIComponent).join('/');}

export class S3CompatiblePublishingProvider implements PublishingProvider{
  readonly name:string;
  private transport:ObjectTransport;
  constructor(private config:ObjectPublishingConfig,transport?:ObjectTransport){
    this.name=config.name;this.transport=transport??(async(url,init)=>fetch(url,init) as any);
    const endpoint=new URL(config.endpoint);
    const publicBase=new URL(config.publicBaseUrl);
    if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)throw new Error('Object publishing endpoint must use HTTPS without embedded credentials');
    if(publicBase.protocol!=='https:'||publicBase.username||publicBase.password)throw new Error('Object publishing public base URL must use HTTPS without embedded credentials');
    if(!config.accessKeyId||!config.secretAccessKey)throw new Error('Object publishing credentials are required');
  }
  private objectPath(key:string){
    const base=[this.config.bucketPath||'',this.config.prefix||'',key].filter(Boolean).join('/').replace(/\/+/g,'/');
    return encodedPath(base);
  }
  private async request(method:'PUT'|'GET',key:string,body?:Buffer|string,contentType='application/octet-stream'){
    const endpoint=new URL(this.config.endpoint),path=this.objectPath(key),date=new Date(),stamp=amzDate(date),day=stamp.slice(0,8),payload=body===undefined?'':body,payloadHash=sha(payload);
    const headers:Record<string,string>={'host':endpoint.host,'x-amz-content-sha256':payloadHash,'x-amz-date':stamp};
    if(body!==undefined)headers['content-type']=contentType;
    if(this.config.sessionToken)headers['x-amz-security-token']=this.config.sessionToken;
    const signedHeaders=Object.keys(headers).sort().join(';'),canonicalHeaders=Object.keys(headers).sort().map(k=>`${k}:${headers[k].trim()}\n`).join('');
    const canonical=`${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`,scope=`${day}/${this.config.region}/s3/aws4_request`,stringToSign=`AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${sha(canonical)}`;
    const kDate=hmac('AWS4'+this.config.secretAccessKey,day),kRegion=hmac(kDate,this.config.region),kService=hmac(kRegion,'s3'),kSigning=hmac(kService,'aws4_request'),signature=createHmac('sha256',kSigning).update(stringToSign).digest('hex');
    headers.authorization=`AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const url=new URL(path,endpoint).toString(),response=await this.transport(url,{method,headers,...(body!==undefined?{body:body as any}:{})});
    if(response.status<200||response.status>=300)throw new StudioError(`Object publishing provider returned HTTP ${response.status}`,502,'PUBLISHING_PROVIDER_ERROR');
    return response;
  }
  async deploy(input:{siteId:string;releaseId:string;artifact:ReleaseArtifact;checksum:string}):Promise<ProviderDeployment>{
    const bundle=compileCanonicalToStaticBundle(input.siteId,Number((input.artifact as any).version||1),input.artifact),releasePrefix=`releases/${input.releaseId}`;
    for(const file of bundle.files)await this.request('PUT',`${releasePrefix}/${file.path}`,Buffer.isBuffer(file.content)?file.content:Buffer.from(file.content,'utf8'),file.contentType);
    const manifest=JSON.stringify({releaseId:input.releaseId,siteId:input.siteId,artifactChecksum:input.checksum,files:bundle.files.map(f=>({path:f.path,sha256:sha(Buffer.isBuffer(f.content)?f.content:Buffer.from(f.content,'utf8')),size:f.size})),generatedAt:new Date().toISOString()});
    await this.request('PUT',`${releasePrefix}/_forgestudio-release.json`,manifest,'application/json');
    // Publish files to the active prefix only after the immutable release has been written.
    for(const file of bundle.files)await this.request('PUT',file.path,Buffer.isBuffer(file.content)?file.content:Buffer.from(file.content,'utf8'),file.contentType);
    await this.request('PUT','_forgestudio-release.json',manifest,'application/json');
    const base=this.config.publicBaseUrl.replace(/\/$/,'');
    return {reference:`${base}/`};
  }
  async status(input:{siteId:string;releaseId:string;reference:string;checksum:string}):Promise<ProviderStatus>{
    try{
      const response=await this.request('GET','_forgestudio-release.json'),body=JSON.parse(await response.text());
      const healthy=body?.siteId===input.siteId&&body?.releaseId===input.releaseId&&body?.artifactChecksum===input.checksum;
      return {healthy,checksum:healthy?String(body.artifactChecksum):undefined};
    }catch{return {healthy:false};}
  }
}
export function configuredExternalPublishingProvider(){
  const kind=(process.env.STUDIO_PUBLISHING_PROVIDER||'').toLowerCase();
  if(!['aws-s3','cloudflare-r2'].includes(kind))return null;
  const accessKeyId=process.env.STUDIO_OBJECT_ACCESS_KEY_ID||'',secretAccessKey=process.env.STUDIO_OBJECT_SECRET_ACCESS_KEY||'',publicBaseUrl=process.env.STUDIO_OBJECT_PUBLIC_BASE_URL||'';
  let endpoint=process.env.STUDIO_OBJECT_ENDPOINT||'',region=process.env.STUDIO_OBJECT_REGION||'',bucketPath=process.env.STUDIO_OBJECT_BUCKET_PATH;
  if(kind==='aws-s3'){
    const bucket=process.env.STUDIO_AWS_S3_BUCKET||'';region=region||process.env.AWS_REGION||'us-east-1';
    if(!endpoint&&bucket)endpoint=`https://${bucket}.s3.${region}.amazonaws.com`;
  }
  if(kind==='cloudflare-r2'){
    const account=process.env.STUDIO_CLOUDFLARE_ACCOUNT_ID||'',bucket=process.env.STUDIO_CLOUDFLARE_R2_BUCKET||'';region=region||'auto';
    if(!endpoint&&account)endpoint=`https://${account}.r2.cloudflarestorage.com`;
    bucketPath=bucketPath||bucket||undefined;
  }
  if(!endpoint||!accessKeyId||!secretAccessKey||!publicBaseUrl)throw new Error('Configured external publishing provider is missing endpoint, credentials, or public base URL');
  return new S3CompatiblePublishingProvider({name:kind as any,endpoint,region,bucketPath,accessKeyId,secretAccessKey,sessionToken:process.env.STUDIO_OBJECT_SESSION_TOKEN,publicBaseUrl,prefix:process.env.STUDIO_OBJECT_PREFIX});
}
