import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database,type Actor } from './database.js';
import { parse,designOnly,digest,jsonObject,uuid,StudioError } from './validation.js';
import { contentOnly } from './design-policy.js';
import { validateVariables,validateClasses } from '../../services/tokens/designToken.service.js';

export type CommandSource='HUMAN'|'AI'|'SYSTEM';
export interface CommandMetadata { source:CommandSource; operationId?:string; correlationId?:string; timestamp?:string; validatedContentCommand?:boolean; }
export interface DesignSaveResult extends Record<string,unknown> { hash:string; operationId:string; correlationId:string; replayed:boolean; }
const stableId=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9:_-]{0,149}$/);
const pageSlug=z.string().min(1).max(180).regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/);
const pageDefinition=z.object({
  id:stableId,name:z.string().trim().min(1).max(120),slug:pageSlug,elements:z.array(z.record(z.string(),z.unknown())).max(500),
  pageSettings:z.record(z.string(),z.unknown()).optional(),customCss:z.string().max(50000).optional(),isHome:z.boolean().optional(),
}).strict();
const pagePatch=z.object({
  name:z.string().trim().min(1).max(120).optional(),slug:pageSlug.optional(),
  pageSettings:z.record(z.string(),z.unknown()).optional(),customCss:z.string().max(50000).optional(),
}).strict().refine(v=>Object.keys(v).length>0,'At least one page field is required');
const designCommand=z.discriminatedUnion('type',[
  z.object({type:z.literal('SET_ELEMENT_TEXT'),elementId:stableId,field:z.enum(['content','text','alt']),value:z.string().max(20000)}).strict(),
  z.object({type:z.literal('SET_STYLE'),elementId:stableId,property:z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,79}$/),value:z.union([z.string().max(500),z.number(),z.null()])}).strict(),
  z.object({type:z.literal('UNSET_STYLE'),elementId:stableId,property:z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,79}$/)}).strict(),
  z.object({type:z.literal('ADD_ELEMENT'),parentId:stableId.nullable().default(null),afterId:stableId.nullable().default(null),element:z.record(z.string(),z.unknown())}).strict(),
  z.object({type:z.literal('REMOVE_ELEMENT'),elementId:stableId}).strict(),
  z.object({type:z.literal('CREATE_PAGE'),page:pageDefinition}).strict(),
  z.object({type:z.literal('UPDATE_PAGE'),pageId:stableId,patch:pagePatch}).strict(),
  z.object({type:z.literal('UPDATE_PAGE_SETTINGS'),pageId:stableId,settings:z.record(z.string(),z.unknown())}).strict(),
  z.object({type:z.literal('DELETE_PAGE'),pageId:stableId}).strict(),
  z.object({type:z.literal('REORDER_PAGES'),pageIds:z.array(stableId).min(1).max(200)}).strict(),
  z.object({type:z.literal('SET_HOME_PAGE'),pageId:stableId}).strict(),
  z.object({type:z.literal('SET_DESIGN_SYSTEM'),variables:z.array(z.record(z.string(),z.unknown())).max(250),classes:z.array(z.record(z.string(),z.unknown())).max(250)}).strict(),
  z.object({type:z.literal('SET_CMS_BINDING'),elementId:stableId,binding:z.object({collectionId:uuid,field:z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),target:z.enum(['content','src','alt','href']),itemSlug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160).optional()}).strict().nullable()}).strict(),
  z.object({type:z.literal('UPSERT_COMPONENT'),componentId:stableId,name:z.string().trim().min(1).max(120),element:z.record(z.string(),z.unknown()),slots:z.array(z.string().regex(/^[A-Za-z0-9_-]{1,80}$/)).max(50).default([])}).strict(),
  z.object({type:z.literal('CREATE_COMPONENT_VARIANT'),componentId:stableId,variant:z.object({id:stableId,name:z.string().trim().min(1).max(120),element:z.record(z.string(),z.unknown())}).strict()}).strict(),
  z.object({type:z.literal('INSTANTIATE_COMPONENT'),componentId:stableId,variantId:stableId.optional(),instanceId:stableId,parentId:stableId.nullable().default(null),afterId:stableId.nullable().default(null)}).strict(),
  z.object({type:z.literal('DETACH_COMPONENT'),elementId:stableId}).strict(),
  z.object({type:z.literal('SET_COMPONENT_SLOT'),elementId:stableId,slotName:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/).nullable()}).strict(),
]);
const commandBatch=z.object({
  baseHash:z.string().regex(/^[a-f0-9]{64}$/),
  commands:z.array(designCommand).min(1).max(100),
  operationId:z.string().uuid(),
  correlationId:z.string().uuid().optional(),
  timestamp:z.string().datetime().optional(),
}).strict();
export type DesignCommand=z.infer<typeof designCommand>;

