import {useState} from 'react';
import {useData,useMutation,Feedback} from './api';
import type {PanelProps} from './types';

export default function AgentPanel({site,refresh}:PanelProps){
  const base=`/sites/${site.id}/agent/tools`,catalog=useData(base,refresh),mutation=useMutation(()=>{}),[context,setContext]=useState<any>(null);
  async function inspect(){
    const result=await mutation.send(`${base}/site.read_context/execute`,'POST',{},'Authorized site context loaded');
    if(result)setContext(result.result);
  }
  return <section><div className="sn-section-heading"><div><h2>Agent API</h2><p>Scoped domain tools for connected agents. Tools inherit the signed-in human's permissions and never expose direct database access.</p></div><button className="sn-button" onClick={inspect} disabled={mutation.busy}>Inspect authorized context</button></div>
    <Feedback state={catalog}/><Feedback state={mutation}/>
    {catalog.data?.tools?.length?<div className="sn-table"><table><thead><tr><th>Tool</th><th>Effect</th><th>Permission</th><th>Idempotency</th><th>Timeout</th></tr></thead><tbody>{catalog.data.tools.map((tool:any)=><tr key={tool.name}><td><strong>{tool.name}</strong><small>{tool.description}</small></td><td><span className="sn-badge">{tool.effect}</span></td><td>{tool.capability}</td><td>{tool.idempotency}</td><td>{tool.timeoutMs} ms</td></tr>)}</tbody></table></div>:!catalog.loading&&!catalog.error&&<p className="sn-empty">No agent tools are available for this role.</p>}
    {context&&<article className="sn-card"><h3>Authorized context preview</h3><p className="sn-help">This is the bounded context an agent can read through <code>site.read_context</code>. Operational secrets and raw database access are not included.</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(context,null,2)}</pre></article>}
  </section>;
}
