import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface Activation {
  id: string;
  siteUrl: string;
  siteDomain: string;
  ipAddress?: string | null;
  isLocalhost: boolean;
  activatedAt: string;
  lastPingAt: string;
}

interface License {
  id: string;
  key: string;
  planSlug: string;
  maxSites: number;
  status: string;
  expiresAt?: string | null;
  createdAt: string;
  activations: Activation[];
  telemetry: {
    totalActivations: number;
    productionActivations: number;
    localhostActivations: number;
    remainingSlots: number;
    isLimitReached: boolean;
  };
}

export default function LicensingPanel() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [maskedKeys, setMaskedKeys] = useState<{ [id: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedLicenseKey, setSelectedLicenseKey] = useState("");
  const [transferFromDomain, setTransferFromDomain] = useState("");
  const [transferToDomain, setTransferToDomain] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // Deactivation state
  const [deactivatingDomain, setDeactivatingDomain] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${apiUrl}/api/v1/licenses/my-licenses`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load licenses.");
      }
      setLicenses(data?.data?.licenses || []);

      // Default mask all keys
      const maskMap: { [id: string]: boolean } = {};
      (data?.data?.licenses || []).forEach((lic: License) => {
        maskMap[lic.id] = true;
      });
      setMaskedKeys(maskMap);
    } catch (err: any) {
      setError(err.message || "Failed to fetch licensing data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const toggleMaskKey = (licenseId: string) => {
    setMaskedKeys((prev) => ({
      ...prev,
      [licenseId]: !prev[licenseId],
    }));
  };

  const handleDeactivate = async (licenseKey: string, siteDomain: string) => {
    if (
      !confirm(
        `Are you sure you want to deactivate ${siteDomain}? This will release the site activation slot.`
      )
    ) {
      return;
    }

    try {
      setDeactivatingDomain(siteDomain);
      setError("");
      setSuccess("");

      const res = await fetch(`${apiUrl}/api/v1/licenses/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ licenseKey, siteDomain }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to deactivate domain.");
      }

      setSuccess(`Domain ${siteDomain} has been successfully deactivated.`);
      fetchLicenses();
    } catch (err: any) {
      setError(err.message || "Deactivation failed.");
    } finally {
      setDeactivatingDomain(null);
    }
  };

  const openTransferModal = (licenseKey: string, fromDomain: string) => {
    setSelectedLicenseKey(licenseKey);
    setTransferFromDomain(fromDomain);
    setTransferToDomain("");
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferToDomain.trim()) {
      setError("Please specify the destination domain.");
      return;
    }

    try {
      setTransferLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch(`${apiUrl}/api/v1/licenses/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          licenseKey: selectedLicenseKey,
          fromDomain: transferFromDomain,
          toDomain: transferToDomain.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "License transfer failed.");
      }

      setSuccess(
        `License successfully transferred from ${transferFromDomain} to ${transferToDomain.trim()}!`
      );
      setTransferModalOpen(false);
      fetchLicenses();
    } catch (err: any) {
      setError(err.message || "Failed to transfer license.");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleGenerateLicense = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${apiUrl}/api/v1/licenses/generate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to generate license.");
      }
      setSuccess("New license successfully provisioned!");
      fetchLicenses();
    } catch (err: any) {
      setError(err.message || "Failed to provision license.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔐</span>
              <h2 className="text-xl font-bold text-slate-900">
                Licenses & Client Site Activations
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Manage your ForgeStudio software licenses, monitor active WordPress & custom site bindings, and perform zero-downtime domain transfers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLicenses}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              title="Refresh licenses"
            >
              🔄 Refresh
            </button>
            <Link
              to="/subscriptions"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              ⭐ Upgrade Site Limits
            </Link>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700 flex items-center justify-between">
          <span>✔ {success}</span>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-44 w-full animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
          <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-100 border border-slate-200" />
        </div>
      ) : licenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-600">
            🔑
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-800">
            No Active License Key Found
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            You don't currently have an active license key. Click below to provision your license key for your current subscription plan.
          </p>
          <button
            onClick={handleGenerateLicense}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            Provision My License Key
          </button>
        </div>
      ) : (
        licenses.map((lic) => {
          const isMasked = maskedKeys[lic.id] ?? true;
          const displayKey = isMasked
            ? lic.key.slice(0, 3) + "••••-••••-••••-" + lic.key.slice(-4)
            : lic.key;

          return (
            <div
              key={lic.id}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
            >
              {/* License Card Header */}
              <div className="border-b border-slate-100 bg-slate-50/70 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        License Key
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          lic.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {lic.status}
                      </span>
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 uppercase">
                        {lic.planSlug} Tier
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <code className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-mono text-base font-bold tracking-wider text-slate-800 shadow-inner">
                        {displayKey}
                      </code>

                      <button
                        onClick={() => toggleMaskKey(lic.id)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-600 hover:bg-slate-100 transition"
                        title={isMasked ? "Reveal Key" : "Hide Key"}
                      >
                        {isMasked ? "👁️ Show" : "🙈 Hide"}
                      </button>

                      <button
                        onClick={() => handleCopyKey(lic.key)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
                      >
                        <span>{copiedKey === lic.key ? "✔ Copied" : "📋 Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quota Counters */}
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm">
                      <div className="text-lg font-black text-slate-800">
                        {lic.telemetry?.productionActivations || 0} / {lic.maxSites}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Production Sites
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm">
                      <div className="text-lg font-black text-emerald-600">
                        {lic.telemetry?.localhostActivations || 0}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Localhost (Exempt)
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm">
                      <div className="text-lg font-black text-blue-600">
                        {lic.telemetry?.remainingSlots ?? Math.max(0, lic.maxSites - (lic.telemetry?.productionActivations || 0))}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Slots Remaining
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activated Sites Table */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Activated Sites ({lic.activations?.length || 0})
                  </h4>
                  <div className="text-xs text-slate-500">
                    💡 Localhost & dev domains (.local, .test) do not consume production slots.
                  </div>
                </div>

                {!lic.activations || lic.activations.length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 py-8 text-center text-sm text-slate-500">
                    No active website domains yet. Use this license key inside your WordPress ForgeStudio plugin or client website runtime to activate.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Site Domain</th>
                          <th className="px-4 py-3">Environment</th>
                          <th className="px-4 py-3">IP Address</th>
                          <th className="px-4 py-3">Activated On</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-medium">
                        {lic.activations.map((act) => (
                          <tr key={act.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {act.siteDomain}
                                </span>
                                {act.siteUrl && (
                                  <a
                                    href={act.siteUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-500 hover:text-blue-700"
                                    title="Open Site"
                                  >
                                    ↗
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {act.isLocalhost ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                  <span>💻 Localhost</span>
                                  <span className="text-[10px] text-emerald-600 font-normal">(Free)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                                  🌐 Production Slot
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                              {act.ipAddress || "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {new Date(act.activatedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={() => openTransferModal(lic.key, act.siteDomain)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition shadow-sm"
                                title="Transfer to new domain"
                              >
                                🔀 Transfer
                              </button>

                              <button
                                onClick={() => handleDeactivate(lic.key, act.siteDomain)}
                                disabled={deactivatingDomain === act.siteDomain}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 transition disabled:opacity-50"
                                title="Deactivate and free site slot"
                              >
                                {deactivatingDomain === act.siteDomain ? "..." : "✕ Deactivate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Transfer Domain Modal (F-442, F-443) */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Transfer Domain Binding
              </h3>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Atomically release the slot for{" "}
              <strong className="text-slate-700">{transferFromDomain}</strong> and re-bind it to your new target domain.
            </p>

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Current Domain
                </label>
                <input
                  type="text"
                  disabled
                  value={transferFromDomain}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  New Target Domain / URL *
                </label>
                <input
                  type="text"
                  placeholder="e.g. newdomain.com or https://client.com"
                  value={transferToDomain}
                  onChange={(e) => setTransferToDomain(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  {transferLoading ? "Transferring..." : "Confirm Domain Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