const saveInput=z.object({
  baseHash:z.string().regex(/^[a-f0-9]{64}$/),
  editorData:z.record(z.string(),z.unknown()),
  operationId:z.string().uuid().optional(),
  correlationId:z.string().uuid().optional(),
  timestamp:z.string().datetime().optional(),
}).strict();

function protectedNodes(value:any,result=new Map<string,any>()):Map<string,any>{
  if(Array.isArray(value))value.forEach(v=>protectedNodes(v,result));
  else if(value&&typeof value==='object'){if(typeof value.id==='string'&&value.isProtected)result.set(value.id,value);Object.values(value).forEach(v=>protectedNodes(v,result));}
  return result;
}
function allById(value:any,id:string,result:any[]=[]):any[]{
  if(!value||typeof value!=='object')return result;
  if(value.id===id)result.push(value);
  for(const child of Object.values(value))allById(child,id,result);
  return result;
}


function cloneJson<T>(value:T):T{return JSON.parse(JSON.stringify(value));}
function collectIds(value:any,result=new Set<string>()):Set<string>{
  if(!value||typeof value!=='object')return result;
  if(typeof value.id==='string'){if(result.has(value.id))throw new StudioError('Design contains duplicate element IDs',409,'DUPLICATE_ELEMENT_ID');result.add(value.id);}
  for(const [key,child] of Object.entries(value))if(key!=='components')collectIds(child,result);return result;
}
function findNodes(value:any,id:string,result:any[]=[]):any[]{
  if(!value||typeof value!=='object')return result;
  if(value.id===id)result.push(value);
  for(const child of Object.values(value))findNodes(child,id,result);return result;
}
function removeNode(container:any,id:string):boolean{
  if(!container||typeof container!=='object')return false;
  for(const key of ['elements','children']){
    const list=container[key];
    if(Array.isArray(list)){
      const index=list.findIndex((x:any)=>x?.id===id);
      if(index>=0){list.splice(index,1);return true;}
      for(const child of list)if(removeNode(child,id))return true;
    }
  }
  if(Array.isArray(container.pages))for(const page of container.pages)if(removeNode(page,id))return true;
  return false;
}
function rootElements(design:any):any[]{if(!Array.isArray(design.elements))design.elements=[];return design.elements;}
const RESERVED_PAGE_PATHS=new Set(['/api','/admin','/super-admin','/login','/signup','/editor','/dashboard','/subscriptions']);
function pagesOf(design:any):any[]{if(!Array.isArray(design.pages))design.pages=[];return design.pages;}
function pageSlugFromName(name:string,pages:any[],excludeId?:string):string{
  const stem=name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'page';
  let slug='/'+stem,index=2;const used=new Set(pages.filter(p=>p.id!==excludeId).map(p=>String(p.slug).toLowerCase()));
  while(used.has(slug)||RESERVED_PAGE_PATHS.has(slug))slug='/'+stem+'-'+index++;
  return slug;
}
function validatePageSlugValue(slug:string,pages:any[],pageId?:string,isHome=false){
  if(RESERVED_PAGE_PATHS.has(slug))throw new StudioError('Page slug is reserved',409,'PAGE_SLUG_RESERVED');
  const duplicate=pages.find(p=>p.id!==pageId&&String(p.slug).toLowerCase()===slug.toLowerCase());
  if(duplicate)throw new StudioError('Page slug already exists',409,'PAGE_SLUG_CONFLICT');
  if(slug==='/'&&!isHome)throw new StudioError('Only the home page may use the root slug',409,'PAGE_HOME_REQUIRED');
}
function pageReferenced(value:any,pageId:string):boolean{
  if(Array.isArray(value))return value.some(v=>pageReferenced(v,pageId));
  if(!value||typeof value!=='object')return value===`page:${pageId}`;
  for(const [key,v] of Object.entries(value)){
    if((key==='pageId'||key==='linkPageId')&&v===pageId)return true;
    if(typeof v==='string'&&v===`page:${pageId}`)return true;
    if(pageReferenced(v,pageId))return true;
  }
  return false;
}
function normalizeHome(pages:any[],homePageId:string|undefined){
  if(!pages.length)return {pages,homePageId:undefined};
  let target=pages.find(p=>p.id===homePageId)||pages.find(p=>p.isHome)||pages[0];
  for(const p of pages){
    p.isHome=p.id===target.id;
    if(p.isHome)p.slug='/';
    else if(p.slug==='/')p.slug=pageSlugFromName(String(p.name||'Page'),pages,p.id);
    p.pageSettings={...(p.pageSettings||{}),title:p.pageSettings?.title||p.name,path:p.slug};
  }
  return {pages,homePageId:target.id};
}
function ensureStableElementTree(elements:any[],pageId?:string,ids=new Set<string>()){
  for(const element of elements){
    if(!element||typeof element!=='object'||typeof element.id!=='string'||!stableId.safeParse(element.id).success||typeof element.type!=='string'||element.type.length>80)throw new StudioError('Generated page elements require stable IDs and types',400,'INVALID_ELEMENT');
    if(ids.has(element.id))throw new StudioError('Element tree contains duplicate stable IDs',409,'DUPLICATE_ELEMENT_ID');ids.add(element.id);
    if(Array.isArray(element.children))ensureStableElementTree(element.children,pageId,ids);
  }
}
function componentsOf(design:any):Record<string,any>{if(!design.components||typeof design.components!=='object'||Array.isArray(design.components))design.components={};return design.components;}
function validateComponentLibrary(design:any){
  const components=design.components;if(components===undefined)return;
  if(!components||typeof components!=='object'||Array.isArray(components)||Object.keys(components).length>250)throw new StudioError('Component library is invalid or exceeds 250 definitions',400,'INVALID_COMPONENT_LIBRARY');
  for(const [id,definition] of Object.entries(components) as [string,any][]){
    if(!stableId.safeParse(id).success||!definition||typeof definition!=='object'||typeof definition.name!=='string'||definition.name.length<1||definition.name.length>120||!definition.element)throw new StudioError('Component definition is invalid',400,'INVALID_COMPONENT_LIBRARY');
    ensureStableElementTree([definition.element]);
    const slots=definition.slots??[];if(!Array.isArray(slots)||slots.length>50||new Set(slots).size!==slots.length||slots.some((x:any)=>typeof x!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(x)))throw new StudioError('Component slots are invalid',400,'INVALID_COMPONENT_LIBRARY');
    const variants=definition.variants??{};if(!variants||typeof variants!=='object'||Array.isArray(variants)||Object.keys(variants).length>50)throw new StudioError('Component variants are invalid',400,'INVALID_COMPONENT_LIBRARY');
    for(const [variantId,variant] of Object.entries(variants) as [string,any][]){if(!stableId.safeParse(variantId).success||variant?.id!==variantId||typeof variant?.name!=='string'||!variant?.element)throw new StudioError('Component variant is invalid',400,'INVALID_COMPONENT_LIBRARY');ensureStableElementTree([variant.element]);}
  }
}
function cloneComponentInstance(node:any,componentId:string,instanceId:string,root=true):any{
  const copy=cloneJson(node),sourceId=String(copy.id||'node'),nextId=root?instanceId:`${instanceId}:${sourceId}`.slice(0,150);
  copy.id=nextId;copy.componentId=componentId;copy.isComponent=true;
  if(Array.isArray(copy.children))copy.children=copy.children.map((child:any)=>cloneComponentInstance(child,componentId,instanceId,false));
  return copy;
}
function detachComponentMetadata(node:any):any{
  const copy=cloneJson(node);delete copy.componentId;delete copy.componentName;delete copy.componentVariantId;delete copy.isComponent;
  if(Array.isArray(copy.children))copy.children=copy.children.map(detachComponentMetadata);return copy;
}
function applyDesignCommands(design:Record<string,unknown>,commands:DesignCommand[]):Record<string,unknown>{
  const next=cloneJson(design);collectIds(next);
  for(const command of commands){
    if(command.type==='SET_ELEMENT_TEXT'){
      const matches=findNodes(next,command.elementId);if(matches.length!==1)throw new StudioError('Element target is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');
      if(typeof matches[0][command.field]!=='string')throw new StudioError('Target field is not editable text',400,'NOT_TEXT');matches[0][command.field]=command.value;
    } else if(command.type==='SET_STYLE'||command.type==='UNSET_STYLE'){
      const matches=findNodes(next,command.elementId);if(matches.length!==1)throw new StudioError('Element target is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');
      if(!matches[0].styles||typeof matches[0].styles!=='object'||Array.isArray(matches[0].styles))matches[0].styles={};
      if(command.type==='UNSET_STYLE')delete matches[0].styles[command.property];else if(command.value===null)delete matches[0].styles[command.property];else matches[0].styles[command.property]=command.value;
    } else if(command.type==='REMOVE_ELEMENT'){
      if(!removeNode(next,command.elementId))throw new StudioError('Element not found',404,'ELEMENT_NOT_FOUND');
    } else if(command.type==='ADD_ELEMENT'){
      const element=cloneJson(command.element) as any;
      if(typeof element.id!=='string'||!stableId.safeParse(element.id).success||typeof element.type!=='string')throw new StudioError('New elements require a stable id and type',400,'INVALID_ELEMENT');
      const ids=collectIds(next);if(ids.has(element.id))throw new StudioError('Element ID already exists',409,'DUPLICATE_ELEMENT_ID');
      ensureStableElementTree([element]);
      let list:any[];
      if(command.parentId===null)list=rootElements(next);
      else {const parents=findNodes(next,command.parentId);if(parents.length!==1)throw new StudioError('Parent element is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');if(!Array.isArray(parents[0].children))parents[0].children=[];list=parents[0].children;}
      if(command.afterId===null)list.push(element);
      else {const index=list.findIndex((x:any)=>x?.id===command.afterId);if(index<0)throw new StudioError('Insertion anchor is not a child of the selected parent',409,'INSERTION_ANCHOR_MISSING');list.splice(index+1,0,element);}
    } else if(command.type==='CREATE_PAGE'){
      const pages=pagesOf(next),page=cloneJson(command.page) as any;
      if(pages.some(p=>p.id===page.id))throw new StudioError('Page ID already exists',409,'PAGE_ID_CONFLICT');
      ensureStableElementTree(page.elements,page.id);validatePageSlugValue(page.slug,pages,page.id,pages.length===0);
      page.isHome=pages.length===0;page.createdAt=page.createdAt||new Date().toISOString();page.updatedAt=new Date().toISOString();
      page.pageSettings={...(page.pageSettings||{}),title:page.pageSettings?.title||page.name,path:page.isHome?'/':page.slug};
      if(page.isHome)page.slug='/';pages.push(page);const normalized=normalizeHome(pages,next.homePageId as string|undefined);next.pages=normalized.pages;next.homePageId=normalized.homePageId;
    } else if(command.type==='UPDATE_PAGE'){
      const pages=pagesOf(next),page=pages.find(p=>p.id===command.pageId);if(!page)throw new StudioError('Page not found',404,'PAGE_NOT_FOUND');
      const patch=cloneJson(command.patch) as any;if(patch.slug!==undefined)validatePageSlugValue(patch.slug,pages,page.id,page.id===next.homePageId);
      const settings=patch.pageSettings;delete patch.pageSettings;Object.assign(page,patch);if(settings)page.pageSettings={...(page.pageSettings||{}),...settings};if(page.id===next.homePageId)page.slug='/';page.updatedAt=new Date().toISOString();page.pageSettings={...(page.pageSettings||{}),title:page.name,path:page.slug};
    } else if(command.type==='UPDATE_PAGE_SETTINGS'){
      const pages=pagesOf(next),page=pages.find(p=>p.id===command.pageId);if(!page)throw new StudioError('Page not found',404,'PAGE_NOT_FOUND');
      const settings=jsonObject(cloneJson(command.settings));page.pageSettings={...(page.pageSettings||{}),...settings,title:page.name,path:page.slug};page.updatedAt=new Date().toISOString();
    } else if(command.type==='DELETE_PAGE'){
      const pages=pagesOf(next);if(pages.length<=1)throw new StudioError('Cannot delete the only page',409,'LAST_PAGE');
      const index=pages.findIndex(p=>p.id===command.pageId);if(index<0)throw new StudioError('Page not found',404,'PAGE_NOT_FOUND');
      const other={...next,pages:pages.filter(p=>p.id!==command.pageId)};if(pageReferenced(other,command.pageId))throw new StudioError('Page is still referenced by navigation or content',409,'PAGE_REFERENCED');
      pages.splice(index,1);const normalized=normalizeHome(pages,next.homePageId===command.pageId?undefined:next.homePageId as string|undefined);next.pages=normalized.pages;next.homePageId=normalized.homePageId;
    } else if(command.type==='REORDER_PAGES'){
      const pages=pagesOf(next),ids=pages.map(p=>p.id);if(command.pageIds.length!==ids.length||new Set(command.pageIds).size!==ids.length||command.pageIds.some(id=>!ids.includes(id)))throw new StudioError('Page reorder must include every page exactly once',400,'INVALID_PAGE_ORDER');
      const map=new Map(pages.map(p=>[p.id,p]));next.pages=command.pageIds.map(id=>map.get(id));
    } else if(command.type==='SET_HOME_PAGE'){
      const pages=pagesOf(next);if(!pages.some(p=>p.id===command.pageId))throw new StudioError('Page not found',404,'PAGE_NOT_FOUND');
      const normalized=normalizeHome(pages,command.pageId);next.pages=normalized.pages;next.homePageId=normalized.homePageId;
    } else if(command.type==='SET_DESIGN_SYSTEM'){
      if(command.variables.some(v=>typeof v.id!=='string')||command.classes.some(v=>typeof v.id!=='string'))throw new StudioError('Design-system entries require stable IDs',400,'INVALID_DESIGN_SYSTEM');
      next.globalVariables=validateVariables(command.variables);next.globalClasses=validateClasses(command.classes);
    } else if(command.type==='SET_CMS_BINDING'){
      const matches=findNodes(next,command.elementId);if(matches.length!==1)throw new StudioError('Element target is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');
      if(command.binding===null)delete matches[0].cmsBinding;else matches[0].cmsBinding=cloneJson(command.binding);
    } else if(command.type==='UPSERT_COMPONENT'){
      const library=componentsOf(next),existing=library[command.componentId];ensureStableElementTree([command.element]);
      library[command.componentId]={name:command.name,element:cloneJson(command.element),slots:[...new Set(command.slots)],variants:existing?.variants||{},version:Number(existing?.version||0)+1};
    } else if(command.type==='CREATE_COMPONENT_VARIANT'){
      const library=componentsOf(next),definition=library[command.componentId];if(!definition)throw new StudioError('Component definition not found',404,'COMPONENT_NOT_FOUND');
      ensureStableElementTree([command.variant.element]);definition.variants={...(definition.variants||{}),[command.variant.id]:cloneJson(command.variant)};definition.version=Number(definition.version||1)+1;
    } else if(command.type==='INSTANTIATE_COMPONENT'){
      const library=componentsOf(next),definition=library[command.componentId];if(!definition)throw new StudioError('Component definition not found',404,'COMPONENT_NOT_FOUND');
      const variant=command.variantId?definition.variants?.[command.variantId]:undefined;if(command.variantId&&!variant)throw new StudioError('Component variant not found',404,'COMPONENT_VARIANT_NOT_FOUND');
      const instance=cloneComponentInstance(variant?.element||definition.element,command.componentId,command.instanceId);instance.componentName=definition.name;if(command.variantId)instance.componentVariantId=command.variantId;
      if(findNodes(next,command.instanceId).length)throw new StudioError('Instance ID already exists',409,'DUPLICATE_ELEMENT_ID');
      let list:any[];if(command.parentId===null)list=rootElements(next);else{const parents=findNodes(next,command.parentId);if(parents.length!==1)throw new StudioError('Parent element is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');if(!Array.isArray(parents[0].children))parents[0].children=[];list=parents[0].children;}
      if(command.afterId===null)list.push(instance);else{const index=list.findIndex((x:any)=>x?.id===command.afterId);if(index<0)throw new StudioError('Insertion anchor is not a child of the selected parent',409,'INSERTION_ANCHOR_MISSING');list.splice(index+1,0,instance);}
    } else if(command.type==='DETACH_COMPONENT'){
      const matches=findNodes(next,command.elementId);if(matches.length!==1)throw new StudioError('Component instance not found',404,'ELEMENT_NOT_FOUND');const detached=detachComponentMetadata(matches[0]);Object.keys(matches[0]).forEach(k=>delete matches[0][k]);Object.assign(matches[0],detached);
    } else if(command.type==='SET_COMPONENT_SLOT'){
      const matches=findNodes(next,command.elementId);if(matches.length!==1)throw new StudioError('Element target is missing or ambiguous',409,'ELEMENT_NOT_UNIQUE');if(command.slotName===null)delete matches[0].componentSlotName;else matches[0].componentSlotName=command.slotName;
    }
  }
  collectIds(next);return next;
}

