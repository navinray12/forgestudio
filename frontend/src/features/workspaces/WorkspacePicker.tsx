import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, CodeXml, LayoutGrid, Plus, X } from "lucide-react";
import type { useDashboardWorkspace } from "../../pages/dashboard/useDashboardWorkspace";
import type { DashboardWorkspaceOption } from "../../pages/dashboard/workspace-selection";
import "./WorkspacePicker.css";

type Kind = "STANDARD" | "DEVELOPER";
type Managed = DashboardWorkspaceOption & { siteCount: number; archivedSiteCount: number };
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
async function request<T>(path = "", options: { method?: string; body?: unknown; key?: string; signal?: AbortSignal } = {}): Promise<T> {
  const response = await fetch(`${apiUrl}/api/dashboard/workspaces${path}`, {
    method: options.method || "GET", credentials: "include", signal: options.signal,
    headers: options.body === undefined ? {} : { "Content-Type": "application/json", "X-Forge-Intent": "workspace-command", ...(options.key ? { "Idempotency-Key": options.key } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 401 ? "Your session has expired. Sign in again to continue." : data?.error?.message || data?.message || "Unable to update workspaces. Please try again.");
  if (!data) throw new Error("The workspace response was incomplete. Please try again.");
  return data as T;
}
function WorkspaceIcon({ developer = false }: { developer?: boolean }) {
  return <span className={`workspace-picker-icon ${developer ? "is-developer" : ""}`} aria-hidden="true">{developer ? <CodeXml size={19} /> : <LayoutGrid size={19} />}</span>;
}
export default function WorkspacePicker({ data, disabled, onCreated, onSelect }: {
  data: ReturnType<typeof useDashboardWorkspace>; disabled?: boolean; onCreated: (id: string) => void; onSelect?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 });
  const [mode, setMode] = useState<Kind | "manage" | null>(null);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<Managed[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Managed | null>(null);
  const [renameName, setRenameName] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const operation = useRef(false);
  const commandKey = useRef<{ signature: string; key: string } | null>(null);
  const listRequest = useRef<AbortController | null>(null);
  const current = data.workspaces.find(item => item.id === data.workspaceId);
  const label = data.loading ? "Loading workspaces..." : current?.name || "Personal sites";

  useEffect(() => {
    if (!open) return;
    (menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]') || menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)"))?.focus();
    const pointer = (event: PointerEvent) => { if (event.target instanceof Node && !menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false); };
    const close = () => setOpen(false);
    const scroll = (event: Event) => { if (event.target instanceof Node && menu.current?.contains(event.target)) return; setOpen(false); };
    document.addEventListener("pointerdown", pointer); window.addEventListener("resize", close); window.addEventListener("scroll", scroll, true);
    return () => { document.removeEventListener("pointerdown", pointer); window.removeEventListener("resize", close); window.removeEventListener("scroll", scroll, true); };
  }, [open]);
  useEffect(() => {
    if (mode) { if (!dialog.current?.open) dialog.current?.showModal(); }
    else if (dialog.current?.open) { dialog.current.close(); trigger.current?.focus(); }
  }, [mode]);
  useEffect(() => () => listRequest.current?.abort(), []);
  useEffect(() => { if (data.loading || disabled) setOpen(false); }, [data.loading, disabled]);

  function toggle() {
    if (!open && trigger.current) {
      const rect = trigger.current.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 288), window.innerWidth - 24);
      setPosition({ top: rect.bottom + 5, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width, maxHeight: window.innerHeight - rect.bottom - 17 });
    }
    setOpen(value => !value);
  }
  function menuKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (event.key === "Tab") { setOpen(false); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }
  function choose(id: string) { data.selectWorkspace(id); setOpen(false); onSelect?.(); }
  function showCreate(kind: Kind) { setOpen(false); setError(""); setNotice(""); setName(""); commandKey.current = null; setMode(kind); }
  async function loadManaged() {
    listRequest.current?.abort();
    const controller = new AbortController(); listRequest.current = controller; setLoading(true); setError("");
    try { const result = await request<{ workspaces: Managed[] }>("", { signal: controller.signal }); if (!controller.signal.aborted) setRows(result.workspaces); }
    catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load workspaces."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  function showManage() { setOpen(false); setMode("manage"); setEditing(null); setNotice(""); void loadManaged(); }
  function closeDialog() { if (!operation.current) { listRequest.current?.abort(); setMode(null); setError(""); } }
  async function create() {
    if (operation.current || !name.trim() || mode === "manage" || !mode) return;
    const payload = { name: name.trim(), workspaceType: mode };
    const signature = JSON.stringify(payload);
    if (commandKey.current?.signature !== signature) commandKey.current = { signature, key: crypto.randomUUID() };
    operation.current = true; setBusy(true); setError("");
    try {
      const result = await request<{ workspace: { id: string } }>("", { method: "POST", body: payload, key: commandKey.current!.key });
      setMode(null); onCreated(result.workspace.id);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to create workspace."); }
    finally { operation.current = false; setBusy(false); }
  }
  async function rename() {
    if (operation.current || !editing || !renameName.trim()) return;
    operation.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await request(`/${editing.id}`, { method: "PATCH", body: { name: renameName.trim(), expectedUpdatedAt: editing.updatedAt } });
      setEditing(null); setNotice("Workspace name updated."); data.retry(); await loadManaged();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to rename workspace."); }
    finally { operation.current = false; setBusy(false); }
  }
  return <>
    <button ref={trigger} type="button" className={`workspace-picker-trigger ${open ? "is-open" : ""}`} aria-label="Dashboard workspace" title={current?.name || "Personal sites"} aria-haspopup="menu" aria-expanded={open} aria-controls="workspace-picker-menu" disabled={data.loading || !!data.error || disabled} onClick={toggle} onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (!open) toggle(); } }}>
      <WorkspaceIcon developer={current?.workspaceType === "DEVELOPER"} /><span className="workspace-picker-label">{label}</span><ChevronsUpDown size={15} />
    </button>
    {open && createPortal(<div ref={menu} id="workspace-picker-menu" role="menu" aria-label="Workspaces" className="workspace-picker-menu" style={position} onKeyDown={menuKeyboard}>
      <div className="workspace-picker-options">
        {data.showPersonal && <button role="menuitemradio" aria-checked={data.workspaceId === "personal"} onClick={() => choose("personal")}><WorkspaceIcon /><span>Personal sites</span>{data.workspaceId === "personal" && <Check size={14} />}</button>}
        {data.workspaces.map(workspace => <button key={workspace.id} role="menuitemradio" aria-checked={workspace.id === data.workspaceId} onClick={() => choose(workspace.id)}><WorkspaceIcon developer={workspace.workspaceType === "DEVELOPER"} /><span>{workspace.name}{workspace.workspaceType === "DEVELOPER" && <small>Developer workspace</small>}</span>{workspace.id === data.workspaceId && <Check size={14} />}</button>)}
      </div>
      <div className="workspace-picker-commands"><button role="menuitem" onClick={() => showCreate("STANDARD")}>Create Workspace</button><button role="menuitem" onClick={() => showCreate("DEVELOPER")}>Create developer workspace</button><button role="menuitem" onClick={showManage}>Manage Workspaces</button></div>
    </div>, document.body)}
    <dialog ref={dialog} className="workspace-dialog" aria-labelledby="workspace-dialog-title" onCancel={event => { event.preventDefault(); closeDialog(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } }}>
      <div className="workspace-dialog-heading"><div><p className="workspace-dialog-eyebrow">YOUR TEAM, CONNECTED</p><h2 id="workspace-dialog-title">{mode === "manage" ? "Manage Workspaces" : mode === "DEVELOPER" ? "Create developer workspace" : "Create Workspace"}</h2></div><button type="button" className="workspace-dialog-close" aria-label="Close workspace dialog" disabled={busy} onClick={closeDialog}><X size={18} /></button></div>
      {error && <div className="workspace-dialog-error" role="alert">{error}</div>}{notice && <p className="workspace-dialog-notice" role="status">{notice}</p>}
      {mode === "manage" ? <>
        <p className="workspace-dialog-description">Switch between your workspaces and manage their names. Site content stays in its workspace.</p>
        <div className="workspace-manager-toolbar"><button disabled={busy || loading} onClick={() => void loadManaged()}>Refresh workspaces</button><button disabled={busy} onClick={() => showCreate("STANDARD")}><Plus size={14} /> Create Workspace</button></div>
        {loading ? <p role="status">Loading workspaces...</p> : <div className="workspace-manager-list">{rows.length === 0 && !error && <p>No workspaces yet. Create one to get started.</p>}{rows.map(workspace => <div className="workspace-manager-row" key={workspace.id}>
          <WorkspaceIcon developer={workspace.workspaceType === "DEVELOPER"} /><div className="workspace-manager-details"><strong>{workspace.name}</strong><small>{workspace.workspaceType === "DEVELOPER" ? "Developer" : "Standard"} workspace · {workspace.userRole?.toLowerCase()} · {workspace.siteCount} sites · {workspace.archivedSiteCount} archived{workspace.lifecycleStatus === "ARCHIVED" && " · Read only"}</small></div>
          <button disabled={busy} onClick={() => { choose(workspace.id); closeDialog(); }}>Open</button>
          {["OWNER", "ADMIN"].includes(workspace.userRole || "") && workspace.lifecycleStatus !== "ARCHIVED" && <button disabled={busy} aria-label={`Rename ${workspace.name}`} onClick={() => { setEditing(workspace); setRenameName(workspace.name); setError(""); }}>Rename</button>}
        </div>)}</div>}
        {editing && <form className="workspace-rename-form" onSubmit={event => { event.preventDefault(); void rename(); }}><label>Workspace name<input autoFocus aria-label="Rename workspace" value={renameName} maxLength={120} disabled={busy} onChange={event => setRenameName(event.target.value)} /></label><div className="workspace-dialog-actions"><button type="button" disabled={busy} onClick={() => { setEditing(null); setError(""); }}>Cancel rename</button><button className="workspace-dialog-primary" disabled={busy || !renameName.trim()}>{busy ? "Saving..." : "Save name"}</button></div></form>}
      </> : <form onSubmit={event => { event.preventDefault(); void create(); }}>
        <p className="workspace-dialog-description">{mode === "DEVELOPER" ? "Create a separate space for development and testing. Your sites keep the same editor and publishing controls." : "Organize your sites in a workspace for you and your team."}</p>
        <label>Workspace name<input aria-label="Workspace name" autoFocus required maxLength={120} disabled={busy} value={name} onChange={event => setName(event.target.value)} placeholder={mode === "DEVELOPER" ? "e.g. Development lab" : "e.g. Design team"} /></label>
        <div className="workspace-dialog-actions"><button type="button" disabled={busy} onClick={closeDialog}>Cancel</button><button className="workspace-dialog-primary" disabled={busy || !name.trim()}>{busy ? "Creating..." : "Create workspace"}</button></div>
      </form>}
    </dialog>
  </>;
}
