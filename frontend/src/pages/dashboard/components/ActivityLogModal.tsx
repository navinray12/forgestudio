import React, { useState, useEffect } from "react";
import { X, RefreshCw, Filter, ChevronDown, ChevronRight, Activity, Shield } from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  targetResource: string;
  details: any;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
  } | null;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId?: string;
  websiteName?: string;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  websiteId,
  websiteName,
}) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (websiteId) {
        params.append("targetResource", `website:${websiteId}`);
      }
      if (actionFilter !== "ALL") {
        params.append("action", actionFilter);
      }
      params.append("limit", "50");

      const res = await fetch(`${apiUrl}/api/v1/audit-logs?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load activity logs.");
      }

      const data = await res.json();
      setLogs(data.data?.logs || data.logs || []);
    } catch (err: any) {
      setError(err.message || "An error occurred fetching logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, websiteId, actionFilter]);

  if (!isOpen) return null;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("PUBLISH") || act.includes("DEPLOY")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
    if (act.includes("CONNECT") || act.includes("SYNC")) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
    if (act.includes("DELETE") || act.includes("REVOKE") || act.includes("DISCONNECT") || act.includes("SUSPEND")) {
      return "bg-red-500/10 text-red-400 border-red-500/30";
    }
    if (act.includes("LOGIN") || act.includes("AUTH") || act.includes("SECURITY")) {
      return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    }
    return "bg-slate-800 text-slate-300 border-slate-700";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {websiteName ? `Activity Log: ${websiteName}` : "Platform Activity Log"}
              </h2>
              <p className="text-xs text-slate-400">
                Audit history of publishing, integrations, and management operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/50 px-6 py-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold">Filter Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Actions</option>
              <option value="PUBLISH">Publish / Deployment</option>
              <option value="WORDPRESS_CONNECTED">WordPress Connected</option>
              <option value="WORDPRESS_DISCONNECTED">WordPress Disconnected</option>
              <option value="ROLE_UPDATE">Permissions & Roles</option>
              <option value="LOGIN">User Login</option>
            </select>
          </div>

          <div className="text-xs text-slate-400">
            Showing <span className="font-semibold text-white">{logs.length}</span> recorded events
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-950/40 border-b border-red-800/60 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Logs Table Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs font-semibold">Loading activity logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Shield className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-sm font-semibold text-slate-400">No activity logs recorded yet.</p>
              <p className="text-xs text-slate-600 mt-1">Actions performed on this resource will appear here in chronological order.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-8"></th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map((log) => {
                    const isExpanded = !!expandedRows[log.id];
                    const badgeClass = getActionBadgeColor(log.action);
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => toggleRow(log.id)}
                          className="hover:bg-slate-800/40 cursor-pointer transition select-none"
                        >
                          <td className="py-3 px-4 text-slate-500">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeClass}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-300 truncate max-w-[200px]">
                            {log.targetResource}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {log.ipAddress || "—"}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={5} className="p-4 pl-12 border-b border-slate-800/60">
                              <div className="space-y-2">
                                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Payload Details
                                </div>
                                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-48">
                                  {log.details ? JSON.stringify(log.details, null, 2) : "{}"}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3.5 bg-slate-950/40 text-xs text-slate-500">
          <span>ForgeStudio Audit Engine &bull; Immutability Guaranteed</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogModal;
