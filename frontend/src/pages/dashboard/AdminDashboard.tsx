import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Globe,
  Users,
  Activity,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  HardDrive,
  Cpu,
} from "lucide-react";

interface AdminStats {
  health: {
    status: string;
    database: { connected: boolean; latencyMs: number };
    system: { uptimeSeconds: number; memory: { heapUsedMb: number; heapTotalMb: number } };
    jobs: { queued: number; running: number; failed: number; completed: number };
  };
  totals: {
    totalUsers: number;
    activeUsers: number;
    totalWebsites: number;
    publishedWebsites: number;
    totalDeployments: number;
    totalOrganizations: number;
    totalWorkspaces: number;
  };
  recentDeployments: Array<{
    id: string;
    version: number;
    status: string;
    destinationType: string;
    createdAt: string;
    website?: { id: string; name: string; slug: string };
  }>;
}

interface AdminWebsite {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName?: string; email?: string };
  _count?: { deployments: number; revisions: number };
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [websites, setWebsites] = useState<AdminWebsite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, sitesRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/operations/admin/stats`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/operations/admin/websites?limit=100`, { credentials: "include" }),
      ]);

      if (!statsRes.ok || !sitesRes.ok) {
        throw new Error("Failed to load administrative metrics.");
      }

      const statsData = await statsRes.json();
      const sitesData = await sitesRes.json();

      setStats(statsData.data);
      setWebsites(sitesData.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const filteredWebsites = websites.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20">
            F
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">ForgeStudio Admin Console</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">Platform Operations & Website Moderation</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-200">{user?.fullName || user?.email}</span>
            <span className="text-[11px] text-slate-400">Role: {user?.role}</span>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Metric Overview Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Websites</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats?.totals?.totalWebsites ?? 0}</span>
              <span className="text-xs text-emerald-400 font-semibold">
                {stats?.totals?.publishedWebsites ?? 0} Published
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {(stats?.totals?.totalWebsites ?? 0) - (stats?.totals?.publishedWebsites ?? 0)} in Draft status
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats?.totals?.totalUsers ?? 0}</span>
              <span className="text-xs text-emerald-400 font-semibold">
                {stats?.totals?.activeUsers ?? 0} Active
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">Across all registered tenants</div>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deployments</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats?.totals?.totalDeployments ?? 0}</span>
              <span className="text-xs text-slate-400 font-semibold">Processed</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">Internal, SFTP & WordPress</div>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Status</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">
                {stats?.health?.status || "HEALTHY"}
              </span>
              <span className="text-xs text-slate-400">
                {stats?.health?.database?.latencyMs ?? 0}ms DB
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Uptime: {Math.floor((stats?.health?.system?.uptimeSeconds ?? 0) / 60)} mins
            </div>
          </div>
        </section>

        {/* Website Moderation Section */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Website Projects Moderation</h2>
              <p className="text-xs text-slate-400">Overview of all websites created across the platform</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, slug, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Website</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Revisions</th>
                  <th className="py-3 px-4">Deployments</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredWebsites.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {loading ? "Loading websites..." : "No matching websites found."}
                    </td>
                  </tr>
                ) : (
                  filteredWebsites.map((site) => (
                    <tr key={site.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        <div>{site.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">/{site.slug}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {site.user?.fullName || site.user?.email || "Unknown"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            site.status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {site.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{site._count?.revisions ?? 0}</td>
                      <td className="py-3 px-4 text-slate-400">{site._count?.deployments ?? 0}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(site.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          to={`/editor/${site.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition text-[11px]"
                        >
                          Editor
                        </Link>
                        {site.status === "PUBLISHED" && (
                          <Link
                            to={`/site/${site.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white transition text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* System Diagnostics & Recent Deployments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Deployments */}
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Recent Deployment Activity
            </h2>

            <div className="space-y-2.5">
              {!stats?.recentDeployments || stats.recentDeployments.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">No recent deployment activity.</p>
              ) : (
                stats.recentDeployments.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">
                        {d.website?.name || "Website"} (v{d.version})
                      </span>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Target: {d.destinationType} • {new Date(d.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.status === "PUBLISHED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : d.status === "FAILED"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Job Queue & Diagnostics */}
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              Background Worker & Job Queue
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Queued</span>
                <p className="text-xl font-bold text-amber-400">{stats?.health?.jobs?.queued ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Running</span>
                <p className="text-xl font-bold text-blue-400">{stats?.health?.jobs?.running ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Completed</span>
                <p className="text-xl font-bold text-emerald-400">{stats?.health?.jobs?.completed ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Failed</span>
                <p className="text-xl font-bold text-red-400">{stats?.health?.jobs?.failed ?? 0}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Node.js Environment:</span>
                <span className="font-mono text-slate-300">{stats?.health?.system?.nodeVersion}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Heap Memory Used:</span>
                <span className="font-mono text-slate-300">
                  {stats?.health?.system?.memory?.heapUsedMb ?? 0} MB /{" "}
                  {stats?.health?.system?.memory?.heapTotalMb ?? 0} MB
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;