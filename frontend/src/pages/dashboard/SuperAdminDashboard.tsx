/**
 * @file Super Admin Dashboard: Enterprise tenant governance, multi-workspace directory, and support grant controls.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { DashboardShell, type NavGroup } from "./components/DashboardShell";
import {
  Building2,
  Layers,
  ShieldAlert,
  KeyRound,
  Cpu,
  Globe2,
  HardDrive,
  Users,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  Activity,
  Server,
  Zap,
} from "lucide-react";

type SuperAdminTab = "organizations" | "workspaces" | "support-grants" | "infrastructure";

interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  workspaceCount: number;
  totalSites: number;
  createdAt: string;
}

interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  orgName: string;
  isPersonal: boolean;
  memberCount: number;
  siteCount: number;
  createdAt: string;
}

interface SupportGrantRecord {
  id: string;
  workspaceName: string;
  requestedBy: string;
  grantee: string;
  reason: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  expiresAt: string;
}

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>("organizations");
  const [searchQuery, setSearchQuery] = useState("");

  const [orgs, setOrgs] = useState<OrganizationRecord[]>([
    {
      id: "org-1",
      name: "PixelCraft Agency Group",
      slug: "pixelcraft",
      ownerEmail: "alex.rivera@agency.io",
      workspaceCount: 3,
      totalSites: 28,
      createdAt: "2025-10-15T00:00:00Z",
    },
    {
      id: "org-2",
      name: "Nordic Commerce Labs",
      slug: "nordic-labs",
      ownerEmail: "marcus@enterprise.net",
      workspaceCount: 5,
      totalSites: 45,
      createdAt: "2025-12-01T00:00:00Z",
    },
    {
      id: "org-3",
      name: "Solopreneur Hub",
      slug: "solopreneur",
      ownerEmail: "priya@designs.co",
      workspaceCount: 1,
      totalSites: 12,
      createdAt: "2026-01-20T00:00:00Z",
    },
  ]);

  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([
    {
      id: "ws-1",
      name: "Production Client Sites",
      slug: "pixelcraft-prod",
      orgName: "PixelCraft Agency Group",
      isPersonal: false,
      memberCount: 8,
      siteCount: 19,
      createdAt: "2025-10-16T00:00:00Z",
    },
    {
      id: "ws-2",
      name: "Staging Sandbox",
      slug: "pixelcraft-staging",
      orgName: "PixelCraft Agency Group",
      isPersonal: false,
      memberCount: 5,
      siteCount: 9,
      createdAt: "2025-11-04T00:00:00Z",
    },
    {
      id: "ws-3",
      name: "Nordic Flagship Store Sites",
      slug: "nordic-flagship",
      orgName: "Nordic Commerce Labs",
      isPersonal: false,
      memberCount: 12,
      siteCount: 31,
      createdAt: "2025-12-05T00:00:00Z",
    },
    {
      id: "ws-4",
      name: "Priya Personal Workspace",
      slug: "priya-personal",
      orgName: "Solopreneur Hub",
      isPersonal: true,
      memberCount: 1,
      siteCount: 12,
      createdAt: "2026-01-20T00:00:00Z",
    },
  ]);

  const [grants, setGrants] = useState<SupportGrantRecord[]>([
    {
      id: "sg-1",
      workspaceName: "Production Client Sites",
      requestedBy: "alex.rivera@agency.io",
      grantee: "Tier 3 Platform Engineer",
      reason: "Troubleshoot WordPress SFTP reconciliation timeout",
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    },
    {
      id: "sg-2",
      workspaceName: "Nordic Flagship Store Sites",
      requestedBy: "marcus@enterprise.net",
      grantee: "Security Auditor",
      reason: "Custom Code revision verification",
      status: "EXPIRED",
      expiresAt: "2026-03-10T18:00:00Z",
    },
  ]);

  const navGroups: NavGroup[] = [
    {
      label: "Tenant Governance",
      items: [
        {
          id: "organizations",
          label: "Organizations",
          icon: <Building2 className="w-4 h-4" />,
          badge: `${orgs.length}`,
          onClick: () => setActiveTab("organizations"),
        },
        {
          id: "workspaces",
          label: "Workspaces Directory",
          icon: <Layers className="w-4 h-4" />,
          badge: `${workspaces.length}`,
          onClick: () => setActiveTab("workspaces"),
        },
      ],
    },
    {
      label: "Security & Operations",
      items: [
        {
          id: "support-grants",
          label: "Support Grants",
          icon: <KeyRound className="w-4 h-4" />,
          badge: `${grants.filter((g) => g.status === "ACTIVE").length}`,
          onClick: () => setActiveTab("support-grants"),
        },
        {
          id: "infrastructure",
          label: "Infrastructure Health",
          icon: <Cpu className="w-4 h-4" />,
          onClick: () => setActiveTab("infrastructure"),
        },
      ],
    },
  ];

  const handleRevokeGrant = (grantId: string) => {
    setGrants((prev) =>
      prev.map((g) => (g.id === grantId ? { ...g, status: "REVOKED" } : g))
    );
  };

  return (
    <DashboardShell
      title="Super Admin Governance Center"
      subtitle="Multi-tenant isolation, cross-organization governance, and platform support authority"
      activeTab={activeTab}
      navGroups={navGroups}
    >
      {/* ================= TAB 1: ORGANIZATIONS ================= */}
      {activeTab === "organizations" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500 w-64"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="p-4">Organization</th>
                    <th className="p-4">Owner Email</th>
                    <th className="p-4">Workspaces</th>
                    <th className="p-4">Total Websites</th>
                    <th className="p-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {orgs
                    .filter((o) => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-white">{o.name}</p>
                              <p className="text-[11px] text-slate-400">slug: {o.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-slate-300">{o.ownerEmail}</td>
                        <td className="p-4 font-bold text-indigo-400">{o.workspaceCount}</td>
                        <td className="p-4 font-bold text-emerald-400">{o.totalSites}</td>
                        <td className="p-4 text-slate-400">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: WORKSPACES ================= */}
      {activeTab === "workspaces" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="p-4">Workspace</th>
                    <th className="p-4">Parent Org</th>
                    <th className="p-4">Scope Type</th>
                    <th className="p-4">Members</th>
                    <th className="p-4">Websites</th>
                    <th className="p-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {workspaces.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <Layers className="w-4 h-4 text-indigo-400" />
                          <span className="font-bold text-white">{w.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">{w.orgName}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            w.isPersonal
                              ? "bg-slate-700 text-slate-300"
                              : "bg-indigo-500/20 text-indigo-300"
                          }`}
                        >
                          {w.isPersonal ? "Personal" : "Enterprise Org"}
                        </span>
                      </td>
                      <td className="p-4 font-semibold">{w.memberCount}</td>
                      <td className="p-4 font-semibold text-emerald-400">{w.siteCount}</td>
                      <td className="p-4 text-slate-400">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SUPPORT GRANTS ================= */}
      {activeTab === "support-grants" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-purple-900/20 border border-purple-800/40 text-xs text-purple-200">
            <p className="font-bold">Durable Workspace Authority Delegation (FS-040)</p>
            <p className="mt-0.5 text-purple-300/80">
              Support grants allow time-bounded access delegation into customer workspace environments without impersonating or leaking user credentials.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="p-4">Target Workspace</th>
                    <th className="p-4">Grantee</th>
                    <th className="p-4">Justification</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Expires</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {grants.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-bold text-white">{g.workspaceName}</td>
                      <td className="p-4 font-medium text-slate-300">{g.grantee}</td>
                      <td className="p-4 text-slate-400 max-w-xs truncate">{g.reason}</td>
                      <td className="p-4">
                        {g.status === "ACTIVE" && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        )}
                        {g.status === "EXPIRED" && (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                            <Clock className="w-3.5 h-3.5" /> Expired
                          </span>
                        )}
                        {g.status === "REVOKED" && (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-400">{new Date(g.expiresAt).toLocaleString()}</td>
                      <td className="p-4 text-right">
                        {g.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => handleRevokeGrant(g.id)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
                          >
                            Revoke Grant
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: INFRASTRUCTURE ================= */}
      {activeTab === "infrastructure" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Rendering Nodes</span>
                <Server className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mt-4">8 / 8 Online</h3>
              <p className="text-xs text-emerald-400 mt-1">Average Response: 14ms</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Database Cluster</span>
                <HardDrive className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mt-4">Read/Write Primary</h3>
              <p className="text-xs text-emerald-400 mt-1">Connection Pool: 18 / 100 active</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Draft Sync Bus</span>
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mt-4">0 Queued Retries</h3>
              <p className="text-xs text-emerald-400 mt-1">Receipt Hash Integrity: 100%</p>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default SuperAdminDashboard;