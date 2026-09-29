import {isIP} from 'node:net';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import {designOnly,StudioError} from './validation.js';

export type QualitySeverity='ERROR'|'WARNING';
export interface QualityFinding {code:string;severity:QualitySeverity;message:string;pageId?:string;elementId?:string;viewport?:number}
export interface VisualValidationResult {findings:QualityFinding[];screenshots?:Record<string,string>;provider:string}
export interface VisualValidationProvider {readonly name:string;inspect(input:{siteId:string;design:Record<string,unknown>;viewports:number[];timeoutMs:number}):Promise<VisualValidationResult>}

function privateHost(host:string){
  const h=host.toLowerCase();if(h==='localhost'||h.endsWith('.local')||h.endsWith('.internal'))return true;
  if(isIP(h)&&(h==='127.0.0.1'||h==='::1'||h.startsWith('10.')||h.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[01])\./.test(h)||h.startsWith('169.254.')))return true;
  return false;
}
export class HttpVisualValidationProvider implements VisualValidationProvider{
  readonly name='isolated-browser-validator';private endpoint:URL;
  constructor(baseUrl:string,private token:string){
    const u=new URL(baseUrl);if(u.protocol!=='https:'||u.username||u.password||privateHost(u.hostname))throw new Error('STUDIO_VISUAL_QA_URL must be a public HTTPS origin');
    this.endpoint=new URL('/v1/inspect',u);
  }
  async inspect(input:{siteId:string;design:Record<string,unknown>;viewports:number[];timeoutMs:number}):Promise<VisualValidationResult>{
    const r=await fetch(this.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(input.timeoutMs),headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:JSON.stringify({siteId:input.siteId,document:input.design,viewports:input.viewports,checks:['horizontal-overflow','clipped-text','missing-assets','broken-links','invalid-html','contrast','alt-text','form-labels','heading-order','focus']})});
    const body:any=await r.json().catch(()=>({}));if(!r.ok)throw new StudioError('Visual validation provider failed',502,'VISUAL_QA_PROVIDER_ERROR');
    const schema=z.object({findings:z.array(z.object({code:z.string().max(80),severity:z.enum(['ERROR','WARNING']),message:z.string().max(1000),pageId:z.string().max(150).optional(),elementId:z.string().max(150).optional(),viewport:z.number().int().min(240).max(5000).optional()}).strict()).max(1000),screenshots:z.record(z.string(),z.string().url()).optional()}).strict();
    const parsed=schema.safeParse(body);if(!parsed.success)throw new StudioError('Visual validation provider returned invalid data',502,'VISUAL_QA_PROVIDER_ERROR');
    return {...parsed.data,provider:this.name};
  }
}
export function configuredVisualValidationProvider():VisualValidationProvider|null{
  return process.env.STUDIO_VISUAL_QA_URL&&process.env.STUDIO_VISUAL_QA_TOKEN?new HttpVisualValidationProvider(process.env.STUDIO_VISUAL_QA_URL,process.env.STUDIO_VISUAL_QA_TOKEN):null;
}

