import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ShieldAlert,
  Users,
  Globe,
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
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Server,
  Trash2,
} from "lucide-react";

interface SuperAdminStats {
  health: {
    status: string;
    database: { connected: boolean; latencyMs: number };
    system: { uptimeSeconds: number; memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number } };
    jobs: { queued: number; running: number; failed: number; completed: number };
  };
  totals: {
    totalUsers: number;
    newUsersToday: number;
    newUsers7Days: number;
    newUsers30Days: number;
    activeUsers: number;
    suspendedUsers: number;
    totalWebsites: number;
    draftWebsites: number;
    publishedWebsites: number;
    suspendedWebsites: number;
    recentWebsiteActivityCount: number;
    totalDeployments: number;
    failedDeployments: number;
    recentDeploymentsCount: number;
    totalOrganizations: number;
    totalWorkspaces: number;
    storageUsageMb: number;
    recentAlertsCount: number;
  };
  recentAuditLogs: Array<{
    id: string;
    action: string;
    targetResource: string;
    result: string;
    reason?: string;
    createdAt: string;
    user?: { id: string; fullName?: string; email?: string; role?: string };
  }>;
  recentDeployments: Array<{
    id: string;
    version: number;
    status: string;
    destinationType: string;
    createdAt: string;
    website?: { id: string; name: string; slug: string };
  }>;
  recentWebsites: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    moderationStatus: string;
    updatedAt: string;
    user?: { id: string; email?: string; fullName?: string };
  }>;
  timestamp: string;
  activityDefinition: string;
}

interface ManagedUser {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { websites: number };
}

interface ManagedWebsite {
  id: string;
  name: string;
  slug: string;
  status: string;
  moderationStatus: string;
  moderationReason?: string;
  moderatedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName?: string; email?: string };
  _count?: { deployments: number; revisions: number };
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

interface ManagedAuditLog {
  id: string;
  action: string;
  targetResource: string;
  actorRole?: string;
  result: string;
  reason?: string;
  correlationId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
  user?: { id: string; fullName?: string; email?: string; role?: string };
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type SuperAdminTab = "overview" | "users" | "websites" | "audit-logs" | "jobs" | "monitoring";

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Tab & Control states
  const [activeTab, setActiveTab] = useState<SuperAdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Stats
  const [stats, setStats] = useState<SuperAdminStats | null>(null);

  // Users
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [usersMeta, setUsersMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userPage, setUserPage] = useState(1);

