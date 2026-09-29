import {Link} from 'react-router-dom';
import {useData,useMutation,Feedback} from './api';
import type {PanelProps} from './types';

export default function BlogPanel({site,refresh,reload}:PanelProps){
  const base=`/sites/${site.id}/blog`,state=useData(base,refresh),m=useMutation(reload);
  const setup=async()=>{await m.send(`${base}/setup`,'POST',{},'Blog CMS configured');};
  return <section><div className="sn-section-heading"><div><h2>Blog</h2><p>First-class blog publishing built on the same CMS drafts, references, scheduling, localization and revisions.</p></div>{!state.data?.configured&&site.capabilities.includes('EDIT_DESIGN')&&<button className="sn-button sn-primary" onClick={setup} disabled={m.busy}>Configure blog</button>}</div>
    <Feedback state={state}/><Feedback state={m}/>
    {state.data?.configured?<div className="sn-grid">
      <article className="sn-card"><h3>Posts</h3><p className="sn-stat">{state.data.counts?.posts?.total??0}</p><p className="sn-help">{state.data.counts?.posts?.live??0} live · {state.data.counts?.posts?.scheduled??0} scheduled</p><Link className="sn-button" to="?panel=collections">Manage posts in CMS</Link></article>
      <article className="sn-card"><h3>Authors</h3><p className="sn-stat">{state.data.counts?.authors?.total??0}</p><p className="sn-help">Author profiles are CMS records and can be localized independently.</p><Link className="sn-button" to="?panel=collections">Manage authors</Link></article>
      <article className="sn-card"><h3>Categories</h3><p className="sn-stat">{state.data.counts?.categories?.total??0}</p><p className="sn-help">Posts reference category translation groups rather than duplicating category text.</p><Link className="sn-button" to="?panel=collections">Manage categories</Link></article>
      <article className="sn-card"><h3>Public discovery</h3><p className="sn-help">Only published posts from an enabled locale appear in public search, RSS, taxonomy pages and the blog sitemap.</p><div className="sn-inline-actions"><a className="sn-button" target="_blank" rel="noreferrer" href={`/api/v1/studio-next/public/sites/${site.id}/blog/rss.xml`}>RSS</a><a className="sn-button" target="_blank" rel="noreferrer" href={`/api/v1/studio-next/public/sites/${site.id}/blog/sitemap.xml`}>Sitemap</a></div></article>
    </div>:!state.loading&&!state.error&&<div className="sn-empty"><h3>Blog is not configured</h3><p>Configure it once to create Blog Posts, Blog Authors and Blog Categories as real CMS collections. Existing collections are never overwritten.</p></div>}
  </section>;
}