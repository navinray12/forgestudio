import {randomUUID} from 'node:crypto';
import type {RequestHandler} from 'express';

interface RouteMetric {count:number;errors:number;latencies:number[];lastStatus:number;lastSeen:string}
const metrics=new Map<string,RouteMetric>();
const MAX_ROUTES=250,MAX_SAMPLES=256;
function normalize(path:string){
  return path.split('?')[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/ig,':id')
    .replace(/\d+(?=\/|$)/g,'/:n')
    .slice(0,240);
}
function percentile(values:number[],p:number){
  if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b),index=Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1));return Math.round(sorted[index]*100)/100;
}
function record(key:string,status:number,latency:number){
  let entry=metrics.get(key);if(!entry){if(metrics.size>=MAX_ROUTES){const oldest=[...metrics.entries()].sort((a,b)=>a[1].lastSeen.localeCompare(b[1].lastSeen))[0];if(oldest)metrics.delete(oldest[0]);}entry={count:0,errors:0,latencies:[],lastStatus:0,lastSeen:''};metrics.set(key,entry);}
  entry.count++;if(status>=500)entry.errors++;entry.lastStatus=status;entry.lastSeen=new Date().toISOString();entry.latencies.push(latency);if(entry.latencies.length>MAX_SAMPLES)entry.latencies.splice(0,entry.latencies.length-MAX_SAMPLES);
}
export function studioMetricsSnapshot(){
  let requests=0,errors=0;const routes=[...metrics.entries()].map(([route,m])=>{requests+=m.count;errors+=m.errors;return {route,count:m.count,errors:m.errors,errorRate:m.count?Math.round(m.errors*10000/m.count)/100:0,p50Ms:percentile(m.latencies,.5),p95Ms:percentile(m.latencies,.95),p99Ms:percentile(m.latencies,.99),lastStatus:m.lastStatus,lastSeen:m.lastSeen};}).sort((a,b)=>b.count-a.count);
  return {requests,errors,errorRate:requests?Math.round(errors*10000/requests)/100:0,routes,generatedAt:new Date().toISOString(),scope:'PROCESS'};
}
export const observeStudioRequests:RequestHandler=(req,res,next)=>{
  const requestId=randomUUID(),incoming=req.get('X-Correlation-Id'),correlationId=incoming&&/^[0-9a-f-]{36}$/i.test(incoming)?incoming:requestId,start=process.hrtime.bigint();
  res.setHeader('X-Request-Id',requestId);res.setHeader('X-Correlation-Id',correlationId);res.locals.requestId=requestId;res.locals.correlationId=correlationId;
  res.on('finish',()=>{
    const elapsed=Number(process.hrtime.bigint()-start)/1e6,key=`${req.method} ${normalize(req.originalUrl)}`;record(key,res.statusCode,elapsed);
    if(process.env.STUDIO_STRUCTURED_ACCESS_LOGS==='true'||res.statusCode>=500){
      const path=normalize(req.originalUrl),siteMatch=req.originalUrl.match(/\/sites\/([0-9a-f-]{36})/i);
      console.info(JSON.stringify({type:'studio.http',requestId,correlationId,method:req.method,path,status:res.statusCode,latencyMs:Math.round(elapsed*100)/100,siteId:siteMatch?.[1]??null,userId:res.locals.actor?.id??null}));
    }
  });next();
};
