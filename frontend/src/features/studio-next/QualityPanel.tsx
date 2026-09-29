import {useData,useMutation,Feedback} from './api';
import type {PanelProps} from './types';

export default function QualityPanel({site,refresh}:PanelProps){
  const base=`/sites/${site.id}/quality`,state=useData(base,refresh),visual=useMutation(()=>{});
  async function runVisual(){await visual.send(`${base}?visual=true`,'GET',undefined,'Visual validation completed');}
  const findings=[...(state.data?.deterministic??[]),...(visual.data?.visual?.findings??[])];
  return <section><div className="sn-section-heading"><div><h2>Quality</h2><p>Release checks against the canonical design, with optional isolated browser validation at desktop, tablet and phone widths.</p></div><button className="sn-button sn-primary" onClick={runVisual} disabled={visual.busy||state.data?.visual?.configured===false}>Run visual validation</button></div>
    <Feedback state={state}/><Feedback state={visual}/>
    {state.data?.visual?.configured===false&&<div className="sn-banner">Isolated screenshot validation is not configured. Set the backend visual-QA provider to enable 1440, 1024, 768, 390 and 360px browser checks. Deterministic release checks still run.</div>}
    <div className="sn-card"><div className="sn-panel-head"><div><h3>Findings</h3><p className="sn-help">Critical deterministic errors block release preparation. Warnings remain visible for review.</p></div><span className={`sn-badge ${state.data?.blocking===0?'sn-green':''}`}>{state.data?.blocking??0} blocking</span></div>
      {findings.length?<div className="sn-table"><table><thead><tr><th>Severity</th><th>Code</th><th>Location</th><th>Finding</th></tr></thead><tbody>{findings.map((f:any,i:number)=><tr key={i}><td><span className="sn-badge">{f.severity}</span></td><td>{f.code}</td><td>{[f.pageId,f.elementId,f.viewport?f.viewport+'px':null].filter(Boolean).join(' · ')||'Site'}</td><td>{f.message}</td></tr>)}</tbody></table></div>:<p className="sn-empty">No deterministic quality findings.</p>}
    </div>
  </section>;
}
