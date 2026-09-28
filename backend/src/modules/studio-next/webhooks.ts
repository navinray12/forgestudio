import {createCipheriv,createDecipheriv,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {z} from 'zod';
import {Database,type Actor,type Client} from './database.js';
import {parse,uuid,StudioError,jsonObject} from './validation.js';

export interface WebhookTransportResult {status:number;body:string}
export type WebhookTransport=(input:{url:string;body:string;headers:Record<string,string>} )=>Promise<WebhookTransportResult>;
export type HostResolver=(hostname:string)=>Promise<string[]>;
export interface WebhookConfig {masterKey?:Buffer|null;transport?:WebhookTransport;resolveHost?:HostResolver;maxAttempts?:number}
export interface EventOutbox {emit(c:Client,siteId:string,eventType:string,payload:Record<string,unknown>):Promise<string>}

const endpointInput=z.object({
  url:z.string().url().max(2000),
  events:z.array(z.union([z.literal('*'),z.string().regex(/^[a-z][a-z0-9_.-]{1,99}$/)])).min(1).max(50).transform(v=>[...new Set(v)]),
}).strict();
const eventName=z.string().regex(/^[a-z][a-z0-9_.-]{1,99}$/);
const MAX_RESPONSE=500;

function configuredMasterKey():Buffer|null{
  const raw=process.env.STUDIO_WEBHOOK_MASTER_KEY;if(!raw)return null;
  try{const key=Buffer.from(raw,'base64');return key.length===32?key:null;}catch{return null;}
}
export function configuredWebhookConfig():WebhookConfig{return {masterKey:configuredMasterKey()};}

function privateIp(address:string):boolean{
  address=address.replace(/^\[|\]$/g,'').toLowerCase();
  if(address==='::1'||address==='0:0:0:0:0:0:0:1'||address==='0.0.0.0')return true;
  if(address.startsWith('fc')||address.startsWith('fd')||address.startsWith('fe8')||address.startsWith('fe9')||address.startsWith('fea')||address.startsWith('feb'))return true;
  if(isIP(address)===4){
    const [a,b]=address.split('.').map(Number);
    return a===10||a===127||a===0||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a>=224);
  }
  return false;
}
export function validateWebhookUrl(raw:string){
  let u:URL;try{u=new URL(raw);}catch{throw new StudioError('Enter a valid webhook URL',400,'INVALID_WEBHOOK_URL');}
  if(u.username||u.password||u.hash)throw new StudioError('Webhook URLs cannot contain credentials or fragments',400,'INVALID_WEBHOOK_URL');
  const test=process.env.NODE_ENV==='test';
  if(u.protocol!=='https:'&&!(test&&u.protocol==='http:'))throw new StudioError('Webhook endpoints must use HTTPS',400,'INVALID_WEBHOOK_URL');
  if(['localhost','localhost.localdomain'].includes(u.hostname.toLowerCase())||isIP(u.hostname)&&privateIp(u.hostname))throw new StudioError('Webhook endpoints cannot target local or private addresses',400,'INVALID_WEBHOOK_URL');
  return u;
}
async function defaultResolver(hostname:string){return (await lookup(hostname,{all:true,verbatim:true})).map(x=>x.address);}
async function assertPublicDestination(url:string,resolver:HostResolver){
  const u=validateWebhookUrl(url),addresses=await resolver(u.hostname);
  if(!addresses.length||addresses.some(privateIp))throw new StudioError('Webhook hostname resolves to a private or unsafe address',400,'WEBHOOK_SSRF_BLOCKED');
}
async function defaultTransport(input:{url:string;body:string;headers:Record<string,string>}):Promise<WebhookTransportResult>{
  const r=await fetch(input.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:input.headers,body:input.body});
  return {status:r.status,body:(await r.text()).slice(0,MAX_RESPONSE)};
}
function encrypt(secret:string,key:Buffer){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]),tag=cipher.getAuthTag();
  return {iv,ciphertext:Buffer.concat([encrypted,tag])};
}
function decrypt(iv:Buffer,ciphertext:Buffer,key:Buffer){
  if(ciphertext.length<17)throw new Error('invalid ciphertext');
  const tag=ciphertext.subarray(ciphertext.length-16),data=ciphertext.subarray(0,ciphertext.length-16),decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');
}
export function verifyWebhookSignature(body:string,header:string|undefined,secret:string,maxAgeSeconds=300){
  if(!header)throw new StudioError('Webhook signature is missing',400,'SIGNATURE_INVALID');
  const parts=Object.fromEntries(header.split(',').map(p=>p.split('=',2) as [string,string])),stamp=Number(parts.t),sig=parts.v1;
  if(!Number.isInteger(stamp)||!sig||Math.abs(Math.floor(Date.now()/1000)-stamp)>maxAgeSeconds)throw new StudioError('Webhook signature is invalid or expired',400,'SIGNATURE_INVALID');
  const expected=createHmac('sha256',secret).update(`${stamp}.${body}`).digest('hex');
  if(sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw new StudioError('Webhook signature is invalid',400,'SIGNATURE_INVALID');
  return true;
}

export class Webhooks implements EventOutbox{
  private key:Buffer|null;private transport:WebhookTransport;private resolver:HostResolver;private maxAttempts:number;
  constructor(private db:Database,config:WebhookConfig={}){
    this.key=config.masterKey===undefined?configuredMasterKey():config.masterKey;
    this.transport=config.transport??defaultTransport;this.resolver=config.resolveHost??defaultResolver;this.maxAttempts=Math.max(1,Math.min(config.maxAttempts??8,12));
  }
  private requireKey(){if(!this.key||this.key.length!==32)throw new StudioError('Webhooks are not configured. Set a 32-byte base64 STUDIO_WEBHOOK_MASTER_KEY.',503,'WEBHOOKS_NOT_CONFIGURED');return this.key;}
  async list(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'MANAGE_SETTINGS');
      const endpoints=await c.query(`SELECT id,url,events,enabled,created_at AS "createdAt" FROM studio.webhook_endpoints WHERE site_id=$1 ORDER BY created_at DESC`,[siteId]);
      const deliveries=await c.query(`SELECT d.id,d.state,d.attempts,d.response_status AS "responseStatus",d.last_error AS "lastError",d.delivered_at AS "deliveredAt",d.created_at AS "createdAt",e.event_type AS "eventType",w.url
        FROM studio.webhook_deliveries d JOIN studio.webhook_events e ON e.id=d.event_id JOIN studio.webhook_endpoints w ON w.id=d.endpoint_id WHERE e.site_id=$1 ORDER BY d.created_at DESC LIMIT 100`,[siteId]);
      return {endpoints:endpoints.rows,deliveries:deliveries.rows,configured:!!this.key};
    });
  }
  async create(actor:Actor,siteId:string,input:unknown){
    const b=parse(endpointInput,input),key=this.requireKey(),url=validateWebhookUrl(b.url).toString(),secret=randomBytes(32).toString('hex'),sealed=encrypt(secret,key),id=randomUUID();
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      await c.query(`INSERT INTO studio.webhook_endpoints(id,site_id,url,events,secret_iv,secret_ciphertext,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,siteId,url,b.events,sealed.iv,sealed.ciphertext,actor.id]);
      await this.db.audit(c,actor,site,'webhook.endpoint_created',url);
      return {id,url,events:b.events,secret};
    });
  }
  async test(actor:Actor,siteId:string,endpointId:string){
    parse(uuid,endpointId);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      const endpoint=await c.query('SELECT id FROM studio.webhook_endpoints WHERE id=$1 AND site_id=$2 AND enabled',[endpointId,siteId]);
      if(!endpoint.rows[0])throw new StudioError('Webhook endpoint not found',404,'NOT_FOUND');
      const eventId=randomUUID(),deliveryId=randomUUID();
      await c.query(`INSERT INTO studio.webhook_events(id,site_id,event_type,payload) VALUES($1,$2,'webhook.test',$3::jsonb)`,[eventId,siteId,JSON.stringify({message:'ForgeStudio webhook test',endpointId})]);
      await c.query('INSERT INTO studio.webhook_deliveries(id,event_id,endpoint_id) VALUES($1,$2,$3)',[deliveryId,eventId,endpointId]);
      await this.db.audit(c,actor,site,'webhook.test_queued',endpointId);return {deliveryId};
    });
  }
  async remove(actor:Actor,siteId:string,endpointId:string){
    parse(uuid,endpointId);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      const r=await c.query('DELETE FROM studio.webhook_endpoints WHERE id=$1 AND site_id=$2 RETURNING url',[endpointId,siteId]);
      if(!r.rows[0])throw new StudioError('Webhook endpoint not found',404,'NOT_FOUND');
      await this.db.audit(c,actor,site,'webhook.endpoint_deleted',r.rows[0].url);return {};
    });
  }
  async emit(c:Client,siteId:string,eventType:string,payload:Record<string,unknown>){
    const type=parse(eventName,eventType),data=jsonObject(payload),eventId=randomUUID();
    await c.query('INSERT INTO studio.webhook_events(id,site_id,event_type,payload) VALUES($1,$2,$3,$4::jsonb)',[eventId,siteId,type,JSON.stringify(data)]);
    const endpoints=await c.query(`SELECT id FROM studio.webhook_endpoints WHERE site_id=$1 AND enabled AND ($2=ANY(events) OR '*'=ANY(events))`,[siteId,type]);
    for(const endpoint of endpoints.rows)await c.query('INSERT INTO studio.webhook_deliveries(id,event_id,endpoint_id) VALUES($1,$2,$3)',[randomUUID(),eventId,endpoint.id]);
    return eventId;
  }
  async redeliver(actor:Actor,siteId:string,deliveryId:string){
    parse(uuid,deliveryId);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'MANAGE_SETTINGS',true);
      const r=await c.query(`UPDATE studio.webhook_deliveries d SET state='QUEUED',attempts=0,next_attempt_at=now(),response_status=NULL,response_excerpt=NULL,last_error=NULL,delivered_at=NULL
        FROM studio.webhook_events e WHERE d.id=$1 AND d.event_id=e.id AND e.site_id=$2 RETURNING d.id`,[deliveryId,siteId]);
      if(!r.rows[0])throw new StudioError('Webhook delivery not found',404,'NOT_FOUND');
      await this.db.audit(c,actor,site,'webhook.delivery_redelivered',deliveryId);return {};
    });
  }
  async deliverDue():Promise<{delivered:number;retried:number;dead:number}>{
    if(!this.key){
      const pending=await this.db.pool.query("SELECT 1 FROM studio.webhook_deliveries WHERE state IN ('QUEUED','DELIVERING') LIMIT 1");
      if(!pending.rowCount)return {delivered:0,retried:0,dead:0};
    }
    const key=this.requireKey();let delivered=0,retried=0,dead=0;
    for(let iteration=0;iteration<25;iteration++){
      const claimed=await this.db.tx(async c=>{
        const r=await c.query(`SELECT d.id,d.attempts,w.url,w.secret_iv,w.secret_ciphertext,e.id AS event_id,e.event_type,e.payload,e.created_at
          FROM studio.webhook_deliveries d JOIN studio.webhook_endpoints w ON w.id=d.endpoint_id JOIN studio.webhook_events e ON e.id=d.event_id
          WHERE ((d.state='QUEUED' AND d.next_attempt_at<=now()) OR (d.state='DELIVERING' AND d.next_attempt_at<=now())) AND w.enabled ORDER BY d.next_attempt_at,d.id FOR UPDATE OF d SKIP LOCKED LIMIT 1`);
        if(!r.rows[0])return null;
        await c.query("UPDATE studio.webhook_deliveries SET state='DELIVERING',attempts=attempts+1,next_attempt_at=now()+interval '2 minutes' WHERE id=$1",[r.rows[0].id]);return r.rows[0];
      });
      if(!claimed)break;
      let status:number|undefined,excerpt='',errorCode='';
      try{
        await assertPublicDestination(claimed.url,this.resolver);
        const secret=decrypt(Buffer.from(claimed.secret_iv),Buffer.from(claimed.secret_ciphertext),key);
        const body=JSON.stringify({id:claimed.event_id,type:claimed.event_type,createdAt:new Date(claimed.created_at).toISOString(),data:claimed.payload}),stamp=Math.floor(Date.now()/1000),signature=createHmac('sha256',secret).update(`${stamp}.${body}`).digest('hex');
        const response=await this.transport({url:claimed.url,body,headers:{'Content-Type':'application/json','User-Agent':'ForgeStudio-Webhooks/1.0','X-ForgeStudio-Event':claimed.event_type,'X-ForgeStudio-Signature':`t=${stamp},v1=${signature}`}});
        status=response.status;excerpt=response.body.slice(0,MAX_RESPONSE);
        if(status>=200&&status<300){
          await this.db.pool.query("UPDATE studio.webhook_deliveries SET state='DELIVERED',response_status=$2,response_excerpt=$3,last_error=NULL,delivered_at=now() WHERE id=$1",[claimed.id,status,excerpt]);delivered++;continue;
        }
        errorCode=`HTTP_${status}`;
      }catch(error){errorCode=(error as any)?.code||'DELIVERY_FAILED';excerpt=String((error as any)?.message||'delivery failed').slice(0,MAX_RESPONSE);}
      const attempt=Number(claimed.attempts)+1;
      if(attempt>=this.maxAttempts){
        await this.db.pool.query("UPDATE studio.webhook_deliveries SET state='DEAD',response_status=$2,response_excerpt=$3,last_error=$4 WHERE id=$1",[claimed.id,status??null,excerpt,errorCode]);dead++;
      }else{
        const seconds=Math.min(3600,30*Math.pow(2,Math.max(0,attempt-1)));
        await this.db.pool.query("UPDATE studio.webhook_deliveries SET state='QUEUED',response_status=$2,response_excerpt=$3,last_error=$4,next_attempt_at=now()+($5||' seconds')::interval WHERE id=$1",[claimed.id,status??null,excerpt,errorCode,String(seconds)]);retried++;
      }
    }
    return {delivered,retried,dead};
  }
  async retain(){
    const r=await this.db.pool.query(`DELETE FROM studio.webhook_events e WHERE e.created_at<now()-interval '90 days'
      AND NOT EXISTS(SELECT 1 FROM studio.webhook_deliveries d WHERE d.event_id=e.id AND d.state IN ('QUEUED','DELIVERING'))`);
    return {deleted:r.rowCount??0};
  }
}
