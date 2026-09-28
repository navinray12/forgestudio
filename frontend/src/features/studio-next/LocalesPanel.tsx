import { useEffect, useState } from 'react';
import { Plus, Globe } from 'lucide-react';
import { useData, useMutation, Feedback, Modal } from './api';
import type { PanelProps } from './types';

function LocaleEnabled({ locale, base, canEdit, mutation }: {
  locale: { code: string; enabled: boolean; isPrimary?: boolean };
  base: string;
  canEdit: boolean;
  mutation: ReturnType<typeof useMutation>;
}) {
  const [enabled, setEnabled] = useState(locale.enabled);
  useEffect(() => setEnabled(locale.enabled), [locale.enabled]);

  return <label className="sn-check">
    <input
      type="checkbox"
      aria-label="Publicly enabled"
      checked={enabled}
      disabled={!canEdit || locale.isPrimary || mutation.busy}
      onChange={async event => {
        const next = event.target.checked;
        // Show the user's choice immediately, but never retain it after a rejected save.
        setEnabled(next);
        const saved = await mutation.send(`${base}/locales/${locale.code}`, 'PATCH', { enabled: next }, 'Locale updated');
        if (!saved) setEnabled(locale.enabled);
      }}
    />
    Publicly enabled
  </label>;
}

function TranslationEditor({ page, record, locale, base, onClose, reload }: {
  page: any; record: any; locale: string; base: string; onClose: () => void; reload: () => void;
}) {
  const [draft, setDraft] = useState(record?.draft || { title: '', description: '', texts: {}, alts: {} });
  const m = useMutation(reload);
  return <Modal title={`${page.name} · ${locale}`} onClose={onClose} busy={m.busy}>
    <form onSubmit={async event => {
      event.preventDefault();
      if (await m.send(`${base}/localization/${encodeURIComponent(page.id)}/${locale}`, 'PUT', {
        revision: record?.revision || 0, data: draft,
      }, 'Translation draft saved')) onClose();
    }}>
      <p className="sn-help">Missing translations use primary-language text. Empty text is an intentional empty override. Publishing is a separate action.</p>
      <label>Localized page title<input value={draft.title} maxLength={200} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Localized description<textarea value={draft.description} maxLength={1000} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
      {page.nodes.map((node: any) => <fieldset className="sn-field-card" key={node.id}>
        <legend>{node.id}</legend><p className="sn-source">{node.text.slice(0, 300)}</p>
        <label>Translated text<textarea value={draft.texts[node.id] ?? ''} placeholder="Primary-language fallback" onChange={event => setDraft({ ...draft, texts: { ...draft.texts, [node.id]: event.target.value } })} /></label>
        <button className="sn-link" type="button" onClick={() => {
          const texts = { ...draft.texts }; delete texts[node.id]; setDraft({ ...draft, texts });
        }}>Use primary text</button>
        {node.alt !== undefined && <label>Image alternative text<input value={draft.alts[node.id] ?? ''} onChange={event => setDraft({ ...draft, alts: { ...draft.alts, [node.id]: event.target.value } })} /></label>}
      </fieldset>)}
      <Feedback state={m} />
      <footer><button type="button" className="sn-button" onClick={onClose} disabled={m.busy}>Cancel</button><button className="sn-button sn-primary" disabled={m.busy}>Save translation draft</button></footer>
    </form>
  </Modal>;
}

export default function LocalesPanel({ site, refresh, reload }: PanelProps) {
  const base = `/sites/${site.id}`, r = useData(`${base}/localization`, refresh), m = useMutation(reload);
  const [creating, setCreating] = useState(false), [code, setCode] = useState(''), [name, setName] = useState('');
  const [selected, setSelected] = useState(''), [editing, setEditing] = useState<any>(null);
  const secondary = r.data?.locales.filter((locale: any) => !locale.isPrimary) || [];
  const locale = secondary.find((entry: any) => entry.code === selected) || secondary[0];
  const canEdit = site.capabilities.includes('EDIT_CONTENT'), canPublish = site.capabilities.includes('PUBLISH');

  return <section>
    <div className="sn-section-heading"><div><h2>Localization</h2><p>Translate page text and CMS items without changing the primary design. Only published translations are returned to visitors.</p></div>{site.capabilities.includes('MANAGE_SETTINGS') && <button className="sn-button sn-primary" onClick={() => setCreating(true)}><Plus size={15} />Add locale</button>}</div>
    <Feedback state={r} /><Feedback state={m} />
    <div className="sn-locale-cards">{r.data?.locales.map((entry: any) => <div className={`sn-locale-card ${locale?.code === entry.code ? 'selected' : ''}`} key={entry.code}>
      <button onClick={() => { if (!entry.isPrimary) setSelected(entry.code); }}><Globe size={19} /><strong>{entry.name}</strong><span>{entry.code}{entry.isPrimary ? ' · Primary' : ''}</span></button>
      <LocaleEnabled locale={entry} base={base} canEdit={site.capabilities.includes('MANAGE_SETTINGS')} mutation={m} />
    </div>)}</div>
    {!locale && !r.loading && <p className="sn-empty">Add a secondary locale to translate pages.</p>}
    {locale && <div className="sn-table"><table><thead><tr><th>Page</th><th>{locale.name}</th><th>Actions</th></tr></thead><tbody>{r.data?.pages.map((page: any) => {
      const record = r.data.translations.find((translation: any) => translation.pageId === page.id && translation.locale === locale.code);
      return <tr key={page.id}><td>{page.name}<small>{page.slug}</small></td><td>{record?.liveRevision ? 'Published' : record ? 'Draft' : 'Primary fallback'}{record && <small>Draft {record.revision} / Live {record.liveRevision || '—'}</small>}</td><td><div className="sn-inline-actions">
        {canEdit && <button className="sn-button" onClick={() => setEditing({ page, record })}>Edit translation</button>}
        {canPublish && record && <button className="sn-button" disabled={m.busy} onClick={() => { void m.send(`${base}/localization/${encodeURIComponent(page.id)}/${locale.code}/publish`, 'POST', { revision: record.revision, publish: true }, 'Translation published'); }}>Publish</button>}
        {canPublish && record?.liveRevision && <button className="sn-button" disabled={m.busy} onClick={() => { void m.send(`${base}/localization/${encodeURIComponent(page.id)}/${locale.code}/publish`, 'POST', { revision: record.revision, publish: false }, 'Translation unpublished'); }}>Unpublish</button>}
      </div></td></tr>;
    })}</tbody></table></div>}
    {creating && <Modal title="Add locale" onClose={() => setCreating(false)} busy={m.busy}><form onSubmit={async event => {
      event.preventDefault();
      if (await m.send(`${base}/locales`, 'POST', { code, name }, 'Locale added')) { setCreating(false); setCode(''); setName(''); }
    }}>
      <label>Language code<input required placeholder="fr or pt-BR" maxLength={35} value={code} onChange={event => setCode(event.target.value)} /></label>
      <label>Display name<input required placeholder="French" maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
      <Feedback state={m} /><footer><button className="sn-button sn-primary" disabled={m.busy}>Add locale</button></footer>
    </form></Modal>}
    {editing && locale && <TranslationEditor {...editing} locale={locale.code} base={base} onClose={() => setEditing(null)} reload={reload} />}
    <p className="sn-help">Page translations cover known text and image-alt nodes. Global component slots, locale subdirectories and localized SEO routing are not generated by this panel.</p>
  </section>;
}
