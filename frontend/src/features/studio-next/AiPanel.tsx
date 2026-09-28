import {useState} from 'react';
import {useData,useMutation,Feedback} from './api';
import type {PanelProps} from './types';

type AiMode='copy'|'section'|'page'|'site'|'cms';
export default function AiPanel({site,refresh,reload}:PanelProps){
  const base=`/sites/${site.id}/ai`,status=useData(`${base}/status`,refresh),changes=useData(`${base}/changes`,refresh);
  const m=useMutation(reload);
  const [mode,setMode]=useState<AiMode>('copy');
  const [elementId,setElementId]=useState('heading'),[field,setField]=useState('content'),[afterId,setAfterId]=useState('heading');
  const [instruction,setInstruction]=useState('Make this copy more concise while preserving its meaning.'),[proposal,setProposal]=useState<any>(null);
  const choose=(next:AiMode)=>{
    setMode(next);setProposal(null);
    setInstruction(next==='copy'?'Make this copy more concise while preserving its meaning.':next==='section'?'Add a responsive pricing section that follows the existing design direction.':next==='page'?'Create an About page that follows the current design system.':next==='site'?'Create a professional five-page SaaS website with reusable design tokens and editable components.':'Create a blog CMS with title, body, category, author and SEO fields plus two draft example records.');
  };
  const propose=async(e:React.FormEvent)=>{
    e.preventDefault();
    const path=mode==='copy'?'/copy/propose':mode==='section'?'/sections/propose':mode==='page'?'/pages/propose':mode==='site'?'/sites/propose':'/cms/propose';
    const body=mode==='copy'?{elementId,field,instruction}:mode==='section'?{afterId:afterId||null,instruction}:{instruction};
    const value=await m.send(base+path,'POST',body,'AI proposal created');if(value)setProposal({...value,kind:mode});
  };
  const apply=async()=>{if(!proposal)return;const value=await m.send(`${base}/changes/${proposal.changeSetId}/apply`,'POST',{},'AI change applied');if(value)setProposal(null);};
  const reject=async()=>{if(!proposal)return;const value=await m.send(`${base}/changes/${proposal.changeSetId}/reject`,'POST',{},'AI proposal rejected');if(value)setProposal(null);};
  const configured=mode==='copy'?status.data?.features?.copy?.configured:mode==='section'?status.data?.features?.section?.configured:mode==='page'?status.data?.features?.page?.configured:mode==='site'?status.data?.features?.site?.configured:status.data?.features?.cms?.configured;
  return <section className="sn-panel">
    <div className="sn-panel-head"><div><p className="sn-eyebrow">AI ASSISTANT</p><h2>Reviewable AI website generation</h2><p className="sn-help">AI never writes directly to the live site. It proposes typed changes against the canonical Designer document; approved changes remain fully editable afterward.</p></div></div>
    <Feedback state={status}/>{status.data&&!status.data.configured&&<div className="sn-banner">AI is disabled until approved providers, credentials and model roles are configured. Designer and CMS features continue to work without AI.</div>}
    <div className="sn-inline-actions">{(['copy','section','page','site','cms'] as AiMode[]).map(key=><button key={key} className={`sn-button ${mode===key?'sn-primary':''}`} onClick={()=>choose(key)}>{key==='copy'?'Copy edit':key==='section'?'Generate section':key==='page'?'Generate page':key==='site'?'Generate site':'Generate CMS'}</button>)}</div>
    <form className="sn-card" onSubmit={propose}>
      {mode==='copy'&&<><label>Element ID<input value={elementId} maxLength={150} onChange={e=>setElementId(e.target.value)}/></label><label>Text field<select value={field} onChange={e=>setField(e.target.value)}><option value="content">content</option><option value="text">text</option><option value="alt">alt</option></select></label></>}
      {mode==='section'&&<label>Insert after element ID<input value={afterId} maxLength={150} onChange={e=>setAfterId(e.target.value)} placeholder="Leave empty to append"/></label>}
      <label>Instruction<textarea value={instruction} maxLength={5000} onChange={e=>setInstruction(e.target.value)}/></label>
      <button className="sn-button sn-primary" disabled={m.busy||!configured}>{mode==='copy'?'Generate copy proposal':mode==='section'?'Generate section proposal':mode==='page'?'Generate page proposal':mode==='site'?'Plan and generate site':'Generate CMS draft proposal'}</button>
      {!configured&&status.data?.configured&&<p className="sn-help">This AI capability has no approved model role configured.</p>}
    </form>
    <Feedback state={m}/>
    {proposal&&<article className="sn-card"><p className="sn-eyebrow">PREVIEW — NOT APPLIED</p>
      {proposal.kind==='copy'?<><h3>{proposal.elementId}.{proposal.field}</h3><p><strong>Current:</strong> {proposal.current}</p><p><strong>Proposed:</strong> {proposal.replacement}</p></>:
       proposal.kind==='section'?<><h3>New section: {proposal.section?.id}</h3><p><strong>Type:</strong> {proposal.section?.type}</p><p><strong>Elements:</strong> {proposal.section?.children?.length??0}</p></>:
       proposal.kind==='page'?<><h3>New page: {proposal.page?.name}</h3><p><strong>Route:</strong> {proposal.page?.slug}</p><p><strong>Top-level elements:</strong> {proposal.page?.elements?.length??0}</p></>:
       proposal.kind==='site'?<><h3>{proposal.plan?.siteName}</h3><p><strong>Pages:</strong> {proposal.plan?.pages?.map((p:any)=>p.name).join(', ')}</p><p><strong>Design system:</strong> {proposal.plan?.designSystem?.variableCount??0} variables · {proposal.plan?.designSystem?.classCount??0} classes</p></>:
       <><h3>CMS collection: {proposal.collection?.name}</h3><p><strong>Slug:</strong> {proposal.collection?.slug}</p><p><strong>Fields:</strong> {proposal.collection?.fields?.length??0}</p><p><strong>Draft records:</strong> {proposal.itemCount??0}</p><p className="sn-help">Generated CMS records remain drafts until a publisher explicitly publishes them.</p></>}
      {proposal.rationale&&<p className="sn-help">{proposal.rationale}</p>}<div className="sn-inline-actions"><button className="sn-button sn-primary" onClick={apply} disabled={m.busy}>Apply reviewed change</button><button className="sn-button" onClick={reject} disabled={m.busy}>Reject proposal</button></div>
    </article>}
    <div className="sn-card"><h3>Recent AI changesets</h3><Feedback state={changes}/>{changes.data?.changes?.length?changes.data.changes.map((change:any)=><div key={change.id} className="sn-row"><span>{change.name}</span><span>{change.status}</span></div>):<p className="sn-help">No AI changesets yet.</p>}</div>
  </section>;
}
