/** Test-only production-bundle host using real PostgreSQL sessions and the new HTTP router. */
import express from 'express';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {testPool,install,actor,site,workspace,grant,serverFor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import {Workspaces} from '../../src/modules/studio-next/workspaces.js';
import {createPresenceServer} from '../../src/modules/studio-next/presence.js';
import type {AIProvider} from '../../src/modules/studio-next/ai.js';
const pool=testPool();await install(pool);const db=new Database(pool);
const owner=await actor(pool,{fullName:'Browser Studio Owner'}),invitee=await actor(pool,{fullName:'Browser Invited Member'}),reviewer=await actor(pool,{fullName:'Browser Reviewer'});
const siteId=await site(pool,owner),aiSiteId=await site(pool,owner,{version:1,elements:[],pages:[]},'DRAFT'),workspaceId=await workspace(pool,owner);await grant(pool,siteId,reviewer,'REVIEWER');
await new Workspaces(db).invite(owner,workspaceId,{email:invitee.email,role:'MEMBER'});
const dist=path.resolve(process.env.STUDIO_DIST_PATH||'../studio-built-dist');
const browserAiProvider:AIProvider={name:'browser-fixture',model:'browser-structured-v1',async generateStructured(input){
  if(input.system.includes('website architecture plan'))return {value:{siteName:'Browser Accounting',pages:[{id:'browser-home',name:'Home',slug:'/',purpose:'Landing'},{id:'browser-features',name:'Features',slug:'/features',purpose:'Features'},{id:'browser-contact',name:'Contact',slug:'/contact',purpose:'Contact'}],designSystem:{variables:[{id:'browser-primary',name:'Primary',category:'color',token:'--fs-color-primary',value:'#2563eb'}],classes:[{id:'browser-card',name:'Card',className:'browser-card',styles:{borderRadius:'16px'}}]}},usage:{inputUnits:12,outputUnits:8}};
  if(input.system.includes('approved site plan'))return {value:{pages:[{id:'browser-home',name:'Home',slug:'/',elements:[{id:'browser-home-title',type:'heading',content:'Browser Accounting'}],pageSettings:{title:'Browser Accounting'}},{id:'browser-features',name:'Features',slug:'/features',elements:[{id:'browser-features-title',type:'heading',content:'Features'}],pageSettings:{title:'Features'}},{id:'browser-contact',name:'Contact',slug:'/contact',elements:[{id:'browser-contact-title',type:'heading',content:'Contact'}],pageSettings:{title:'Contact'}}]},usage:{inputUnits:15,outputUnits:20}};
  if(input.system.startsWith('Generate one editable website page'))return {value:{page:{id:'browser-about',name:'About',slug:'/about',elements:[{id:'browser-about-title',type:'heading',content:'About'}],pageSettings:{title:'About'}},rationale:'One editable page'},usage:{inputUnits:5,outputUnits:7}};
  if(input.system.includes('one editable website section'))return {value:{section:{id:'browser-section',type:'section',children:[]},rationale:'One editable section'},usage:{inputUnits:4,outputUnits:4}};
  if(input.system.includes('Design one CMS collection'))return {value:{collection:{name:'Browser Blog',slug:'browser-blog',fields:[{key:'title',name:'Title',type:'TEXT',required:true},{key:'body',name:'Body',type:'RICH_TEXT',required:true}]},items:[{name:'Browser draft',slug:'browser-draft',locale:'en',fields:{title:'Browser draft',body:'<p>Draft from AI</p>'}}],rationale:'Draft-only browser fixture'},usage:{inputUnits:6,outputUnits:7}};
  return {value:{replacement:'Browser concise heading',rationale:'Shorter copy'},usage:{inputUnits:3,outputUnits:3}};
}};
const {app,server}=serverFor(db,{requestLimit:100000,aiProvider:browserAiProvider,analyticsSecret:'browser-test-signing-secret-with-more-than-32-characters',commerce:{accounts:{},origin:'',webhookSecret:undefined}});
app.get('/api/v1/auth/me',db.auth(),(_req,res)=>res.json({success:true,data:{user:{...res.locals.actor,status:'ACTIVE',role:'USER',phone:null,phoneVerified:false,lastLoginAt:null}}}));
app.use('/api',(_req,res)=>res.status(404).json({success:false,error:{message:'Legacy APIs are not provided by this integration harness'}}));
app.use(express.static(dist));app.get('/{*path}',(_req,res)=>res.sendFile(path.join(dist,'index.html')));
createPresenceServer(server,db);
await new Promise<void>(resolve=>server.listen(5188,'127.0.0.1',resolve));process.env.FRONTEND_URL='http://127.0.0.1:5188';
const metadata=path.resolve(process.env.STUDIO_BROWSER_METADATA||'../studio-test-session.json');await mkdir(path.dirname(metadata),{recursive:true});await writeFile(metadata,JSON.stringify({base:process.env.FRONTEND_URL,siteId,aiSiteId,workspaceId,ownerToken:owner.token,inviteeToken:invitee.token,reviewerToken:reviewer.token}),{mode:0o600});
console.log('Site Studio test host ready');
async function close(){server.close();await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[owner.id,invitee.id,reviewer.id]]);await pool.end();process.exit(0);}
process.once('SIGTERM',()=>{void close();});process.once('SIGINT',()=>{void close();});
