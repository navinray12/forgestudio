import {useState} from 'react';
import {useData,useMutation,Feedback} from './api';
import type {PanelProps} from './types';

export default function AiPanel({site,refresh,reload}:PanelProps){
  const base=`/sites/${site.id}/ai`,status=useData(`${base}/status`,refresh),changes=useData(`${base}/changes`,refresh);
  const m=useMutation(reload);
  const [mode,setMode]=useState<'copy'|'section'>('copy');
  const [elementId,setElementId]=useState('heading'),[field,setField]=useState('content'),[afterId,setAfterId]=useState('heading');
  const [instruction,setInstruction]=useState('Make this copy more concise while preserving its meaning.'),[proposal,setProposal]=useState<any>(null);
  const propose=async(e:React.FormEvent)=>{
    e.preventDefault();
    const path=mode==='copy'?'/copy/propose':'/sections/propose';
    const body=mode==='copy'?{elementId,field,instruction}:{afterId:afterId||null,instruction};
    const value=await m.send(base+path,'POST',body,'AI proposal created');if(value)setProposal({...value,kind:mode});
  };
  const apply=async()=>{if(!proposal)return;const value=await m.send(`${base}/changes/${proposal.changeSetId}/apply`,'POST',{},'AI change applied');if(value)setProposal(null);};
  const reject=async()=>{if(!proposal)return;const value=await m.send(`${base}/changes/${proposal.changeSetId}/reject`,'POST',{},'AI proposal rejected');if(value)setProposal(null);};
  return <section className="sn-panel">
    <div className="sn-panel-head"><div><p className="sn-eyebrow">AI ASSISTANT</p><h2>Reviewable AI design changes</h2><p className="sn-help">AI creates a persisted changeset first. Nothing changes until you approve it. Approved changes use the same stable-ID domain commands as manual edits.</p></div></div>
    <Feedback state={status}/>{status.data&&!status.data.configured&&<div className="sn-banner">AI is disabled until an approved provider, credential and model are configured on the backend. Designer and CMS features remain available.</div>}
    <div className="sn-inline-actions"><button className={`sn-button ${mode==='copy'?'sn-primary':''}`} onClick={()=>{setMode('copy');setProposal(null);setInstruction('Make this copy more concise while preserving its meaning.');}}>Copy edit</button><button className={`sn-button ${mode==='section'?'sn-primary':''}`} onClick={()=>{setMode('section');setProposal(null);setInstruction('Add a responsive pricing section that follows the existing design direction.');}}>Generate section</button></div>
    <form className="sn-card" onSubmit={propose}>
      {mode==='copy'?<><label>Element ID<input value={elementId} maxLength={150} onChange={e=>setElementId(e.target.value)}/></label><label>Text field<select value={field} onChange={e=>setField(e.target.value)}><option value="content">content</option><option value="text">text</option><option value="alt">alt</option></select></label></>:<label>Insert after element ID<input value={afterId} maxLength={150} onChange={e=>setAfterId(e.target.value)} placeholder="Leave empty to append"/></label>}
      <label>Instruction<textarea value={instruction} maxLength={3000} onChange={e=>setInstruction(e.target.value)}/></label>
      <button className="sn-button sn-primary" disabled={m.busy||!status.data?.configured}>{mode==='copy'?'Generate copy proposal':'Generate section proposal'}</button>
    </form>
    <Feedback state={m}/>
    {proposal&&<article className="sn-card"><p className="sn-eyebrow">PREVIEW — NOT APPLIED</p>
      {proposal.kind==='copy'?<><h3>{proposal.elementId}.{proposal.field}</h3><p><strong>Current:</strong> {proposal.current}</p><p><strong>Proposed:</strong> {proposal.replacement}</p></>:<><h3>New section: {proposal.section?.id}</h3><p><strong>Type:</strong> {proposal.section?.type}</p><p><strong>Elements:</strong> {proposal.section?.children?.length??0}</p></>}
      {proposal.rationale&&<p className="sn-help">{proposal.rationale}</p>}<div className="sn-inline-actions"><button className="sn-button sn-primary" onClick={apply} disabled={m.busy}>Apply reviewed change</button><button className="sn-button" onClick={reject} disabled={m.busy}>Reject proposal</button></div>
    </article>}
    <div className="sn-card"><h3>Recent AI changesets</h3><Feedback state={changes}/>{changes.data?.changes?.length?changes.data.changes.map((change:any)=><div key={change.id} className="sn-row"><span>{change.name}</span><span>{change.status}</span></div>):<p className="sn-help">No AI changesets yet.</p>}</div>
  </section>;
}
