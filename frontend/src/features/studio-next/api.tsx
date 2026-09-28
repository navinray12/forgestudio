import { useEffect,useState,useRef,type ReactNode } from 'react';
import { API_ORIGIN } from '../studio/api';
export class ApiError extends Error { status:number; code:string; constructor(message:string,status:number,code:string){super(message);this.status=status;this.code=code;} }
export async function api<T=any>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
  const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timeout=setTimeout(abort,20000);
  try{
    const r=await fetch(`${API_ORIGIN}/api/v1/studio-next${path}`,{method,credentials:path.startsWith('/public/')?'omit':'include',signal:controller.signal,headers:{Accept:'application/json',...(body!==undefined?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-Studio-Request':'1'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const payload=await r.json().catch(()=>null);
    if(!r.ok||!payload?.success)throw new ApiError(payload?.error?.message||`Request failed (${r.status})`,r.status,payload?.error?.code||'REQUEST_FAILED');return payload;
  }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
export function useData<T=any>(path:string|null,revision=0){
  const key=`${path}:${revision}`;const [state,setState]=useState<{key:string;data?:T;error?:string}>({key:''});
  useEffect(()=>{if(!path)return;const c=new AbortController();api<T>(path,'GET',undefined,c.signal).then(data=>{if(!c.signal.aborted)setState({key,data});}).catch(e=>{if(!c.signal.aborted)setState({key,error:e.message});});return()=>c.abort();},[path,key]);
  const match=state.key===key?state:undefined;return {data:match?.data,error:match?.error,loading:!!path&&!match};
}
export function useMutation(refresh:()=>void){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const running=useRef(false);
  async function send<T=any>(path:string,method:string,body?:unknown,message='Saved'):Promise<T|undefined>{
    if(running.current)return;running.current=true;setBusy(true);setError('');setNotice('');
    try{const result=await api<T>(path,method,body);setNotice(message);refresh();return result;}catch(e){setError(e instanceof Error?e.message:'Request failed');return undefined;}finally{running.current=false;setBusy(false);}
  }
  return {send,busy,error,notice,setError};
}
export function Feedback({state}:{state:{error?:string;notice?:string;loading?:boolean}}){return <>{state.loading&&<p className="sn-status" role="status">Loading…</p>}{state.error&&<p className="sn-error" role="alert">{state.error}</p>}{state.notice&&<p className="sn-notice" role="status">{state.notice}</p>}</>;}
export function Modal({title,children,onClose,busy=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);
  return <dialog ref={ref} className="sn-modal" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><header><h2>{title}</h2><button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog">×</button></header><div className="sn-modal-body">{children}</div></dialog>;
}
export function downloadJson(name:string,value:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export const slugify=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120);
export const date=(s:string)=>s?new Date(s).toLocaleString():'—';
