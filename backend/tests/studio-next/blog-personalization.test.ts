import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';

if(!url)test('blog/personalization integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,server:Server,base:string,owner:TestActor,outsider:TestActor,siteId:string;
  async function send(method:string,path:string,a:TestActor|undefined=owner,body?:unknown,expected=200){
    const headers:any={Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})};
    if(a)headers.Cookie=`forge_session=${a.token}`;
    const r=await fetch(base+path,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const type=r.headers.get('content-type')||'';const value=type.includes('json')?await r.json():await r.text();
    assert.equal(r.status,expected,`${method} ${path}: ${typeof value==='string'?value:JSON.stringify(value)}`);return value as any;
  }
  before(async()=>{process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';pool=testPool();await install(pool);const db=new Database(pool);owner=await actor(pool);outsider=await actor(pool);siteId=await site(pool,owner,{version:1,elements:[{id:'heading',type:'heading',content:'Home'}]},'PUBLISHED');({server}=serverFor(db,{requestLimit:100000}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;});
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[owner.id,outsider.id]]);await pool.end();});

  test('blog setup creates CMS-backed collections once and preserves existing CMS',async()=>{
    const first=await send('POST',`/sites/${siteId}/blog/setup`,owner,{},201);assert.equal(first.configured,true);assert.equal(first.replayed,false);
    const second=await send('POST',`/sites/${siteId}/blog/setup`,owner,{},201);assert.equal(second.configured,true);assert.equal(second.replayed,true);
    const cms=await send('GET',`/sites/${siteId}/collections`);const slugs=cms.collections.map((x:any)=>x.slug);assert.ok(slugs.includes('blog-posts'));assert.ok(slugs.includes('blog-authors'));assert.ok(slugs.includes('blog-categories'));
    await send('GET',`/sites/${siteId}/blog`,outsider,undefined,404);
  });

  test('blog drafts stay private while published posts appear in search RSS taxonomy and preview',async()=>{
    const cms=await send('GET',`/sites/${siteId}/collections`),posts=cms.collections.find((x:any)=>x.slug==='blog-posts'),authors=cms.collections.find((x:any)=>x.slug==='blog-authors'),categories=cms.collections.find((x:any)=>x.slug==='blog-categories');
    const author=await send('POST',`/sites/${siteId}/collections/${authors.id}/items`,owner,{name:'Ada Writer',slug:'ada-writer',locale:'en',fields:{bio:'<p>Author bio</p>'}},201);
    await send('POST',`/sites/${siteId}/items/${author.id}/actions`,owner,{revision:0,action:'PUBLISH'});
    const authorList=await send('GET',`/sites/${siteId}/collections/${authors.id}/items?locale=en`),authorGroup=authorList.items[0].groupId;
    const category=await send('POST',`/sites/${siteId}/collections/${categories.id}/items`,owner,{name:'Guides',slug:'guides',locale:'en',fields:{description:'How-to articles'}},201);
    await send('POST',`/sites/${siteId}/items/${category.id}/actions`,owner,{revision:0,action:'PUBLISH'});
    const categoryList=await send('GET',`/sites/${siteId}/collections/${categories.id}/items?locale=en`),categoryGroup=categoryList.items[0].groupId;
    const post=await send('POST',`/sites/${siteId}/collections/${posts.id}/items`,owner,{name:'First Guide',slug:'first-guide',locale:'en',fields:{title:'First Guide',excerpt:'A useful guide',body:'<p>Draft body</p>',author:authorGroup,category:categoryGroup,tags:['guide','first'],seo_title:'First Guide'}},201);
    const before=await send('GET',`/public/sites/${siteId}/blog/search?q=Guide`,undefined);assert.equal(before.total,0);
    const preview=await send('GET',`/sites/${siteId}/blog/preview/first-guide?locale=en`,owner);assert.equal(preview.post.fields.title,'First Guide');
    await send('POST',`/sites/${siteId}/items/${post.id}/actions`,owner,{revision:0,action:'PUBLISH'});
    const search=await send('GET',`/public/sites/${siteId}/blog/search?q=Guide`,undefined);assert.equal(search.total,1);assert.equal(search.items[0].slug,'first-guide');
    const article=await send('GET',`/public/sites/${siteId}/blog/posts/first-guide?locale=en`,undefined);assert.equal(article.post.fields.title,'First Guide');
    const byAuthor=await send('GET',`/public/sites/${siteId}/blog/authors/ada-writer?locale=en`,undefined);assert.equal(byAuthor.posts.length,1);
    const byCategory=await send('GET',`/public/sites/${siteId}/blog/categories/guides?locale=en`,undefined);assert.equal(byCategory.posts.length,1);
    const rss=await send('GET',`/public/sites/${siteId}/blog/rss.xml?locale=en`,undefined);assert.match(rss,/First Guide/);assert.match(rss,/first-guide/);
    const sitemap=await send('GET',`/public/sites/${siteId}/blog/sitemap.xml?locale=en`,undefined);assert.match(sitemap,/first-guide/);
  });

  test('blog setup refuses to hijack pre-existing reserved CMS slugs',async()=>{
    const s=await site(pool,owner,{version:1,elements:[]},'PUBLISHED');
    await send('POST',`/sites/${s}/collections`,owner,{name:'Existing',slug:'blog-posts',fields:[]},201);
    await send('POST',`/sites/${s}/blog/setup`,owner,{},409);
  });

  test('personalization is deterministic, revision checked, feature governed and tenant scoped',async()=>{
    const created=await send('POST',`/sites/${siteId}/personalization`,owner,{name:'Spring pricing hero',priority:10,conditions:[{attribute:'path',operator:'PREFIX',value:'/pricing'},{attribute:'utmCampaign',operator:'EQ',value:'spring'}],targetElementId:'heading',variant:{text:'Spring pricing'}},201);
    await send('GET',`/sites/${siteId}/personalization`,outsider,undefined,404);
    await send('PATCH',`/sites/${siteId}/personalization/${created.id}/state`,owner,{state:'RUNNING',revision:0});
    const match=await send('POST',`/public/sites/${siteId}/personalization`,undefined,{path:'/pricing/team',context:{utmCampaign:'spring',deviceCategory:'desktop'}});assert.equal(match.deterministic,true);assert.equal(match.variants.length,1);assert.equal(match.variants[0].variant.text,'Spring pricing');
    const same=await send('POST',`/public/sites/${siteId}/personalization`,undefined,{path:'/pricing/team',context:{utmCampaign:'spring',deviceCategory:'desktop'}});assert.deepEqual(same.variants,match.variants);
    const miss=await send('POST',`/public/sites/${siteId}/personalization`,undefined,{path:'/pricing/team',context:{utmCampaign:'other'}});assert.equal(miss.variants.length,0);
    await send('PUT',`/sites/${siteId}/personalization/${created.id}`,owner,{name:'Stale',priority:10,conditions:[],targetElementId:'heading',variant:{text:'x'},revision:0},409);
    await send('PUT',`/sites/${siteId}/governance/features`,owner,{feature:'PERSONALIZATION',enabled:false});
    const disabled=await send('POST',`/public/sites/${siteId}/personalization`,undefined,{path:'/pricing/team',context:{utmCampaign:'spring'}});assert.deepEqual(disabled.variants,[]);
    await send('PATCH',`/sites/${siteId}/personalization/${created.id}/state`,owner,{state:'PAUSED',revision:1});
    await send('DELETE',`/sites/${siteId}/personalization/${created.id}`,owner);
  });
}