const cmsBindingSchema=z.object({collectionId:uuid,field:z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),target:z.enum(['content','src','alt','href']),itemSlug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160).optional()}).strict();
function collectCmsBindings(value:any,result:Array<{elementId:string;binding:z.infer<typeof cmsBindingSchema>}>=[]){
  if(!value||typeof value!=='object')return result;
  if(typeof value.id==='string'&&value.cmsBinding!==undefined)result.push({elementId:value.id,binding:parse(cmsBindingSchema,value.cmsBinding)});
  for(const child of Object.values(value))collectCmsBindings(child,result);
  if(result.length>500)throw new StudioError('Design exceeds CMS binding limit',400,'CMS_BINDING_LIMIT');
  return result;
}
async function validateCmsBindings(c:any,siteId:string,design:any){
  const bindings=collectCmsBindings(design);if(!bindings.length)return;
  const ids=[...new Set(bindings.map(x=>x.binding.collectionId))];
  const rows=await c.query('SELECT id,fields FROM studio.collections WHERE site_id=$1 AND id=ANY($2::uuid[])',[siteId,ids]);
  if(rows.rowCount!==ids.length)throw new StudioError('CMS binding references a collection outside this site or a missing collection',400,'INVALID_CMS_BINDING');
  const map=new Map<string,any[]>(rows.rows.map((row:any)=>[String(row.id),Array.isArray(row.fields)?row.fields:[]]));
  for(const entry of bindings){
    const field=(map.get(entry.binding.collectionId)||[]).find((f:any)=>f?.key===entry.binding.field);
    if(!field)throw new StudioError(`CMS binding field ${entry.binding.field} does not exist`,400,'INVALID_CMS_BINDING');
    const allowed=entry.binding.target==='src'?['IMAGE','URL']:entry.binding.target==='href'?['URL','TEXT','EMAIL']:entry.binding.target==='alt'?['TEXT']:['TEXT','RICH_TEXT','NUMBER','BOOLEAN','DATE','EMAIL','URL','COLOR','OPTION'];
    if(!allowed.includes(String(field.type)))throw new StudioError('CMS field type is incompatible with the selected element property',400,'INVALID_CMS_BINDING');
  }
}