  // Websites
  const [websitesList, setWebsitesList] = useState<ManagedWebsite[]>([]);
  const [websitesMeta, setWebsitesMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [websiteSearch, setWebsiteSearch] = useState("");
  const [websiteStatusFilter, setWebsiteStatusFilter] = useState("");
  const [websiteModerationFilter, setWebsiteModerationFilter] = useState("");
  const [websitePage, setWebsitePage] = useState(1);

  // Audit Logs
  const [auditLogsList, setAuditLogsList] = useState<ManagedAuditLog[]>([]);
  const [auditMeta, setAuditMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  // Background Jobs
  const [jobsList, setJobsList] = useState<BackgroundJobRecord[]>([]);

  // Monitoring
  const [monitoringTelemetry, setMonitoringTelemetry] = useState<any>(null);

  // Modals
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [suspensionModalUser, setSuspensionModalUser] = useState<ManagedUser | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");

  const [selectedWebsite, setSelectedWebsite] = useState<ManagedWebsite | null>(null);
  const [websiteModalOpen, setWebsiteModalOpen] = useState(false);
  const [moderationModalWebsite, setModerationModalWebsite] = useState<ManagedWebsite | null>(null);
  const [moderationReason, setModerationReason] = useState("");

  const [selectedAuditLog, setSelectedAuditLog] = useState<ManagedAuditLog | null>(null);

  // ==========================================
  // Fetch Handlers
  // ==========================================

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/admin/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load platform statistics.");
      const data = await res.json();
      setStats(data.data);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to fetch stats" });
    }
  }, [apiUrl]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(userPage),
        limit: "15",
        ...(userSearch ? { search: userSearch } : {}),
        ...(userStatusFilter ? { status: userStatusFilter } : {}),
        ...(userRoleFilter ? { role: userRoleFilter } : {}),
      });

      const res = await fetch(`${apiUrl}/api/v1/operations/admin/users?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load users list.");
      const data = await res.json();
      setUsersList(data.data || []);
      setUsersMeta(data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to load users" });
    }
  }, [apiUrl, userPage, userSearch, userStatusFilter, userRoleFilter]);

  const fetchWebsites = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(websitePage),
        limit: "15",
        ...(websiteSearch ? { search: websiteSearch } : {}),
        ...(websiteStatusFilter ? { status: websiteStatusFilter } : {}),
        ...(websiteModerationFilter ? { moderationStatus: websiteModerationFilter } : {}),
      });

      const res = await fetch(`${apiUrl}/api/v1/operations/admin/websites?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load websites list.");
      const data = await res.json();
      setWebsitesList(data.data || []);
      setWebsitesMeta(data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to load websites" });
    }
  }, [apiUrl, websitePage, websiteSearch, websiteStatusFilter, websiteModerationFilter]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(auditPage),
        limit: "25",
        ...(auditSearch ? { search: auditSearch } : {}),
        ...(auditActionFilter ? { action: auditActionFilter } : {}),
      });

      const res = await fetch(`${apiUrl}/api/v1/operations/admin/audit-logs?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load audit logs.");
      const data = await res.json();
      setAuditLogsList(data.data || []);
      setAuditMeta(data.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to load audit logs" });
    }
  }, [apiUrl, auditPage, auditSearch, auditActionFilter]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/jobs?limit=50`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load background job queue.");
      const data = await res.json();
      setJobsList(data.data || []);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to load jobs" });
    }
  }, [apiUrl]);

  const fetchMonitoring = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/admin/monitoring`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load monitoring telemetry.");
      const data = await res.json();
      setMonitoringTelemetry(data.data);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to load monitoring" });
    }
  }, [apiUrl]);

  const refreshActiveTab = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      if (activeTab === "overview") await fetchStats();
      else if (activeTab === "users") await fetchUsers();
      else if (activeTab === "websites") await fetchWebsites();
      else if (activeTab === "audit-logs") await fetchAuditLogs();
      else if (activeTab === "jobs") await fetchJobs();
      else if (activeTab === "monitoring") await fetchMonitoring();
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchStats, fetchUsers, fetchWebsites, fetchAuditLogs, fetchJobs, fetchMonitoring]);

  useEffect(() => {
    queueMicrotask(() => {
      refreshActiveTab();
    });
  }, [refreshActiveTab]);

  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      refreshActiveTab();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, refreshActiveTab]);

  // ==========================================
  // Administrative Actions
  // ==========================================

  const handleToggleUserStatus = async () => {
    if (!suspensionModalUser) return;
    const target = suspensionModalUser;
    const nextStatus = target.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoading(target.id);
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/admin/users/${target.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus, reason: suspensionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || "Failed to update user status.");

      setFeedback({
        type: "success",
        message: `User ${target.email || target.fullName} status updated to ${nextStatus}.`,
      });
      setSuspensionModalUser(null);
      setSuspensionReason("");
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Action failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleWebsiteModeration = async () => {
    if (!moderationModalWebsite) return;
    const target = moderationModalWebsite;
    const nextStatus = target.moderationStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoading(target.id);
    try {
      const res = await fetch(`${apiUrl}/api/v1/operations/admin/websites/${target.id}/moderation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ moderationStatus: nextStatus, reason: moderationReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || "Failed to update website moderation.");

      setFeedback({
        type: "success",
        message: `Website "${target.name}" moderation updated to ${nextStatus}.`,
      });
      setModerationModalWebsite(null);
      setModerationReason("");
      fetchWebsites();
      fetchStats();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Action failed." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      ...(auditSearch ? { search: auditSearch } : {}),
      ...(auditActionFilter ? { action: auditActionFilter } : {}),
    });
    window.open(`${apiUrl}/api/v1/operations/admin/audit-logs/export?${params.toString()}`, "_blank");
  };

  // Job Queue Actions
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
      fetchJobs();
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
      fetchJobs();
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
      setFeedback({ type: "success", message: `Purged completed and inactive background jobs.` });
      fetchJobs();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Purge failed" });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center font-black text-white shadow-md shadow-amber-500/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">Super Admin Control Center</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                Super Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Global Governance, Tenancy, Security & Background Jobs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Refreshed: {lastRefreshedAt || "Just now"}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="text-[11px] text-slate-400">Poll:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-slate-900 text-slate-200">Manual</option>
              <option value={15} className="bg-slate-900 text-slate-200">15s</option>
              <option value={30} className="bg-slate-900 text-slate-200">30s</option>
              <option value={60} className="bg-slate-900 text-slate-200">60s</option>
            </select>
          </div>

          <button
            onClick={refreshActiveTab}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
            title="Refresh active tab"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>

          <div className="hidden sm:flex flex-col text-right pl-2 border-l border-slate-800">
            <span className="text-xs font-semibold text-slate-200">{user?.fullName || user?.email}</span>
            <span className="text-[10px] text-amber-400 font-bold">Tier: Platform Owner</span>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-2 sticky top-[57px] z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(["overview", "users", "websites", "audit-logs", "jobs", "monitoring"] as SuperAdminTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
              }`}
            >
              {tab === "overview" && <Activity className="w-3.5 h-3.5" />}
              {tab === "users" && <Users className="w-3.5 h-3.5" />}
              {tab === "websites" && <Globe className="w-3.5 h-3.5" />}
              {tab === "audit-logs" && <FileText className="w-3.5 h-3.5" />}
              {tab === "jobs" && <Cpu className="w-3.5 h-3.5" />}
              {tab === "monitoring" && <Server className="w-3.5 h-3.5" />}
              {tab.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              feedback.type === "success"
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                : "bg-red-950/60 border-red-800 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & PLATFORM STATS                          */}
        {/* ========================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm hover:border-slate-700 transition">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Organizations</span>
                <div className="mt-3 text-3xl font-black text-white">{stats?.totals?.totalOrganizations ?? 0}</div>
                <div className="mt-2 text-xs text-slate-500">
                  {stats?.totals?.totalWorkspaces ?? 0} Workspaces registered
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm hover:border-slate-700 transition">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
                <div className="mt-3 text-3xl font-black text-white">{stats?.totals?.totalUsers ?? 0}</div>
                <div className="mt-2 text-xs text-emerald-400 font-semibold">
                  {stats?.totals?.activeUsers ?? 0} Active accounts • {stats?.totals?.suspendedUsers ?? 0} Suspended
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm hover:border-slate-700 transition">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Websites</span>
                <div className="mt-3 text-3xl font-black text-white">{stats?.totals?.totalWebsites ?? 0}</div>
                <div className="mt-2 text-xs text-blue-400 font-semibold">
                  {stats?.totals?.publishedWebsites ?? 0} Published • {stats?.totals?.draftWebsites ?? 0} Draft
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm hover:border-slate-700 transition">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">System Health</span>
                <div className="mt-3 text-2xl font-bold text-emerald-400">{stats?.health?.status || "HEALTHY"}</div>
                <div className="mt-2 text-xs text-slate-500">
                  DB Latency: {stats?.health?.database?.latencyMs ?? 0}ms • Uptime: {Math.floor((stats?.health?.system?.uptimeSeconds ?? 0) / 60)}m
                </div>
              </div>
            </section>

            {/* Platform Quick Audit Trail Snapshot */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Latest Platform Audit Trail Events
                </h2>
                <button
                  onClick={() => setActiveTab("audit-logs")}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                >
                  View Full Audit Log →
                </button>
              </div>

              <div className="divide-y divide-slate-800/60">
                {!stats?.recentAuditLogs || stats.recentAuditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No audit logs recorded yet.</p>
                ) : (
                  stats.recentAuditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-amber-400">{log.action}</span>
                        <span className="text-slate-400 ml-2">on {log.targetResource}</span>
                        <div className="text-[11px] text-slate-500">
                          By: {log.user?.email || "System"} ({log.user?.role || "SYSTEM"})
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

        {/* ========================================================= */}
        {/* TAB 2: PLATFORM USERS MANAGEMENT                          */}
        {/* ========================================================= */}
        {activeTab === "users" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Global Platform Users Directory</h2>
                <p className="text-xs text-slate-400">View, moderate, and suspend platform user accounts across all roles</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="DELETED">Deleted</option>
                </select>

                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Roles</option>
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
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
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        {loading ? "Loading users..." : "No users found matching criteria."}
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => {
                      const isSelf = u.id === user?.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-900/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-200">{u.fullName || "Unnamed User"}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email || u.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
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
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setUserModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition"
                            >
                              Details
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSuspensionModalUser(u);
                                setSuspensionReason(u.suspensionReason || "");
                              }}
                              disabled={isSelf || actionLoading === u.id}
                              title={isSelf ? "Cannot suspend your own account" : ""}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed ${
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Showing {usersList.length} of {usersMeta.total} users</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {usersMeta.page} of {usersMeta.totalPages}</span>
                <button
                  type="button"
                  disabled={userPage >= usersMeta.totalPages}
                  onClick={() => setUserPage((p) => p + 1)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PLATFORM WEBSITES                                  */}
        {/* ========================================================= */}
        {activeTab === "websites" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Global Websites Management</h2>
                <p className="text-xs text-slate-400">Inspect projects across all tenants and perform administrative moderation</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search name, slug, owner..."
                    value={websiteSearch}
                    onChange={(e) => {
                      setWebsiteSearch(e.target.value);
                      setWebsitePage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={websiteStatusFilter}
                  onChange={(e) => {
                    setWebsiteStatusFilter(e.target.value);
                    setWebsitePage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>

                <select
                  value={websiteModerationFilter}
                  onChange={(e) => {
                    setWebsiteModerationFilter(e.target.value);
                    setWebsitePage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Moderation</option>
                  <option value="ACTIVE">Moderation Active</option>
                  <option value="SUSPENDED">Moderation Suspended</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Website</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Moderation</th>
                    <th className="py-3 px-4">Deployments</th>
                    <th className="py-3 px-4">Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {websitesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        {loading ? "Loading websites..." : "No websites found."}
                      </td>
                    </tr>
                  ) : (
                    websitesList.map((site) => (
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
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              site.moderationStatus === "ACTIVE"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                : "bg-red-500/10 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {site.moderationStatus || "ACTIVE"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{site._count?.deployments ?? 0}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(site.updatedAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWebsite(site);
                              setWebsiteModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white transition text-[11px] font-semibold border border-slate-700"
                          >
                            Details
                          </button>

                          <Link
                            to={`/editor/${site.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition text-[11px] font-semibold"
                          >
                            Editor
                          </Link>

                          {site.status === "PUBLISHED" && (
                            <Link
                              to={`/site/${site.id}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white transition text-[11px] border border-slate-700"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setModerationModalWebsite(site);
                              setModerationReason(site.moderationReason || "");
                            }}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                              site.moderationStatus === "SUSPENDED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                            }`}
                          >
                            {site.moderationStatus === "SUSPENDED" ? "Reactivate" : "Suspend"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Showing {websitesList.length} of {websitesMeta.total} websites</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={websitePage <= 1}
                  onClick={() => setWebsitePage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {websitesMeta.page} of {websitesMeta.totalPages}</span>
                <button
                  type="button"
                  disabled={websitePage >= websitesMeta.totalPages}
                  onClick={() => setWebsitePage((p) => p + 1)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 4: AUDIT LOGS TRAIL                                   */}
        {/* ========================================================= */}
        {activeTab === "audit-logs" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Platform Audit Log Trail</h2>
                <p className="text-xs text-slate-400">Tamper-evident audit events with actor attribution and metadata</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search action or resource..."
                    value={auditSearch}
                    onChange={(e) => {
                      setAuditSearch(e.target.value);
                      setAuditPage(1);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="">All Actions</option>
                  <option value="USER_SUSPEND">User Suspended</option>
                  <option value="USER_REACTIVATE">User Reactivated</option>
                  <option value="WEBSITE_MODERATION_SUSPEND">Website Suspended</option>
                  <option value="WEBSITE_MODERATION_REACTIVATE">Website Reactivated</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Resource</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditLogsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                        No audit records found.
                      </td>
                    </tr>
                  ) : (
                    auditLogsList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4 font-bold text-amber-400 font-sans">{log.action}</td>
                        <td className="py-3 px-4 text-slate-300">{log.targetResource}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {log.user?.email || "System"} ({log.actorRole || log.user?.role || "SYSTEM"})
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.result === "SUCCESS" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {log.result || "SUCCESS"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-sans">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedAuditLog(log)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 font-sans">
              <span>Showing {auditLogsList.length} of {auditMeta.total} logs</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {auditMeta.page} of {auditMeta.totalPages}</span>
                <button
                  type="button"
                  disabled={auditPage >= auditMeta.totalPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 5: BACKGROUND JOBS                                    */}
        {/* ========================================================= */}
        {activeTab === "jobs" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Background Worker Job Queue</h2>
                <p className="text-xs text-slate-400 mt-0.5">Automated queue processing, retries, and scheduled executions.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePurgeJobs}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-bold transition flex items-center gap-1.5"
                  title="Remove completed and cancelled jobs from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge Completed</span>
                </button>
                <button
                  type="button"
                  onClick={fetchJobs}
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
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                        No active or historical background jobs found.
                      </td>
                    </tr>
                  ) : (
                    jobsList.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4 text-slate-400">{job.id.substring(0, 8)}...</td>
                        <td className="py-3 px-4 font-bold text-amber-400 font-sans">{job.type}</td>
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
                        <td className="py-3 px-4 text-right font-sans">
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
                            <span className="text-slate-600 text-[10px]">✓ Resolved</span>
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

        {/* ========================================================= */}
        {/* TAB 6: SYSTEM MONITORING                                  */}
        {/* ========================================================= */}
        {activeTab === "monitoring" && (
          <div className="space-y-6">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Database Status</span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400">
                    {monitoringTelemetry?.health?.database?.connected ? "Connected" : "Disconnected"}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {monitoringTelemetry?.health?.database?.latencyMs ?? 0}ms
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">PostgreSQL Primary Storage Engine</p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Server Telemetry</span>
                <div className="mt-3 text-2xl font-bold text-white">
                  {monitoringTelemetry?.serverUptimeFormatted || "Active"}
                </div>
                <p className="mt-2 text-xs text-slate-500">Node: {monitoringTelemetry?.health?.system?.nodeVersion || "v20+"}</p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Memory Allocation</span>
                <div className="mt-3 text-2xl font-bold text-amber-400">
                  {monitoringTelemetry?.health?.system?.memory?.heapUsedMb ?? 0} MB
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Heap Total: {monitoringTelemetry?.health?.system?.memory?.heapTotalMb ?? 0} MB
                </p>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODALS                                                    */}
      {/* ========================================================= */}

      {/* User Details Modal */}
      {userModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">User Account Details</h3>
              <button onClick={() => setUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono text-slate-200">{selectedUser.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Full Name:</span>
                <span className="text-slate-200 font-semibold">{selectedUser.fullName || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-200">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Role:</span>
                <span className="text-amber-400 font-bold">{selectedUser.role}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Account Status:</span>
                <span className={`font-bold ${selectedUser.status === "ACTIVE" ? "text-emerald-400" : "text-red-400"}`}>
                  {selectedUser.status}
                </span>
              </div>

              {selectedUser.status === "SUSPENDED" && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 space-y-1 text-red-300">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Suspension Metadata
                  </div>
                  <p>Reason: {selectedUser.suspensionReason || "No reason specified"}</p>
                  <p className="text-[10px] text-red-400 font-mono">
                    Suspended At: {selectedUser.suspendedAt ? new Date(selectedUser.suspendedAt).toLocaleString() : "Unknown"}
                  </p>
                </div>
              )}

              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Websites Owned:</span>
                <span className="text-slate-200 font-semibold">{selectedUser._count?.websites ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Registered:</span>
                <span className="text-slate-200">{new Date(selectedUser.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setUserModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Suspension Modal */}
      {suspensionModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {suspensionModalUser.status === "ACTIVE" ? "Suspend User Account" : "Reactivate User Account"}
                </h3>
                <p className="text-xs text-slate-400">
                  {suspensionModalUser.email || suspensionModalUser.fullName} ({suspensionModalUser.role})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {suspensionModalUser.status === "ACTIVE"
                ? "Suspending this user will immediately invalidate all active sessions, block new logins, and deny protected API access. Account and website data remain preserved."
                : "Reactivating this account will permit the user to log in again. Previously revoked sessions will not be restored automatically."}
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Reason for administrative action
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="E.g., Security policy violation, non-payment..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSuspensionModalUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleUserStatus}
                disabled={actionLoading === suspensionModalUser.id}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 ${
                  suspensionModalUser.status === "ACTIVE" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {actionLoading === suspensionModalUser.id
                  ? "Processing..."
                  : suspensionModalUser.status === "ACTIVE"
                  ? "Confirm Suspension"
                  : "Confirm Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Website Details Modal */}
      {websiteModalOpen && selectedWebsite && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Website Details</h3>
              <button onClick={() => setWebsiteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Name:</span>
                <span className="text-slate-200 font-semibold">{selectedWebsite.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Slug:</span>
                <span className="font-mono text-slate-300">/{selectedWebsite.slug}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Owner:</span>
                <span className="text-slate-200">{selectedWebsite.user?.email || "Unknown"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold">{selectedWebsite.status}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Moderation Status:</span>
                <span className={`font-bold ${selectedWebsite.moderationStatus === "ACTIVE" ? "text-blue-400" : "text-red-400"}`}>
                  {selectedWebsite.moderationStatus || "ACTIVE"}
                </span>
              </div>

              {selectedWebsite.moderationStatus === "SUSPENDED" && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs">
                  <strong>Moderation Reason:</strong> {selectedWebsite.moderationReason || "Suspended by Administrator"}
                </div>
              )}

              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Deployments:</span>
                <span className="text-slate-200">{selectedWebsite._count?.deployments ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Updated:</span>
                <span className="text-slate-200">{new Date(selectedWebsite.updatedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setWebsiteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Website Moderation Modal */}
      {moderationModalWebsite && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {moderationModalWebsite.moderationStatus === "SUSPENDED" ? "Reactivate Website" : "Suspend Website"}
                </h3>
                <p className="text-xs text-slate-400">{moderationModalWebsite.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {moderationModalWebsite.moderationStatus === "SUSPENDED"
                ? "Reactivating this website will lift publishing restrictions. Existing content will be restored to active status."
                : "Suspending this website prevents publishing new updates until reinstated by administration."}
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Moderation Reason
              </label>
              <textarea
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder="E.g., Legal dispute, abuse investigation..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModerationModalWebsite(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleWebsiteModeration}
                disabled={actionLoading === moderationModalWebsite.id}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 ${
                  moderationModalWebsite.moderationStatus === "SUSPENDED"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {actionLoading === moderationModalWebsite.id
                  ? "Processing..."
                  : moderationModalWebsite.moderationStatus === "SUSPENDED"
                  ? "Reactivate Website"
                  : "Suspend Website"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Detail Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Audit Event Details</h3>
              <button onClick={() => setSelectedAuditLog(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Action:</span>
                <span className="text-amber-400 font-bold">{selectedAuditLog.action}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Target Resource:</span>
                <span className="text-slate-200 font-mono">{selectedAuditLog.targetResource}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Actor Email:</span>
                <span className="text-slate-200">{selectedAuditLog.user?.email || "System"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Actor Role:</span>
                <span className="text-slate-200">{selectedAuditLog.actorRole || selectedAuditLog.user?.role || "SYSTEM"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Result:</span>
                <span className={selectedAuditLog.result === "SUCCESS" ? "text-emerald-400" : "text-red-400"}>
                  {selectedAuditLog.result || "SUCCESS"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-300">{new Date(selectedAuditLog.createdAt).toLocaleString()}</span>
              </div>

              {selectedAuditLog.reason && (
                <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-400">Reason:</span>
                  <span className="text-slate-300">{selectedAuditLog.reason}</span>
                </div>
              )}

              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Payload / Details:</span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedAuditLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;