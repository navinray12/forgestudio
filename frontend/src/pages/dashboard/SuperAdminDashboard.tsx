import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AiInfrastructurePanel from "./components/AiInfrastructurePanel";
import {
  ShieldAlert,
  Users,
  Building,
  Activity,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Play,
  RotateCcw,
  Layers,
  Cpu,
  FileText,
} from "lucide-react";

interface SuperAdminStats {
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
  recentAuditLogs: Array<{
    id: string;
    action: string;
    targetResource: string;
    details?: any;
    ipAddress?: string;
    createdAt: string;
    user?: { id: string; fullName?: string; email?: string };
  }>;
}

interface ManagedUser {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  lastLoginAt?: string;
  createdAt: string;
  _count?: { websites: number };
}

interface BackgroundJobRecord {
  id: string;
  type: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  runAt: string;
  createdAt: string;
}

interface AIInfrastructure {
  providers: Array<{ provider: string; credentialConfigured: boolean; health: string }>;
  routes: Array<{
    feature: string; provider: string | null; model: string | null; enabled: boolean;
    fallbackModels: string[]; timeoutMs: number; maxOutputTokens: number;
    source: "DATABASE" | "ENVIRONMENT"; credentialConfigured: boolean;
  }>;
}
interface StudioObservability {
  requests:number;errors:number;errorRate:number;generatedAt:string;scope:string;
  routes:Array<{route:string;count:number;errors:number;errorRate:number;p50Ms:number;p95Ms:number;p99Ms:number;lastStatus:number;lastSeen:string}>;
}

