import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
import {communityPostInput,communityQuery,createDashboardCommunityRouter} from '../routes/dashboard-community.routes.js';
import {errorMiddleware} from '../middlewares/error.middleware.js';
test('community accepts only bounded public content and safe resource links',()=>{
 const post={id:randomUUID(),title:'Useful discussion',content:'Content for the community',kind:'discussions'};
 assert.equal(communityPostInput.safeParse(post).success,true);
 for(const patch of [{authorId:randomUUID()},{visibility:'PRIVATE'},{kind:'admin'},{title:'no'},{templateId:randomUUID()},{resourceUrl:'https://example.com'}])assert.equal(communityPostInput.safeParse({...post,...patch}).success,false);
 for(const resourceUrl of ['javascript:alert(1)','http://example.com','https://user:secret@example.com'])assert.equal(communityPostInput.safeParse({...post,kind:'plugins',resourceUrl}).success,false);
 assert.equal(communityPostInput.safeParse({...post,kind:'plugins',resourceUrl:'https://example.com/plugin'}).success,true);
 for(const input of [{page:0},{sort:'sql'},{userId:randomUUID()},{search:'a'.repeat(101)}])assert.equal(communityQuery.safeParse(input).success,false);
 assert.equal(communityQuery.parse({saved:'true'}).saved,true);
});
test('every community route requires authentication, validates identity and preserves other public routes',async()=>{
 const calls:any[]=[];const service:any=Object.fromEntries(['list','options','create','detail','comment','react','follow'].map(k=>[k,async(...args:any[])=>{calls.push([k,...args]);return{ok:true};}]));const app=express();app.use(express.json());app.use('/api',createDashboardCommunityRouter((req,res,next)=>{if(!req.headers.authorization){res.sendStatus(401);return;}res.locals.user={id:'session-user'};next();},service));app.get('/api/public',(_q,r)=>r.sendStatus(200));app.use(errorMiddleware);const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const url=`http://127.0.0.1:${(server.address()as any).port}/api`,id=randomUUID(),headers={authorization:'fixture','Content-Type':'application/json'};
 try{for(const [path,method] of [['','GET'],['/options','GET'],['','POST'],[`/posts/${id}`,'GET'],[`/posts/${id}/comments`,'POST'],[`/posts/${id}/like`,'PATCH'],[`/posts/${id}/bookmark`,'PATCH'],[`/creators/${id}/follow`,'PATCH']])assert.equal((await fetch(url+'/dashboard/community'+path,{method})).status,401);assert.equal((await fetch(url+'/public')).status,200);
 assert.equal((await fetch(url+'/dashboard/community?userId=other',{headers})).status,400);assert.equal((await fetch(url+'/dashboard/community/posts/bad/like',{method:'PATCH',headers,body:'{"value":true}'})).status,400);assert.equal(calls.length,0);
 const response=await fetch(url+'/dashboard/community',{headers});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(calls[0][1],'session-user');
 assert.equal((await fetch(url+`/dashboard/community/posts/${id}/like`,{method:'PATCH',headers,body:'{"value":true}'})).status,200);assert.deepEqual(calls[1],['react','session-user',id,'like',true]);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
