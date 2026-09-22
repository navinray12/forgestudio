/**
 * @file Admin Dashboard: Comprehensive administrative control console for ForgeStudio.
 */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { DashboardShell, type NavGroup } from "./components/DashboardShell";
import {
  Users,
  Globe,
  CreditCard,
  FileCode,
  ShieldCheck,
  Activity,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Ban,
  MoreVertical,
  ExternalLink,
  Plus,
  BarChart3,
  Server,
  Layers,
} from "lucide-react";

type AdminTab = "overview" | "users" | "subscriptions" | "audit" | "plugins";

interface UserRecord {
  id: string;
  fullName: string | null;
  email: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  emailVerified: boolean;
  websiteCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PlanOverview {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  websiteLimit: number;
  storageLimitMb: number;
  activeSubscribers: number;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);

  // Mock initial administrative telemetry / data
  const [stats, setStats] = useState({
    totalUsers: 142,
    activeWebsites: 318,
    monthlyRevenue: "₹1,24,500",
    systemStatus: "Healthy (99.98% Uptime)",
  });

  const [usersList, setUsersList] = useState<UserRecord[]>([
    {
      id: "u-1",
      fullName: "Alex Rivera",
      email: "alex.rivera@agency.io",
      role: "USER",
      status: "ACTIVE",
      emailVerified: true,
      websiteCount: 8,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      createdAt: "2026-01-10T10:00:00Z",
    },
    {
      id: "u-2",
      fullName: "Priya Sharma",
      email: "priya@designs.co",
      role: "USER",
      status: "ACTIVE",
      emailVerified: true,
      websiteCount: 14,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      createdAt: "2026-02-01T12:30:00Z",
    },
    {
      id: "u-3",
      fullName: "Marcus Vance",
      email: "marcus@enterprise.net",
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      websiteCount: 4,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      createdAt: "2025-11-20T08:00:00Z",
    },
    {
      id: "u-4",
      fullName: "Elena Rostova",
      email: "elena.r@suspicious.test",
      role: "USER",
      status: "SUSPENDED",
      emailVerified: false,
      websiteCount: 1,
      lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      createdAt: "2026-03-01T09:15:00Z",
    },
  ]);

  const [plans, setPlans] = useState<PlanOverview[]>([
    {
      id: "p-free",
      name: "Starter / Free",
      slug: "free",
      price: 0,
      currency: "INR",
      websiteLimit: 1,
      storageLimitMb: 100,
      activeSubscribers: 84,
    },
    {
      id: "p-pro",
      name: "Designer Pro",
      slug: "pro",
      price: 1499,
      currency: "INR",
      websiteLimit: 10,
      storageLimitMb: 5000,
      activeSubscribers: 42,
    },
    {
      id: "p-agency",
      name: "Agency Scale",
      slug: "agency",
      price: 4999,
      currency: "INR",
      websiteLimit: 50,
      storageLimitMb: 25000,
      activeSubscribers: 16,
    },
  ]);

  const [auditEvents] = useState([
    {
      id: "aud-1",
      action: "USER_LOGIN_SUCCESS",
      resource: "Session",
      actor: "alex.rivera@agency.io",
      ip: "103.21.244.18",
      timestamp: "10 mins ago",
    },
    {
      id: "aud-2",
      action: "WEBSITE_PUBLISH",
      resource: "Website (portfolio-v2)",
      actor: "priya@designs.co",
      ip: "49.207.180.9",
      timestamp: "1 hour ago",
    },
    {
      id: "aud-3",
      action: "WORKSPACE_INVITE_SENT",
      resource: "Workspace (Studio Alpha)",
      actor: "marcus@enterprise.net",
      ip: "157.240.198.35",
      timestamp: "3 hours ago",
    },
    {
      id: "aud-4",
      action: "ACCOUNT_SUSPENDED",
      resource: "User (elena.r@suspicious.test)",
      actor: "System Security Guard",
      ip: "127.0.0.1",
      timestamp: "1 day ago",
    },
  ]);

  const navGroups: NavGroup[] = [
    {
      label: "Administration",
      items: [
        {
          id: "overview",
          label: "Platform Overview",
          icon: <Activity className="w-4 h-4" />,
          onClick: () => setActiveTab("overview"),
        },
        {
          id: "users",
          label: "User Management",
          icon: <Users className="w-4 h-4" />,
          badge: `${usersList.length}`,
          onClick: () => setActiveTab("users"),
        },
        {
          id: "subscriptions",
          label: "Subscription Plans",
          icon: <CreditCard className="w-4 h-4" />,
          onClick: () => setActiveTab("subscriptions"),
        },
      ],
    },
    {
      label: "Governance & Security",
      items: [
        {
          id: "audit",
          label: "Audit Logs",
          icon: <ShieldCheck className="w-4 h-4" />,
          onClick: () => setActiveTab("audit"),
        },
        {
          id: "plugins",
          label: "Plugin Registry",
          icon: <Layers className="w-4 h-4" />,
          onClick: () => setActiveTab("plugins"),
        },
      ],
    },
  ];

