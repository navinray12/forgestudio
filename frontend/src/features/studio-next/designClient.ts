export class DesignApiError extends Error { status:number; constructor(message:string,status:number){super(message);this.status=status;} }
/** A single in-tab queue coordinates manual save and autosave; other tabs get a server hash conflict. */
const hashes=new Map<string,string>();
const queues=new Map<string,Promise<unknown>>();
export async function loadDesign(api:string,siteId:string){
  const res=await fetch(`${api}/api/v1/studio-next/sites/${siteId}/design`,{credentials:'include',signal:AbortSignal.timeout(20000)});
  const result=await res.json().catch(()=>({}));
  if(!res.ok||!result.success)throw new DesignApiError(result.error?.message||'Unable to load the server design',res.status);
  hashes.set(siteId,result.hash);return result.website;
}
export function saveDesign(api:string,siteId:string,editorData:unknown):Promise<void>{
  const job=(queues.get(siteId)||Promise.resolve()).catch(()=>undefined).then(async()=>{
    const baseHash=hashes.get(siteId);
    if(!baseHash)throw new Error('No server version is available. Reconnect and reload before saving. Your local recovery copy is retained.');
    const operationId=crypto.randomUUID(),timestamp=new Date().toISOString();
    const res=await fetch(`${api}/api/v1/studio-next/sites/${siteId}/design`,{
      method:'PUT',credentials:'include',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json','X-Studio-Request':'1'},body:JSON.stringify({baseHash,editorData,operationId,correlationId:operationId,timestamp}),
    });
    const result=await res.json().catch(()=>({}));
    if(!res.ok||!result.success)throw new Error(result.error?.message||`Server save failed (${res.status}). Local recovery only.`);
    hashes.set(siteId,result.hash);
  });
  queues.set(siteId,job);return job;
}
