import {useState} from 'react';
import {useData,useMutation,Feedback} from './api';
import type {PanelProps} from './types';

export default function AiPanel({site,refresh,reload}:PanelProps){
  const base=`/sites/${site.id}/ai`,status=useData(`${base}/status`,refresh),changes=useData(`${base}/changes`,refresh);
  const m=useMutation(reload);
  const [elementId,setElementId]=useState('heading'),[field,setField]=useState('content'),[instruction,setInstruction]=useState('Make this copy more concise while preserving its meaning.'),[proposal,setProposal]=useState<any>(null);
  const propose=async(e:React.FormEvent)=>{e.preventDefault();const value=await m.send(`${base}/copy/propose`,'POST',{elementId,field,instruction},'AI proposal created');if(value)setProposal(value);};
  const apply=async()=>{if(!proposal)return;const value=await m.send(`${base}/changes/${proposal.changeSetId}/apply`,'POST',{},'AI change applied');if(value)setProposal(null);};
  return <section className="sn-panel"><div className="sn-panel-head"><div><p className="sn-eyebrow">AI ASSISTANT</p><h2>Reviewable AI copy changes</h2><p className="sn-help">AI proposes a changeset first. Applying it uses the same server-side design command as a manual Designer save.</p></div></div>
    <Feedback state={status}/>{status.data&&!status.data.configured&&<div className="sn-banner">AI copy editing is disabled until an approved provider, credential and <code>AI_MODEL_COPY</code> are configured on the backend.</div>}
    <form className="sn-card" onSubmit={propose}><label>Element ID<input value={elementId} maxLength={150} onChange={e=>setElementId(e.target.value)}/></label><label>Text field<select value={field} onChange={e=>setField(e.target.value)}><option value="content">content</option><option value="text">text</option><option value="alt">alt</option></select></label><label>Instruction<textarea value={instruction} maxLength={2000} onChange={e=>setInstruction(e.target.value)}/></label><button className="sn-button sn-primary" disabled={m.busy||!status.data?.configured}>Generate proposal</button></form>
    <Feedback state={m}/>
    {proposal&&<article className="sn-card"><p className="sn-eyebrow">PREVIEW — NOT APPLIED</p><h3>{proposal.elementId}.{proposal.field}</h3><p><strong>Current:</strong> {proposal.current}</p><p><strong>Proposed:</strong> {proposal.replacement}</p>{proposal.rationale&&<p className="sn-help">{proposal.rationale}</p>}<div className="sn-inline-actions"><button className="sn-button sn-primary" onClick={apply} disabled={m.busy}>Apply reviewed change</button><button className="sn-button" onClick={async()=>{const value=await m.send(`${base}/changes/${proposal.changeSetId}/reject`,'POST',{},'AI proposal rejected');if(value)setProposal(null);}} disabled={m.busy}>Reject proposal</button></div></article>}
    <div className="sn-card"><h3>Recent AI changesets</h3><Feedback state={changes}/>{changes.data?.changes?.length?changes.data.changes.map((c:any)=><div key={c.id} className="sn-row"><span>{c.name}</span><span>{c.status}</span></div>):<p className="sn-help">No AI changesets yet.</p>}</div>
  </section>;
}
