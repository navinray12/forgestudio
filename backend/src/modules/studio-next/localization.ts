import { z } from 'zod';
import { Database, type Actor } from './database.js';
import { parse, localeCode, revision, checkRevision, StudioError, uuid } from './validation.js';
const pageId=z.string().min(1).max(150).regex(/^[\w-]+$/);
const localizedSlug=z.string().min(1).max(180).regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/);
const translation=z.object({title:z.string().max(200).default(''),description:z.string().max(1000).default(''),slug:localizedSlug.optional(),texts:z.record(z.string().max(150),z.string().max(20000)).default({}),alts:z.record(z.string().max(150),z.string().max(500)).default({})}).strict();
export function translatableNodes(elements:any[]):Array<{id:string;text:string;alt?:string}>{
  const list:Array<{id:string;text:string;alt?:string}>=[];
  const walk=(nodes:any[],depth=0)=>{
    if(depth>40||list.length>500)throw new StudioError('Page exceeds translation editor limits');
    for(const node of nodes||[]){
      if(typeof node.id==='string'&&(typeof node.content==='string'||typeof node.alt==='string'))list.push({id:node.id,text:node.content||'',...(typeof node.alt==='string'?{alt:node.alt}:{})});
      if(Array.isArray(node.children))walk(node.children,depth+1);
    }
  };walk(elements);return list;
}
export class Localization {
  constructor(private db:Database){}
  async locales(actor:Actor,siteId:string,input?:unknown){
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,input?'MANAGE_SETTINGS':'VIEW',!!input);
      if(input){
        const b=parse(z.object({code:localeCode,name:z.string().trim().min(1).max(80),enabled:z.boolean()}).strict(),input);
        if(b.code==='en'&&!b.enabled)throw new StudioError('The primary locale must stay enabled');
        const count=await c.query('SELECT count(*)::int AS total FROM studio.site_locales WHERE site_id=$1',[siteId]);
        if(count.rows[0].total>=30){const existing=await c.query('SELECT 1 FROM studio.site_locales WHERE site_id=$1 AND code=$2',[siteId,b.code]);if(!existing.rowCount)throw new StudioError('Locale limit reached',409);}
        await c.query('INSERT INTO studio.site_locales(site_id,code,name,enabled) VALUES($1,$2,$3,$4) ON CONFLICT(site_id,code) DO UPDATE SET name=excluded.name,enabled=excluded.enabled',[siteId,b.code,b.name,b.enabled]);
        await this.db.audit(c,actor,site,'locale.updated',b.code);
      }
      const r=await c.query('SELECT code,name,enabled FROM studio.site_locales WHERE site_id=$1 ORDER BY (code=\'en\') DESC,code',[siteId]);return {locales:r.rows};
    });
  }
  async list(actor:Actor,siteId:string,locale:string){
    parse(localeCode,locale);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId);
      const data=site.editorData||{};
      const pages=Array.isArray(data.pages)&&data.pages.length?data.pages:[{id:'home',name:'Home',elements:data.elements||[]}];
      const rows=await c.query('SELECT page_id AS "pageId",draft,revision,published_revision AS "publishedRevision" FROM studio.page_translations WHERE site_id=$1 AND locale=$2',[siteId,locale]);
      return {pages:pages.slice(0,100).map((p:any)=>({id:p.id,name:p.name||p.title||p.id,nodes:translatableNodes(p.elements||[])})),translations:rows.rows};
    });
  }
  async save(actor:Actor,siteId:string,pid:string,locale:string,input:unknown){
    parse(pageId,pid);parse(localeCode,locale);
    if(locale==='en')throw new StudioError('Edit primary-language content in the Designer');
    const b=parse(z.object({revision,data:translation}).strict(),input);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_CONTENT',true);
      const data=site.editorData||{};const pages=Array.isArray(data.pages)&&data.pages.length?data.pages:[{id:'home',elements:data.elements||[]}];
      const p=pages.find((p:any)=>p.id===pid);if(!p)throw new StudioError('Page not found',404);
      const desiredSlug=b.data.slug??String(p.slug||'/');
      if(desiredSlug==='/'&&String(p.slug||'/')!=='/')throw new StudioError('Only the primary home page may use the locale root route',409,'LOCALIZED_SLUG_CONFLICT');
      const slugConflict=await c.query(`SELECT 1 FROM studio.page_translations WHERE site_id=$1 AND locale=$2 AND page_id<>$3 AND COALESCE(draft->>'slug',live->>'slug')=$4 LIMIT 1`,[siteId,locale,pid,desiredSlug]);
      if(slugConflict.rowCount)throw new StudioError('Localized page slug already exists',409,'LOCALIZED_SLUG_CONFLICT');
      b.data.slug=desiredSlug;
      const ids=new Set(translatableNodes(p.elements||[]).map(n=>n.id));
      if([...Object.keys(b.data.texts),...Object.keys(b.data.alts)].some(id=>!ids.has(id)))throw new StudioError('A translation references an unknown element');
      const exists=await c.query('SELECT 1 FROM studio.site_locales WHERE site_id=$1 AND code=$2',[siteId,locale]);if(!exists.rowCount)throw new StudioError('Add the locale first');
      const row=await c.query('SELECT revision FROM studio.page_translations WHERE site_id=$1 AND page_id=$2 AND locale=$3',[siteId,pid,locale]);
      checkRevision(row.rows[0]?.revision||0,b.revision);
      await c.query(`INSERT INTO studio.page_translations(site_id,page_id,locale,draft,revision) VALUES($1,$2,$3,$4::jsonb,1)
        ON CONFLICT(site_id,page_id,locale) DO UPDATE SET draft=excluded.draft,revision=studio.page_translations.revision+1,updated_at=now()`,[siteId,pid,locale,JSON.stringify(b.data)]);
      await this.db.audit(c,actor,site,'locale.page_draft_saved',`${pid}: ${locale}`);return {revision:b.revision+1};
    });
  }
  async publish(actor:Actor,siteId:string,pid:string,locale:string,input:unknown){
    const b=parse(z.object({revision,publish:z.boolean()}).strict(),input);parse(pageId,pid);parse(localeCode,locale);
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'PUBLISH',true);
      const r=await c.query('SELECT * FROM studio.page_translations WHERE site_id=$1 AND page_id=$2 AND locale=$3 FOR UPDATE',[siteId,pid,locale]);
      if(!r.rows[0])throw new StudioError('Save a translation first',404);checkRevision(r.rows[0].revision,b.revision);
      await c.query(`UPDATE studio.page_translations SET live=CASE WHEN $4 THEN draft ELSE NULL END,published_revision=CASE WHEN $4 THEN revision ELSE NULL END,published_at=CASE WHEN $4 THEN now() ELSE NULL END WHERE site_id=$1 AND page_id=$2 AND locale=$3`,[siteId,pid,locale,b.publish]);
      await this.db.audit(c,actor,site,b.publish?'locale.page_published':'locale.page_unpublished',`${pid}: ${locale}`);return {};
    });
  }
  private routeFor(siteId:string,locale:string,slug:string){
    const clean=slug==='/'?'':slug.replace(/^\//,'');
    return locale==='en'?(`/site/${siteId}${clean?'/'+clean:''}`):(`/site/${siteId}/${locale}${clean?'/'+clean:''}`);
  }
  async publicData(siteId:string,locale:string){
    parse(uuid,siteId);parse(localeCode,locale);
    const site=await this.db.pool.query(`SELECT id,"editorData" FROM public.websites WHERE id=$1 AND status='PUBLISHED'`,[siteId]);if(!site.rowCount)throw new StudioError('Site not found',404);
    const locales=await this.db.pool.query('SELECT code,name FROM studio.site_locales WHERE site_id=$1 AND enabled ORDER BY code',[siteId]);
    if(!locales.rows.some(l=>l.code===locale))throw new StudioError('Locale not published',404);
    const rows=await this.db.pool.query('SELECT page_id,locale,live FROM studio.page_translations WHERE site_id=$1 AND live IS NOT NULL',[siteId]);
    const requested=rows.rows.filter(r=>r.locale===locale),editor=site.rows[0].editorData||{},published=editor.publishedData||editor;
    const pages=Array.isArray(published.pages)&&published.pages.length?published.pages:[{id:'home',slug:'/',name:'Home'}];
    const byPage=new Map<string,any[]>();for(const row of rows.rows){const list=byPage.get(row.page_id)||[];list.push(row);byPage.set(row.page_id,list);}
    const routes=pages.map((page:any)=>{
      const alternatives=locales.rows.map((l:any)=>{const translated=(byPage.get(page.id)||[]).find((x:any)=>x.locale===l.code)?.live;const slug=l.code==='en'?String(page.slug||'/'):String(translated?.slug||page.slug||'/');return {locale:l.code,name:l.name,slug,href:this.routeFor(siteId,l.code,slug)};});
      return {pageId:page.id,alternatives};
    });
    return {locales:locales.rows,pages:Object.fromEntries(requested.map(r=>[r.page_id,r.live])),routes};
  }
  async resolvePath(siteId:string,path:string){
    parse(uuid,siteId);if(typeof path!=='string'||path.length>500||!path.startsWith('/'))throw new StudioError('Invalid localized route');
    const site=await this.db.pool.query(`SELECT "editorData" FROM public.websites WHERE id=$1 AND status='PUBLISHED'`,[siteId]);if(!site.rowCount)throw new StudioError('Site not found',404);
    const locales=await this.db.pool.query('SELECT code,name FROM studio.site_locales WHERE site_id=$1 AND enabled ORDER BY code',[siteId]);
    const parts=path.split('/').filter(Boolean),locale=parts[0]&&locales.rows.some((l:any)=>l.code===parts[0]&&l.code!=='en')?parts.shift()!:'en',slug='/'+parts.join('/');
    const editor=site.rows[0].editorData||{},published=editor.publishedData||editor,pages=Array.isArray(published.pages)&&published.pages.length?published.pages:[{id:'home',slug:'/',name:'Home'}];
    let page:any;
    if(locale==='en')page=pages.find((p:any)=>String(p.slug||'/')===slug)||(!parts.length?pages.find((p:any)=>p.isHome||p.slug==='/'):undefined);
    else {
      const translations=await this.db.pool.query(`SELECT page_id,live FROM studio.page_translations WHERE site_id=$1 AND locale=$2 AND live IS NOT NULL`,[siteId,locale]);
      const match=translations.rows.find((r:any)=>String(r.live?.slug||pages.find((p:any)=>p.id===r.page_id)?.slug||'/')===slug);
      page=match?pages.find((p:any)=>p.id===match.page_id):undefined;
    }
    if(!page)throw new StudioError('Localized page not found',404,'NOT_FOUND');
    const data=await this.publicData(siteId,locale),route=data.routes.find((r:any)=>r.pageId===page.id);
    return {locale,pageId:page.id,slug,translation:data.pages[page.id]??null,hreflang:route?.alternatives??[]};
  }
}
