import { lazy, Suspense, useEffect, useRef, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Archive, ArrowLeft, ArrowRight, ArrowUpRight, Code2, CreditCard, FileText, Folder as FolderIcon, Gauge, Globe, LayoutGrid, List, LogOut, Menu, Plus, Puzzle, RefreshCw, Search, Settings, Star, Users, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { API_ORIGIN, request, useResource } from "./api";
import type { Bootstrap, DialogState, Folder, Panel, Site, SiteResult, View, Workspace } from "./types";
import StudioDialog from "./StudioDialog";
import SiteCollection, { SITE_DRAG_TYPE, type SiteAction } from "./SiteCollection";
import { ActivityPanel, WorkspacePanel } from "./WorkspacePanels";
import "./studio.css";

const ManagedSiteModal = lazy(() => import("../../pages/dashboard/components/ManagedSiteModal").then(module => ({ default: module.ManagedSiteModal })));
const RoleManagerModal = lazy(() => import("../../pages/dashboard/components/RoleManagerModal").then(module => ({ default: module.RoleManagerModal })));
const PluginHub = lazy(() => import("../../pages/dashboard/components/PluginHub"));
const DeveloperApiSettings = lazy(() => import("../../pages/dashboard/components/DeveloperApiSettings"));
const SubscriptionBillingPanel = lazy(() => import("../../pages/dashboard/components/SubscriptionBillingPanel"));
const CustomPostTypesPanel = lazy(() => import("../../pages/dashboard/components/CustomPostTypesPanel"));
const PerformancePanel = lazy(() => import("../../pages/dashboard/components/PerformancePanel"));
const VIEW_TITLES: Record<View, string> = { all: "All sites", favorites: "Favorites", archived: "Archived sites", shared: "Shared with me" };
const PANEL_TITLES: Record<Panel, string> = { sites: "Sites", activity: "Activity", workspace: "Workspace settings", apps: "Apps & integrations", cms: "Custom content", developer: "Developer API", billing: "Billing & invoices", performance: "Performance & SEO" };

export default function StudioDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaceId, setWorkspaceId] = useState("personal");
  const [panel, setPanel] = useState<Panel>("sites");
  const [view, setView] = useState<View>("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [managed, setManaged] = useState<Site | null>(null);
  const [access, setAccess] = useState<Site | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const bootstrap = useResource<Bootstrap>("/bootstrap", refresh);
  const workspace = bootstrap.data?.workspaces.find(item => item.id === workspaceId);
  const workspaceName = workspaceId === "personal" ? "Personal workspace" : workspace?.name || "Workspace";
  const canManage = workspaceId === "personal" || !!workspace?.canManage;
  const params = new URLSearchParams({ workspaceId, view, q: search, sort, direction, page: String(page), limit: "12" });
  if (folderId) params.set("folderId", folderId);
  const results = useResource<SiteResult>(panel === "sites" ? `/sites?${params}` : null, refresh);
  const folders = results.data?.folders || [];
  const currentFolder = folders.find(item => item.id === folderId);
  const title = panel === "sites" ? currentFolder?.name || VIEW_TITLES[view] : PANEL_TITLES[panel];

  useEffect(() => { const timeout = window.setTimeout(() => { setSearch(query); setPage(1); }, 250); return () => window.clearTimeout(timeout); }, [query]);
  useEffect(() => {
    const stored = (() => { try { return localStorage.getItem(`studio.layout.${user?.id}`); } catch { return null; } })();
    if (stored === "grid" || stored === "list") setLayout(stored);
  }, [user?.id]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const element = event.target as HTMLElement | null;
      if (element?.closest("input, textarea, select, [contenteditable=true], dialog")) return;
      if (event.key === "/" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) { event.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 6000); return () => window.clearTimeout(timer); }, [notice]);

  function selectView(nextView: View) { setPanel("sites"); setView(nextView); setFolderId(null); setPage(1); setSidebar(false); }
  function selectPanel(nextPanel: Panel) { setPanel(nextPanel); setSidebar(false); }
  function selectWorkspace(nextId: string) { setWorkspaceId(nextId); setFolderId(null); setView("all"); setPage(1); setQuery(""); setSearch(""); setFailure(""); }
  function chooseLayout(next: "grid" | "list") { setLayout(next); try { localStorage.setItem(`studio.layout.${user?.id}`, next); } catch { /* Storage may be unavailable in private browsing. */ } }
  function changed(message: string) { setRefresh(value => value + 1); setNotice(message); setFailure(""); }
  async function mutate(path: string, method: string, body: unknown, message: string) {
    setBusy(true); setFailure("");
    try { await request(path, { method, body }); changed(message); }
    catch (error) { setFailure(error instanceof Error ? error.message : "The change could not be saved"); }
    finally { setBusy(false); }
  }
  function siteAction(site: Site, action: SiteAction) {
    if (action === "settings") return setManaged(site);
    if (action === "access") return setAccess(site);
    if (action === "favorite") { void mutate(`/sites/${site.id}/favorite`, "PUT", { favorite: !site.favorite }, site.favorite ? "Removed from favorites" : "Added to favorites"); return; }
    if (action === "restore") { void mutate(`/sites/${site.id}`, "PATCH", { archived: false, revision: site.revision }, "Site restored"); return; }
    if (action === "live") { if (!navigator.clipboard) { setFailure("Clipboard access requires HTTPS or localhost. Open the site from Site settings."); return; } void navigator.clipboard.writeText(`${window.location.origin}/site/${site.id}`).then(() => setNotice("Live-site link copied")).catch(() => setFailure("Clipboard access was denied. Open the published site from Site settings.")); return; }
    setDialog({ type: action, site });
  }
  async function dropSite(event: DragEvent, target: Folder | null) {
    event.preventDefault();
    if (busy) return;
    const site = results.data?.sites.find(item => item.id === event.dataTransfer.getData(SITE_DRAG_TYPE));
    if (!site?.canManage) return;
    await mutate(`/sites/${site.id}`, "PATCH", { folderId: target?.id ?? null, revision: site.revision }, target ? `Moved to ${target.name}` : "Moved out of folder");
  }
  function allowDrop(event: DragEvent) { if (event.dataTransfer.types.includes(SITE_DRAG_TYPE)) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }

  async function submitDialog(value: string, targetFolder: string | null, operationId: string) {
    if (!dialog) return;
    const site = dialog.site;
    if (dialog.type === "create" || dialog.type === "copy") {
      const response = await request<{ site: { id: string } }>("/sites", { method: "POST", body: { name: value, workspaceId, folderId: dialog.type === "create" ? folderId : null, sourceSiteId: site?.id ?? null, operationId } });
      changed(dialog.type === "copy" ? "Design copied to a new draft" : "Site created");
      navigate(`/editor/${response.site.id}`); return;
    }
    if (dialog.type === "workspace") {
      const response = await request<{ workspace: Workspace }>("/workspaces", { method: "POST", body: { name: value, operationId } });
      selectWorkspace(response.workspace.id); changed("Workspace created"); return;
    }
    if (dialog.type === "renameWorkspace") { await request(`/workspaces/${workspaceId}`, { method: "PATCH", body: { name: value } }); changed("Workspace renamed"); return; }
    if (dialog.type === "folder") { await request("/folders", { method: "POST", body: { name: value, workspaceId } }); changed("Folder created"); return; }
    if (dialog.type === "renameFolder" || dialog.type === "deleteFolder") {
      await request(`/folders/${dialog.folder!.id}`, { method: dialog.type === "deleteFolder" ? "DELETE" : "PATCH", body: { workspaceId, ...(dialog.type === "renameFolder" ? { name: value } : {}) } });
      if (dialog.type === "deleteFolder") setFolderId(null);
      changed(dialog.type === "deleteFolder" ? "Folder deleted; sites were kept" : "Folder renamed"); return;
    }
    if (!site) return;
    const patch = dialog.type === "rename" ? { name: value } : dialog.type === "move" ? { folderId: targetFolder } : { archived: true };
    await request(`/sites/${site.id}`, { method: "PATCH", body: { ...patch, revision: site.revision } });
    changed("Site updated");
  }

  return <div className="fs-studio">
    <a href="#studio-main" className="fs-skip">Skip to content</a>
    {sidebar && <button className="fs-scrim" aria-label="Close navigation" onClick={() => setSidebar(false)} />}
    <aside className={`fs-sidebar ${sidebar ? "fs-sidebar-open" : ""}`} aria-label="Workspace navigation">
      <Link className="fs-brand" to="/dashboard"><span className="fs-brand-symbol">F</span>ForgeStudio<span className="fs-brand-label">Studio</span></Link>
      <div className="fs-workspace-switch"><label htmlFor="studio-workspace">WORKSPACE</label><select id="studio-workspace" value={workspaceId} onChange={event => selectWorkspace(event.target.value)} disabled={busy}><option value="personal">Personal workspace</option>{bootstrap.data?.workspaces.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button onClick={() => setDialog({ type: "workspace" })}><Plus size={14} /> New workspace</button></div>
      <nav className="fs-navigation">
        <button className={panel === "sites" && view === "all" ? "fs-active" : ""} onClick={() => selectView("all")}><Globe size={17} />All sites</button>
        <button className={panel === "sites" && view === "favorites" ? "fs-active" : ""} onClick={() => selectView("favorites")}><Star size={17} />Favorites</button>
        <button className={panel === "sites" && view === "shared" ? "fs-active" : ""} onClick={() => selectView("shared")}><Users size={17} />Shared with me</button>
        <button className={panel === "sites" && view === "archived" ? "fs-active" : ""} onClick={() => selectView("archived")}><Archive size={17} />Archived sites</button>
        <span className="fs-nav-label">WORKSPACE TOOLS</span>
        <button className={panel === "activity" ? "fs-active" : ""} onClick={() => selectPanel("activity")}><Activity size={17} />Activity</button>
        <button className={panel === "workspace" ? "fs-active" : ""} onClick={() => selectPanel("workspace")}><Settings size={17} />Workspace settings</button>
        <span className="fs-nav-label">ACCOUNT TOOLS</span>
        <button className={panel === "apps" ? "fs-active" : ""} onClick={() => selectPanel("apps")}><Puzzle size={17} />Apps & integrations</button>
        <button className={panel === "cms" ? "fs-active" : ""} onClick={() => selectPanel("cms")}><FileText size={17} />Custom content</button>
        <button className={panel === "developer" ? "fs-active" : ""} onClick={() => selectPanel("developer")}><Code2 size={17} />Developer API</button>
        <button className={panel === "performance" ? "fs-active" : ""} onClick={() => selectPanel("performance")}><Gauge size={17} />Performance & SEO</button>
        <button className={panel === "billing" ? "fs-active" : ""} onClick={() => selectPanel("billing")}><CreditCard size={17} />Billing & invoices</button>
        <Link to="/invitations"><Users size={17} />Invitations</Link>
        <Link to="/dashboard?legacy=1"><ArrowUpRight size={17} />Advanced console</Link>
      </nav>
      <div className="fs-account"><span className="fs-avatar">{(user?.fullName || user?.email || "F").slice(0, 1).toUpperCase()}</span><div><strong>{user?.fullName || "Your account"}</strong><span>{user?.email}</span></div><button className="fs-icon" title="Sign out" aria-label="Sign out" onClick={() => { void logout().then(() => navigate("/login")).catch(() => setFailure("Sign out failed. Try again.")); }}><LogOut size={16} /></button></div>
    </aside>
    <div className="fs-body"><header className="fs-topbar"><div><button className="fs-icon fs-mobile-toggle" aria-label="Open navigation" onClick={() => setSidebar(true)}><Menu size={20} /></button><span className="fs-breadcrumb">{workspaceName}</span><span className="fs-breadcrumb-divider">/</span><strong>{PANEL_TITLES[panel]}</strong></div><div><span className="fs-plan">{bootstrap.data?.plan.name || "Account"} plan</span><Link to="/subscriptions" className="fs-button fs-small">Manage plan <ArrowUpRight size={14} /></Link></div></header>
      <main id="studio-main" className="fs-main"><div className="fs-page-title"><div><p className="fs-eyebrow">YOUR WEB, ORGANIZED</p><h1>{title}</h1><p>{panel === "sites" ? view === "shared" ? "Sites shared with you across workspaces." : "Create, design, and manage your websites in one place." : "Manage your ForgeStudio workspace and connected tools."}</p></div>{panel === "sites" && canManage && <button className="fs-button fs-primary" onClick={() => setDialog({ type: "create" })}><Plus size={17} />New site</button>}</div>
        {(failure || bootstrap.error) && <div className="fs-error fs-banner" role="alert"><span>{failure || bootstrap.error}</span><button className="fs-button fs-small" onClick={() => { setFailure(""); setRefresh(value => value + 1); }}>Retry</button></div>}
        {notice && <div className="fs-notice" role="status">{notice}<button className="fs-icon" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button></div>}
        {panel === "sites" && <>
          <div className="fs-toolbar"><label className="fs-search"><Search size={17} /><input ref={searchRef} aria-label="Search sites" placeholder="Search sites…" value={query} onChange={event => setQuery(event.target.value)} /><kbd>/</kbd></label><div className="fs-toolbar-actions"><label className="fs-sort">Sort by<select aria-label="Sort sites by" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="updated">Last modified</option><option value="created">Date created</option><option value="name">Alphabetical</option><option value="published">Last published</option></select></label><button className="fs-button fs-small" title="Toggle sort direction" onClick={() => { setDirection(direction === "asc" ? "desc" : "asc"); setPage(1); }}>{direction === "asc" ? "Ascending" : "Descending"}</button><div className="fs-view-switch" role="group" aria-label="Site layout"><button className={layout === "grid" ? "fs-selected" : ""} aria-label="Grid view" aria-pressed={layout === "grid"} onClick={() => chooseLayout("grid")}><LayoutGrid size={17} /></button><button className={layout === "list" ? "fs-selected" : ""} aria-label="List view" aria-pressed={layout === "list"} onClick={() => chooseLayout("list")}><List size={18} /></button></div><button className="fs-icon" title="Refresh sites" aria-label="Refresh sites" disabled={results.loading || busy} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} /></button></div></div>
          {view !== "shared" && <div className="fs-folder-section"><div className="fs-section-heading"><span>FOLDERS</span>{canManage && <button onClick={() => setDialog({ type: "folder" })}><Plus size={14} />New folder</button>}</div><div className="fs-folders"><button className={`fs-folder ${folderId === null ? "fs-folder-active" : ""}`} onClick={() => { setFolderId(null); setPage(1); }} onDragOver={allowDrop} onDrop={event => { void dropSite(event, null); }}><LayoutGrid size={18} />All sites</button>{folders.map(folder => <div key={folder.id} className={`fs-folder ${folderId === folder.id ? "fs-folder-active" : ""}`} onDragOver={allowDrop} onDrop={event => { void dropSite(event, folder); }}><button onClick={() => { setFolderId(folder.id); setPage(1); }}><FolderIcon size={18} />{folder.name}</button>{canManage && <details className="fs-site-menu"><summary aria-label={`Actions for folder ${folder.name}`}>···</summary><div className="fs-menu"><button onClick={() => setDialog({ type: "renameFolder", folder })}>Rename folder</button><button onClick={() => setDialog({ type: "deleteFolder", folder })}>Delete folder</button></div></details>}</div>)}</div><p className="fs-folder-hint">Drag owned sites into a folder, or choose “Move to folder” from a site’s menu.</p></div>}
          <div className="fs-results-heading"><h2>{currentFolder ? currentFolder.name : VIEW_TITLES[view]} {results.data && <span>{results.data.total}</span>}</h2><span>{results.loading ? "Loading…" : "Changes are saved to your workspace"}</span></div>
          {results.error && <div className="fs-error fs-banner" role="alert"><span>{results.error}</span><button className="fs-button" onClick={() => setRefresh(value => value + 1)}>Retry</button></div>}
          {results.loading && <div className="fs-loading" role="status"><RefreshCw size={22} />Loading sites…</div>}
          {results.data && !results.data.sites.length && <div className="fs-empty"><div><Globe size={32} /></div><h2>{search ? "No matching sites" : view === "archived" ? "No archived sites" : view === "favorites" ? "Your favorites will appear here" : view === "shared" ? "No sites shared with you yet" : "A blank canvas. Your next big idea."}</h2><p>{search ? "Try a different name or clear your search." : "Create a site or explore another view. Your existing sites are kept in their original workspaces."}</p>{search ? <button className="fs-button" onClick={() => setQuery("")}>Clear search</button> : canManage && view === "all" && <button className="fs-button fs-primary" onClick={() => setDialog({ type: "create" })}><Plus size={16} />Create your first site</button>}</div>}
          {results.data && results.data.sites.length > 0 && <SiteCollection sites={results.data.sites} view={layout} busy={busy} onAction={siteAction} />}
          {results.data && results.data.total > results.data.limit && <div className="fs-pagination"><span>Page {page} of {Math.ceil(results.data.total / results.data.limit)}</span><div><button className="fs-button" disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}><ArrowLeft size={15} />Previous</button><button className="fs-button" disabled={page * results.data.limit >= results.data.total || busy} onClick={() => setPage(value => value + 1)}>Next<ArrowRight size={15} /></button></div></div>}
        </>}
        {panel === "activity" && <ActivityPanel workspaceId={workspaceId} refresh={refresh} />}
        {panel === "workspace" && <WorkspacePanel workspace={workspace} userName={user?.fullName || "you"} refresh={refresh} onRename={() => setDialog({ type: "renameWorkspace" })} />}
        <Suspense fallback={<div className="fs-loading" role="status">Loading tools…</div>}><div className="fs-embedded">{panel === "apps" && <PluginHub />}{panel === "developer" && <DeveloperApiSettings />}{panel === "billing" && <SubscriptionBillingPanel />}{panel === "cms" && <CustomPostTypesPanel />}{panel === "performance" && <PerformancePanel />}</div></Suspense>
        <footer className="fs-footer"><span>ForgeStudio · Visual website workspace</span><Link to="/dashboard?legacy=1">Open advanced console <ArrowUpRight size={13} /></Link></footer>
      </main>
    </div>
    {dialog && <StudioDialog dialog={dialog} folders={folders} workspaceName={workspaceName} onClose={() => setDialog(null)} onSubmit={submitDialog} />}
    <Suspense fallback={<div className="fs-modal-loading" role="status">Loading site tools…</div>}>{managed && <ManagedSiteModal website={managed} isOpen onClose={() => setManaged(null)} onWebsiteUpdated={() => changed("Site settings updated")} />}{access && <RoleManagerModal websiteId={access.id} websiteName={access.name} apiUrl={API_ORIGIN} onClose={() => setAccess(null)} />}</Suspense>
  </div>;
}
