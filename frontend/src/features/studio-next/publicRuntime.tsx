import { useState,useEffect,useMemo } from 'react';
import DOMPurify from 'dompurify';
import { api } from './api';
interface Translation {title?:string;description?:string;slug?:string;texts?:Record<string,string>;alts?:Record<string,string>}
interface LocaleRoute {locale:string;name:string;slug:string;href:string}
const plainHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function applyTranslation<T extends {id:string;content?:string;alt?:string;children?:any[]}>(elements:T[],translation:Translation|undefined,variant:{text:string;targetElementId:string}|null):T[]{
  return elements.map(el=>({...el,...(translation?.texts&&Object.hasOwn(translation.texts,el.id)?{content:DOMPurify.sanitize(translation.texts[el.id],{USE_PROFILES:{html:true}})}:{}),...(translation?.alts&&Object.hasOwn(translation.alts,el.id)?{alt:translation.alts[el.id]}:{}),...(variant?.targetElementId===el.id?{content:plainHtml(variant.text)}:{}),...(el.children?{children:applyTranslation(el.children,translation,variant)}:{})}));
}
function safeBoundUrl(value:unknown,kind:'src'|'href'){
  if(typeof value!=='string')return undefined;
  const v=value.trim();if(!v)return undefined;
  if(v.startsWith('/')||v.startsWith('#'))return v;
  try{const u=new URL(v,window.location.origin);if(['http:','https:'].includes(u.protocol))return v;if(kind==='href'&&['mailto:','tel:'].includes(u.protocol))return v;}catch{}
  return undefined;
}
function collectCmsBindings(elements:any[],result:any[]=[]){
  for(const el of elements||[]){
    if(el?.id&&el.cmsBinding?.collectionId&&el.cmsBinding?.field&&el.cmsBinding?.target)result.push({elementId:el.id,...el.cmsBinding});
    if(Array.isArray(el?.children))collectCmsBindings(el.children,result);
    if(result.length>=100)break;
  }
  return result.slice(0,100);
}
function applyCmsValues(elements:any[],values:Record<string,Record<string,unknown>>):any[]{
  return elements.map(el=>{
    const resolved={...el},bound=values[el.id];
    if(bound){
      if(bound.content!==undefined)resolved.content=DOMPurify.sanitize(String(bound.content),{USE_PROFILES:{html:true}});
      if(bound.alt!==undefined)resolved.alt=String(bound.alt).slice(0,500);
      if(bound.src!==undefined){const src=safeBoundUrl(bound.src,'src');if(src)resolved.src=src;}
      if(bound.href!==undefined){const href=safeBoundUrl(bound.href,'href');if(href)resolved.href=href;}
    }
    if(el.children)resolved.children=applyCmsValues(el.children,values);
    return resolved;
  });
}
function optOutRequested(){return navigator.doNotTrack==='1'||(navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true;}
export function usePublishedRuntime(siteId:string|undefined,pageId:string,elements:any[],path:string,resolvedLocale?:string){
  const trackPath=path==='/'?'/':`/${path.replace(/^\/+/, '')}`;
  const locale=resolvedLocale||new URLSearchParams(window.location.search).get('locale')||'en';
  const [localized,setLocalized]=useState<{key:string;locales:any[];pages:Record<string,Translation>;routes:Array<{pageId:string;alternatives:LocaleRoute[]}>}>({key:'',locales:[],pages:{},routes:[]});
  const [enabled,setEnabled]=useState(false),[consent,setConsent]=useState(false),[variant,setVariant]=useState<{text:string;targetElementId:string}|null>(null);
  const [cmsValues,setCmsValues]=useState<Record<string,Record<string,unknown>>>({});
  const key=`${siteId}:${locale}`;
  useEffect(()=>{
    if(!siteId)return;const c=new AbortController();
    api<any>(`/public/sites/${siteId}/localization?locale=${encodeURIComponent(locale)}`,'GET',undefined,c.signal).then(r=>setLocalized({key,locales:r.locales,pages:r.pages,routes:r.routes||[]})).catch(()=>{if(!c.signal.aborted)setLocalized({key,locales:[],pages:{},routes:[]});});
    api<any>(`/public/sites/${siteId}/analytics`,'GET',undefined,c.signal).then(r=>setEnabled(r.enabled)).catch(()=>{if(!c.signal.aborted)setEnabled(false);});
    try{setConsent(!optOutRequested()&&localStorage.getItem(`studio.analytics.consent.${siteId}`)==='yes');}catch{setConsent(false);}
    return()=>c.abort();
  },[siteId,key,locale]);
  useEffect(()=>{
    if(!siteId){setCmsValues({});return;}
    const bindings=collectCmsBindings(elements);
    if(!bindings.length){setCmsValues({});return;}
    const c=new AbortController();
    api<any>(`/public/sites/${siteId}/bindings/resolve?locale=${encodeURIComponent(locale)}`,'POST',{bindings},c.signal)
      .then(r=>{if(!c.signal.aborted)setCmsValues(r.values||{});})
      .catch(()=>{if(!c.signal.aborted)setCmsValues({});});
    return()=>c.abort();
  },[siteId,locale,elements]);

  useEffect(()=>{
    setVariant(null);if(!siteId||!enabled||!consent||optOutRequested())return;
    const c=new AbortController();let ticket='';let visitorId:string;
    try{const storageKey=`studio.analytics.visitor.${siteId}`;visitorId=localStorage.getItem(storageKey)||crypto.randomUUID();localStorage.setItem(storageKey,visitorId);}catch{return;}
    api<any>(`/public/sites/${siteId}/assignment`,'POST',{visitorId,path:trackPath,consent:true},c.signal).then(async r=>{
      if(c.signal.aborted)return;ticket=r.ticket;setVariant(r.variant);await api(`/public/sites/${siteId}/events`,'POST',{id:crypto.randomUUID(),ticket,event:'PAGEVIEW'},c.signal);
    }).catch(()=>{/* Analytics must never break public rendering. */});
    const conversion=()=>{if(ticket&&!c.signal.aborted)void api(`/public/sites/${siteId}/events`,'POST',{id:crypto.randomUUID(),ticket,event:'CONVERSION'},c.signal).catch(()=>{});};
    const click=(e:MouseEvent)=>{if(e.target instanceof Element&&e.target.closest('[data-studio-goal="conversion"]'))conversion();};
    document.addEventListener('click',click);window.addEventListener('studio:conversion',conversion);
    return()=>{c.abort();document.removeEventListener('click',click);window.removeEventListener('studio:conversion',conversion);};
  },[siteId,pageId,trackPath,enabled,consent]);
  const current=localized.key===key?localized:undefined;const translation=current?.pages[pageId];
  useEffect(()=>{
    const route=current?.routes.find(r=>r.pageId===pageId);
    const original=document.title;const meta=document.querySelector('meta[name="description"]');const old=meta?.getAttribute('content');
    if(translation?.title)document.title=translation.title;if(translation?.description&&meta)meta.setAttribute('content',translation.description);
    const added:HTMLLinkElement[]=[];
    for(const alt of route?.alternatives??[]){const link=document.createElement('link');link.rel='alternate';link.hreflang=alt.locale;link.href=new URL(alt.href,window.location.origin).href;document.head.appendChild(link);added.push(link);}
    const currentAlt=route?.alternatives.find(alt=>alt.locale===locale);let canonical:HTMLLinkElement|undefined;
    if(currentAlt){canonical=document.createElement('link');canonical.rel='canonical';canonical.href=new URL(currentAlt.href,window.location.origin).href;document.head.appendChild(canonical);}
    return()=>{document.title=original;if(meta&&old!==null&&old!==undefined)meta.setAttribute('content',old);for(const link of added)link.remove();canonical?.remove();};
  },[translation,current,pageId,locale]);
  const localizedElements=useMemo(()=>applyCmsValues(applyTranslation(elements,translation,variant),cmsValues),[elements,translation,variant,cmsValues]);
  function choose(value:boolean){setConsent(value);try{localStorage.setItem(`studio.analytics.consent.${siteId}`,value?'yes':'no');if(!value)localStorage.removeItem(`studio.analytics.visitor.${siteId}`);}catch{}}
  const controls=(!enabled&&(!current||current.locales.length<=1))?null:<div style={{position:'relative',zIndex:20,display:'flex',flexWrap:'wrap',justifyContent:'flex-end',gap:12,padding:'8px 16px',font:'12px system-ui',background:'#f8fafc',color:'#334155'}}>
    {!!current?.locales.length&&current.locales.length>1&&<label>Language <select aria-label="Published page language" value={locale} onChange={e=>{const route=current.routes.find(r=>r.pageId===pageId);const target=route?.alternatives.find(a=>a.locale===e.target.value)?.href;if(target)window.location.assign(target);else{const fallback=new URL(window.location.href);fallback.searchParams.set('locale',e.target.value);window.location.assign(fallback.href);}}}>{current.locales.map(l=><option key={l.code} value={l.code}>{l.name}</option>)}</select></label>}
    {enabled&&!optOutRequested()&&<label><input type="checkbox" checked={consent} onChange={e=>choose(e.target.checked)}/> Allow optional analytics and text experiments</label>}
  </div>;
  return {elements:localizedElements,controls,translate:(nodes:any[])=>applyTranslation(nodes,translation,null)};
}
