import React, { useState } from "react";
import type { PublishingState, DeploymentConfig, PageConfig } from "../types";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  publishing: PublishingState;
  deployment: DeploymentConfig;
  pages: PageConfig[];
  websiteName: string;
  websiteId?: string;
  onPublish: () => Promise<void>;
  onUpdateDeployment: (config: DeploymentConfig) => void;
  onOpenPreview: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  publishing,
  deployment,
  pages,
  websiteName,
  websiteId,
  onPublish,
  onUpdateDeployment,
  onOpenPreview,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [customDomain, setCustomDomain] = useState(deployment?.customDomain || "");
  const [webhookUrl, setWebhookUrl] = useState(deployment?.webhookUrl || "");
  const [saveFeedback, setSaveFeedback] = useState("");

  if (!isOpen) return null;

  const isActuallyDeployed = deployment?.provider !== "none" && Boolean(deployment?.deployedAt);

  const handlePublishClick = async () => {
    try {
      setIsPublishing(true);
      await onPublish();
      setSaveFeedback("Website successfully published to latest version!");
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Failed to publish website.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDeploymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDeployment({
      ...deployment,
      customDomain: customDomain.trim() || undefined,
      webhookUrl: webhookUrl.trim() || undefined,
      provider: customDomain.trim() || webhookUrl.trim() ? "custom" : "none",
    });
    setSaveFeedback("Deployment settings updated.");
    setTimeout(() => setSaveFeedback(""), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold">
              🚀
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Publish & Deployment</h2>
              <p className="text-xs text-slate-400">
                Manage website versions, preview live status, and configure hosting.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Status Overview Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Current Website Status
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                <span className="block text-slate-400 text-[10px] uppercase font-bold">Publish State</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      publishing.status === "PUBLISHED"
                        ? "bg-emerald-500 shadow-sm shadow-emerald-500"
                        : "bg-amber-500"
                    }`}
                  />
                  <span className="font-extrabold text-white">{publishing.status}</span>
                  <span className="text-[10px] text-slate-400 font-mono">v{publishing.version || 1}</span>
                </div>
                {publishing.publishedAt ? (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Published: {new Date(publishing.publishedAt).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1">Not yet published</p>
                )}
              </div>

              <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
                <span className="block text-slate-400 text-[10px] uppercase font-bold">Deployment Hosting</span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isActuallyDeployed ? "bg-emerald-500 shadow-sm shadow-emerald-500" : "bg-slate-500"
                    }`}
                  />
                  <span className="font-extrabold text-white">
                    {isActuallyDeployed ? "LIVE PRODUCTION" : "LOCAL BUILDER"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {deployment?.customDomain
                    ? `Domain: ${deployment.customDomain}`
                    : "No external domain connected"}
                </p>
              </div>
            </div>

            {/* Verification checklist */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Total Pages to Publish:</span>
                <span className="font-bold text-white">{pages.length} pages</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-300 mt-1">
                <span>Home Page:</span>
                <span className="font-bold text-blue-400">
                  {pages.find((p) => p.isHome || p.slug === "/")?.name || "Home"} (/)
                </span>
              </div>
            </div>
          </div>

          {/* Publishing Action Box */}
          <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-white">Publish Website Snapshot</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Creates a canonical published build snapshot with all active pages, shared headers/footers, and global styles.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePublishClick}
                disabled={isPublishing}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isPublishing ? "Publishing..." : "🚀 Publish Now"}
              </button>
            </div>
            {publishing.status === "PUBLISHED" && Boolean(publishing.publishedAt) && Boolean(websiteId) && (
              <div className="pt-3 border-t border-blue-900/40 flex items-center justify-between">
                <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  Published & Live (v{publishing.version || 1})
                </span>
                <a
                  href={`/site/${websiteId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                >
                  <span>Visit Live Site</span>
                  <span>↗</span>
                </a>
              </div>
            )}
          </div>

          {/* Domain & Hosting Configuration (No fake deployment) */}
          <form onSubmit={handleSaveDeploymentConfig} className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
            <div>
              <h4 className="text-xs font-extrabold text-white">Production Deployment Integration</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Connect your real hosting provider, custom domain, or deployment webhook. Live status is only awarded when connected.
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Custom Domain</label>
                <input
                  type="text"
                  placeholder="e.g. www.mybrand.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  CI/CD Deploy Webhook (Vercel, Netlify, Cloudflare, Custom Server)
                </label>
                <input
                  type="text"
                  placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">
                🔒 We never show false "Live" statuses without a verified deployment.
              </span>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
              >
                Save Hosting Settings
              </button>
            </div>
          </form>

          {saveFeedback && (
            <div className="rounded-lg bg-blue-900/40 border border-blue-500/40 p-2.5 text-xs font-semibold text-blue-200 text-center animate-fadeIn">
              {saveFeedback}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950/60 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPreview();
              }}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition cursor-pointer flex items-center gap-1"
            >
              <span>👁️</span>
              <span>Open Interactive Preview</span>
            </button>
            {publishing.status === "PUBLISHED" && Boolean(publishing.publishedAt) && Boolean(websiteId) && (
              <a
                href={`/site/${websiteId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
              >
                <span>🌐</span>
                <span>Visit Live Site ↗</span>
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
