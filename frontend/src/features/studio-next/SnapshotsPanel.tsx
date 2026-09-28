import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData,useMutation,Feedback,api,date } from './api';
import type { PanelProps } from './types';
export default function SnapshotsPanel({site,refresh,reload}:PanelProps){
  const base=`/sites/${site.id}`,r=useData(`${base}/snapshots`,refresh),m=useMutation(reload);const [name,setName]=useState('');
  return <section><div className="sn-section-heading"><div><h2>Design snapshots</h2><p>Capture the server-saved design. Restoring creates a recovery snapshot and leaves the live release and connected services unchanged.</p></div><Link to={`/editor/${site.id}`} className="sn-button">Open Designer</Link></div><Feedback state={r}/><Feedback state={m}/>{site.capabilities.includes('EDIT_DESIGN')&&<form className="sn-card sn-row" onSubmit={async e=>{e.preventDefault();if(await m.send(`${base}/snapshots`,'POST',{name},'Server design captured'))setName('');}}><label className="sn-grow">Snapshot name<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Before home-page redesign"/></label><button className="sn-button sn-primary" disabled={m.busy}>Capture snapshot</button></form>}{r.data?.snapshots.map((s:any)=><article className="sn-history" key={s.id}><div><strong>{s.name}</strong><small>{date(s.createdAt)} · {s.hash.slice(0,12)}</small></div><button className="sn-button" disabled={m.busy} onClick={async()=>{
    if(!window.confirm(`Restore “${s.name}” to the working draft? Unsaved browser edits are not included. The live site will remain unchanged.`))return;
    try{const d=await api(`${base}/design`);await m.send(`${base}/snapshots/${s.id}/restore`,'POST',{baseHash:d.hash},'Design restored. Reload any open Designer tabs before editing.');}catch(e){m.setError(e instanceof Error?e.message:'Unable to restore');}
  }}>Restore draft</button></article>)}{r.data?.snapshots.length===0&&<div className="sn-empty">No snapshots yet. Save in the Designer, then capture a checkpoint here.</div>}</section>;
}
