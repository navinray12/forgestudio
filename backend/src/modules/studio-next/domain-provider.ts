import {isIP} from 'node:net';
import {StudioError} from './validation.js';

export interface DomainProvisionResult {reference:string;tlsState:'PENDING'|'ACTIVE'}
export interface DomainHealth {hostingState:'PROVISIONING'|'ACTIVE'|'FAILED';tlsState:'PENDING'|'ACTIVE'|'FAILED';errorCode?:string}
export interface DomainProvider{
  readonly name:string;
  provision(input:{siteId:string;hostname:string;canonical:boolean;redirectToCanonical:boolean}):Promise<DomainProvisionResult>;
  status(input:{siteId:string;hostname:string;reference:string}):Promise<DomainHealth>;
  remove(input:{siteId:string;hostname:string;reference:string}):Promise<void>;
}
function privateHost(host:string){
  const h=host.toLowerCase();if(h==='localhost'||h.endsWith('.local')||h.endsWith('.internal'))return true;
  if(isIP(h)&&(h==='127.0.0.1'||h==='::1'||h.startsWith('10.')||h.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[01])\./.test(h)||h.startsWith('169.254.')))return true;
  return false;
}
export class HttpDomainProvider implements DomainProvider{
  readonly name='external-domain-control';private endpoint:URL;
  constructor(baseUrl:string,private token:string){
    const url=new URL(baseUrl);if(url.protocol!=='https:'||url.username||url.password||privateHost(url.hostname))throw new Error('STUDIO_DOMAIN_PROVIDER_URL must be a public HTTPS origin');
    this.endpoint=url;
  }
  private async request(path:string,method:string,body?:unknown){
    const response=await fetch(new URL(path,this.endpoint),{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value:any=await response.json().catch(()=>({}));if(!response.ok)throw new StudioError('Domain provider request failed',502,'DOMAIN_PROVIDER_ERROR');return value;
  }
  async provision(input:{siteId:string;hostname:string;canonical:boolean;redirectToCanonical:boolean}):Promise<DomainProvisionResult>{
    const r=await this.request('/v1/domains','POST',input);if(typeof r.reference!=='string'||!r.reference||!['PENDING','ACTIVE'].includes(r.tlsState))throw new StudioError('Domain provider returned invalid provisioning data',502,'DOMAIN_PROVIDER_ERROR');
    return {reference:r.reference,tlsState:r.tlsState};
  }
  async status(input:{siteId:string;hostname:string;reference:string}):Promise<DomainHealth>{
    const r=await this.request(`/v1/domains/${encodeURIComponent(input.reference)}?siteId=${encodeURIComponent(input.siteId)}&hostname=${encodeURIComponent(input.hostname)}`,'GET');
    if(!['PROVISIONING','ACTIVE','FAILED'].includes(r.hostingState)||!['PENDING','ACTIVE','FAILED'].includes(r.tlsState))throw new StudioError('Domain provider returned invalid health data',502,'DOMAIN_PROVIDER_ERROR');
    return {hostingState:r.hostingState,tlsState:r.tlsState,...(typeof r.errorCode==='string'?{errorCode:r.errorCode.slice(0,120)}:{})};
  }
  async remove(input:{siteId:string;hostname:string;reference:string}){await this.request(`/v1/domains/${encodeURIComponent(input.reference)}`,'DELETE',{siteId:input.siteId,hostname:input.hostname});}
}
export function configuredDomainProvider():DomainProvider|null{
  return process.env.STUDIO_DOMAIN_PROVIDER_URL&&process.env.STUDIO_DOMAIN_PROVIDER_TOKEN?new HttpDomainProvider(process.env.STUDIO_DOMAIN_PROVIDER_URL,process.env.STUDIO_DOMAIN_PROVIDER_TOKEN):null;
}
