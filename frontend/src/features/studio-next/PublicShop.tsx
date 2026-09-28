import { useState,useRef } from 'react';
import { useParams,useSearchParams } from 'react-router-dom';
import { useData,api,Feedback } from './api';
import './studio-next.css';
export default function PublicShop(){
  const {siteId}=useParams(),[params]=useSearchParams(),r=useData(`/public/sites/${siteId}/catalog`),[busy,setBusy]=useState(''),[error,setError]=useState('');const keys=useRef(new Map<string,string>());
  async function checkout(productId:string){
    if(busy)return;setBusy(productId);setError('');const key=keys.current.get(productId)||crypto.randomUUID();keys.current.set(productId,key);
    try{const response=await api<{url:string}>(`/public/sites/${siteId}/checkout`,'POST',{productId,quantity:1,operationId:key});const target=new URL(response.url);if(target.protocol!=='https:'||target.hostname!=='checkout.stripe.com')throw new Error('Invalid checkout destination');window.location.assign(target.href);}catch(e){setError(e instanceof Error?e.message:'Checkout unavailable');}finally{setBusy('');}
  }
  return <div className="sn sn-public"><main className="sn-public-main"><header className="sn-title"><p className="sn-eyebrow">SECURE HOSTED CHECKOUT</p><h1>{r.data?.siteName||'Shop'}</h1><p>Payments are completed with Stripe; card details are not collected on this page.</p></header><Feedback state={r}/><Feedback state={{error}}/>{params.get('checkout')==='returned'&&<p className="sn-notice">You returned from checkout. Payment confirmation is handled by the payment provider and a verified server webhook; this page does not confirm payment.</p>}{params.get('checkout')==='cancelled'&&<p className="sn-warning">Checkout was cancelled. No successful payment is assumed.</p>}{r.data&&!r.data.checkoutConfigured&&<p className="sn-warning">Checkout is not available for this site.</p>}<div className="sn-product-grid">{r.data?.products.map((p:any)=><article key={p.id} className="sn-card"><h2>{p.name}</h2><p>{p.description}</p><strong className="sn-price">{(p.priceMinor/100).toFixed(2)} {p.currency.toUpperCase()}</strong><button className="sn-button sn-primary" disabled={!!busy||!r.data.checkoutConfigured} onClick={()=>void checkout(p.id)}>{busy===p.id?'Opening checkout…':'Buy one'}</button></article>)}</div>{r.data&&!r.data.products.length&&<p className="sn-empty">No products available.</p>}</main></div>;
}
