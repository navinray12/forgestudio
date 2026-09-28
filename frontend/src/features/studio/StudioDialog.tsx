import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { DialogState, Folder } from "./types";

const TITLES = { create: "Create a new site", copy: "Duplicate site design", rename: "Rename site", move: "Move to folder", archive: "Archive site", folder: "Create folder", renameFolder: "Rename folder", deleteFolder: "Delete folder", workspace: "Create workspace", renameWorkspace: "Rename workspace" };
export default function StudioDialog({ dialog, folders, workspaceName, onClose, onSubmit }: {
  dialog: DialogState; folders: Folder[]; workspaceName: string;
  onClose: () => void; onSubmit: (value: string, folderId: string | null, operationId: string) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [operationId] = useState(() => crypto.randomUUID());
  const [value, setValue] = useState(dialog.type === "copy" ? `${dialog.site?.name || "Site"} copy`.slice(0, 120) : dialog.type === "renameWorkspace" ? workspaceName : dialog.site?.name || dialog.folder?.name || "");
  const [folderId, setFolderId] = useState(dialog.site?.folderId || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsName = !["move", "archive", "deleteFolder"].includes(dialog.type);
  const destructive = dialog.type === "archive" || dialog.type === "deleteFolder";
  useEffect(() => { ref.current?.showModal(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSubmit(value.trim(), folderId || null, operationId); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : "The change could not be saved"); }
    finally { setBusy(false); }
  }
  return <dialog className="fs-dialog" ref={ref} aria-labelledby="studio-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={submit}>
      <header><h2 id="studio-dialog-title">{TITLES[dialog.type]}</h2><button className="fs-icon" type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20} /></button></header>
      <div className="fs-dialog-body">
        <p className="fs-muted">{dialog.type === "workspace" ? "Create a separate space to organize your sites." : <>Workspace: <strong>{workspaceName}</strong></>}</p>
        {dialog.type === "create" && <p>Start with a blank, editable site. Add sections and templates from the Designer’s library.</p>}
        {dialog.type === "copy" && <p>Copies the editable design into a new draft. CMS entries, submissions, domains, billing, credentials and deployments are not copied.</p>}
        {dialog.type === "archive" && <p>Move <strong>{dialog.site?.name}</strong> out of All sites. You can restore it later. <strong>This does not unpublish the live site</strong>, delete data, or free a site-plan slot.</p>}
        {dialog.type === "deleteFolder" && <p>Delete <strong>{dialog.folder?.name}</strong>? Its sites will return to All sites. No site will be deleted.</p>}
        {needsName && <label className="fs-field">Name<input autoFocus required maxLength={120} value={value} onChange={event => setValue(event.target.value)} autoComplete="off" disabled={busy} /></label>}
        {dialog.type === "move" && <label className="fs-field">Destination folder<select autoFocus value={folderId} onChange={event => setFolderId(event.target.value)} disabled={busy}><option value="">All sites — no folder</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>}
        {error && <p className="fs-error" role="alert">{error}</p>}
      </div>
      <footer><button type="button" className="fs-button" disabled={busy} onClick={onClose}>Cancel</button><button className={`fs-button ${destructive ? "fs-danger" : "fs-primary"}`} disabled={busy || (needsName && !value.trim())}>{busy ? "Saving…" : destructive ? "Confirm" : dialog.type === "create" ? "Create site" : "Save"}</button></footer>
    </form>
  </dialog>;
}
