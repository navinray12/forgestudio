/**
 * @file Autosave feature: Draft Recovery Tools. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { useState } from 'react';
import { listRecovery } from '../persistence/local-recovery-store';
interface Props { accountId?: string; websiteId?: string; apiUrl: string; currentDocument: () => string }
/**
 * Download.
 * @param name Name supplied to this operation (type: string).
 * @param data Data supplied to this operation (type: string).
 */
function download(name: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/**
 * Render the draft recovery tools interface and connect its event handlers.
 * @param options Named inputs: accountId, websiteId, apiUrl, currentDocument.

 * @param options.accountId Account identifier used to scope this operation or its browser recovery records.
 * @param options.websiteId Identifier of the website whose data is being read or changed.
 * @param options.apiUrl Api Url passed by the caller.
 * @param options.currentDocument Current Document passed by the caller.
 */
export function DraftRecoveryTools({ accountId, websiteId, apiUrl, currentDocument }: Props) {
  const [message, setMessage] = useState('');
  const [host, setHost] = useState<string | null>(null);
  const [copies, setCopies] = useState<Awaited<ReturnType<typeof listRecovery>>>([]);
  const [opened, setOpened] = useState(false);
  /**
   * Compare.
   */
  async function compare() {
    if (!accountId || !websiteId) return;
    setOpened(true); setMessage('Loading the current host version…'); setHost(null);
    try {
      const response = await fetch(`${apiUrl}/api/v1/websites/${websiteId}`, { credentials: 'include', signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error('The host could not authorize this comparison. Sign in or reconnect before retrieving saved copies.');
      const body = await response.json();
      setHost(JSON.stringify(body.website.editorData, null, 2));
      setCopies(await listRecovery(accountId, websiteId));
      setMessage(`Host revision: ${body.website.draftRevision}. Download both versions before reloading; reloading discards changes still in this tab.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Recovery storage is unavailable.'); }
  }
  return <>
    <button type="button" onClick={() => { void compare(); }} className="px-2 py-1 text-xs text-amber-200 border border-amber-700 rounded">Recovery / compare</button>
    {opened && <div role="dialog" aria-modal="true" aria-label="Draft recovery" className="fixed inset-0 z-[20000] bg-slate-950/95 text-white p-8 overflow-auto">
      <h2 className="text-xl font-semibold">Preserve and compare your drafts</h2>
      <p role="status" className="my-4 max-w-3xl">{message}</p>
      <div className="flex flex-wrap gap-4">
        <button type="button" onClick={() => download('current-local-draft.json', currentDocument())}>Download current local draft</button>
        {host && <button type="button" onClick={() => download('current-host-draft.json', host)}>Download current host draft</button>}
        <button type="button" onClick={() => setOpened(false)}>Return to editor</button>
      </div>
      <ul className="mt-6 space-y-3">{copies.map(copy => <li key={copy.key}>
        <button type="button" onClick={() => download(`recovery-${copy.updatedAt}.json`, copy.data)}>Download recovery copy from {new Date(copy.updatedAt).toLocaleString()} ({copy.bytes.toLocaleString()} bytes)</button>
      </li>)}</ul>
    </div>}
  </>;
}
