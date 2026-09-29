import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import type {Server} from 'node:http';
import {WebSocket} from 'ws';
import {testPool,install,actor,site,serverFor,url,type TestActor} from './fixture.js';
import {Database} from '../../src/modules/studio-next/database.js';
import {createPresenceServer} from '../../src/modules/studio-next/presence.js';

if(!url)test('distributed presence requires STUDIO_TEST_DATABASE_URL',{skip:true},()=>{});
else{
  let pool:pg.Pool,db:Database,serverA:Server,serverB:Server,owner:TestActor,siteId:string,baseA:string,baseB:string;
  const sockets:WebSocket[]=[];
  const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
  function wsUrl(base:string){return base.replace('http:','ws:')+'/ws/presence';}
  function connect(base:string,a:TestActor){
    const ws=new WebSocket(wsUrl(base),{origin:'http://localhost:5173',headers:{Cookie:`forge_session=${a.token}`}});sockets.push(ws);return ws;
  }
  function next(ws:WebSocket,predicate:(value:any)=>boolean,timeoutMs=5000){
    return new Promise<any>((resolve,reject)=>{
      const timer=setTimeout(()=>{cleanup();reject(new Error('WebSocket event timeout'));},timeoutMs);
      const onMessage=(data:any)=>{try{const value=JSON.parse(data.toString());if(predicate(value)){cleanup();resolve(value);}}catch{}};
      const onError=(error:any)=>{cleanup();reject(error);};
      const cleanup=()=>{clearTimeout(timer);ws.off('message',onMessage);ws.off('error',onError);};
      ws.on('message',onMessage);ws.on('error',onError);
    });
  }
  before(async()=>{
    process.env.FRONTEND_URL='http://localhost:5173';process.env.NODE_ENV='test';
    pool=testPool();await install(pool);db=new Database(pool);owner=await actor(pool,{fullName:'Distributed Tester'});siteId=await site(pool,owner);
    ({server:serverA}=serverFor(db,{requestLimit:100000}));({server:serverB}=serverFor(db,{requestLimit:100000}));
    createPresenceServer(serverA,db);createPresenceServer(serverB,db);
    await Promise.all([new Promise<void>(r=>serverA.listen(0,'127.0.0.1',r)),new Promise<void>(r=>serverB.listen(0,'127.0.0.1',r))]);
    baseA=`ws://127.0.0.1:${(serverA.address() as any).port}`.replace('ws:','http:');
    baseB=`ws://127.0.0.1:${(serverB.address() as any).port}`.replace('ws:','http:');
    await wait(200);
  });
  after(async()=>{
    for(const ws of sockets)ws.terminate();
    await Promise.all([new Promise<void>(r=>serverA.close(()=>r())),new Promise<void>(r=>serverB.close(()=>r()))]);
    await pool.query('DELETE FROM public.users WHERE id=$1',[owner.id]);await pool.end();
  });

  test('presence leases synchronize peers across two server instances',async()=>{
    const a=connect(baseA,owner);await new Promise<void>((resolve,reject)=>{a.once('open',()=>resolve());a.once('error',reject);});
    const syncA=next(a,m=>m.type==='SYNC');a.send(JSON.stringify({type:'JOIN',websiteId:siteId}));const first=await syncA;assert.equal(first.peers.length,1);
    const b=connect(baseB,owner);await new Promise<void>((resolve,reject)=>{b.once('open',()=>resolve());b.once('error',reject);});
    const syncB=next(b,m=>m.type==='SYNC');b.send(JSON.stringify({type:'JOIN',websiteId:siteId}));const second=await syncB;
    assert.equal(second.peers.length,2);assert.ok(second.peers.some((p:any)=>p.socketId===first.selfSocketId));
    const leases=await pool.query('SELECT count(*)::int AS n FROM studio.presence_leases WHERE site_id=$1 AND expires_at>now()',[siteId]);assert.equal(leases.rows[0].n,2);
  });

  test('selection events fan out across server instances through PostgreSQL notifications',async()=>{
    const a=connect(baseA,owner);const b=connect(baseB,owner);
    await Promise.all([new Promise<void>((resolve,reject)=>{a.once('open',()=>resolve());a.once('error',reject);}),new Promise<void>((resolve,reject)=>{b.once('open',()=>resolve());b.once('error',reject);})]);
    const sa=next(a,m=>m.type==='SYNC'),sb=next(b,m=>m.type==='SYNC');a.send(JSON.stringify({type:'JOIN',websiteId:siteId}));b.send(JSON.stringify({type:'JOIN',websiteId:siteId}));const [syncA,syncB]=await Promise.all([sa,sb]);
    const remote=next(a,m=>m.type==='PEER_SELECT'&&m.socketId===syncB.selfSocketId);
    b.send(JSON.stringify({type:'SELECT',elementId:'hero-title'}));const event=await remote;assert.equal(event.elementId,'hero-title');
    const row=await pool.query('SELECT selected_element_id FROM studio.presence_leases WHERE socket_id=$1',[syncB.selfSocketId]);assert.equal(row.rows[0].selected_element_id,'hero-title');
    assert.notEqual(syncA.selfSocketId,syncB.selfSocketId);
  });
}
