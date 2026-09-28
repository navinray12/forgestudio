/** Test-only production-bundle host using real PostgreSQL sessions and the new HTTP router. */
import express from 'express';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {testPool,install,actor,site,workspace,grant,serverFor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import {Workspaces} from '../../src/modules/studio-next/workspaces.js';
import {createPresenceServer} from '../../src/modules/studio-next/presence.js';
const pool=testPool();await install(pool);const db=new Database(pool);
const owner=await actor(pool,{fullName:'Browser Studio Owner'}),invitee=await actor(pool,{fullName:'Browser Invited Member'}),reviewer=await actor(pool,{fullName:'Browser Reviewer'});
const siteId=await site(pool,owner),workspaceId=await workspace(pool,owner);await grant(pool,siteId,reviewer,'REVIEWER');
await new Workspaces(db).invite(owner,workspaceId,{email:invitee.email,role:'MEMBER'});
const dist=path.resolve(process.env.STUDIO_DIST_PATH||'../studio-built-dist');
const {app,server}=serverFor(db,{requestLimit:100000,analyticsSecret:'browser-test-signing-secret-with-more-than-32-characters',commerce:{accounts:{},origin:'',webhookSecret:undefined}});
app.get('/api/v1/auth/me',db.auth(),(_req,res)=>res.json({success:true,data:{user:{...res.locals.actor,status:'ACTIVE',role:'USER',phone:null,phoneVerified:false,lastLoginAt:null}}}));
app.use('/api',(_req,res)=>res.status(404).json({success:false,error:{message:'Legacy APIs are not provided by this integration harness'}}));
app.use(express.static(dist));app.get('/{*path}',(_req,res)=>res.sendFile(path.join(dist,'index.html')));
createPresenceServer(server,db);
await new Promise<void>(resolve=>server.listen(5188,'127.0.0.1',resolve));process.env.FRONTEND_URL='http://127.0.0.1:5188';
const metadata=path.resolve(process.env.STUDIO_BROWSER_METADATA||'../studio-test-session.json');await mkdir(path.dirname(metadata),{recursive:true});await writeFile(metadata,JSON.stringify({base:process.env.FRONTEND_URL,siteId,workspaceId,ownerToken:owner.token,inviteeToken:invitee.token,reviewerToken:reviewer.token}),{mode:0o600});
console.log('Site Studio test host ready');
async function close(){server.close();await pool.query('DELETE FROM public.users WHERE id=ANY($1::uuid[])',[[owner.id,invitee.id,reviewer.id]]);await pool.end();process.exit(0);}
process.once('SIGTERM',()=>{void close();});process.once('SIGINT',()=>{void close();});
