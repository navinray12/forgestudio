import { createHash,randomUUID } from 'node:crypto';
import { WebSocketServer,WebSocket } from 'ws';
import type { Server, IncomingMessage } from 'node:http';
import { z } from 'zod';
import { Database,type Actor } from './database.js';
import { parse,uuid } from './validation.js';
import { trustedOrigin } from '../studio/domain.js';
interface Peer { socketId:string; user:{userId:string;name:string;color:string}; websiteId:string; cursor?:{x:number;y:number};selectedElementId?:string|null;lastSeen:number }
const rooms=new Map<string,Map<WebSocket,Peer>>();
function broadcast(site:string,value:unknown,except?:WebSocket){
  const json=JSON.stringify(value);for(const socket of rooms.get(site)?.keys()||[])if(socket!==except&&socket.readyState===WebSocket.OPEN){if(socket.bufferedAmount>256000)socket.close(1013,'Slow consumer');else socket.send(json);}
}
async function authenticate(db:Database,req:IncomingMessage):Promise<Actor>{
  const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('forge_session='))?.slice(14);
  if(!cookie||cookie.length>512)throw new Error('No session');
  const r=await db.pool.query(`SELECT u.id,u.email,u."emailVerified",u."fullName" FROM public.sessions s JOIN public.users u ON u.id=s."userId"
    WHERE s."tokenHash"=$1 AND s."revokedAt" IS NULL AND s."expiresAt">now() AND u.status='ACTIVE'`,[createHash('sha256').update(decodeURIComponent(cookie)).digest('hex')]);
  if(!r.rows[0])throw new Error('Invalid session');return r.rows[0];
}
export function createPresenceServer(server:Server,db:Database){
  const wss=new WebSocketServer({noServer:true,maxPayload:8192});
  server.on('upgrade',(req,socket,head)=>{
    if(!['/ws/presence','/ws/collaboration'].includes((req.url||'').split('?')[0]))return;
    if(!trustedOrigin(req.headers.origin,process.env.FRONTEND_URL,process.env.NODE_ENV==='production')){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
    void authenticate(db,req).then(actor=>{
      if(socket.destroyed)return;
      wss.handleUpgrade(req,socket,head,ws=>{wss.emit('connection',ws,req,actor);});
    }).catch(()=>{if(!socket.destroyed){socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();}});
  });
  wss.on('connection',(ws:WebSocket,req:IncomingMessage,initial:Actor)=>{
    let actor=initial,siteId:string|null=null,peer:Peer|null=null,lastAuth=0,count=0,windowStart=Date.now(),pending=0;
    let queue=Promise.resolve();
    const leave=()=>{if(siteId){const room=rooms.get(siteId);room?.delete(ws);broadcast(siteId,{type:'PEER_LEFT',socketId:peer?.socketId});if(!room?.size)rooms.delete(siteId);}siteId=null;peer=null;};
    ws.on('message',raw=>{
      if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}
      if(++count>35||++pending>40){ws.close(1008,'Message rate exceeded');return;}
      queue=queue.then(async()=>{
        if(ws.readyState!==WebSocket.OPEN)return;
        const message=JSON.parse(raw.toString());
        if(message.type==='JOIN'){
          const target=parse(uuid,message.websiteId);
          actor=await authenticate(db,req);await db.tx(c=>db.site(c,actor,target,'VIEW'));
          if(ws.readyState!==WebSocket.OPEN)return;
          leave();siteId=target;
          if((rooms.get(target)?.size||0)>=100){ws.close(1008,'Room limit reached');return;}
          const color=`hsl(${parseInt(createHash('sha256').update(actor.id).digest('hex').slice(0,4),16)%360} 55% 42%)`;
          peer={socketId:randomUUID(),websiteId:target,user:{userId:actor.id,name:actor.fullName||'Collaborator',color},lastSeen:Date.now()};
          if(!rooms.has(target))rooms.set(target,new Map());rooms.get(target)!.set(ws,peer);lastAuth=Date.now();
          ws.send(JSON.stringify({type:'SYNC',selfSocketId:peer.socketId,peers:[...rooms.get(target)!.values()]}));broadcast(target,{type:'PEER_JOINED',peer},ws);return;
        }
        if(!siteId||!peer)throw new Error('Join first');
        if(Date.now()-lastAuth>5000){actor=await authenticate(db,req);await db.tx(c=>db.site(c,actor,siteId!,'VIEW'));lastAuth=Date.now();}
        peer.lastSeen=Date.now();
        if(message.type==='CURSOR'){
          const cursor=parse(z.object({x:z.number().finite().min(-100000).max(1000000),y:z.number().finite().min(-100000).max(1000000)}).strict(),message.cursor);
          peer.cursor=cursor;broadcast(siteId,{type:'PEER_CURSOR',socketId:peer.socketId,cursor},ws);
        }else if(message.type==='SELECT'){
          const elementId=parse(z.string().max(150).nullable(),message.elementId);peer.selectedElementId=elementId;
          broadcast(siteId,{type:'PEER_SELECT',socketId:peer.socketId,elementId},ws);
        }else if(message.type==='PING')ws.send(JSON.stringify({type:'PONG'}));else throw new Error('Unsupported message');
      }).catch(()=>ws.close(1008,'Invalid message or access revoked')).finally(()=>{pending--;});
    });
    ws.once('close',leave);ws.once('error',leave);
  });
  const reaper=setInterval(()=>{
    for(const room of rooms.values())for(const [ws,peer] of room)if(Date.now()-peer.lastSeen>45000)ws.terminate();
    // Idle sessions are bounded by the existing 25-second heartbeat and 45-second reaper.
  },15000);reaper.unref();
  wss.once('close',()=>clearInterval(reaper));server.once('close',()=>{clearInterval(reaper);for(const ws of wss.clients)ws.terminate();wss.close();});
  return wss;
}
export function getPresenceRoomsSummary(){return Object.fromEntries([...rooms].map(([id,room])=>[id,{peerCount:room.size,users:[...room.values()].map(p=>p.user.name)}]));}