export class DomainCommands {
  constructor(private db:Database){}
  async executeDesignCommands(actor:Actor,siteId:string,input:unknown,metadata:CommandMetadata={source:'HUMAN'}):Promise<DesignSaveResult>{
    const b=parse(commandBatch,input),commandHash=digest({command:'design.commands',siteId,baseHash:b.baseHash,commands:b.commands});
    const replay=await this.db.tx(async c=>{
      await this.db.site(c,actor,siteId,'VIEW');
      const prior=await c.query('SELECT result FROM studio.command_receipts WHERE actor_id=$1 AND idempotency_key=$2',[actor.id,b.operationId]);
      if(!prior.rows[0])return null;
      const saved=jsonObject(prior.rows[0].result);
      if(saved.commandHash!==commandHash)throw new StudioError('Idempotency key was already used for a different command',409,'IDEMPOTENCY_CONFLICT');
      if(typeof saved.hash!=='string')throw new StudioError('Stored command receipt is invalid',503,'COMMAND_RECEIPT_INVALID');
      return {hash:saved.hash,operationId:b.operationId,correlationId:typeof saved.correlationId==='string'?saved.correlationId:(b.correlationId??b.operationId),replayed:true} as DesignSaveResult;
    });
    if(replay)return replay;
    const contentSafe=b.commands.every(command=>['SET_ELEMENT_TEXT','UPDATE_PAGE_SETTINGS'].includes(command.type));
    const current=await this.db.tx(async c=>{const site=await this.db.site(c,actor,siteId,contentSafe?'EDIT_CONTENT':'EDIT_DESIGN');return designOnly(site.editorData);});
    if(digest(current)!==b.baseHash)throw new StudioError('Another session changed this design. Reload and reconcile before applying commands.',409,'DESIGN_CONFLICT');
    const next=applyDesignCommands(current,b.commands);
    const applied=await this.saveDesign(actor,siteId,{baseHash:b.baseHash,editorData:next,operationId:b.operationId,correlationId:b.correlationId,timestamp:b.timestamp},{...metadata,operationId:b.operationId,correlationId:b.correlationId,timestamp:b.timestamp,validatedContentCommand:contentSafe});
    await this.db.tx(async c=>{await c.query(`UPDATE studio.command_receipts SET result=result || $3::jsonb WHERE actor_id=$1 AND idempotency_key=$2`,[actor.id,b.operationId,JSON.stringify({commandHash,correlationId:applied.correlationId})]);});
    return applied;
  }

