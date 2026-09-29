import {useMemo} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import DOMPurify from 'dompurify';
import {useData,Feedback} from './api';

function SafeRich({html}:{html:unknown}){const clean=useMemo(()=>DOMPurify.sanitize(String(html??''),{USE_PROFILES:{html:true}}),[html]);return <div dangerouslySetInnerHTML={{__html:clean}}/>;}
export default function PublicBlog(){
  const {siteId,postSlug}=useParams(),[params,setParams]=useSearchParams(),locale=params.get('locale')||'en',q=params.get('q')||'';
  const post=useData<any>(siteId&&postSlug?`/public/sites/${siteId}/blog/posts/${encodeURIComponent(postSlug)}?locale=${encodeURIComponent(locale)}`:null);
  const list=useData<any>(siteId&&!postSlug?`/public/sites/${siteId}/blog/search?locale=${encodeURIComponent(locale)}&q=${encodeURIComponent(q)}&limit=30`:null);
  if(postSlug)return <main style={{maxWidth:860,margin:'0 auto',padding:'48px 20px',fontFamily:'system-ui'}}><Feedback state={post}/>{post.data?.post&&<article><Link to={`/blog/${siteId}?locale=${encodeURIComponent(locale)}`}>← Blog</Link><h1>{post.data.post.fields?.title||post.data.post.name}</h1>{post.data.post.fields?.excerpt&&<p>{post.data.post.fields.excerpt}</p>}<SafeRich html={post.data.post.fields?.body}/>{post.data.related?.length>0&&<section><h2>Related content</h2>{post.data.related.map((item:any)=><p key={item.slug}><Link to={`/blog/${siteId}/${item.slug}?locale=${encodeURIComponent(locale)}`}>{item.fields?.title||item.name}</Link></p>)}</section>}</article>}</main>;
  return <main style={{maxWidth:1000,margin:'0 auto',padding:'48px 20px',fontFamily:'system-ui'}}><header><h1>Blog</h1><form onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget),next=String(form.get('q')||'');setParams(next?{locale,q:next}:{locale});}}><label>Search posts <input name='q' defaultValue={q} maxLength={120}/></label><button>Search</button></form></header><Feedback state={list}/><section>{list.data?.items?.map((item:any)=><article key={item.slug} style={{padding:'24px 0',borderBottom:'1px solid #e2e8f0'}}><h2><Link to={`/blog/${siteId}/${item.slug}?locale=${encodeURIComponent(locale)}`}>{item.fields?.title||item.name}</Link></h2>{item.fields?.excerpt&&<p>{item.fields.excerpt}</p>}</article>)}{list.data&&!list.data.items?.length&&<p>No published posts found.</p>}</section></main>;
}