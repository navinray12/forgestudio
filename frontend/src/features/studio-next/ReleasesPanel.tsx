import {useState} from 'react';
import {useData,useMutation,Feedback,date} from './api';
import type {PanelProps} from './types';

export default function ReleasesPanel({site,refresh,reload}:PanelProps){
  const releases=useData<any>(`/sites/${site.id}/releases`,refresh),design=useData<any>(`/sites/${site.id}/design`,refresh),m=useMutation(reload);
  const [prepared,setPrepared]=useState<string|null>(null);
  const prepare=async()=>{if(!design.data?.hash)return;const result=await m.send<any>(`/sites/${site.id}/releases`,'POST',{baseHash:design.data.hash,operationId:crypto.randomUUID()},'Immutable release prepared');if(result)setPrepared(result.releaseId);};
  const publish=async(id:string)=>{await m.send(`/sites/${site.id}/releases/${id}/publish`,'POST',{},'Release verified and activated');setPrepared(null);};
  const rollback=async(id:string)=>{if(!confirm('Redeploy this immutable artifact as a new rollback release?'))return;await m.send(`/sites/${site.id}/releases/${id}/rollback`,'POST',{},'Rollback artifact verified and activated');};
  const rows=releases.data?.releases??[];
  return <section className="sn-panel">
    <div className="sn-panel-head"><div><p className="sn-eyebrow">PUBLISHING</p><h2>Immutable releases</h2><p className="sn-help">Preparing captures the current authoring document without changing the live site. Publishing activates only after provider verification. Rollback redeploys an earlier immutable artifact.</p></div><button className="sn-button sn-primary" onClick={prepare} disabled={m.busy||!design.data?.hash}>Prepare current design</button></div>
    <Feedback state={releases}/><Feedback state={design}/><Feedback state={m}/>
    {prepared&&<div className="sn-banner">Release prepared. The live site is unchanged until verification succeeds. <button className="sn-button sn-primary" onClick={()=>publish(prepared)} disabled={m.busy}>Publish & verify</button></div>}
    <div className="sn-card"><h3>Release history</h3>{rows.length?rows.map((release:any)=><div className="sn-row" key={release.id}><div><strong>{release.id.slice(0,8)}</strong><div className="sn-help">{date(release.createdAt)} · {release.provider} · {release.artifactChecksum?.slice(0,12)}</div>{release.rollbackOf&&<div className="sn-help">Rollback of {release.rollbackOf.slice(0,8)}</div>}</div><div className="sn-inline-actions"><span className="sn-badge">{release.status}</span>{release.status==='PREPARED'&&<button className="sn-button sn-primary" onClick={()=>publish(release.id)} disabled={m.busy}>Publish & verify</button>}{['ACTIVE','SUPERSEDED'].includes(release.status)&&release.id!==releases.data?.activeReleaseId&&<button className="sn-button" onClick={()=>rollback(release.id)} disabled={m.busy}>Rollback to this</button>}</div></div>):<p className="sn-help">No immutable releases have been prepared yet.</p>}</div>
  </section>;
}
