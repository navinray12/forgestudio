import { Link,useParams,useSearchParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useData,Feedback } from './api';
import './studio-next.css';
function Value({field,value}:{field:any;value:any}){
  if(value===null||value===undefined)return null;
  if(field.type==='RICH_TEXT')return <div className="sn-rich-text" dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(String(value),{USE_PROFILES:{html:true}})}}/>;
  if(field.type==='IMAGE')return <img loading="lazy" className="sn-content-image" src={value.url||value} alt={value.alt||field.name}/>;
  if(field.type==='URL')return <a href={value} rel="noopener noreferrer" target="_blank">{value}</a>;
  if(field.type==='BOOLEAN')return <span>{value?'Yes':'No'}</span>;
  if(field.type==='MULTI_REFERENCE')return <span>{value.join(', ')}</span>;
  return <span>{String(value)}</span>;
}
export default function PublicContent(){
  const {siteId,collectionSlug,itemSlug}=useParams(),[params]=useSearchParams();const locale=params.get('locale')||'en';
  const r=useData(`/public/sites/${siteId}/collections/${collectionSlug}${itemSlug?`/${itemSlug}`:''}?locale=${encodeURIComponent(locale)}`);
  return <div className="sn sn-public"><main className="sn-public-main"><header className="sn-title"><p className="sn-eyebrow">PUBLISHED CONTENT · {locale}</p><h1>{r.data?.collectionName||'Content'}</h1></header><Feedback state={r}/>{itemSlug&&<Link className="sn-button" to={`/content/${siteId}/${collectionSlug}?locale=${encodeURIComponent(locale)}`}>All published entries</Link>}{r.data?.items.map((item:any)=><article className="sn-content-card" key={item.id}><h2>{itemSlug?item.name:<Link to={`/content/${siteId}/${collectionSlug}/${item.slug}?locale=${encodeURIComponent(locale)}`}>{item.name}</Link>}</h2>{r.data.schema.map((field:any)=><div className="sn-content-field" key={field.key}><h3>{field.name}</h3><Value field={field} value={item.fields[field.key]}/></div>)}</article>)}{r.data&&!r.data.items.length&&<p className="sn-empty">No published entries are available in this locale.</p>}<footer className="sn-footer">Published with ForgeStudio. Up to 100 published entries are shown.</footer></main></div>;
}