function textOf(node:any){return typeof node?.content==='string'?node.content.replace(/<[^>]*>/g,'').trim():'';}
function numericPx(value:unknown){if(typeof value==='number')return value;if(typeof value==='string'&&/^\d+(?:\.\d+)?px$/.test(value))return Number(value.slice(0,-2));return null;}
export function inspectDesign(design:Record<string,unknown>):QualityFinding[]{
  const findings:QualityFinding[]=[],ids=new Set<string>(),headings:Record<string,number[]>={};
  function visit(node:any,pageId?:string){
    if(!node||typeof node!=='object')return;
    const id=typeof node.id==='string'?node.id:undefined;
    if(id){if(ids.has(id))findings.push({code:'DUPLICATE_ID',severity:'ERROR',message:'Stable element ID is duplicated.',pageId,elementId:id});ids.add(id);}
    const type=String(node.type||'').toLowerCase();
    if((type==='image'||type==='img')&&!node.alt&&!node.attributes?.['aria-hidden'])findings.push({code:'IMAGE_ALT_MISSING',severity:'WARNING',message:'Image has no alternative text. Mark decorative images aria-hidden or provide meaningful alt text.',pageId,elementId:id});
    if(/^h[1-6]$/.test(type)||type==='heading'){
      if(!textOf(node))findings.push({code:'HEADING_EMPTY',severity:'WARNING',message:'Heading has no readable text.',pageId,elementId:id});
      const level=/^h([1-6])$/.exec(type)?.[1];if(level)(headings[pageId||'root']??=[]).push(Number(level));
    }
    if((type==='button'||node.semanticTag==='button')&&!textOf(node)&&!node.attributes?.['aria-label'])findings.push({code:'BUTTON_NAME_MISSING',severity:'WARNING',message:'Button has no accessible name.',pageId,elementId:id});
    const href=node.href??node.attributes?.href;if(typeof href==='string'&&/^javascript:/i.test(href))findings.push({code:'UNSAFE_LINK',severity:'ERROR',message:'javascript: links are not allowed.',pageId,elementId:id});
    const width=numericPx(node.styles?.width);if(width&&width>1440&&!node.responsiveOverrides?.mobile?.width)findings.push({code:'FIXED_WIDTH_OVERFLOW_RISK',severity:'WARNING',message:`Fixed width ${width}px has no mobile override.`,pageId,elementId:id,viewport:390});
    if(Array.isArray(node.interactions)&&node.interactions.some((x:any)=>['transform','position','size'].includes(x?.action)&&!x?.reducedMotion))findings.push({code:'REDUCED_MOTION_POLICY_MISSING',severity:'WARNING',message:'Motion interaction should define reduced-motion behavior.',pageId,elementId:id});
    if(Array.isArray(node.children))node.children.forEach((child:any)=>visit(child,pageId));
  }
  const pages=Array.isArray(design.pages)?design.pages as any[]:[];
  pages.forEach(page=>(page.elements||[]).forEach((node:any)=>visit(node,page.id)));
  if(Array.isArray(design.elements))(design.elements as any[]).forEach(node=>visit(node));
  for(const [pageId,levels] of Object.entries(headings)){for(let i=1;i<levels.length;i++)if(levels[i]>levels[i-1]+1)findings.push({code:'HEADING_ORDER_SKIP',severity:'WARNING',message:`Heading level jumps from h${levels[i-1]} to h${levels[i]}.`,pageId:pageId==='root'?undefined:pageId});}
  return findings.slice(0,1000);
}

export class Quality{
  constructor(private db:Database,private provider:VisualValidationProvider|null=configuredVisualValidationProvider()){}
  async inspect(actor:Actor,siteId:string,visual=false){
    const design=await this.db.tx(async c=>{await this.db.site(c,actor,siteId,'VIEW');const r=await c.query('SELECT "editorData" FROM public.websites WHERE id=$1',[siteId]);return designOnly(r.rows[0].editorData||{});});
    const deterministic=inspectDesign(design);
    if(!visual)return {deterministic,visual:{configured:!!this.provider,executed:false,findings:[]},blocking:deterministic.filter(x=>x.severity==='ERROR').length};
    if(!this.provider)throw new StudioError('Visual screenshot validation is not configured',503,'VISUAL_QA_NOT_CONFIGURED');
    const result=await this.provider.inspect({siteId,design,viewports:[1440,1024,768,390,360],timeoutMs:90000});
    await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,'VIEW');await this.db.audit(c,actor,site,'quality.visual_inspected',`${result.findings.length} findings`);});
    return {deterministic,visual:{configured:true,executed:true,...result},blocking:[...deterministic,...result.findings].filter(x=>x.severity==='ERROR').length};
  }
}
