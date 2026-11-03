import {NotificationProvider} from '../../features/notifications/NotificationContext';
import NotificationBell from '../../features/notifications/NotificationBell';
import AccountShell from "../../features/account/AccountShell";
import TemplatesView from "../../features/templates/dashboard/TemplatesView";
import BillingView from "../../features/billing/BillingView";
import ForumView from "../../features/forum/ForumView";
import { partitionDashboardSites } from "./site-archive";
import UsageView from "../../features/usage/UsageView";
import MembersView from "../../features/workspaces/MembersView";
import { useMembersData } from "../../features/workspaces/use-members-data";
import WorkspacePicker from "../../features/workspaces/WorkspacePicker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Archive,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CodeXml,
  Folder,
  FolderPlus,
  FileText,
  Grid2X2,
  TrendingUp,
  LibraryBig,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Settings,
  Plug,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { HeaderUserDropdown } from "../../components/HeaderUserDropdown";
import { useDashboardWorkspace } from "./useDashboardWorkspace";
import { DashboardSettings } from "./DashboardSettings";
import "./DashboardPage.css";

interface Website {
  id: string;
  userId: string;
  archivedAt?: string | null;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "grid" | "list";
type DashboardSection = "notifications" | "help" | "security" | "community" | "account" | "sites" | "archive" | "members" | "usage" | "billing" | "integrations" | "libraries" | "forms";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";


const navItems = [
  { label: "Sites", icon: LayoutGrid, section: "sites" as DashboardSection },
  { label: "Archive", icon: Archive, section: "archive" as DashboardSection },
];

const secondaryItems = [
  { label: "Members", icon: Users, section: "members" as DashboardSection },
  { label: "Plans", icon: Sparkles, section: "plans" as const },
  { label: "Usage", icon: TrendingUp, section: "usage" as const },
  { label: "Forms", icon: FileText, section: "forms" as const },
  { label: "Billing", icon: Folder, section: "billing" as const },
  { label: "Integrations", icon: Plug, section: "integrations" as const, expandable: true },
  { label: "Libraries & Templates", icon: LibraryBig, section: "libraries" as const, expandable: true },
];

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "Edited today";
  if (days === 1) return "Edited yesterday";
  return `Edited ${days} days ago`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "FS";
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [dashboardSearch, setDashboardSearch] = useSearchParams();
  const workspaceData = useDashboardWorkspace(user?.id);
  const membersData = useMembersData(workspaceData.workspaceId, workspaceData.selectWorkspace);
  const [accountPanel, setAccountPanel] = useState<string | null>(null);
  const [section, setSection] = useState<DashboardSection>(dashboardSearch.get("section") === "notifications" ? "notifications" : dashboardSearch.get("section") === "help" ? "help" : dashboardSearch.get("section") === "security" ? "security" : dashboardSearch.get("section") === "community" ? "community" : dashboardSearch.get("section") === "account" ? "account" : params.workspaceId ? "members" : dashboardSearch.get("section") === "billing" ? "billing" : "sites");
  useEffect(() => {
    const next = new URLSearchParams(dashboardSearch);
    if (["billing", "account", "community", "security", "help", "notifications"].includes(section)) next.set("section", section);
    else if (["billing", "account", "community", "security", "help", "notifications"].includes(next.get("section") || "")) next.delete("section");
    // A shared Community post belongs only to the Community page.
    if (section !== "community") next.delete("post");
    if (next.toString() !== dashboardSearch.toString()) setDashboardSearch(next, { replace: true });
  }, [section, dashboardSearch, setDashboardSearch]);
  function openSettings(panel: string) { if (panel === "help-support") panel = "help"; if (panel === "account" || panel === "community" || panel === "security" || panel === "help" || panel === "notifications") { setAccountPanel(null); setSection(panel); } else setAccountPanel(panel); }
  const [allWebsites, setWebsites] = useState<Website[]>([]);
  const { websites, archivedWebsites } = useMemo(() => partitionDashboardSites(allWebsites), [allWebsites]);
  // Identifies the workspace whose site list is currently displayed.
  const [sitesWorkspaceId, setSitesWorkspaceId] = useState("");
  const [archivePending, setArchivePending] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState("");
  const archiveRequest = useRef<AbortController | null>(null);
  const folderStorageKey = `forgestudio.dashboard.folders.${user?.id}.${workspaceData.workspaceId}`;
  const [folders, setFolders] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const [activeFolder, setActiveFolder] = useState("All sites");
  const [search, setSearch] = useState("");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !settingsRef.current?.contains(event.target)) setSettingsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSettingsOpen(false);
        settingsButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);
  const [createOpen, setCreateOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [creating, setCreating] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const siteRequest = useRef<AbortController | null>(null);
  const fetchWebsites = useCallback(async (showRefresh = false, signal?: AbortSignal) => {
    siteRequest.current?.abort();
    const controller = new AbortController();
    siteRequest.current = controller;
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    const requestSignal = controller.signal;
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/api/dashboard/sites?includeArchived=true&workspaceId=${encodeURIComponent(workspaceData.workspaceId)}`, { credentials: "include", signal: requestSignal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || data?.error?.message || "Unable to load sites.");
      if (!requestSignal.aborted) { setWebsites(Array.isArray(data?.websites) ? data.websites : []); setSitesWorkspaceId(workspaceData.workspaceId); }
    } catch (requestError) {
      if (requestSignal.aborted) return;
      setError(requestError instanceof Error ? requestError.message : "Unable to load sites.");
    } finally {
      signal?.removeEventListener("abort", abort);
      if (!requestSignal.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, [workspaceData.workspaceId]);

  useEffect(() => {
    if (workspaceData.loading || workspaceData.error) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => { setWebsites([]); setMenuId(null); setArchiveError(""); void fetchWebsites(false, controller.signal); }, 0);
    return () => { controller.abort(); siteRequest.current?.abort(); archiveRequest.current?.abort(); window.clearTimeout(timer); };
  }, [fetchWebsites, workspaceData.loading, workspaceData.error]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
    let data: { folders?: string[]; assignments?: Record<string, string>; favorites?: string[] } = {};
    try { data = JSON.parse(localStorage.getItem(folderStorageKey) || "{}"); } catch { /* Storage is optional. */ }
    setFolders(Array.isArray(data?.folders) ? data.folders.filter(value => typeof value === "string") : []);
    setAssignments(data?.assignments && typeof data.assignments === "object" ? data.assignments : {});
    setFavorites(Array.isArray(data?.favorites) ? data.favorites : []);
    setActiveFolder("All sites"); setLoadedStorageKey(folderStorageKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [folderStorageKey]);
  useEffect(() => {
    if (loadedStorageKey !== folderStorageKey) return;
    try { localStorage.setItem(folderStorageKey, JSON.stringify({ folders, assignments, favorites })); } catch { /* Storage is optional. */ }
  }, [folderStorageKey, loadedStorageKey, folders, assignments, favorites]);

  const visibleWebsites = useMemo(() => {
    const source = section === "archive" ? archivedWebsites : websites;
    return [...source]
      .filter((site) => site.name.toLowerCase().includes(search.toLowerCase()) && (activeFolder === "All sites" || assignments[site.id] === activeFolder))
      .sort((a, b) => {
        const aDate = new Date(a.updatedAt || a.createdAt).getTime();
        const bDate = new Date(b.updatedAt || b.createdAt).getTime();
        return sortNewestFirst ? bDate - aDate : aDate - bDate;
      });
  }, [archivedWebsites, search, section, sortNewestFirst, websites, activeFolder, assignments]);
  const sitesPending = !workspaceData.error && !error && (workspaceData.loading || loading || sitesWorkspaceId !== workspaceData.workspaceId);
  const siteCount = sitesPending || workspaceData.error || error ? 0 : websites.length;

  const handleArchive = async (site: Website) => {
    if ((archiveRequest.current && !archiveRequest.current.signal.aborted) || sitesPending) return;
    const controller = new AbortController();
    archiveRequest.current = controller;
    setArchivePending(site.id); setArchiveError("");
    try {
      const response = await fetch(`${apiUrl}/api/dashboard/sites/${site.id}/archive`, {
        method: "PATCH", credentials: "include", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspaceData.workspaceId, archived: !site.archivedAt }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || data?.error?.message || "Unable to update archive. Please try again.");
      if (!controller.signal.aborted) { setMenuId(null); await fetchWebsites(true, controller.signal); }
    } catch (error) {
      if (!controller.signal.aborted) setArchiveError(error instanceof Error ? error.message : "Unable to update archive.");
    } finally {
      if (archiveRequest.current === controller) { archiveRequest.current = null; setArchivePending(null); }
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteName.trim() || creating || workspaceData.loading || workspaceData.error) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/api/dashboard/sites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: siteName.trim(), workspaceId: workspaceData.workspaceId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.website?.id) throw new Error(data?.message || data?.error?.message || "Unable to create site.");
      setCreateOpen(false);
      setSiteName("");
      navigate(`/editor/${data.website.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create site.");
    } finally { setCreating(false); }
  };

  const handleLogout = async () => { await logout(); navigate("/login", { replace: true }); };
  const addFolder = () => {
    const name = window.prompt("Folder name");
    if (name?.trim() && !folders.includes(name.trim())) setFolders((current) => [...current, name.trim()]);
  };




  if (section === "account" || section === "community" || section === "security" || section === "help" || section === "notifications") return <AccountShell page={section} onNavigate={setSection} onBack={() => setSection("sites")} onAdd={() => { setSection("sites"); setCreateOpen(true); }} onTemplates={() => setSection("libraries")} onSaved={() => workspaceData.retry()} onSettings={openSettings}>{accountPanel && <DashboardSettings panel={accountPanel} onClose={() => setAccountPanel(null)} />}</AccountShell>;

  return (
    <div className={`studio-dashboard ${section === "billing" ? "is-billing" : section === "integrations" ? "is-integrations" : section === "libraries" ? "is-libraries" : ""}`}>
      <header className="studio-header">
        <Link to="/dashboard" className="studio-brand">web studio</Link>
        <div className="header-divider" />
        <div className="header-actions">
          <NotificationBell onSettings={openSettings}/>
          <Link className="upgrade-button" to="/subscriptions">Upgrade <span>→</span></Link>
          <HeaderUserDropdown onSettings={openSettings} />
          <button className="mobile-menu" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={mobileNavOpen}><Menu size={20} /></button>
        </div>
      </header>

      <div className="studio-layout">
        <aside className={`studio-sidebar ${mobileNavOpen ? "is-open" : ""}`}>
          <WorkspacePicker data={workspaceData} disabled={membersData.selectionLocked} onSelect={() => { setMobileNavOpen(false); setActiveFolder("All sites"); }} onCreated={id => { workspaceData.retry(id); setSection("sites"); setMobileNavOpen(false); if (params.workspaceId) navigate("/dashboard"); }} />
          <nav className="sidebar-nav" aria-label="Workspace navigation">
            {navItems.map(({ label, icon: Icon, section: itemSection }) => (
              <button key={label} className={`sidebar-link ${section === itemSection ? "is-active" : ""}`} onClick={() => { setSection(itemSection); setActiveFolder("All sites"); setMobileNavOpen(false); }}><Icon size={16} /><span>{label}</span></button>
            ))}
            <div className="sidebar-rule" />
            {secondaryItems.map(({ label, icon: Icon, section: itemSection }) => <button key={label} className={`sidebar-link ${section === itemSection ? "is-active" : ""}`} onClick={() => { if (itemSection === "members" || itemSection === "usage" || itemSection === "forms" || itemSection === "billing" || itemSection === "libraries") setSection(itemSection); else navigate(itemSection === "plans" ? "/subscriptions" : "/dashboard/tools"); setMobileNavOpen(false); }}><Icon size={16} /><span>{label}</span></button>)}
            <Link className="sidebar-link" to="/dashboard/tools"><CodeXml size={16} /><span>Developer Tools</span><ChevronRight className="sidebar-chevron" size={14} /></Link>
          </nav>
          <div className="sidebar-footer" ref={settingsRef}>
            <button ref={settingsButtonRef} type="button" className="sidebar-link" aria-expanded={settingsOpen} aria-controls="dashboard-settings" onClick={() => setSettingsOpen((open) => !open)}>
              <Settings size={16} /><span>Settings</span>
              {settingsOpen ? <ChevronDown className="sidebar-chevron" size={14} /> : <ChevronRight className="sidebar-chevron" size={14} />}
            </button>
            <div id="dashboard-settings" className="sidebar-settings" hidden={!settingsOpen}>
              <button className="sidebar-link" onClick={() => { openSettings("account"); setSettingsOpen(false); setMobileNavOpen(false); }}>
                <Settings size={16} /><span>Account settings</span>
              </button>
              <button className="sidebar-link" onClick={() => { openSettings("help"); setSettingsOpen(false); setMobileNavOpen(false); }}>
                <CircleHelp size={16} /><span>Help center</span>
              </button>
              <button type="button" className="sidebar-link" onClick={() => { setSettingsOpen(false); setMobileNavOpen(false); handleLogout(); }}>
                <LogOut size={16} /><span>Log out</span>
              </button>
            </div>
          </div>
    </aside>

    <main className={`studio-main ${section === "usage" ? "is-usage" : ""}`}>
      {section === "libraries" ? <TemplatesView onOpenSites={() => setSection("sites")} /> : section === "billing" ? <BillingView /> : section === "forms" ? <ForumView /> : section === "usage" ? <UsageView workspaceId={workspaceData.workspaceId} workspaceLoading={workspaceData.loading} workspaceError={workspaceData.error} onRetryWorkspace={() => workspaceData.retry()} /> : section === "members" ? <>
        {workspaceData.workspaceId === "personal" && <div className="dashboard-workspace-prompt"><p>Choose or create a workspace using the workspace menu to manage members.</p></div>}
        <MembersView data={membersData} />
      </> : <>
        <div className="main-heading-row">
          <div><p className="eyebrow">{section === "archive" ? "YOUR SITES, STORED" : "YOUR WEB, ORGANIZED"}</p><h1>{section === "archive" ? "Archive" : "All sites"}</h1><p className="subtitle">{section === "archive" ? "Restore and manage sites you have moved out of your workspace." : "Create, design, and manage your websites in one place."}</p></div>
          <button className="primary-button" disabled={workspaceData.loading || !!workspaceData.error} onClick={() => setCreateOpen(true)}><Plus size={16} /> New site</button>
        </div>

        <div className="toolbar">
          <label className="search-field"><Search size={16} /><input aria-label="Search sites" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sites..." /><kbd>/</kbd></label>
          <div className="sort-controls"><span>Sort by</span><button className="control-button" onClick={() => setSortNewestFirst((current) => !current)}>Last modified <ChevronDown size={13} /></button><button className="control-button" onClick={() => setSortNewestFirst((current) => !current)}>{sortNewestFirst ? "Descending" : "Ascending"}</button><div className="view-toggle"><button className={viewMode === "grid" ? "is-active" : ""} onClick={() => setViewMode("grid")} aria-label="Grid view"><Grid2X2 size={15} /></button><button className={viewMode === "list" ? "is-active" : ""} onClick={() => setViewMode("list")} aria-label="List view"><List size={16} /></button></div><button className="icon-button refresh-button" disabled={workspaceData.loading || !!workspaceData.error} onClick={() => void fetchWebsites(true)} aria-label="Refresh sites"><RefreshCw size={15} className={refreshing ? "spin" : ""} /></button></div>
        </div>

        {section === "sites" && <div className="folders-section"><div className="section-label-row"><span className="section-label">Folders</span><button className="new-folder-button" onClick={addFolder}><FolderPlus size={14} /> New folder</button></div><div className="folder-tabs"><button className={`folder-tab ${activeFolder === "All sites" ? "is-active" : ""}`} onClick={() => setActiveFolder("All sites")}><Grid2X2 size={14} /> All sites <span className="count-badge">{siteCount}</span></button>{folders.map((folder) => <button key={folder} className={`folder-tab ${activeFolder === folder ? "is-active" : ""}`} onClick={() => setActiveFolder(folder)}><Folder size={14} /> {folder} <MoreHorizontal size={14} /></button>)}</div><p className="folder-helper">Folders and favorites are saved in this browser for the selected workspace.</p></div>}

        <div className="sites-heading"><div className="sites-title"><h2>{section === "archive" ? "Archived sites" : activeFolder}</h2><span className="count-badge">{sitesPending || workspaceData.error || error ? 0 : visibleWebsites.length}</span></div><span className="save-note">Sites are saved to your workspace</span></div>

        {archiveError && <div className="dashboard-error" role="alert">{archiveError}<button onClick={() => setArchiveError("")}>Dismiss</button></div>}
        {(error || workspaceData.error) && <div className="dashboard-error" role="alert">{error || workspaceData.error}<button onClick={() => { if (workspaceData.error) workspaceData.retry(); else void fetchWebsites(true); }}>Try again</button></div>}
        {sitesPending ? <div className="site-grid" aria-label="Loading sites"><div className="loading-card" /><div className="loading-card" /><div className="loading-card" /></div> : error || workspaceData.error ? null : visibleWebsites.length === 0 ? <div className="empty-state"><div className="empty-icon"><Folder size={22} /></div><h3>{section === "archive" ? "Your archive is empty" : search ? "No sites found" : "Create your first site"}</h3><p>{search ? "Try a different search term." : section === "archive" ? "Archived sites will appear here. You can restore them at any time." : "Start with a blank canvas, a template, or an AI-generated site."}</p>{section === "sites" && !search && <button className="primary-button" disabled={workspaceData.loading || !!workspaceData.error} onClick={() => setCreateOpen(true)}><Plus size={16} /> New site</button>}</div> : <div className={`site-grid ${viewMode === "list" ? "is-list" : ""}`}>{visibleWebsites.map((site, index) => <SiteCard key={site.id} site={site} canArchive={site.userId === user?.id} archivePending={archivePending !== null} onArchive={() => void handleArchive(site)} index={index} viewMode={viewMode} favorite={favorites.includes(site.id)} onFavorite={() => setFavorites(current => current.includes(site.id) ? current.filter(id => id !== site.id) : [...current, site.id])} folders={folders} folder={assignments[site.id] || ""} onFolder={folder => setAssignments(current => ({ ...current, [site.id]: folder }))} menuId={menuId} onMenu={() => setMenuId(menuId === site.id ? null : site.id)} onOpen={() => navigate(`/editor/${site.id}`)} />)}</div>}
      </>}
    </main>
      </div >

    {accountPanel && <DashboardSettings panel={accountPanel} onClose={() => setAccountPanel(null)} />}
    { createOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><form className="create-modal" role="dialog" aria-modal="true" aria-label="Create a new site" onSubmit={handleCreate}><button type="button" className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Close"><X size={18} /></button><div className="modal-icon"><Sparkles size={20} /></div><p className="eyebrow">NEW PROJECT</p><h2>Create a new site</h2>{error && <p className="dashboard-error" role="alert">{error}</p>}<p className="modal-description">Give your project a name. You can customize everything in the visual editor.</p><label className="modal-label" htmlFor="site-name">Site name<input id="site-name" maxLength={120} autoFocus value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="e.g. Northstar Notes" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="primary-button" disabled={creating || !siteName.trim()}>{creating ? "Creating..." : "Create site"}</button></div></form></div>
}
    </div >
  );
}

function SiteCard({ site, canArchive, archivePending, onArchive, index, viewMode, favorite, onFavorite, folders, folder, onFolder, menuId, onMenu, onOpen }: { site: Website; canArchive: boolean; archivePending: boolean; onArchive: () => void; index: number; viewMode: ViewMode; favorite: boolean; onFavorite: () => void; folders: string[]; folder: string; onFolder: (folder: string) => void; menuId: string | null; onMenu: () => void; onOpen: () => void }) {
  const color = ["#a83bf0", "#f05d93", "#3ac7b6"][index % 3];
  return <article className={`site-card ${viewMode === "list" ? "is-list" : ""}`}><button className="site-preview" onClick={onOpen} aria-label={`Open ${site.name}`}><div className="browser-bar"><span className="browser-dot red" /><span className="browser-dot yellow" /><span className="browser-dot green" /><span className="preview-url">{site.slug || site.name}</span></div><div className="preview-body" style={{ "--site-color": color } as React.CSSProperties}><div className="preview-initials">{initials(site.name)}</div><div className="preview-line wide" /><div className="preview-line" /><div className="preview-pill" /><div className="preview-blocks"><span /><span /><span /></div></div></button><div className="site-meta"><div><h3>{site.name}</h3><p>{relativeDate(site.updatedAt || site.createdAt)}</p></div><div className="site-card-actions"><button aria-label={`Favorite ${site.name}`} aria-pressed={favorite} onClick={onFavorite}><Star size={15} fill={favorite ? "currentColor" : "none"} /></button><div className="menu-wrap"><button onClick={onMenu} aria-label={`More options for ${site.name}`}><MoreHorizontal size={16} /></button>{menuId === site.id && <div className="site-menu"><button onClick={onOpen}>Open editor</button>{canArchive && <button disabled={archivePending} onClick={onArchive}>{archivePending ? "Updating..." : site.archivedAt ? "Restore site" : "Archive site"}</button>}<label className="folder-menu-label">Move to folder<select aria-label={`Folder for ${site.name}`} value={folder} onChange={event => onFolder(event.target.value)}><option value="">All sites</option>{folders.map(name => <option key={name}>{name}</option>)}</select></label><button onClick={() => navigator.clipboard?.writeText(site.slug || site.name)}>Copy site slug</button></div>}</div></div></div></article>;
}

export default function DashboardPage(){return <NotificationProvider><DashboardContent/></NotificationProvider>;}
