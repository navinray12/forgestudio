import { useMemo,useRef,useState } from 'react';
import { useParams,useSearchParams } from 'react-router-dom';
import { useData,api,Feedback } from './api';
import './studio-next.css';

export default function PublicShop(){
  const {siteId}=useParams(),[params]=useSearchParams(),r=useData(`/public/sites/${siteId}/catalog`),[busy,setBusy]=useState(false),[error,setError]=useState(''),[cart,setCart]=useState<Record<string,number>>({});
  const keys=useRef(new Map<string,string>());
  const products=r.data?.products??[];
  const selected=useMemo(()=>products.filter((p:any)=>(cart[p.id]||0)>0),[products,cart]);
  const cartMode=selected[0]?.billingType??null,cartCurrency=selected[0]?.currency??null;
  const compatible=(p:any)=>!cartMode||(p.billingType===cartMode&&p.currency===cartCurrency);
  function setQuantity(product:any,quantity:number){setCart(previous=>({...previous,[product.id]:Math.max(0,Math.min(20,quantity))}));}
  async function checkout(){
    if(busy||!selected.length)return;setBusy(true);setError('');
    const signature=selected.map((p:any)=>`${p.id}:${cart[p.id]}`).sort().join('|'),key=keys.current.get(signature)||crypto.randomUUID();keys.current.set(signature,key);
    try{
      const response=await api<{url:string}>(`/public/sites/${siteId}/checkout-cart`,'POST',{items:selected.map((p:any)=>({productId:p.id,quantity:cart[p.id]})),operationId:key});
      const target=new URL(response.url);if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw new Error('Invalid checkout destination');window.location.assign(target.href);
    }catch(e){setError(e instanceof Error?e.message:'Checkout unavailable');}finally{setBusy(false);}
  }
  const total=selected.reduce((sum:number,p:any)=>sum+p.priceMinor*(cart[p.id]||0),0);
  return <div className="sn sn-public"><main className="sn-public-main"><header className="sn-title"><p className="sn-eyebrow">SECURE HOSTED CHECKOUT</p><h1>{r.data?.siteName||'Shop'}</h1><p>Build a cart here; payment and subscription details are completed with Stripe. Card data never enters this page.</p></header>
    <Feedback state={r}/><Feedback state={{error}}/>
    {params.get('checkout')==='returned'&&<p className="sn-notice">You returned from checkout. Payment or subscription activation is confirmed only by a signed server webhook.</p>}
    {params.get('checkout')==='cancelled'&&<p className="sn-warning">Checkout was cancelled. Reserved inventory is released when Stripe expires the Checkout Session.</p>}
    {r.data&&!r.data.checkoutConfigured&&<p className="sn-warning">Checkout is not available for this site.</p>}
    {selected.length>0&&<div className="sn-card"><strong>Cart · {cartMode==='RECURRING'?'Recurring':'One time'} · {(total/100).toFixed(2)} {String(cartCurrency||'').toUpperCase()}</strong><p className="sn-help">A cart intentionally cannot mix recurring and one-time products or currencies.</p><button className="sn-button sn-primary" disabled={busy||!r.data?.checkoutConfigured} onClick={()=>void checkout()}>{busy?'Opening checkout…':`Checkout ${selected.length} item${selected.length===1?'':'s'}`}</button></div>}
    <div className="sn-product-grid">{products.map((p:any)=>{
      const qty=cart[p.id]||0,disabled=!compatible(p)||p.inventoryQuantity===0;
      return <article key={p.id} className="sn-card"><h2>{p.name}</h2><p>{p.description}</p><strong className="sn-price">{(p.priceMinor/100).toFixed(2)} {p.currency.toUpperCase()}</strong><p className="sn-help">{p.billingType==='RECURRING'?`Billed every ${p.billingInterval}`:p.inventoryQuantity===null?'One-time purchase':`${p.inventoryQuantity} available`}</p><label>Quantity<input type="number" min={0} max={Math.min(20,p.inventoryQuantity??20)} value={qty} disabled={disabled} onChange={e=>setQuantity(p,Number(e.target.value)||0)}/></label>{!compatible(p)&&<p className="sn-warning">Use a separate checkout for this billing type or currency.</p>}</article>;
    })}</div>
    {r.data&&!products.length&&<p className="sn-empty">No products available.</p>}
  </main></div>;
}
