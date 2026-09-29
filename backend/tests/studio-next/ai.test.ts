import {before,after,test} from 'node:test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import type pg from 'pg';
import type {Server} from 'node:http';
import {testPool,install,actor,site,grant,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import type {AIProvider} from '../../src/modules/studio-next/ai.js';

if(!url)test('AI integration requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else {
  let pool:pg.Pool,server:Server,base:string,user:TestActor,siteId:string,calls=0;
  const provider:AIProvider={name:'fixture',model:'fixture-model-v1',async generateStructured(input){
    calls++;
    let value:any;
    if(input.system.includes('one editable website section'))value={section:{id:'ai-pricing',type:'section',children:[{id:'ai-pricing-title',type:'heading',content:'Simple pricing'}]},rationale:'Adds only the requested section.'};
    else if(input.system.startsWith('Generate one editable website page'))value={page:{id:'ai-about',name:'About AI',slug:'/about-ai',elements:[{id:'ai-about-heading',type:'heading',content:'About our product',styles:{fontSize:'40px'}}],pageSettings:{title:'About AI',description:'About this product'}},rationale:'Adds one page without changing existing pages.'};
    else if(input.system.includes('website architecture plan'))value={siteName:'Accounting Cloud',pages:[{id:'site-home',name:'Home',slug:'/',purpose:'Primary landing page'},{id:'site-features',name:'Features',slug:'/features',purpose:'Explain product features'},{id:'site-contact',name:'Contact',slug:'/contact',purpose:'Lead capture'}],designSystem:{variables:[{id:'ds-primary',name:'Primary',category:'color',token:'--fs-color-primary',value:'#2563eb'}],classes:[{id:'ds-card',name:'Card',className:'fs-card',styles:{borderRadius:'16px',padding:'24px'}}]}};
    else if(input.system.includes('approved site plan'))value={pages:[{id:'site-home',name:'Home',slug:'/',elements:[{id:'site-home-hero',type:'container',children:[{id:'site-home-title',type:'heading',content:'Accounting made clear'}]}],pageSettings:{title:'Accounting Cloud'}},{id:'site-features',name:'Features',slug:'/features',elements:[{id:'site-features-title',type:'heading',content:'Features'}],pageSettings:{title:'Features'}},{id:'site-contact',name:'Contact',slug:'/contact',elements:[{id:'site-contact-title',type:'heading',content:'Contact us'}],pageSettings:{title:'Contact'}}]};
    else if(input.system.includes('Design one CMS collection'))value={collection:{name:'Blog Posts',slug:'blog-posts',fields:[{key:'title',name:'Title',type:'TEXT',required:true},{key:'body',name:'Body',type:'RICH_TEXT',required:true},{key:'category',name:'Category',type:'OPTION',required:false,options:['Product','Guides']}]},items:[{name:'Draft one',slug:'draft-one',locale:'en',fields:{title:'Draft one',body:'<p>Review me</p>',category:'Product'}},{name:'Draft two',slug:'draft-two',locale:'en',fields:{title:'Draft two',body:'<p>Review me too</p>',category:'Guides'}}],rationale:'Creates reviewable drafts only.'};
    else if(input.system.includes('Improve metadata for exactly one selected webpage'))value={title:'Accounting automation for teams',description:'Automate routine accounting workflows with editable, structured tools.',canonical:'https://example.com/features',robotsIndex:true,robotsFollow:true,openGraph:{title:'Accounting automation for teams',description:'Automate routine accounting workflows.',image:null},twitter:{title:'Accounting automation',description:'Structured accounting automation tools.',image:null},structuredData:{'@context':'https://schema.org','@type':'WebPage'},rationale:'Uses only supplied page context.'};
    else value={replacement:'Concise heading',rationale:'Shorter without changing the claim.'};
    return {value,usage:{inputUnits:10,outputUnits:5}};
  }};
  const send=async(method:string,path:string,body?:unknown,expected=200)=>{
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${user.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  };
  const sendAs=async(a:TestActor,method:string,path:string,body?:unknown,expected=200)=>{
    const r=await fetch(base+path,{method,headers:{Cookie:`forge_session=${a.token}`,Origin:'http://localhost:5173','X-Studio-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const value=await r.json();assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(value)}`);return value;
  };
  before(async()=>{process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';pool=testPool();await install(pool);const db=new Database(pool);user=await actor(pool);siteId=await site(pool,user);({server}=serverFor(db,{aiProvider:provider,requestLimit:100000}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/v1/studio-next`;});
  after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.query('DELETE FROM public.users WHERE id=$1',[user.id]);await pool.end();});
  test('typed human commands mutate only their stable-ID targets',async()=>{const d=await send('GET',`/sites/${siteId}/design`);const op=randomUUID();await send('POST',`/sites/${siteId}/design/commands`,{baseHash:d.hash,operationId:op,commands:[{type:'SET_STYLE',elementId:'heading',property:'fontSize',value:'24px'},{type:'SET_ELEMENT_TEXT',elementId:'heading',field:'content',value:'Command heading'}]});const next=await send('GET',`/sites/${siteId}/design`);assert.equal(next.website.editorData.elements[0].content,'Command heading');assert.equal(next.website.editorData.elements[0].styles.fontSize,'24px');});
  test('CMS bindings are site-scoped, field-compatible and stored through domain commands',async()=>{
    const s=await site(pool,user,{version:1,elements:[{id:'bound-heading',type:'heading',content:'Fallback'}]},'DRAFT');
    const collection=await send('POST',`/sites/${s}/collections`,{name:'Articles',slug:'articles',fields:[{key:'title',name:'Title',type:'TEXT',required:true},{key:'image',name:'Image',type:'IMAGE',required:false}]},201);
    let d=await send('GET',`/sites/${s}/design`);
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_CMS_BINDING',elementId:'bound-heading',binding:{collectionId:collection.id,field:'title',target:'content'}}]});
    d=await send('GET',`/sites/${s}/design`);assert.deepEqual(d.website.editorData.elements[0].cmsBinding,{collectionId:collection.id,field:'title',target:'content'});
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_CMS_BINDING',elementId:'bound-heading',binding:{collectionId:collection.id,field:'image',target:'content'}}]},400);
    const other=await site(pool,user,{version:1,elements:[]},'DRAFT'),foreign=await send('POST',`/sites/${other}/collections`,{name:'Foreign',slug:'foreign',fields:[{key:'title',name:'Title',type:'TEXT',required:true}]},201);
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_CMS_BINDING',elementId:'bound-heading',binding:{collectionId:foreign.id,field:'title',target:'content'}}]},404);
  });
  test('structured interaction rules are validated and stored through the shared Designer command path',async()=>{
    const s=await site(pool,user,{version:1,elements:[{id:'interactive-button',type:'button',content:'Open'}]},'DRAFT');let d=await send('GET',`/sites/${s}/design`);
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_INTERACTIONS',elementId:'interactive-button',rules:[{id:'open-details',trigger:'click',action:'toggle-visibility',targetSelector:'#details'}]}]});
    d=await send('GET',`/sites/${s}/design`);assert.deepEqual(d.website.editorData.elements[0].interactions,[{id:'open-details',trigger:'click',action:'toggle-visibility',targetSelector:'#details'}]);
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_INTERACTIONS',elementId:'interactive-button',rules:[{id:'bad-rule',trigger:'timer',action:'execute-script'}]}]},400);
  });
  test('Designer structural, class, attribute and responsive commands preserve stable IDs',async()=>{
    const s=await site(pool,user,{version:1,elements:[{id:'row',type:'section',children:[{id:'card',type:'div',content:'Card',children:[{id:'card-title',type:'heading',content:'Title'}]},{id:'target',type:'section',children:[]}]}]},'DRAFT');
    let d=await send('GET',`/sites/${s}/design`);
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[
      {type:'DUPLICATE_ELEMENT',elementId:'card',newRootId:'card-copy',parentId:'target',afterId:null},
      {type:'MOVE_ELEMENT',elementId:'card',parentId:'target',afterId:'card-copy'},
      {type:'ATTACH_CLASS',elementId:'card',className:'featured-card'},
      {type:'SET_ATTRIBUTE',elementId:'card',name:'aria-label',value:'Featured card'},
      {type:'SET_VISIBILITY',elementId:'card',visible:false},
      {type:'SET_RESPONSIVE_STYLE',elementId:'card',breakpoint:'mobile',property:'display',value:'block'}
    ]});
    d=await send('GET',`/sites/${s}/design`);const target=d.website.editorData.elements[0].children.find((x:any)=>x.id==='target');
    assert.deepEqual(target.children.map((x:any)=>x.id),['card-copy','card']);
    assert.equal(target.children[0].children[0].id,'card-copy-1');assert.ok(target.children[1].classes.includes('featured-card'));assert.equal(target.children[1].attributes['aria-label'],'Featured card');assert.equal(target.children[1].visibility.visible,false);assert.equal(target.children[1].responsiveOverrides.mobile.display,'block');
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'DETACH_CLASS',elementId:'card',className:'featured-card'},{type:'SET_ATTRIBUTE',elementId:'card',name:'aria-label',value:null}]});
    d=await send('GET',`/sites/${s}/design`);const card=d.website.editorData.elements[0].children.find((x:any)=>x.id==='target').children.find((x:any)=>x.id==='card');assert.equal(card.classes.includes('featured-card'),false);assert.equal(card.attributes['aria-label'],undefined);
  });
  test('typed command retries are idempotent and stale commands fail',async()=>{const d=await send('GET',`/sites/${siteId}/design`),operationId=randomUUID(),body={baseHash:d.hash,operationId,commands:[{type:'SET_ELEMENT_TEXT',elementId:'heading',field:'content',value:'Retry once'}]};const first=await send('POST',`/sites/${siteId}/design/commands`,body);const second=await send('POST',`/sites/${siteId}/design/commands`,body);assert.equal(first.hash,second.hash);assert.equal(second.replayed,true);await send('POST',`/sites/${siteId}/design/commands`,{...body,operationId:randomUUID()},409);});
  test('structural commands require stable unique IDs',async()=>{const d=await send('GET',`/sites/${siteId}/design`);await send('POST',`/sites/${siteId}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'ADD_ELEMENT',parentId:null,afterId:'heading',element:{id:'cta-section',type:'section',children:[]}}]});const next=await send('GET',`/sites/${siteId}/design`);assert.equal(next.website.editorData.elements.at(-1).id,'cta-section');await send('POST',`/sites/${siteId}/design/commands`,{baseHash:next.hash,operationId:randomUUID(),commands:[{type:'ADD_ELEMENT',parentId:null,afterId:null,element:{id:'cta-section',type:'section'}}]},409);});
  test('page lifecycle commands preserve home and slug invariants',async()=>{
    const s=await site(pool,user,{version:1,elements:[],pages:[]},'DRAFT');let d=await send('GET',`/sites/${s}/design`);
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'CREATE_PAGE',page:{id:'page-home',name:'Home',slug:'/',elements:[{id:'page-home-title',type:'heading',content:'Home'}],pageSettings:{title:'Home'}}},{type:'CREATE_PAGE',page:{id:'page-about',name:'About',slug:'/about',elements:[{id:'page-about-title',type:'heading',content:'About'}],pageSettings:{title:'About'}}},{type:'SET_HOME_PAGE',pageId:'page-about'}]});
    d=await send('GET',`/sites/${s}/design`);assert.equal(d.website.editorData.homePageId,'page-about');assert.equal(d.website.editorData.pages.find((p:any)=>p.id==='page-about').slug,'/');assert.notEqual(d.website.editorData.pages.find((p:any)=>p.id==='page-home').slug,'/');
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'UPDATE_PAGE',pageId:'page-home',patch:{name:'Welcome',slug:'/welcome'}},{type:'REORDER_PAGES',pageIds:['page-about','page-home']}]});
    d=await send('GET',`/sites/${s}/design`);assert.deepEqual(d.website.editorData.pages.map((p:any)=>p.id),['page-about','page-home']);assert.equal(d.website.editorData.pages[1].name,'Welcome');
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'CREATE_PAGE',page:{id:'bad-slug',name:'Bad',slug:'/welcome',elements:[]}}]},409);
  });
  test('AI page generation is reviewable and generated content remains manually editable',async()=>{
    const s=await site(pool,user,{version:1,elements:[],pages:[]},'DRAFT');const before=await send('GET',`/sites/${s}/design`);
    const p=await send('POST',`/sites/${s}/ai/pages/propose`,{instruction:'Create an about page'},201);assert.equal(p.page.id,'ai-about');assert.equal((await send('GET',`/sites/${s}/design`)).website.editorData.pages.length,0);
    await send('POST',`/sites/${s}/ai/changes/${p.changeSetId}/apply`,{});let d=await send('GET',`/sites/${s}/design`);assert.equal(d.website.editorData.pages[0].id,'ai-about');assert.equal(d.website.editorData.pages[0].slug,'/');
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_ELEMENT_TEXT',elementId:'ai-about-heading',field:'content',value:'Edited by a person'}]});d=await send('GET',`/sites/${s}/design`);assert.equal(d.website.editorData.pages[0].elements[0].content,'Edited by a person');assert.notEqual(before.hash,d.hash);
  });
  test('AI full-site generation plans, builds and applies editable pages plus a reusable design system',async()=>{
    const s=await site(pool,user,{version:1,elements:[],pages:[]},'DRAFT');const before=await send('GET',`/sites/${s}/design`);
    const proposal=await send('POST',`/sites/${s}/ai/sites/propose`,{instruction:'Create a professional accounting SaaS website'},201);assert.equal(proposal.pageCount,3);assert.equal(proposal.plan.pages.length,3);assert.equal((await send('GET',`/sites/${s}/design`)).website.editorData.pages.length,0);
    await send('POST',`/sites/${s}/ai/changes/${proposal.changeSetId}/apply`,{});let d=await send('GET',`/sites/${s}/design`);assert.equal(d.website.editorData.pages.length,3);assert.equal(d.website.editorData.homePageId,'site-home');assert.equal(d.website.editorData.globalVariables[0].id,'ds-primary');assert.equal(d.website.editorData.globalClasses[0].id,'ds-card');
    await send('POST',`/sites/${s}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_STYLE',elementId:'site-home-title',property:'fontSize',value:'56px'}]});d=await send('GET',`/sites/${s}/design`);assert.equal(d.website.editorData.pages[0].elements[0].children[0].styles.fontSize,'56px');assert.notEqual(before.hash,d.hash);
    await send('POST',`/sites/${s}/ai/sites/propose`,{instruction:'Replace the whole site'},409);
  });
  test('human CMS create commands are idempotent when an operation ID is supplied',async()=>{
    const s=await site(pool,user);const operationId=randomUUID(),body={name:'Human Notes',slug:'human-notes',fields:[{key:'body',name:'Body',type:'TEXT',required:false}],operationId};
    const first=await send('POST',`/sites/${s}/collections`,body,201),second=await send('POST',`/sites/${s}/collections`,body,201);assert.equal(first.id,second.id);assert.equal(second.replayed,true);
    const count=await pool.query("SELECT count(*)::int AS n FROM studio.collections WHERE site_id=$1 AND slug='human-notes'",[s]);assert.equal(count.rows[0].n,1);
    await send('POST',`/sites/${s}/collections`,{...body,name:'Different'},409);
  });
  test('AI CMS generation creates schema and draft records only after review',async()=>{
    const s=await site(pool,user);const before=await send('GET',`/sites/${s}/collections`);
    const proposal=await send('POST',`/sites/${s}/ai/cms/propose`,{instruction:'Create a blog collection with two draft posts'},201);
    assert.equal(proposal.collection.slug,'blog-posts');assert.equal(proposal.itemCount,2);
    const stillBefore=await send('GET',`/sites/${s}/collections`);assert.equal(stillBefore.collections.some((x:any)=>x.slug==='blog-posts'),false);
    const applied=await send('POST',`/sites/${s}/ai/changes/${proposal.changeSetId}/apply`,{});assert.ok(applied.hash);
    const state=await send('GET',`/sites/${s}/collections`);const collection=state.collections.find((x:any)=>x.slug==='blog-posts');assert.ok(collection);
    const items=await send('GET',`/sites/${s}/collections/${collection.id}/items?locale=en`);assert.equal(items.items.length,2);assert.ok(items.items.every((x:any)=>x.live===null||x.live===undefined));
    const publicRead=await send('GET',`/public/sites/${s}/collections/blog-posts`,undefined);assert.equal(publicRead.items.length,0);
    const receipt=await pool.query('SELECT source,command FROM studio.command_receipts WHERE actor_id=$1 AND idempotency_key=$2',[user.id,proposal.changeSetId]);assert.deepEqual(receipt.rows[0],{source:'AI',command:'cms.create_collection_with_drafts'});
    const replay=await send('POST',`/sites/${s}/ai/changes/${proposal.changeSetId}/apply`,{});assert.equal(replay.alreadyApplied,true);
    assert.equal(before.collections.some((x:any)=>x.slug==='blog-posts'),false);
  });
  test('AI SEO assistance changes only selected page metadata and remains content-editor safe',async()=>{
    const s=await site(pool,user,{version:1,pages:[{id:'seo-page',name:'Features',slug:'/',isHome:true,elements:[{id:'seo-heading',type:'heading',content:'Accounting automation'}],pageSettings:{title:'Features',description:'Original description',customMeta:'keep-me'}}],homePageId:'seo-page'},'DRAFT');
    const before=await send('GET',`/sites/${s}/design`);
    const p=await send('POST',`/sites/${s}/ai/seo/propose`,{pageId:'seo-page',instruction:'Improve metadata for search and social'},201);assert.equal(p.settings.seoTitle,'Accounting automation for teams');
    const unchanged=await send('GET',`/sites/${s}/design`);assert.deepEqual(unchanged.website.editorData.pages[0].pageSettings,before.website.editorData.pages[0].pageSettings);
    await send('POST',`/sites/${s}/ai/changes/${p.changeSetId}/apply`,{});const after=await send('GET',`/sites/${s}/design`);
    assert.equal(after.website.editorData.pages[0].elements[0].content,'Accounting automation');assert.equal(after.website.editorData.pages[0].pageSettings.customMeta,'keep-me');assert.equal(after.website.editorData.pages[0].pageSettings.seoTitle,'Accounting automation for teams');
    const editor=await actor(pool),s2=await site(pool,user,{version:1,pages:[{id:'meta',name:'Meta',slug:'/',isHome:true,elements:[{id:'meta-title',type:'heading',content:'Body'}],pageSettings:{title:'Meta'}}],homePageId:'meta'},'DRAFT');await grant(pool,s2,editor,'CONTENT_EDITOR');
    const d=await sendAs(editor,'GET',`/sites/${s2}/design`);await sendAs(editor,'POST',`/sites/${s2}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'UPDATE_PAGE_SETTINGS',pageId:'meta',settings:{seoTitle:'Editor metadata'}}]});
    assert.equal((await sendAs(editor,'GET',`/sites/${s2}/design`)).website.editorData.pages[0].pageSettings.seoTitle,'Editor metadata');
  });
  test('AI section generation creates a reviewable local changeset and remains manually editable',async()=>{const before=await send('GET',`/sites/${siteId}/design`);const p=await send('POST',`/sites/${siteId}/ai/sections/propose`,{instruction:'Add a simple pricing section',afterId:'heading'},201);assert.equal(p.section.id,'ai-pricing');assert.equal((await send('GET',`/sites/${siteId}/design`)).website.editorData.elements.some((x:any)=>x.id==='ai-pricing'),false);await send('POST',`/sites/${siteId}/ai/changes/${p.changeSetId}/apply`,{});let d=await send('GET',`/sites/${siteId}/design`);assert.equal(d.website.editorData.elements.some((x:any)=>x.id==='ai-pricing'),true);await send('POST',`/sites/${siteId}/design/commands`,{baseHash:d.hash,operationId:randomUUID(),commands:[{type:'SET_STYLE',elementId:'ai-pricing',property:'padding',value:'48px'}]});d=await send('GET',`/sites/${siteId}/design`);assert.equal(d.website.editorData.elements.find((x:any)=>x.id==='ai-pricing').styles.padding,'48px');assert.notEqual(before.hash,d.hash);});
  test('AI proposal is persisted but does not mutate the design until approval',async()=>{const callsBefore=calls;const before=await send('GET',`/sites/${siteId}/design`);const p=await send('POST',`/sites/${siteId}/ai/copy/propose`,{elementId:'heading',field:'content',instruction:'Make it concise'},201);assert.equal(p.replacement,'Concise heading');assert.equal((await send('GET',`/sites/${siteId}/design`)).website.editorData.elements[0].content,before.website.editorData.elements[0].content);await send('POST',`/sites/${siteId}/ai/changes/${p.changeSetId}/apply`,{});assert.equal((await send('GET',`/sites/${siteId}/design`)).website.editorData.elements[0].content,'Concise heading');assert.equal(calls,callsBefore+1);const receipt=await pool.query('SELECT source,command FROM studio.command_receipts WHERE idempotency_key=$1',[p.changeSetId]);assert.deepEqual(receipt.rows[0],{source:'AI',command:'design.save'});assert.notEqual(before.hash,(await send('GET',`/sites/${siteId}/design`)).hash);});
  test('applying an AI changeset is idempotent',async()=>{const p=await send('POST',`/sites/${siteId}/ai/copy/propose`,{elementId:'heading',field:'content',instruction:'Shorten again'},201);const first=await send('POST',`/sites/${siteId}/ai/changes/${p.changeSetId}/apply`,{});const second=await send('POST',`/sites/${siteId}/ai/changes/${p.changeSetId}/apply`,{});assert.equal(first.hash,second.hash);assert.equal(second.alreadyApplied,true);});
  test('rejected AI proposals cannot later be applied',async()=>{const p=await send('POST',`/sites/${siteId}/ai/copy/propose`,{elementId:'heading',field:'content',instruction:'Do not use this'},201);await send('POST',`/sites/${siteId}/ai/changes/${p.changeSetId}/reject`,{});await send('POST',`/sites/${siteId}/ai/changes/${p.changeSetId}/apply`,{},409);});
  test('stale AI proposals cannot overwrite a newer manual save',async()=>{const p=await send('POST',`/sites/${siteId}/ai/copy/propose`,{elementId:'heading',field:'content',instruction:'Another version'},201);const d=await send('GET',`/sites/${siteId}/design`);d.website.editorData.elements[0].content='Manual newer edit';await send('PUT',`/sites/${siteId}/design`,{baseHash:d.hash,editorData:d.website.editorData,operationId:randomUUID()});await send('POST',`/sites/${siteId}/ai/changes/${p.changeSetId}/apply`,{},409);assert.equal((await send('GET',`/sites/${siteId}/design`)).website.editorData.elements[0].content,'Manual newer edit');});
}
