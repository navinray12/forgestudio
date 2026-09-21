import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

interface WhiteLabelConfig {
  agencyName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  hideForgeBranding?: boolean;
  customCss?: string | null;
}

export default function WhiteLabelPanel() {
  const [isAgencyPlan, setIsAgencyPlan] = useState(false);
  const [config, setConfig] = useState<WhiteLabelConfig>({
    agencyName: "",
    logoUrl: "",
    faviconUrl: "",
    hideForgeBranding: false,
    customCss: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchWhiteLabelConfig();
  }, []);

  const fetchWhiteLabelConfig = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${apiUrl}/api/v1/agency/whitelabel`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load white-label configuration.");
      }

      setIsAgencyPlan(Boolean(data?.data?.isAgencyPlan));
      if (data?.data?.config) {
        setConfig({
          agencyName: data.data.config.agencyName || "",
          logoUrl: data.data.config.logoUrl || "",
          faviconUrl: data.data.config.faviconUrl || "",
          hideForgeBranding: Boolean(data.data.config.hideForgeBranding),
          customCss: data.data.config.customCss || "",
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load agency branding.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgencyPlan) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await fetch(`${apiUrl}/api/v1/agency/whitelabel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update white-label config.");
      }

      setSuccess("Agency white-label settings saved successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update branding.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 w-full rounded-2xl bg-slate-100 border border-slate-200" />
        <div className="h-80 w-full rounded-2xl bg-slate-100 border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏷️</span>
              <h2 className="text-xl font-bold text-slate-900">
                White-Label & Agency Branding (F-446)
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Customize client-facing badges, replace ForgeStudio logos with your own agency assets, and eliminate watermarks from published websites.
            </p>
          </div>

          {!isAgencyPlan && (
            <Link
              to="/subscriptions"
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 transition"
            >
              👑 Unlock with Agency Plan
            </Link>
          )}
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

      {/* Non-Agency Plan Gating Banner (Feature F-452) */}
      {!isAgencyPlan && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                Agency Tier Exclusive
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Deliver 100% Unbranded Websites to Your Clients
              </h3>
              <p className="text-sm text-slate-600 max-w-xl">
                Upgrade to the Agency plan to remove "Powered by ForgeStudio" badges, upload your custom agency logos, inject global agency CSS, and present full ownership to your clients.
              </p>
            </div>

            <Link
              to="/subscriptions"
              className="whitespace-nowrap rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition"
            >
              Upgrade to Agency
            </Link>
          </div>
        </div>
      )}

      {/* Configuration Form & Live Preview Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Form Column */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={!isAgencyPlan} className="space-y-6">
              {/* 1. Watermark Suppression Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div>
                  <div className="font-semibold text-sm text-slate-900">
                    Hide ForgeStudio Watermark & Badge
                  </div>
                  <div className="text-xs text-slate-500">
                    Completely removes the bottom "Built with ForgeStudio" watermark on all exported and published sites.
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={Boolean(config.hideForgeBranding)}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hideForgeBranding: e.target.checked,
                      }))
                    }
                    className="peer sr-only"
                    disabled={!isAgencyPlan}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none peer-disabled:opacity-50"></div>
                </label>
              </div>

              {/* 2. Agency Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Agency Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Digital Studios"
                  value={config.agencyName || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, agencyName: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* 3. Logo URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Custom Agency Logo URL
                </label>
                <input
                  type="url"
                  placeholder="https://youragency.com/logo.svg"
                  value={config.logoUrl || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, logoUrl: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                />
              </div>

              {/* 4. Favicon URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Custom Agency Favicon URL
                </label>
                <input
                  type="url"
                  placeholder="https://youragency.com/favicon.ico"
                  value={config.faviconUrl || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, faviconUrl: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                />
              </div>

              {/* 5. Custom CSS */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Global Agency Custom CSS (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="/* Injected across client published preview footers */"
                  value={config.customCss || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, customCss: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 font-mono text-xs"
                />
              </div>
            </fieldset>

            {isAgencyPlan ? (
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Agency Branding"}
              </button>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Form is in read-only preview mode. Upgrade to Agency plan to activate custom branding.
              </div>
            )}
          </form>
        </div>

        {/* Live Preview Column */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Live Branding Preview
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Preview how your published websites will appear to your clients.
            </p>
          </div>

          {/* Browser Mockup */}
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-50">
            <div className="bg-slate-200 px-3 py-2 flex items-center gap-2 border-b border-slate-300">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="mx-auto rounded bg-white px-3 py-0.5 text-[10px] text-slate-500 font-mono">
                client-site.com
              </div>
            </div>

            <div className="p-4 space-y-4 bg-white min-h-[180px] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {config.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt="Agency Logo"
                      className="h-6 max-w-[100px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-6 w-6 rounded bg-indigo-100 flex items-center justify-center text-xs text-indigo-700 font-bold">
                      A
                    </div>
                  )}
                  <span className="font-bold text-xs text-slate-800">
                    {config.agencyName || "Your Agency Name"}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
              </div>

              {/* Watermark Section */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
                {config.hideForgeBranding ? (
                  <div className="text-emerald-600 font-semibold flex items-center gap-1">
                    <span>✔ Watermark suppressed</span>
                  </div>
                ) : (
                  <div className="text-slate-400 flex items-center gap-1">
                    <span>⚡ Powered by ForgeStudio</span>
                  </div>
                )}
                <span className="text-slate-400 font-mono text-[10px]">v1.0</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-800">Branding Resolution Status:</div>
            <div>
              Watermark Removal:{" "}
              <strong className={config.hideForgeBranding ? "text-emerald-600" : "text-slate-700"}>
                {config.hideForgeBranding ? "Active" : "Disabled (Default Forge badge)"}
              </strong>
            </div>
            <div>
              Agency Name: <strong>{config.agencyName || "Not configured"}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
