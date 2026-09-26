import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";

interface SupportCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportCredentialsModal: React.FC<SupportCredentialsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { getSupportTokens, createSupportToken, revokeSupportToken } = useAuth();
  const [label, setLabel] = useState("");
  const [durationHours, setDurationHours] = useState<number>(24);
  const [scope, setScope] = useState("editor_read_write");
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  if (!isOpen) return null;

  const tokens = getSupportTokens();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createSupportToken(label, durationHours, scope);
    setLabel("");
  };

  const handleCopy = (tokenStr: string, id: string) => {
    navigator.clipboard.writeText(tokenStr);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      id="support-credentials-modal"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              🔑
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">Temporary Support Credentials</h2>
              <p className="text-xs text-slate-400">
                Generate secure, scoped, time-bound access tokens for customer support & troubleshooting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Creation Form */}
        <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <h3 className="text-sm font-semibold text-slate-200">Create New Support Token</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-xs text-slate-400">Ticket / Purpose Label</label>
              <input
                type="text"
                placeholder="e.g. Ticket #4082"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400">Expiration Duration</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value={1}>1 Hour</option>
                <option value={8}>8 Hours</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={168}>7 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400">Permission Scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="editor_read_write">Editor Read & Write</option>
                <option value="editor_read_only">Editor Read Only</option>
                <option value="admin_troubleshoot">Full Platform Audit</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-500"
            >
              + Generate Support Token
            </button>
          </div>
        </form>

        {/* Existing Tokens Table */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-200">Active & Past Support Credentials</h3>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
            {tokens.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No support tokens generated yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="p-2.5">Label</th>
                    <th className="p-2.5">Token (Masked)</th>
                    <th className="p-2.5">Scope</th>
                    <th className="p-2.5">Expires</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {tokens.map((t) => {
                    const isExpired = new Date(t.expiresAt).getTime() <= Date.now();
                    const currentStatus = t.status === "revoked" ? "revoked" : isExpired ? "expired" : "active";
                    return (
                      <tr key={t.id} className="hover:bg-slate-900/50">
                        <td className="p-2.5 font-medium text-white">{t.label}</td>
                        <td className="p-2.5 font-mono text-[11px] text-amber-300">
                          {t.token.slice(0, 10)}...{t.token.slice(-4)}
                        </td>
                        <td className="p-2.5 text-slate-400">{t.scope}</td>
                        <td className="p-2.5 text-slate-400">
                          {new Date(t.expiresAt).toLocaleString()}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              currentStatus === "active"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : currentStatus === "expired"
                                ? "bg-slate-700 text-slate-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {currentStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2.5 text-right space-x-2">
                          <button
                            onClick={() => handleCopy(t.token, t.id)}
                            className="rounded bg-slate-800 px-2 py-1 text-[10px] hover:bg-slate-700 text-slate-200"
                          >
                            {copiedTokenId === t.id ? "✓ Copied" : "Copy"}
                          </button>
                          {currentStatus === "active" && (
                            <button
                              onClick={() => revokeSupportToken(t.id)}
                              className="rounded bg-rose-900/40 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-800/60"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
