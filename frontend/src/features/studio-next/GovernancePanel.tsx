import {useEffect,useState} from 'react';
import {useData,useMutation,Feedback} from './api';
import type {PanelProps} from './types';

const labels:Record<string,string>={
  AI_COPY:'AI copy editing',AI_SECTION_GENERATION:'AI section generation',AI_PAGE_GENERATION:'AI page generation',AI_SITE_GENERATION:'AI full-site generation',AI_CMS:'AI CMS generation'
};
export default function GovernancePanel({site,refresh,reload}:PanelProps){
  const features=useData<any>(`/sites/${site.id}/governance/features`,refresh),budget=useData<any>(`/sites/${site.id}/governance/ai-budget`,refresh),m=useMutation(reload);
  const [limit,setLimit]=useState(''),[warning,setWarning]=useState('80');
  useEffect(()=>{if(budget.data){setLimit(budget.data.budget?.monthlyUnitLimit?String(budget.data.budget.monthlyUnitLimit):'');setWarning(String(budget.data.budget?.warningPercent??80));}},[budget.data]);
  const saveBudget=async(e:React.FormEvent)=>{e.preventDefault();await m.send(`/sites/${site.id}/governance/ai-budget`,'PUT',{monthlyUnitLimit:limit?Number(limit):null,warningPercent:Number(warning)},limit?'AI budget updated':'AI budget limit removed');};
  const usage=budget.data?.usage,cap=budget.data?.budget?.monthlyUnitLimit;
  return <section className="sn-panel">
    <div className="sn-panel-head"><div><p className="sn-eyebrow">GOVERNANCE</p><h2>Feature switches & AI budget</h2><p className="sn-help">Server-side switches block new AI operations without deleting existing generated content. Budgets are reserved transactionally before provider calls and reconciled from provider usage.</p></div></div>
    <Feedback state={features}/><Feedback state={budget}/><Feedback state={m}/>
    <div className="sn-card"><h3>AI feature switches</h3>{features.data?.features?.map((feature:any)=><label className="sn-row" key={feature.feature}><span><strong>{labels[feature.feature]??feature.feature}</strong><div className="sn-help">{feature.globalEnabled?'Available globally':'Disabled by deployment policy'}</div></span><input type="checkbox" aria-label={labels[feature.feature]??feature.feature} checked={feature.effective} disabled={m.busy||!feature.globalEnabled} onChange={e=>m.send(`/sites/${site.id}/governance/features`,'PUT',{feature:feature.feature,enabled:e.target.checked},'Feature policy updated')}/></label>)}</div>
    <form className="sn-card" onSubmit={saveBudget}><h3>Monthly AI usage limit</h3><label>Combined input/output units<input type="number" min="1000" max="1000000000" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="Blank = no site-specific hard limit"/></label><label>Warning threshold (%)<input type="number" min="50" max="99" value={warning} onChange={e=>setWarning(e.target.value)}/></label><button className="sn-button sn-primary" disabled={m.busy}>Save AI budget</button></form>
    <div className="sn-card"><h3>Current month</h3><div className="sn-row"><span>Recorded provider units</span><strong>{usage?.monthUnits??0}</strong></div><div className="sn-row"><span>Outstanding reservations</span><strong>{usage?.outstandingReservedUnits??0}</strong></div><div className="sn-row"><span>AI runs</span><strong>{usage?.runs??0}</strong></div><div className="sn-row"><span>Budget</span><strong>{cap??'Unlimited'}</strong></div>{usage?.percent!==null&&usage?.percent!==undefined&&<div className="sn-row"><span>Consumed + reserved</span><strong>{usage.percent}%</strong></div>}{usage?.warning&&<p className="sn-error" role="alert">AI usage has crossed the configured warning threshold.</p>}</div>
  </section>;
}
