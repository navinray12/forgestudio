import { z } from 'zod';
import { Database, type Actor } from './database.js';
import { parse, localeCode, revision, checkRevision, StudioError, uuid } from './validation.js';
const pageId=z.string().min(1).max(150).regex(/^[\w-]+$/);
const translation=z.object({title:z.string().max(200).default(''),description:z.string().max(1000).default(''),texts:z.record(z.string().max(150),z.string().max(20000)).default({}),alts:z.record(z.string().max(150),z.string().max(500)).default({})}).strict();
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
  async publicData(siteId:string,locale:string){
    parse(uuid,siteId);parse(localeCode,locale);
    const site=await this.db.pool.query(`SELECT id FROM public.websites WHERE id=$1 AND status='PUBLISHED'`,[siteId]);if(!site.rowCount)throw new StudioError('Site not found',404);
    const locales=await this.db.pool.query('SELECT code,name FROM studio.site_locales WHERE site_id=$1 AND enabled ORDER BY code',[siteId]);
    if(!locales.rows.some(l=>l.code===locale))throw new StudioError('Locale not published',404);
    const rows=await this.db.pool.query('SELECT page_id,live FROM studio.page_translations WHERE site_id=$1 AND locale=$2 AND live IS NOT NULL',[siteId,locale]);
    return {locales:locales.rows,pages:Object.fromEntries(rows.rows.map(r=>[r.page_id,r.live]))};
  }
}