  async saveDesign(actor:Actor,siteId:string,input:unknown,metadata:CommandMetadata={source:'HUMAN'}):Promise<DesignSaveResult>{
    const b=parse(saveInput,input);
    const operationId=metadata.operationId??b.operationId??randomUUID();
    const correlationId=metadata.correlationId??b.correlationId??randomUUID();
    const timestamp=metadata.timestamp??b.timestamp??new Date().toISOString();
    const requested=designOnly(b.editorData);
    const payloadHash=digest({command:'design.save',siteId,baseHash:b.baseHash,editorData:requested});
    return this.db.tx(async c=>{
      const prior=await c.query('SELECT payload_hash,result FROM studio.command_receipts WHERE actor_id=$1 AND idempotency_key=$2 FOR UPDATE',[actor.id,operationId]);
      if(prior.rows[0]){
        if(prior.rows[0].payload_hash!==payloadHash)throw new StudioError('Idempotency key was already used for a different command',409,'IDEMPOTENCY_CONFLICT');
        const saved=jsonObject(prior.rows[0].result);if(typeof saved.hash!=='string')throw new StudioError('Stored command receipt is invalid',503,'COMMAND_RECEIPT_INVALID');
        return {hash:saved.hash,operationId,correlationId,replayed:true};
      }
      const site=await this.db.site(c,actor,siteId,'VIEW',true);
      if(!site.capabilities.includes('EDIT_DESIGN')&&!site.capabilities.includes('EDIT_CONTENT'))throw new StudioError('Editing is not permitted',403,'FORBIDDEN');
      const current=designOnly(site.editorData);
      if(digest(current)!==b.baseHash)throw new StudioError('Another session changed this design. Reload and reconcile before saving.',409,'DESIGN_CONFLICT');
      let incoming={...current,...requested};
      if(!site.capabilities.includes('EDIT_DESIGN')&&!metadata.validatedContentCommand)incoming=contentOnly(current,incoming);
      if(site.userId!==actor.id){
        for(const id of protectedNodes(current).keys())if(digest(allById(incoming,id))!==digest(allById(current,id)))throw new StudioError('A protected component cannot be changed from this editor',403,'PROTECTED_COMPONENT');
      }
      if(incoming.elements!==undefined&&!Array.isArray(incoming.elements))throw new StudioError('Elements must be an array');
      if(incoming.pages!==undefined&&(!Array.isArray(incoming.pages)||incoming.pages.some((p:any)=>!p||typeof p.id!=='string'||!Array.isArray(p.elements))))throw new StudioError('Each page needs an ID and an elements array');
      await validateCmsBindings(c,siteId,incoming);
      validateComponentLibrary(incoming);
      const updated={...site.editorData,...incoming},result={hash:digest(incoming)};
      await c.query('UPDATE public.websites SET "editorData"=$2::jsonb,"updatedAt"=now() WHERE id=$1',[siteId,JSON.stringify(updated)]);
      await c.query(`INSERT INTO studio.command_receipts(id,actor_id,site_id,command,source,idempotency_key,correlation_id,payload_hash,result)
        VALUES($1,$2,$3,'design.save',$4,$5,$6,$7,$8::jsonb)`,[randomUUID(),actor.id,siteId,metadata.source,operationId,correlationId,payloadHash,JSON.stringify(result)]);
      await this.db.audit(c,actor,site,metadata.source==='AI'?'designer.ai_change_applied':'designer.saved',site.name);
      return {...result,operationId,correlationId,replayed:false};
    });
  }
}
