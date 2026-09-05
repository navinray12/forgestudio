import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { RoleManagerModal } from "./components/RoleManagerModal";
import { TeamSwitcher } from "./components/TeamSwitcher";
import { TeamDashboardView } from "./components/TeamDashboardView";
import DeveloperApiSettings from "./components/DeveloperApiSettings";
import PluginHub from "./components/PluginHub";
import ComposerPanel from "./components/ComposerPanel";
import CustomCodePanel from "./components/CustomCodePanel";
import AdvancedCodePanel from "./components/AdvancedCodePanel";
import CustomPostTypesPanel from "./components/CustomPostTypesPanel";
import PerformancePanel from "./components/PerformancePanel";

interface Website {
  id: string; name: string; slug: string; status: string; createdAt: string; updatedAt: string;
}

type Tab =
  | "websites"
  | "developer-api"
  | "plugin-hub"
  | "custom-code"
  | "advanced-code"
  | "cpts"
  | "composer-installation"
  | "performance";

type NavGroup = {
  label: string;
  items: { id: Tab; label: string; icon: string; badge?: string }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [
      { id: "websites", label: "My Websites", icon: "🌐" },
    ],
  },
  {
    label: "Developer Tools",
    items: [
      { id: "developer-api", label: "Developer API", icon: "🔑", badge: "F-118" },
      { id: "plugin-hub", label: "Plugin Hub", icon: "🔌", badge: "F-119/120" },
      { id: "custom-code", label: "Custom Code", icon: "⚡", badge: "F-112" },
      { id: "advanced-code", label: "Code Manager", icon: "🔧", badge: "F-113→117" },
      { id: "cpts", label: "Custom Post Types", icon: "📝", badge: "F-121" },
      { id: "composer-installation", label: "Composer", icon: "📦", badge: "F-122" },
    ],
  },
  {
    label: "Performance",
    items: [
      { id: "performance", label: "Performance & SEO", icon: "🚀", badge: "F-351→360" },
    ],
  },
];

