import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createDashboardForumRouter, forumReplyInput, forumTopicInput } from '../routes/dashboard-forum.routes.js';
import { createDashboardForumService } from '../services/dashboard-forum.service.js';
import { errorMiddleware } from '../middlewares/error.middleware.js';
test('forum input rejects empty, oversized, unexpected and spoofed-author fields', () => {
 const id='8d56523b-831e-4e23-b988-90faf4951a35';
 const input={id,categoryId:id,title:'Valid title',content:'Useful community discussion'};
 assert.equal(forumTopicInput.safeParse(input).success,true);
 for(const change of [{title:'    '},{content:'short'},{title:'x'.repeat(181)},{authorId:id},{workspaceId:id}])assert.equal(forumTopicInput.safeParse({...input,...change}).success,false);
 assert.equal(forumReplyInput.safeParse({id,content:'   '}).success,false);
});
test('inactive accounts cannot read or mutate discussions', async () => {
 const service=createDashboardForumService({user:{findUnique:async()=>({status:'SUSPENDED'})},$transaction:async(fn:any)=>fn({user:{findUnique:async()=>null}})});
 await assert.rejects(service.read('user',{filter:'latest',page:1}),(error:any)=>error.statusCode===403);
 await assert.rejects(service.solve('user','topic',true),(error:any)=>error.statusCode===403);
});
test('forum routes enforce authentication, strict validation and per-route scope', async () => {
 let calls=0;const service:any={read:async(user:string,input:any)=>{calls++;return {user,...input};},create:async()=>{calls++;return{};}};
 const app=express();app.use(express.json());app.use('/api',createDashboardForumRouter((req,res,next)=>{if(!req.headers.authorization){res.sendStatus(401);return;}res.locals.user={id:'viewer'};next();},service));app.get('/api/public',(_req,res)=>res.sendStatus(200));app.use(errorMiddleware);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address() as any;const base=`http://127.0.0.1:${address.port}/api`;
 try{
  assert.equal((await fetch(base+'/dashboard/forum')).status,401);
  assert.equal((await fetch(base+'/public')).status,200);
  const headers={Authorization:'test','Content-Type':'application/json'};
  for(const path of ['?filter=bad','?categoryId=bad','?page=0','?authorId=other','/bad-id'])assert.equal((await fetch(base+'/dashboard/forum'+path,{headers})).status,400);
  assert.equal((await fetch(base+'/dashboard/forum',{method:'POST',headers,body:'{}'})).status,400);
  assert.equal(calls,0);
  const response=await fetch(base+'/dashboard/forum?filter=solved&page=2',{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(await response.json(),{user:'viewer',filter:'solved',page:2});assert.equal(calls,1);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