  const handleToggleUserStatus = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardShell
      title="Admin Management Console"
      subtitle="Operational oversight, user account management, and tenant governance"
      activeTab={activeTab}
      navGroups={navGroups}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLoading(true)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      }
    >
      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-white">{stats.totalUsers}</h3>
                <p className="text-xs text-emerald-400 mt-1 font-medium">↑ +12% from last month</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Websites</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-white">{stats.activeWebsites}</h3>
                <p className="text-xs text-emerald-400 mt-1 font-medium">↑ +24 new this week</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Monthly MRR</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-white">{stats.monthlyRevenue}</h3>
                <p className="text-xs text-emerald-400 mt-1 font-medium">↑ +18.4% MRR Growth</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Engine Health</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Server className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-base font-bold text-emerald-400">{stats.systemStatus}</h3>
                <p className="text-xs text-slate-400 mt-1">All worker clusters operational</p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-800/60 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Recent Security & Audit Trail
                </h2>
                <button
                  onClick={() => setActiveTab("audit")}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  View all →
                </button>
              </div>
              <div className="divide-y divide-slate-700/50">
                {auditEvents.map((evt) => (
                  <div key={evt.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-200">{evt.action}</span>
                      <span className="text-slate-400 ml-2">on {evt.resource}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">By {evt.actor} • IP: {evt.ip}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">{evt.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Quick Actions
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab("users")}
                  className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center justify-between"
                >
                  <span>Manage User Accounts</span>
                  <span className="text-slate-400">→</span>
                </button>
                <button
                  onClick={() => setActiveTab("subscriptions")}
                  className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center justify-between"
                >
                  <span>Review Subscription Tiers</span>
                  <span className="text-slate-400">→</span>
                </button>
                <Link
                  to="/dashboard"
                  className="w-full text-left p-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium text-indigo-300 transition flex items-center justify-between"
                >
                  <span>Switch to Designer Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: USER MANAGEMENT ================= */}
      {activeTab === "users" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Websites</th>
                    <th className="p-4">Last Login</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                            {u.fullName?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{u.fullName || "Nameless User"}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            <Ban className="w-3.5 h-3.5" /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold">{u.websiteCount}</td>
                      <td className="p-4 text-slate-400">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(u.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            u.status === "ACTIVE"
                              ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                          }`}
                        >
                          {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SUBSCRIPTION PLANS ================= */}
      {activeTab === "subscriptions" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300">
                      {p.activeSubscribers} Subscribers
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">
                      {p.price === 0 ? "Free" : `₹${p.price}`}
                    </span>
                    {p.price > 0 && <span className="text-xs text-slate-400">/ month</span>}
                  </div>
                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      Up to {p.websiteLimit} Hosted Websites
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      {p.storageLimitMb >= 1000 ? `${p.storageLimitMb / 1000} GB` : `${p.storageLimitMb} MB`} Media Storage
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                      Elementor Compatibility Engine
                    </li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Slug: {p.slug}</span>
                  <span className="text-emerald-400 font-semibold">Active Tier</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: AUDIT LOGS ================= */}
      {activeTab === "audit" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
            <h3 className="text-base font-bold text-white mb-4">Platform Audit Stream</h3>
            <div className="divide-y divide-slate-700/60">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-indigo-400">{evt.action}</span>
                    <span className="text-slate-300 ml-2 font-medium">Target: {evt.resource}</span>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-4">
                      <span>Actor: {evt.actor}</span>
                      <span>IP: {evt.ip}</span>
                    </div>
                  </div>
                  <span className="text-slate-400 font-medium">{evt.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: PLUGINS ================= */}
      {activeTab === "plugins" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
            <h3 className="text-base font-bold text-white mb-2">WordPress Plugin Compatibility Matrix</h3>
            <p className="text-xs text-slate-400 mb-6">
              Verified compatibility status for third-party WordPress and WooCommerce extensions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {[
                { name: "Advanced Custom Fields (ACF)", status: "VERIFIED_COMPATIBLE", cat: "Custom Fields" },
                { name: "WooCommerce Core", status: "VERIFIED_COMPATIBLE", cat: "E-Commerce" },
                { name: "Yoast SEO", status: "VERIFIED_COMPATIBLE", cat: "SEO" },
                { name: "Elementor Pro Addons", status: "SUPPORTED", cat: "Builder" },
                { name: "Pods Framework", status: "SUPPORTED", cat: "Custom Fields" },
                { name: "Contact Form 7", status: "VERIFIED_COMPATIBLE", cat: "Forms" },
              ].map((p, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white">{p.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Category: {p.cat}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default AdminDashboard;