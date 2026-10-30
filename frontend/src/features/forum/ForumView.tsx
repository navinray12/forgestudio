import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, Clock3, Eye, Flame, HelpCircle, Lightbulb, Megaphone, MessageCircle, MessagesSquare, RefreshCw, Users, X } from 'lucide-react';
import { forumDate, forumFilters, forumQuery, forumRequest } from './forum-api';
import type { Discussion, Forum } from './forum-api';
import './ForumView.css';
const categoryIcons = [MessageCircle, MessagesSquare, Megaphone, Lightbulb, HelpCircle, Users];
const filterIcons = [Clock3, Flame, HelpCircle, CheckCircle2];
function Avatar({ name }: { name: string }) { return <span className="forum-avatar" aria-hidden="true">{(name || 'Member').slice(0, 1).toUpperCase()}</span>; }
export default function ForumView() {
  const [filter, setFilter] = useState('latest'), [category, setCategory] = useState(''), [page, setPage] = useState(1), [revision, refresh] = useState(0);
  const [state, setState] = useState<{ key: string; data?: Forum; error?: string }>({ key: '' });
  const [dialog, setDialog] = useState<'create' | string | null>(null), [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [dialogError, setDialogError] = useState(''), [busy, setBusy] = useState(false), [title, setTitle] = useState(''), [content, setContent] = useState(''), [draftCategory, setDraftCategory] = useState('');
  const [reply, setReply] = useState('');
  const [showAll, setShowAll] = useState(false);
  const requestId = useRef(crypto.randomUUID()), replyId = useRef(crypto.randomUUID());
  const dialogRef = useRef<HTMLDialogElement>(null), listRef = useRef<HTMLElement>(null);
  const query = forumQuery(filter, category, page), key = `${query}:${revision}`;
  useEffect(() => {
    const controller = new AbortController(); setState({ key });
    forumRequest<Forum>(`?${query}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setState({ key, data }); }).catch(error => { if (!controller.signal.aborted) setState({ key, error: error.message }); });
    return () => controller.abort();
  }, [key, query]);
  useEffect(() => {
    if (!dialog) { dialogRef.current?.close(); return; }
    dialogRef.current?.showModal(); setDialogError(''); setDiscussion(null); setReply(''); replyId.current = crypto.randomUUID();
    if (dialog === 'create') return;
    const controller = new AbortController();
    forumRequest<Discussion>(`/${dialog}`, { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setDiscussion(data); }).catch(error => { if (!controller.signal.aborted) setDialogError(error.message); });
    return () => controller.abort();
  }, [dialog]);
  const current = state.key === key ? state : undefined, data = current?.data;
  function selectCategory(value: string) { setCategory(value); setPage(1); listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function startTopic() { setTitle(''); setContent(''); setDraftCategory(category || data?.categories.find(c => c.slug !== 'announcements')?.id || ''); requestId.current = crypto.randomUUID(); setDialog('create'); }
  async function submitTopic(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setDialogError('');
    try { const result = await forumRequest<{ id: string }>('', { method: 'POST', body: JSON.stringify({ id: requestId.current, title, content, categoryId: draftCategory }) }); refresh(n => n + 1); setDialog(result.id); }
    catch (error) { setDialogError((error as Error).message); } finally { setBusy(false); }
  }
  async function submitReply(event: React.FormEvent) {
    event.preventDefault(); if (busy || !discussion) return; setBusy(true); setDialogError('');
    try { await forumRequest(`/${discussion.topic.id}/replies`, { method: 'POST', body: JSON.stringify({ id: replyId.current, content: reply }) }); setReply(''); replyId.current = crypto.randomUUID(); setDiscussion(await forumRequest<Discussion>(`/${discussion.topic.id}`)); refresh(n => n + 1); }
    catch (error) { setDialogError((error as Error).message); } finally { setBusy(false); }
  }
  async function toggleSolved() {
    if (!discussion || busy) return; setBusy(true); setDialogError('');
    try { await forumRequest(`/${discussion.topic.id}/solved`, { method: 'PATCH', body: JSON.stringify({ solved: !discussion.topic.isSolved }) }); setDiscussion(await forumRequest<Discussion>(`/${discussion.topic.id}`)); refresh(n => n + 1); }
    catch (error) { setDialogError((error as Error).message); } finally { setBusy(false); }
  }
  return <section className="forum-page" aria-label="ForgeStudio Forum" aria-busy={!current?.error && !data}>
    {current?.error ? <div className="forum-status" role="alert"><p>{current.error}</p><button onClick={() => refresh(n => n + 1)}>Retry</button></div> : !data ? <div className="forum-status" role="status">Loading the community…</div> : <>
      <div className="forum-primary">
        <header className="forum-hero"><span className="forum-eyebrow">WELCOME TO FORGESTUDIO FORUM</span><h1>Ask. Learn. <em>Build.</em></h1><p>Get help, share ideas, and connect with an amazing community of designers, developers and creators.</p><div className="forum-hero-members"><Users size={22} /><strong>{data.stats.members.toLocaleString()} members</strong></div><span className="forum-handwriting" aria-hidden="true">Better<br />Together ↗</span></header>
        <div className="forum-section-title"><div><h2>Browse Categories</h2><p>Find the right category or start a new discussion.</p></div><button onClick={() => { setShowAll(value => !value); selectCategory(''); }}>{showAll ? 'Show featured categories' : 'View all categories'} <ArrowRight size={14} /></button></div>
        <div className="forum-categories">{data.categories.slice(0, showAll ? undefined : 6).map((item, index) => { const Icon = categoryIcons[index % categoryIcons.length]; return <button key={item.id} className={`forum-category tone-${index % 6} ${category === item.id ? 'is-selected' : ''}`} onClick={() => selectCategory(item.id)} aria-pressed={category === item.id}><div className="forum-category-top"><span className="forum-category-icon"><Icon size={22} /></span><div><h3>{item.name}</h3><small>{item.topicCount.toLocaleString()} topics</small></div><ChevronRight size={16} /></div><p>{item.description || 'Connect, share ideas, and learn together.'}</p></button>; })}</div>
        <section className="forum-topics" ref={listRef} aria-label="Discussions"><div className="forum-topic-toolbar"><div className="forum-tabs" role="tablist" aria-label="Discussion filters">{forumFilters.map((item, i) => { const Icon = filterIcons[i]; return <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? 'is-active' : ''} onClick={() => { setFilter(item); setPage(1); }}><Icon size={14} />{item}</button>; })}</div><select aria-label="Discussion category" value={category} onChange={event => selectCategory(event.target.value)}><option value="">All Categories</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button aria-label="Refresh discussions" onClick={() => refresh(n => n + 1)}><RefreshCw size={14} /></button></div>
          {data.topics.length ? data.topics.map(topic => <button className="forum-topic-row" key={topic.id} onClick={() => setDialog(topic.id)}><Avatar name={topic.authorName} /><div className="forum-topic-copy"><span className="forum-topic-category">{topic.categoryName}</span>{topic.isSolved && <span className="forum-solved"><CheckCircle2 size={13} /> Solved</span>}<h3>{topic.title}</h3><p>{topic.excerpt}</p></div><div className="forum-topic-metrics"><span><MessageCircle size={14} />{topic.replyCount}</span><span><Eye size={14} />{topic.viewCount}</span></div><div className="forum-topic-author">By {topic.authorName || 'Community member'}<small>{forumDate(topic.createdAt)}</small></div></button>) : <div className="forum-empty"><MessagesSquare size={30} /><h3>No discussions yet</h3><p>{filter === 'latest' && !category ? 'Be the first to start a conversation.' : 'No discussions match this filter.'}</p><button onClick={startTopic}>Start a Topic <ArrowRight size={14} /></button></div>}
          {data.total > data.pageSize && <nav className="forum-pagination" aria-label="Discussion pages"><button disabled={page === 1} onClick={() => setPage(n => n - 1)}>Previous</button><span>Page {page} of {Math.ceil(data.total / data.pageSize)}</span><button disabled={page * data.pageSize >= data.total} onClick={() => setPage(n => n + 1)}>Next</button></nav>}
        </section>
      </div>
      <aside className="forum-aside"><section className="forum-panel"><h2><Users size={21} />Our Community</h2><div className="forum-stats">{(['members', 'topics', 'replies'] as const).map(label => <div key={label}><strong>{data.stats[label].toLocaleString()}</strong><span>{label}</span></div>)}</div><p>Great people. Great discussions.</p></section><section className="forum-panel"><h2><Flame className="forum-flame" size={21} />Trending Topics<button onClick={() => { setFilter('popular'); setPage(1); listRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>View all <ArrowRight size={13} /></button></h2>{data.trending.length ? <ol className="forum-trending">{data.trending.map((item, i) => <li key={item.id}><button onClick={() => setDialog(item.id)}><span>{i + 1}</span><strong>{item.title}</strong><small>{item.viewCount}</small></button></li>)}</ol> : <p>Trending discussions will appear here as the community grows.</p>}</section><section className="forum-panel forum-question"><h2>Have a question?</h2><p>Can't find what you're looking for? Start a new discussion and get help from the community.</p><button className="forum-cta" onClick={startTopic}>Start a Topic <ArrowRight size={15} /></button></section></aside>
    </>}
    <dialog className="forum-dialog" ref={dialogRef} onCancel={event => { if (busy) event.preventDefault(); else setDialog(null); }} onClose={() => setDialog(null)}><button className="forum-close" aria-label="Close discussion" disabled={busy} onClick={() => setDialog(null)}><X size={20} /></button>
      {dialog === 'create' ? <form onSubmit={submitTopic}><h2>Start a Topic</h2><p>Share a question or idea with the public community.</p><label>Category<select required value={draftCategory} onChange={event => { setDraftCategory(event.target.value); requestId.current = crypto.randomUUID(); }}><option value="" disabled>Select a category</option>{data?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Title<input required minLength={5} maxLength={180} value={title} onChange={event => { setTitle(event.target.value); requestId.current = crypto.randomUUID(); }} autoFocus /></label><label>Discussion<textarea required minLength={10} maxLength={20000} rows={7} value={content} onChange={event => { setContent(event.target.value); requestId.current = crypto.randomUUID(); }} /></label><button className="forum-cta" disabled={busy}>{busy ? 'Posting…' : 'Publish Topic'}</button></form> : discussion ? <><span className="forum-topic-category">{discussion.topic.categoryName}</span><h2>{discussion.topic.title}</h2><small>By {discussion.topic.authorName} · {forumDate(discussion.topic.createdAt)}</small><p className="forum-post-content">{discussion.topic.content}</p>{discussion.topic.isSolved && <p className="forum-solved"><CheckCircle2 size={15} /> Solved</p>}{discussion.viewerId === discussion.topic.authorId && !discussion.topic.isLocked && discussion.topic.status !== 'LOCKED' && <button disabled={busy} onClick={toggleSolved}>{discussion.topic.isSolved ? 'Reopen discussion' : 'Mark as solved'}</button>}<h3>Replies ({discussion.posts.length})</h3>{discussion.posts.map(post => <article className="forum-reply" key={post.id}><strong>{post.authorName}</strong><small>{forumDate(post.createdAt)}</small><p className="forum-post-content">{post.content}</p></article>)}{discussion.posts.length === 200 && <p>Showing the first 200 replies.</p>}{discussion.topic.isLocked || discussion.topic.status === 'LOCKED' ? <p>This discussion is locked.</p> : <form onSubmit={submitReply}><label>Your reply<textarea required maxLength={20000} rows={4} value={reply} onChange={event => { setReply(event.target.value); replyId.current = crypto.randomUUID(); }} /></label><button className="forum-cta" disabled={busy}>{busy ? 'Sending…' : 'Post Reply'}</button></form>}</> : dialog !== 'create' && !dialogError ? <p role="status">Loading discussion…</p> : null}
      {dialogError && <div role="alert" className="forum-dialog-error">{dialogError}{dialog !== 'create' && !discussion && <button onClick={() => { const id = dialog; setDialog(null); setTimeout(() => setDialog(id), 0); }}>Retry</button>}</div>}
    </dialog>
  </section>;
}