type SuperAdminTab = "overview" | "users" | "audit-logs" | "jobs" | "ai-infrastructure" | "observability";

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [activeTab, setActiveTab] = useState<SuperAdminTab>("overview");
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [jobsList, setJobsList] = useState<BackgroundJobRecord[]>([]);
  const [aiInfrastructure, setAiInfrastructure] = useState<AIInfrastructure | null>(null);
  const [studioObservability, setStudioObservability] = useState<StudioObservability | null>(null);
  const [routeDrafts, setRouteDrafts] = useState<Record<string, AIInfrastructure["routes"][number]>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchPlatformData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [statsRes, usersRes, jobsRes, aiRes, observabilityRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/operations/admin/stats`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/operations/admin/users?limit=100`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/operations/jobs?limit=50`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/operations/admin/ai-infrastructure`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/operations/admin/studio-observability`, { credentials: "include" }),
      ]);

      if (!statsRes.ok || !usersRes.ok) {
        throw new Error("Failed to load platform data. Please check authentication and role.");
      }

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const jobsData = jobsRes.ok ? await jobsRes.json() : { data: [] };
      const aiData = aiRes.ok ? await aiRes.json() : { data: null };
      const observabilityData = observabilityRes.ok ? await observabilityRes.json() : { data: null };

      setStats(statsData.data);
      setUsersList(usersData.data || []);
      setJobsList(jobsData.data || []);
      setAiInfrastructure(aiData.data);
      setStudioObservability(observabilityData.data);
      if (aiData.data?.routes) setRouteDrafts(Object.fromEntries(aiData.data.routes.map((route: AIInfrastructure["routes"][number]) => [route.feature, route])));
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to load dashboard." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleUserStatus = async (targetUser: ManagedUser) => {
    const nextStatus = targetUser.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoading(targetUser.id);
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/admin/users/${targetUser.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update user status.");

      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
      );
      setFeedback({ type: "success", message: `User status changed to ${nextStatus}` });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Action failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/jobs/${jobId}/retry`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to retry job");
      setFeedback({ type: "success", message: `Job ${jobId.substring(0, 8)} queued for retry` });
      fetchPlatformData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Retry failed" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!window.confirm("Cancel this background job?")) return;
    setActionLoading(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: "Cancelled by SuperAdmin" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel job");
      setFeedback({ type: "success", message: `Job ${jobId.substring(0, 8)} cancelled` });
      fetchPlatformData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Cancel failed" });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurgeJobs = async () => {
    if (!window.confirm("Purge all completed and cancelled background jobs from history?")) return;
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/jobs/purge`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to purge jobs");
      setFeedback({ type: "success", message: `Purged ${data.data?.purgedCount || 0} completed jobs.` });
      fetchPlatformData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Purge failed" });
    }
  };

  const handleSaveAIRoute = async (feature: string) => {
    const route = routeDrafts[feature];
    if (!route || !route.provider || !route.model) {
      setFeedback({ type: "error", message: "Provider and model are required." });
      return;
    }
    setActionLoading(`ai:${feature}`);
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/admin/ai-infrastructure/routes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          feature,
          provider: route.provider,
          model: route.model,
          fallbackModels: route.fallbackModels,
          timeoutMs: route.timeoutMs,
          maxOutputTokens: route.maxOutputTokens,
          enabled: route.enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || "Failed to update AI routing policy.");
      setFeedback({ type: "success", message: `${feature} routing policy updated` });
      await fetchPlatformData();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "AI routing update failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const filteredUsers = usersList.filter(
    (u) =>
      (u.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center font-black text-white shadow-md shadow-amber-500/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">Super Admin Control Center</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">Global Governance, Tenancy, Security & Jobs</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-200">{user?.fullName || user?.email}</span>
            <span className="text-[11px] text-amber-400 font-semibold">Tier: Super Admin (Platform Owner)</span>
          </div>

          <button
            onClick={fetchPlatformData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Refresh Platform Metrics"
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

      {/* Tab Navigation */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-2">
        <div className="max-w-7xl mx-auto flex gap-2">
          {(["overview", "users", "audit-logs", "jobs", "ai-infrastructure", "observability"] as SuperAdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition flex items-center gap-2 ${
                activeTab === tab
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {tab === "overview" && <Activity className="w-3.5 h-3.5" />}
              {tab === "users" && <Users className="w-3.5 h-3.5" />}
              {tab === "audit-logs" && <FileText className="w-3.5 h-3.5" />}
              {tab === "jobs" && <Cpu className="w-3.5 h-3.5" />}
              {tab === "ai-infrastructure" && <Cpu className="w-3.5 h-3.5" />}
              {tab === "ai-infrastructure" && <Cpu className="w-3.5 h-3.5" />}
              {tab === "observability" && <Activity className="w-3.5 h-3.5" />}
              {tab.replaceAll("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
              feedback.type === "success"
                ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
                : "bg-red-950/50 border-red-800 text-red-300"
            }`}
          >
            {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Organizations</span>
                <div className="mt-3 text-3xl font-black text-white">{stats?.totals?.totalOrganizations ?? 0}</div>
                <div className="mt-2 text-xs text-slate-500">{stats?.totals?.totalWorkspaces ?? 0} Workspaces registered</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</span>
                <div className="mt-3 text-3xl font-black text-white">{stats?.totals?.totalUsers ?? 0}</div>
                <div className="mt-2 text-xs text-emerald-400 font-semibold">{stats?.totals?.activeUsers ?? 0} Active accounts</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Websites</span>
                <div className="mt-3 text-3xl font-black text-white">{stats?.totals?.totalWebsites ?? 0}</div>
                <div className="mt-2 text-xs text-blue-400 font-semibold">{stats?.totals?.publishedWebsites ?? 0} Published sites</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Health</span>
                <div className="mt-3 text-2xl font-bold text-emerald-400">{stats?.health?.status || "HEALTHY"}</div>
                <div className="mt-2 text-xs text-slate-500">DB Latency: {stats?.health?.database?.latencyMs ?? 0}ms</div>
              </div>
            </section>

            {/* Quick Audit Trail Snapshot */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Latest Platform Audit Trail Events
              </h2>
              <div className="divide-y divide-slate-800">
                {!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No audit logs recorded yet.</p>
                ) : (
                  stats.recentAuditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-amber-400">{log.action}</span>
                        <span className="text-slate-400 ml-2">on {log.targetResource}</span>
                        <div className="text-[11px] text-slate-500">
                          By: {log.user?.email || "System"} • IP: {log.ipAddress || "Localhost"}
                        </div>
                      </div>
                      <span className="text-slate-500 text-[11px]">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Platform Users Management</h2>
                <p className="text-xs text-slate-400">View, moderate, and suspend platform user accounts</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Global Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Websites Owned</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        {loading ? "Loading users..." : "No users found."}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{u.fullName || "Unnamed User"}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{u.email || u.phone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/10 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{u._count?.websites ?? 0}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={actionLoading === u.id || u.role === "SUPER_ADMIN"}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-30 ${
                              u.status === "ACTIVE"
                                ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            }`}
                          >
                            {u.status === "ACTIVE" ? <Ban className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* AUDIT LOGS TAB */}
        {activeTab === "audit-logs" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight">System Audit Log Trail</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Resource</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No audit records found.
                      </td>
                    </tr>
                  ) : (
                    stats.recentAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4 font-bold text-amber-400">{log.action}</td>
                        <td className="py-3 px-4 text-slate-300">{log.targetResource}</td>
                        <td className="py-3 px-4 text-slate-400">{log.user?.email || "System"}</td>
                        <td className="py-3 px-4 text-slate-500">{log.ipAddress || "127.0.0.1"}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "ai-infrastructure" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-bold text-white">AI Infrastructure</h2>
              <p className="text-xs text-slate-400 mt-1">Approved provider/model routing. Credentials remain in deployment secrets and are never returned by this API.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                {(aiInfrastructure?.providers || []).map((provider) => (
                  <div key={provider.provider} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between">
                      <strong className="capitalize text-slate-100">{provider.provider}</strong>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${provider.credentialConfigured ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{provider.health}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">{provider.credentialConfigured ? "Credential is configured in the backend secret environment." : "No backend credential is configured."}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Model routing</h3>
                <p className="text-xs text-slate-400">Database policy takes precedence over environment defaults. Fallback entries use provider:model syntax.</p>
              </div>
              {(aiInfrastructure?.routes || []).map((route) => {
                const draft = routeDrafts[route.feature] || route;
                return <div key={route.feature} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div><strong className="text-sm text-white">{route.feature}</strong><div className="text-[10px] text-slate-500">Source: {route.source} · credential {route.credentialConfigured ? "configured" : "missing"}</div></div>
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={draft.enabled} onChange={e=>setRouteDrafts(prev=>({...prev,[route.feature]:{...draft,enabled:e.target.checked}}))}/> Enabled</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="text-xs text-slate-400">Provider<select value={draft.provider || ""} onChange={e=>setRouteDrafts(prev=>({...prev,[route.feature]:{...draft,provider:e.target.value}}))} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"><option value="">Select</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select></label>
                    <label className="text-xs text-slate-400">Model<input value={draft.model || ""} onChange={e=>setRouteDrafts(prev=>({...prev,[route.feature]:{...draft,model:e.target.value}}))} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"/></label>
                    <label className="text-xs text-slate-400">Timeout ms<input type="number" min={1000} max={180000} value={draft.timeoutMs} onChange={e=>setRouteDrafts(prev=>({...prev,[route.feature]:{...draft,timeoutMs:Number(e.target.value)}}))} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"/></label>
                    <label className="text-xs text-slate-400">Max output tokens<input type="number" min={64} max={100000} value={draft.maxOutputTokens} onChange={e=>setRouteDrafts(prev=>({...prev,[route.feature]:{...draft,maxOutputTokens:Number(e.target.value)}}))} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"/></label>
                  </div>
                  <label className="block text-xs text-slate-400">Fallback models<input value={(draft.fallbackModels || []).join(", ")} onChange={e=>setRouteDrafts(prev=>({...prev,[route.feature]:{...draft,fallbackModels:e.target.value.split(",").map(v=>v.trim()).filter(Boolean)}}))} placeholder="openai:model-a, anthropic:model-b" className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100"/></label>
                  <div className="flex justify-end"><button type="button" onClick={()=>handleSaveAIRoute(route.feature)} disabled={actionLoading===`ai:${route.feature}`} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold disabled:opacity-50">{actionLoading===`ai:${route.feature}` ? "Saving..." : "Save routing policy"}</button></div>
                </div>;
              })}
            </div>
          </section>
        )}

        {activeTab === "observability" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="text-xs uppercase tracking-wider text-slate-400">Studio requests</div><div className="mt-2 text-3xl font-black text-white">{studioObservability?.requests ?? 0}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="text-xs uppercase tracking-wider text-slate-400">Server errors</div><div className="mt-2 text-3xl font-black text-rose-400">{studioObservability?.errors ?? 0}</div></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="text-xs uppercase tracking-wider text-slate-400">Error rate</div><div className="mt-2 text-3xl font-black text-amber-400">{studioObservability?.errorRate ?? 0}%</div></div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-bold text-white">Studio route telemetry</h2><p className="text-xs text-slate-400">Per-process bounded metrics. Aggregate replicas in the deployment telemetry backend for global SLOs.</p></div><span className="text-[10px] font-bold text-slate-500">{studioObservability?.scope || "PROCESS"}</span></div>
              <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400 uppercase text-[10px]"><tr><th className="p-3">Route</th><th className="p-3">Requests</th><th className="p-3">Errors</th><th className="p-3">p50</th><th className="p-3">p95</th><th className="p-3">p99</th><th className="p-3">Last</th></tr></thead><tbody className="divide-y divide-slate-800">{(studioObservability?.routes || []).map(route=><tr key={route.route}><td className="p-3 font-mono text-slate-300">{route.route}</td><td className="p-3">{route.count}</td><td className="p-3">{route.errors} ({route.errorRate}%)</td><td className="p-3">{route.p50Ms}ms</td><td className="p-3">{route.p95Ms}ms</td><td className="p-3">{route.p99Ms}ms</td><td className="p-3 text-slate-500">{route.lastStatus}</td></tr>)}</tbody></table></div>
            </div>
          </section>
        )}

        {activeTab === "ai-infrastructure" && <AiInfrastructurePanel apiUrl={apiUrl} />}

        {/* JOBS TAB */}
        {activeTab === "jobs" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Background Worker Job Queue</h2>
                <p className="text-xs text-slate-400 mt-0.5">Automated queue processing, retries, and scheduled executions.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePurgeJobs}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-bold transition"
                  title="Remove completed and cancelled jobs from history"
                >
                  🧹 Purge Completed
                </button>
                <button
                  type="button"
                  onClick={fetchPlatformData}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Job ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4">Scheduled Run At</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {jobsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No active or historical background jobs found.
                      </td>
                    </tr>
                  ) : (
                    jobsList.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4 text-slate-400">{job.id.substring(0, 8)}...</td>
                        <td className="py-3 px-4 font-bold text-blue-400">{job.type}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              job.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : job.status === "FAILED"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {job.attempts} / {job.maxAttempts}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{new Date(job.runAt).toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(job.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          {job.status === "FAILED" && (
                            <button
                              type="button"
                              onClick={() => handleRetryJob(job.id)}
                              disabled={actionLoading === job.id}
                              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] border border-amber-500/30 transition disabled:opacity-50"
                            >
                              {actionLoading === job.id ? "Retrying..." : "Retry"}
                            </button>
                          )}
                          {(job.status === "QUEUED" || job.status === "RUNNING") && (
                            <button
                              type="button"
                              onClick={() => handleCancelJob(job.id)}
                              disabled={actionLoading === job.id}
                              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[10px] border border-rose-500/30 transition disabled:opacity-50"
                            >
                              {actionLoading === job.id ? "Cancelling..." : "Cancel"}
                            </button>
                          )}
                          {job.status === "COMPLETED" && (
                            <span className="text-slate-600 text-[10px] font-sans">✓ Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default SuperAdminDashboard;