function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [wLoading, setWLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [websiteName, setWebsiteName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [roleManagerSite, setRoleManagerSite] = useState<Website | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const query = new URLSearchParams(location.search);
  const activeTab = (query.get("tab") as Tab) || "websites";

  const setTab = (tab: Tab) => {
    navigate(tab === "websites" ? "/dashboard" : `/dashboard?tab=${tab}`);
    setSidebarOpen(false);
  };

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchWebsites = async () => {
    setWLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/websites`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.websites) setWebsites(data.websites);
    } catch { /* no-op */ }
    finally { setWLoading(false); }
  };

  useEffect(() => { fetchWebsites(); }, []);

  const handleLogout = async () => { await logout(); navigate("/login", { replace: true }); };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!websiteName.trim()) { setError("Please enter a website name."); return; }
    try {
      setCreating(true);
      const res = await fetch(`${apiUrl}/api/websites`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ name: websiteName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error?.message || data?.message || "Failed to create website."); return; }
      setIsModalOpen(false); setWebsiteName(""); navigate(`/editor/${data.website.id}`);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setCreating(false); }
  };

  const handleDeleteWebsite = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      const res = await fetch(`${apiUrl}/api/websites/${deleteTargetId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { setWebsites(p => p.filter(w => w.id !== deleteTargetId)); setDeleteTargetId(null); }
      else alert("Failed to delete website.");
    } catch { alert("Error deleting website."); }
    finally { setDeleting(false); }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "developer-api": return <DeveloperApiSettings />;
      case "plugin-hub": return <PluginHub />;
      case "custom-code": return <CustomCodePanel />;
      case "advanced-code": return <AdvancedCodePanel />;
      case "cpts": return <CustomPostTypesPanel />;
      case "composer-installation": return <ComposerPanel />;
      case "performance": return <PerformancePanel />;
      default: return <WebsitesTab />;
    }
  };

  const activeNavItem = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab);

  // ─── Websites Tab ────────────────────────────────────────────
  function WebsitesTab() {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-xl mb-3">👋</div>
              <h2 className="text-xl font-bold text-slate-900">Welcome to ForgeStudio</h2>
              <p className="mt-1 text-sm text-slate-500 max-w-lg leading-relaxed">Build, publish, and manage all your websites from one place. Use the sidebar to access Developer Tools, Performance settings, and more.</p>
            </div>
            <div className="text-center bg-slate-50 rounded-xl px-5 py-3 border border-slate-100">
              <div className="text-2xl font-black text-slate-800">{websites.length}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">Projects</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            <TeamSwitcher apiUrl={apiUrl} currentTeamId={currentTeamId} onSelectTeam={setCurrentTeamId} />
          </div>
        </div>

        {currentTeamId ? (
          <TeamDashboardView teamId={currentTeamId} apiUrl={apiUrl} onNavigateEditor={id => navigate(`/editor/${id}`)} />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Your Websites</h3>
              <button onClick={() => { setError(""); setWebsiteName(""); setIsModalOpen(true); }} className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-700 transition shadow-sm">+ New Website</button>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex flex-col gap-2 min-h-[300px]">
              {wLoading ? (
                <div className="flex items-center justify-center text-xs font-semibold text-slate-400 p-8 text-center h-64">Loading your websites…</div>
              ) : websites.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl m-2 h-64">
                  <div className="text-3xl border mb-3 border-slate-200 bg-white shadow-sm h-12 w-12 flex items-center justify-center rounded-full text-slate-400">🌐</div>
                  <h3 className="font-bold text-slate-700 text-sm">No websites yet</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4 max-w-[200px]">Create your first website to see it appear here.</p>
                  <button onClick={() => { setError(""); setWebsiteName(""); setIsModalOpen(true); }} className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-700 transition shadow-sm">+ Create Website</button>
                </div>
              ) : (
                websites.map(site => (
                  <div key={site.id} className="group flex flex-col justify-between rounded-xl border border-transparent hover:border-slate-200 bg-white p-5 hover:bg-slate-50 transition-all relative overflow-hidden">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${site.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>{site.status}</span>
                        <span className="text-[11px] font-semibold text-slate-400">{new Date(site.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-[16px] font-bold tracking-tight text-slate-800 pr-4 truncate">{site.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-400 font-mono pr-4 truncate">/{site.slug}</p>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-y-3 gap-x-2 pt-4 border-t border-slate-100/80">
                      <button onClick={() => setDeleteTargetId(site.id)} className="mr-auto inline-flex items-center px-2 py-1 text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors">Delete</button>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setRoleManagerSite(site)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm">Roles</button>
                        <button onClick={() => navigate(`/editor/${site.id}`)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11px] font-bold text-white hover:bg-slate-800 transition shadow-sm">Open Editor <span className="text-slate-400">→</span></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-slate-900 flex flex-col">

      {/* ── TOP NAV ──────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect y="3" width="18" height="1.5" rx="1" fill="#64748b" /><rect y="8.25" width="18" height="1.5" rx="1" fill="#64748b" /><rect y="13.5" width="18" height="1.5" rx="1" fill="#64748b" /></svg>
            </button>
            <Link to="/dashboard" className="text-base font-black tracking-tight text-slate-900">ForgeStudio</Link>
            <span className="hidden sm:inline text-slate-300 text-lg font-light">/</span>
            <span className="hidden sm:inline text-sm font-semibold text-slate-500">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/subscriptions" className="hidden sm:inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm">⭐ Subscription</Link>
            <button onClick={handleLogout} className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition shadow-sm">Logout</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 mx-auto w-full max-w-[1400px] px-4 sm:px-8 py-6 gap-6">

        {/* ── SIDEBAR ────────────────────────── */}
        {sidebarOpen && <div className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        <aside className={`
          fixed lg:static top-14 left-0 z-20 h-[calc(100vh-3.5rem)] lg:h-auto
          w-60 shrink-0 bg-white lg:bg-transparent border-r lg:border-0 border-slate-200
          transform transition-transform duration-200 overflow-y-auto
          ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0"}
          flex flex-col gap-4 p-4 lg:p-0
        `}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 px-3 pb-1.5 mb-1">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setTab(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${isActive ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"}`}
                    >
                      <span className="text-sm leading-none">{item.icon}</span>
                      <span className="text-xs font-bold flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* ── MAIN CONTENT ───────────────────── */}
        <main className="flex-1 min-w-0">
          {activeNavItem && (
            <div className="mb-5 flex items-center gap-2">
              <span className="text-xl">{activeNavItem?.icon}</span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">{activeNavItem?.label}</h1>
                {activeNavItem?.badge && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{activeNavItem.badge}</p>}
              </div>
            </div>
          )}
          {renderContent()}
        </main>
      </div>

      {/* ── CREATE WEBSITE MODAL ─────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-7 shadow-2xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Create New Website</h2>
            <p className="mt-1.5 text-xs text-slate-500">Enter a name for your new website.</p>
            {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">{error}{error.includes("upgrade") && <div className="mt-2"><Link to="/subscriptions" className="font-bold underline">Upgrade plan →</Link></div>}</div>}
            <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
              <input id="websiteName" type="text" value={websiteName} onChange={e => setWebsiteName(e.target.value)} placeholder="My New Website" autoFocus className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 shadow-sm" />
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={creating} className="h-10 rounded-xl px-4 text-xs font-bold text-slate-500 hover:bg-slate-100 transition">Cancel</button>
                <button type="submit" disabled={creating} className="h-10 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50">{creating ? "Creating..." : "Create Website"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ─────────────────────── */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[380px] rounded-2xl bg-white p-7 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Delete Website?</h3>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">This action cannot be undone.</p>
            <div className="mt-8 flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTargetId(null)} disabled={deleting} className="h-9 rounded-xl px-4 text-[11px] font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button onClick={handleDeleteWebsite} disabled={deleting} className="h-9 rounded-xl bg-white border border-red-200 px-4 text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">{deleting ? "Deleting…" : "Delete Website"}</button>
            </div>
          </div>
        </div>
      )}

      {roleManagerSite && (
        <RoleManagerModal websiteId={roleManagerSite.id} websiteName={roleManagerSite.name} onClose={() => setRoleManagerSite(null)} apiUrl={apiUrl} />
      )}
    </div>
  );
}

export default UserDashboard;