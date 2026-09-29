import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus,ExternalLink } from 'lucide-react';
import { useData,useMutation,Feedback,Modal,date } from './api';
import type { PanelProps } from './types';

function ProductEditor({product,base,onClose,reload}:{product?:any;base:string;onClose:()=>void;reload:()=>void}){
  const [form,setForm]=useState({
    name:product?.name||'',description:product?.description||'',priceMinor:product?.priceMinor||100,currency:product?.currency||'usd',
    stripePriceId:product?.stripePriceId||'',active:product?.active||false,billingType:product?.billingType||'ONE_TIME',
    billingInterval:product?.billingInterval??null,inventoryQuantity:product?.inventoryQuantity??null,
  });
  const m=useMutation(reload);
  const recurring=form.billingType==='RECURRING';
  return <Modal title={product?'Edit product':'New product'} busy={m.busy} onClose={onClose}><form onSubmit={async e=>{
    e.preventDefault();
    const payload={...form,billingInterval:recurring?(form.billingInterval||'month'):null,...(product?{revision:product.revision}:{})};
    const result=await m.send(`${base}/products${product?`/${product.id}`:''}`,product?'PUT':'POST',payload,'Product saved');if(result)onClose();
  }}>
    <label>Name<input required maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Description<textarea maxLength={10000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <div className="sn-two-columns"><label>Price in minor units<input type="number" min={1} max={100000000} step={1} required value={form.priceMinor} onChange={e=>setForm({...form,priceMinor:Number(e.target.value)})}/></label><label>Currency<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}>{['usd','eur','gbp','inr'].map(c=><option key={c}>{c}</option>)}</select></label></div>
    <div className="sn-two-columns"><label>Billing<select value={form.billingType} onChange={e=>setForm({...form,billingType:e.target.value,billingInterval:e.target.value==='RECURRING'?(form.billingInterval||'month'):null})}><option value="ONE_TIME">One time</option><option value="RECURRING">Recurring</option></select></label>{recurring?<label>Interval<select value={form.billingInterval||'month'} onChange={e=>setForm({...form,billingInterval:e.target.value})}><option value="month">Monthly</option><option value="year">Yearly</option></select></label>:<label>Inventory <span className="sn-help">(blank = unlimited)</span><input type="number" min={0} value={form.inventoryQuantity??''} onChange={e=>setForm({...form,inventoryQuantity:e.target.value===''?null:Number(e.target.value)})}/></label>}</div>
    <p className="sn-help">Checkout verifies price currency, amount, billing type and interval against Stripe. Inventory is reserved server-side before opening checkout and restored on expiry/failure.</p>
    <label>Existing Stripe price ID<input required pattern="price_[a-zA-Z0-9]+" value={form.stripePriceId} onChange={e=>setForm({...form,stripePriceId:e.target.value})} placeholder="price_…"/></label>
    <label className="sn-check"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>Show in published catalog</label>
    <Feedback state={m}/><footer><button type="button" className="sn-button" onClick={onClose} disabled={m.busy}>Cancel</button><button className="sn-button sn-primary" disabled={m.busy}>Save product</button></footer>
  </form></Modal>;
}

export default function CommercePanel({site,refresh,reload}:PanelProps){
  const base=`/sites/${site.id}`,r=useData(`${base}/products`,refresh),m=useMutation(reload),[editor,setEditor]=useState<any>(undefined);
  async function refund(order:any){
    if(!order.refundableMinor||!order.providerPaymentIntent)return;
    if(!window.confirm(`Refund ${(order.refundableMinor/100).toFixed(2)} ${order.currency.toUpperCase()} for this order?`))return;
    await m.send(`${base}/refunds`,'POST',{orderId:order.id,amountMinor:order.refundableMinor,operationId:crypto.randomUUID()},'Refund submitted');
  }
  return <section><div className="sn-section-heading"><div><h2>Products, subscriptions & checkout</h2><p>Server-verified multi-item carts, recurring products, inventory reservations, entitlement reconciliation and explicit refunds.</p></div><div className="sn-inline-actions"><Link className="sn-button" to={`/shop/${site.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Public catalog</Link><button className="sn-button sn-primary" onClick={()=>setEditor(null)}><Plus size={15}/>New product</button></div></div>
    <Feedback state={r}/><Feedback state={m}/>
    {r.data&&<><p className={r.data.checkoutConfigured?'sn-notice':'sn-warning'}>{r.data.checkoutConfigured?'Payment-provider configuration is present. Complete Stripe test-mode checkout, subscription renewal/cancel and refund qualification before live use.':'Checkout is disabled. Configure a Stripe key, signed webhook secret, approved site/account mapping, and frontend origin on the server.'}</p>
    <p className="sn-help">One checkout may contain multiple products when they share currency and billing mode. One-time and recurring products are intentionally separated. Tax and shipping calculation still depend on external provider configuration.</p>
    <div className="sn-table"><table><thead><tr><th>Product</th><th>Price</th><th>Billing / inventory</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{r.data.products.map((p:any)=><tr key={p.id}><td><strong>{p.name}</strong><small>{p.stripePriceId}</small></td><td>{(p.priceMinor/100).toFixed(2)} {p.currency.toUpperCase()}</td><td>{p.billingType==='RECURRING'?`Every ${p.billingInterval}`:p.inventoryQuantity===null?'One time · unlimited':`One time · ${p.inventoryQuantity} left`}</td><td><span className="sn-badge">{p.active?'Active':'Hidden'}</span></td><td><button className="sn-button" onClick={()=>setEditor(p)}>Edit product</button></td></tr>)}</tbody></table>{!r.data.products.length&&<p className="sn-empty">No products yet.</p>}</div>
    <h3 className="sn-subheading">Recent orders</h3><div className="sn-table"><table><thead><tr><th>Order / items</th><th>Total</th><th>Mode</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>{r.data.orders.map((o:any)=><tr key={o.id}><td><strong>{(o.items||[]).map((x:any)=>`${x.name} ×${x.quantity}`).join(', ')||'Order'}</strong><small>{o.id}</small></td><td>{(o.totalMinor/100).toFixed(2)} {o.currency.toUpperCase()}</td><td>{o.checkoutMode}</td><td><span className="sn-badge">{o.state}</span></td><td>{date(o.createdAt)}</td><td>{o.state==='PAID'&&o.checkoutMode==='payment'&&o.refundableMinor>0&&o.providerPaymentIntent?<button className="sn-button" disabled={m.busy} onClick={()=>void refund(o)}>Refund remaining</button>:null}</td></tr>)}</tbody></table>{!r.data.orders.length&&<p className="sn-empty">No checkout orders recorded.</p>}</div>
    <h3 className="sn-subheading">Subscription entitlements</h3><div className="sn-table"><table><thead><tr><th>Product</th><th>State</th><th>Subscription</th><th>Period end</th></tr></thead><tbody>{r.data.entitlements.map((e:any)=><tr key={e.id}><td>{e.name}</td><td><span className="sn-badge">{e.state}</span></td><td>{e.providerSubscription||'—'}</td><td>{e.currentPeriodEnd?date(e.currentPeriodEnd):'—'}</td></tr>)}</tbody></table>{!r.data.entitlements.length&&<p className="sn-empty">No subscription entitlements.</p>}</div>
    </>}
    {editor!==undefined&&<ProductEditor product={editor||undefined} base={base} onClose={()=>setEditor(undefined)} reload={reload}/>}
  </section>;
}
