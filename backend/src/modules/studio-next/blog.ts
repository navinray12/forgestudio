import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {Database,type Actor} from './database.js';
import {parse,uuid,localeCode,StudioError} from './validation.js';

const searchInput=z.object({q:z.string().trim().max(120).default(''),locale:localeCode.default('en'),offset:z.coerce.number().int().min(0).max(100000).default(0),limit:z.coerce.number().int().min(1).max(50).default(20)}).strict();
const localeInput=z.object({locale:localeCode.default('en')}).strict();
function xml(value:unknown){return String(value??'').replace(/[<>&"']/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]!));}
function fields(authorId:string,categoryId:string){
  return [
    {key:'title',name:'Title',type:'TEXT',required:true},
    {key:'excerpt',name:'Excerpt',type:'TEXT',required:false},
    {key:'body',name:'Body',type:'RICH_TEXT',required:true},
    {key:'featured_image',name:'Featured image',type:'IMAGE',required:false},
    {key:'author',name:'Author',type:'REFERENCE',required:false,referenceCollection:authorId},
    {key:'category',name:'Category',type:'REFERENCE',required:false,referenceCollection:categoryId},
    {key:'tags',name:'Tags',type:'JSON',required:false},
    {key:'seo_title',name:'SEO title',type:'TEXT',required:false},
    {key:'seo_description',name:'SEO description',type:'TEXT',required:false},
    {key:'canonical',name:'Canonical URL',type:'URL',required:false},
    {key:'open_graph_image',name:'Open Graph image',type:'IMAGE',required:false},
    {key:'noindex',name:'No index',type:'BOOLEAN',required:false},
  ];
}
export class Blog{
  constructor(private db:Database){}
  private async config(siteId:string){
    const r=await this.db.pool.query(`SELECT b.site_id AS "siteId",b.posts_collection_id AS "postsCollectionId",b.authors_collection_id AS "authorsCollectionId",b.categories_collection_id AS "categoriesCollectionId",b.default_locale AS "defaultLocale",
      p.name AS "postsName",a.name AS "authorsName",c.name AS "categoriesName"
      FROM studio.blog_configs b JOIN studio.collections p ON p.id=b.posts_collection_id JOIN studio.collections a ON a.id=b.authors_collection_id JOIN studio.collections c ON c.id=b.categories_collection_id WHERE b.site_id=$1`,[siteId]);
    return r.rows[0]??null;
  }
  async setup(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'EDIT_DESIGN',true);await this.db.site(c,actor,siteId,'EDIT_CONTENT');
      const existing=await c.query('SELECT * FROM studio.blog_configs WHERE site_id=$1 FOR UPDATE',[siteId]);
      if(existing.rows[0])return {configured:true,replayed:true,...existing.rows[0]};
      const conflicts=await c.query(`SELECT slug FROM studio.collections WHERE site_id=$1 AND slug=ANY($2::text[])`,[siteId,['blog-posts','blog-authors','blog-categories']]);
      if(conflicts.rowCount)throw new StudioError('Blog setup requires the reserved collection slugs blog-posts, blog-authors and blog-categories to be unused',409,'BLOG_COLLECTION_CONFLICT');
      const authors=randomUUID(),categories=randomUUID(),posts=randomUUID();
      const authorFields=[{key:'bio',name:'Bio',type:'RICH_TEXT',required:false},{key:'avatar',name:'Avatar',type:'IMAGE',required:false},{key:'website',name:'Website',type:'URL',required:false}];
      const categoryFields=[{key:'description',name:'Description',type:'TEXT',required:false}];
      await c.query(`INSERT INTO studio.collections(id,site_id,name,slug,fields) VALUES($1,$2,'Blog Authors','blog-authors',$3::jsonb),($4,$2,'Blog Categories','blog-categories',$5::jsonb),($6,$2,'Blog Posts','blog-posts',$7::jsonb)`,[authors,siteId,JSON.stringify(authorFields),categories,JSON.stringify(categoryFields),posts,JSON.stringify(fields(authors,categories))]);
      await c.query(`INSERT INTO studio.blog_configs(site_id,posts_collection_id,authors_collection_id,categories_collection_id,created_by) VALUES($1,$2,$3,$4,$5)`,[siteId,posts,authors,categories,actor.id]);
      await this.db.audit(c,actor,site,'blog.configured','Blog CMS configured');
      return {configured:true,replayed:false,siteId,postsCollectionId:posts,authorsCollectionId:authors,categoriesCollectionId:categories,defaultLocale:'en'};
    });
  }
  async status(actor:Actor,siteId:string){
    return this.db.tx(async c=>{
      const site=await this.db.site(c,actor,siteId,'VIEW'),config=await c.query(`SELECT b.posts_collection_id AS "postsCollectionId",b.authors_collection_id AS "authorsCollectionId",b.categories_collection_id AS "categoriesCollectionId",b.default_locale AS "defaultLocale" FROM studio.blog_configs b WHERE site_id=$1`,[siteId]);
      if(!config.rows[0])return {configured:false,site:{id:site.id,name:site.name,capabilities:site.capabilities}};
      const ids=[config.rows[0].postsCollectionId,config.rows[0].authorsCollectionId,config.rows[0].categoriesCollectionId],counts=await c.query(`SELECT collection_id AS id,count(*)::int AS total,count(*) FILTER(WHERE live IS NOT NULL)::int AS live,count(*) FILTER(WHERE scheduled_at IS NOT NULL)::int AS scheduled FROM studio.content_items WHERE site_id=$1 AND collection_id=ANY($2::uuid[]) GROUP BY collection_id`,[siteId,ids]);
      const map=new Map(counts.rows.map(x=>[x.id,x]));
      return {configured:true,site:{id:site.id,name:site.name,capabilities:site.capabilities},...config.rows[0],counts:{posts:map.get(ids[0])??{total:0,live:0,scheduled:0},authors:map.get(ids[1])??{total:0,live:0,scheduled:0},categories:map.get(ids[2])??{total:0,live:0,scheduled:0}}};
    });
  }
  private async publicContext(siteId:string,locale:string){
    parse(uuid,siteId);parse(localeCode,locale);
    const r=await this.db.pool.query(`SELECT b.*,w.name AS site_name FROM studio.blog_configs b JOIN public.websites w ON w.id=b.site_id JOIN studio.site_locales l ON l.site_id=b.site_id AND l.code=$2 AND l.enabled WHERE b.site_id=$1 AND w.status='PUBLISHED'`,[siteId,locale]);
    if(!r.rows[0])throw new StudioError('Published blog not found',404,'NOT_FOUND');return r.rows[0];
  }
  async search(siteId:string,raw:unknown){
    const q=parse(searchInput,raw),config=await this.publicContext(siteId,q.locale),term=`%${q.q.replace(/[\\%_]/g,'\\$&')}%`;
    const base=[siteId,config.posts_collection_id,q.locale,term,q.limit,q.offset];
    const r=await this.db.pool.query(`SELECT i.live FROM studio.content_items i WHERE i.site_id=$1 AND i.collection_id=$2 AND i.locale=$3 AND i.live IS NOT NULL AND NOT i.archived AND (i.live->>'name' ILIKE $4 OR COALESCE(i.live->'fields'->>'title','') ILIKE $4 OR COALESCE(i.live->'fields'->>'excerpt','') ILIKE $4) ORDER BY i.published_at DESC,i.id LIMIT $5 OFFSET $6`,base);
    const total=await this.db.pool.query(`SELECT count(*)::int AS count FROM studio.content_items i WHERE i.site_id=$1 AND i.collection_id=$2 AND i.locale=$3 AND i.live IS NOT NULL AND NOT i.archived AND (i.live->>'name' ILIKE $4 OR COALESCE(i.live->'fields'->>'title','') ILIKE $4 OR COALESCE(i.live->'fields'->>'excerpt','') ILIKE $4)`,base.slice(0,4));
    return {items:r.rows.map(x=>x.live),total:total.rows[0].count,offset:q.offset,limit:q.limit};
  }
  async post(siteId:string,slugValue:string,locale='en'){
    const config=await this.publicContext(siteId,locale);
    const r=await this.db.pool.query(`SELECT i.group_id AS "groupId",i.live,i.published_at AS "publishedAt" FROM studio.content_items i WHERE i.site_id=$1 AND i.collection_id=$2 AND i.locale=$3 AND i.live IS NOT NULL AND NOT i.archived AND i.live->>'slug'=$4 LIMIT 1`,[siteId,config.posts_collection_id,locale,slugValue]);
    if(!r.rows[0])throw new StudioError('Published blog post not found',404,'NOT_FOUND');
    const post=r.rows[0],category=post.live?.fields?.category??null;
    const related=await this.db.pool.query(`SELECT live FROM studio.content_items WHERE site_id=$1 AND collection_id=$2 AND locale=$3 AND live IS NOT NULL AND NOT archived AND group_id<>$4 AND ($5::text IS NULL OR live->'fields'->>'category'=$5) ORDER BY published_at DESC LIMIT 4`,[siteId,config.posts_collection_id,locale,post.groupId,category]);
    return {post:post.live,publishedAt:post.publishedAt,related:related.rows.map(x=>x.live)};
  }
  private async taxonomy(siteId:string,locale:string,kind:'author'|'category',slugValue:string){
    const config=await this.publicContext(siteId,locale),collection=kind==='author'?config.authors_collection_id:config.categories_collection_id,field=kind==='author'?'author':'category';
    const tax=await this.db.pool.query(`SELECT group_id AS "groupId",live FROM studio.content_items WHERE site_id=$1 AND collection_id=$2 AND locale=$3 AND live IS NOT NULL AND NOT archived AND live->>'slug'=$4 LIMIT 1`,[siteId,collection,locale,slugValue]);
    if(!tax.rows[0])throw new StudioError(`Published blog ${kind} not found`,404,'NOT_FOUND');
    const posts=await this.db.pool.query(`SELECT live FROM studio.content_items WHERE site_id=$1 AND collection_id=$2 AND locale=$3 AND live IS NOT NULL AND NOT archived AND live->'fields'->>$4=$5 ORDER BY published_at DESC LIMIT 100`,[siteId,config.posts_collection_id,locale,field,String(tax.rows[0].groupId)]);
    return {[kind]:tax.rows[0].live,posts:posts.rows.map(x=>x.live)};
  }
  author(siteId:string,slugValue:string,locale='en'){return this.taxonomy(siteId,locale,'author',slugValue);}
  category(siteId:string,slugValue:string,locale='en'){return this.taxonomy(siteId,locale,'category',slugValue);}
  async feed(siteId:string,locale='en'){
    const config=await this.publicContext(siteId,locale),posts=await this.db.pool.query(`SELECT live,published_at FROM studio.content_items WHERE site_id=$1 AND collection_id=$2 AND locale=$3 AND live IS NOT NULL AND NOT archived AND COALESCE((live->'fields'->>'noindex')::boolean,false)=false ORDER BY published_at DESC LIMIT 50`,[siteId,config.posts_collection_id,locale]);
    const origin=(process.env.FRONTEND_URL||'').replace(/\/$/,'');
    const items=posts.rows.map(row=>{const item=row.live,link=`${origin}/blog/${encodeURIComponent(item.slug)}`;return `<item><title>${xml(item.fields?.title||item.name)}</title><link>${xml(link)}</link><guid>${xml(link)}</guid><description>${xml(item.fields?.excerpt||'')}</description><pubDate>${xml(new Date(row.published_at).toUTCString())}</pubDate></item>`;}).join('');
    return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(config.site_name)}</title><link>${xml(origin||'/')}</link><description>${xml(config.site_name+' blog')}</description>${items}</channel></rss>`;
  }
  async sitemap(siteId:string,locale='en'){
    const config=await this.publicContext(siteId,locale),posts=await this.db.pool.query(`SELECT live,published_at FROM studio.content_items WHERE site_id=$1 AND collection_id=$2 AND locale=$3 AND live IS NOT NULL AND NOT archived AND COALESCE((live->'fields'->>'noindex')::boolean,false)=false ORDER BY published_at DESC LIMIT 5000`,[siteId,config.posts_collection_id,locale]),origin=(process.env.FRONTEND_URL||'').replace(/\/$/,'');
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${posts.rows.map(row=>`<url><loc>${xml(`${origin}/blog/${encodeURIComponent(row.live.slug)}`)}</loc><lastmod>${xml(new Date(row.published_at).toISOString())}</lastmod></url>`).join('')}</urlset>`;
  }
  async preview(actor:Actor,siteId:string,slugValue:string,locale='en'){
    return this.db.tx(async c=>{await this.db.site(c,actor,siteId,'VIEW');const config=await c.query('SELECT posts_collection_id FROM studio.blog_configs WHERE site_id=$1',[siteId]);if(!config.rows[0])throw new StudioError('Blog is not configured',404,'NOT_FOUND');const r=await c.query(`SELECT name,slug,draft AS fields,revision,live_revision AS "liveRevision",archived,scheduled_at AS "scheduledAt" FROM studio.content_items WHERE site_id=$1 AND collection_id=$2 AND locale=$3 AND slug=$4 LIMIT 1`,[siteId,config.rows[0].posts_collection_id,locale,slugValue]);if(!r.rows[0])throw new StudioError('Blog draft not found',404,'NOT_FOUND');return {post:r.rows[0]};});
  }
}
