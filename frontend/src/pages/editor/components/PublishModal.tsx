import React, { useState, useEffect } from "react";
import type { PublishingState, DeploymentConfig, PageConfig, DeploymentRecord } from "../types";
import { publishingService } from "../../../features/publishing/services/publishingService";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  publishing: PublishingState;
  deployment: DeploymentConfig;
  pages: PageConfig[];
  websiteName: string;
  websiteId?: string;
  approvalWorkflowEnabled?: boolean;
  canPublish?: boolean;
  onPublish: (options?: { destinationType?: "INTERNAL" | "WORDPRESS" }) => Promise<void>;
  onSubmitApproval?: () => Promise<void>;
  onRollback?: (deploymentId: string) => Promise<void>;
  onUpdateDeployment: (config: DeploymentConfig) => void;
  onOpenPreview: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  publishing,
  deployment,
  pages,
  websiteName: _websiteName,
  websiteId,
  approvalWorkflowEnabled = false,
  canPublish = true,
  onPublish,
  onSubmitApproval,
  onRollback,
  onUpdateDeployment,
  onOpenPreview,
}) => {
  const [activeTab, setActiveTab] = useState<"internal" | "wordpress" | "sftp" | "zip">("internal");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState(deployment?.customDomain || "");
  const [webhookUrl, setWebhookUrl] = useState(deployment?.webhookUrl || "");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loadingDeployments, setLoadingDeployments] = useState(false);

  // WordPress connection state
  const [wpStatus, setWpStatus] = useState<any>(null);
  const [wpSiteUrl, setWpSiteUrl] = useState("");
  const [wpApiKey, setWpApiKey] = useState("");
  const [wpSiteName, setWpSiteName] = useState("");
  const [isConnectingWp, setIsConnectingWp] = useState(false);
  const [isVerifyingWp, setIsVerifyingWp] = useState(false);

  // SFTP connection state
  const [sftpHost, setSftpHost] = useState("");
  const [sftpPort, setSftpPort] = useState("22");
  const [sftpUsername, setSftpUsername] = useState("");
  const [sftpPassword, setSftpPassword] = useState("");
  const [sftpRemotePath, setSftpRemotePath] = useState("/var/www/html");
  const [isTestingSftp, setIsTestingSftp] = useState(false);
  const [isSyncingSftp, setIsSyncingSftp] = useState(false);
  const [sftpFeedback, setSftpFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sftpVerified, setSftpVerified] = useState(false);

  useEffect(() => {
    if (isOpen && websiteId) {
      loadDeployments();
      loadWordPressStatus();
      loadSftpConfig();
    }
  }, [isOpen, websiteId]);

  const loadSftpConfig = async () => {
    if (!websiteId) return;
    try {
      const data = await publishingService.getSftpConfig(websiteId);
      if (data?.config) {
        setSftpHost(data.config.host || "");
        setSftpPort(String(data.config.port || 22));
        setSftpUsername(data.config.username || "");
        setSftpRemotePath(data.config.remotePath || "/var/www/html");
        setSftpVerified(data.config.status === "CONNECTED");
      }
    } catch (e) {}
  };

  const handleTestSftp = async () => {
    if (!sftpHost || !sftpUsername) {
      setSftpFeedback({ type: "error", message: "Host and Username are required." });
      return;
    }
    setIsTestingSftp(true);
    setSftpFeedback(null);
    try {
      await publishingService.saveSftpConfig({
        websiteId,
        host: sftpHost,
        port: parseInt(sftpPort, 10) || 22,
        username: sftpUsername,
        password: sftpPassword,
        remotePath: sftpRemotePath,
      });
      const res = await publishingService.verifySftpConfig({
        host: sftpHost,
        port: parseInt(sftpPort, 10) || 22,
        username: sftpUsername,
        password: sftpPassword,
      });
      if (res.success || res.verified) {
        setSftpVerified(true);
        setSftpFeedback({ type: "success", message: "SFTP connection verified successfully!" });
      } else {
        setSftpFeedback({ type: "error", message: res.error || "Connection test failed." });
      }
    } catch (err: any) {
      setSftpFeedback({ type: "error", message: err.message || "Failed to verify SFTP connection." });
    } finally {
      setIsTestingSftp(false);
    }
  };

  const handleSyncSftp = async () => {
    if (!websiteId) return;
    setIsSyncingSftp(true);
    setSftpFeedback(null);
    try {
      const res = await publishingService.syncSftp(websiteId, {
        environment: "PRODUCTION",
      });
      if (res.success) {
        setSftpFeedback({ type: "success", message: `Successfully synced ${res.syncedFilesCount || "all"} files to SFTP server!` });
        loadDeployments();
      } else {
        setSftpFeedback({ type: "error", message: res.error || "SFTP sync failed." });
      }
    } catch (err: any) {
      setSftpFeedback({ type: "error", message: err.message || "SFTP sync failed." });
    } finally {
      setIsSyncingSftp(false);
    }
  };
  const loadDeployments = async () => {
    if (!websiteId) return;
    try {
      setLoadingDeployments(true);
      const data = await publishingService.getDeployments(websiteId);
      setDeployments(data);
    } catch (e) {
      console.warn("Could not load deployments:", e);
    } finally {
      setLoadingDeployments(false);
    }
  };

  const loadWordPressStatus = async () => {
    if (!websiteId) return;
    try {
      const data = await publishingService.getWordPressStatus(websiteId);
      setWpStatus(data);
      if (data?.connection?.siteUrl) {
        setWpSiteUrl(data.connection.siteUrl);
      }
      if (data?.connection?.wpSiteName) {
        setWpSiteName(data.connection.wpSiteName);
      }
    } catch (e) {
      console.warn("Could not load WordPress status:", e);
    }
  };

  if (!isOpen) return null;

  const isActuallyDeployed = deployment?.provider !== "none" && Boolean(deployment?.deployedAt);

  const handlePublishClick = async (dest: "INTERNAL" | "WORDPRESS" = "INTERNAL") => {
    try {
      setIsPublishing(true);
      setSaveFeedback("");
      await onPublish({ destinationType: dest });
      setSaveFeedback(`Website successfully published to ${dest === "WORDPRESS" ? "WordPress" : "live version"}!`);
      loadDeployments();
      if (dest === "WORDPRESS") {
        loadWordPressStatus();
      }
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Failed to publish website.");
    } finally {
      setIsPublishing(false);
    }
  };

  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const handleSubmitApproval = async () => {
    setIsSubmittingApproval(true);
    setSaveFeedback("");
    try {
      if (onSubmitApproval) {
        await onSubmitApproval();
      } else if (websiteId) {
        const res = await fetch(`/api/approval-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ websiteId, note: "Ready for publication review." }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || "Failed to submit for approval");
        }
      }
      setSaveFeedback("Publication request submitted for approval!");
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Failed to submit for approval.");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRollbackClick = async (deploymentId: string, version: number) => {
    if (!onRollback && !websiteId) return;
    const confirm = window.confirm(`Are you sure you want to rollback to deployment v${version}? This will create a new live deployment.`);
    if (!confirm) return;

    try {
      setIsRollingBack(deploymentId);
      setSaveFeedback("");
      if (onRollback) {
        await onRollback(deploymentId);
      } else if (websiteId) {
        await publishingService.rollbackDeployment(websiteId, deploymentId);
      }
      setSaveFeedback(`Successfully rolled back to v${version}!`);
      loadDeployments();
      setTimeout(() => setSaveFeedback(""), 4000);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Rollback failed.");
    } finally {
      setIsRollingBack(null);
    }
  };

  const handleConnectWordPress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteId || !wpSiteUrl.trim() || !wpApiKey.trim()) return;

    try {
      setIsConnectingWp(true);
      setSaveFeedback("");
      await publishingService.connectWordPress(websiteId, wpSiteUrl, wpApiKey, wpSiteName);
      setSaveFeedback("Successfully connected to WordPress destination!");
      setWpApiKey("");
      await loadWordPressStatus();
      setTimeout(() => setSaveFeedback(""), 3500);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Failed to connect to WordPress.");
    } finally {
      setIsConnectingWp(false);
    }
  };

  const handleVerifyWordPress = async () => {
    if (!websiteId) return;
    try {
      setIsVerifyingWp(true);
      setSaveFeedback("");
      const result = await publishingService.verifyWordPress(websiteId);
      setSaveFeedback(`WordPress connection verified! Version: ${result?.verification?.wpVersion || "OK"}`);
      await loadWordPressStatus();
      setTimeout(() => setSaveFeedback(""), 3500);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Verification failed.");
    } finally {
      setIsVerifyingWp(false);
    }
  };

  const handleDisconnectWordPress = async () => {
    if (!websiteId) return;
    const confirm = window.confirm("Are you sure you want to disconnect WordPress? Your ForgeStudio site and revisions remain safe.");
    if (!confirm) return;

    try {
      setSaveFeedback("");
      await publishingService.disconnectWordPress(websiteId);
      setSaveFeedback("WordPress connection disconnected safely.");
      await loadWordPressStatus();
      setTimeout(() => setSaveFeedback(""), 3500);
    } catch (err: any) {
      setSaveFeedback(err?.message || "Disconnect failed.");
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PUBLISHED</span>;
      case "DEPLOYING":
      case "BUILDING":
      case "VALIDATING":
      case "PROCESSING":
      case "VERIFYING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">{status}</span>;
      case "RECONCILIATION_REQUIRED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">RECONCILIATION</span>;
      case "VALIDATION_FAILED":
      case "BUILD_FAILED":
      case "DEPLOY_FAILED":
      case "VERIFICATION_FAILED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
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

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("internal")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === "internal"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            ForgeStudio Live
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wordpress")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "wordpress"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <span>WordPress Destination</span>
            {wpStatus?.isConnected && <span className="h-2 w-2 rounded-full bg-emerald-400"></span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sftp")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "sftp"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <span>SFTP Server</span>
            {sftpVerified && <span className="h-2 w-2 rounded-full bg-emerald-400"></span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("zip")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "zip"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <span>Static ZIP Export</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[68vh]">
          {activeTab === "internal" ? (
            <>
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
                            : publishing.status.includes("FAILED")
                            ? "bg-rose-500"
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
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
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
              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Publish Website Snapshot</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Validates integrity, processes all pages & components, and updates the live production snapshot.
                    </p>
                  </div>
                  {approvalWorkflowEnabled && !canPublish ? (
                    <button
                      type="button"
                      onClick={handleSubmitApproval}
                      disabled={isSubmittingApproval}
                      className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 py-2.5 shadow-lg shadow-amber-600/30 transition disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <span>📋</span>
                      <span>{isSubmittingApproval ? "Submitting..." : "Submit for Approval"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePublishClick("INTERNAL")}
                      disabled={isPublishing}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isPublishing ? "Publishing..." : "🚀 Publish Now"}
                    </button>
                  )}
                </div>
                {publishing.status === "PUBLISHED" && Boolean(publishing.publishedAt) && Boolean(websiteId) && (
                  <div className="pt-3 border-t border-emerald-900/40 flex items-center justify-between">
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

              {/* Deployment History Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Deployment History</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Audited deployment records and non-destructive rollbacks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadDeployments}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    Refresh
                  </button>
                </div>

                {loadingDeployments ? (
                  <div className="text-center py-4 text-xs text-slate-400">Loading deployments...</div>
                ) : deployments.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">No deployments recorded yet.</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {deployments.map((d) => {
                      const isCurrentActive = publishing.status === "PUBLISHED" && publishing.version === d.version;
                      return (
                        <div
                          key={d.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border ${
                            isCurrentActive ? "border-emerald-500/40 bg-emerald-950/20" : "border-slate-800 bg-slate-900/50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white font-mono">v{d.version}</span>
                              {getStatusBadge(d.status)}
                              <span className="text-[10px] text-slate-400 uppercase font-mono">{d.destinationType}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {new Date(d.createdAt).toLocaleString()}
                              {d.creator?.fullName ? ` • by ${d.creator.fullName}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {isCurrentActive ? (
                              <span className="text-[10px] font-bold text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded">
                                Active
                              </span>
                            ) : d.status === "PUBLISHED" ? (
                              <button
                                type="button"
                                onClick={() => handleRollbackClick(d.id, d.version)}
                                disabled={isRollingBack === d.id || isPublishing}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-200 transition disabled:opacity-50 cursor-pointer"
                              >
                                {isRollingBack === d.id ? "Rolling back..." : "Rollback"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Domain & Hosting Configuration */}
              <form onSubmit={handleSaveDeploymentConfig} className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-extrabold text-white">Production Deployment Integration</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Connect your real hosting provider, custom domain, or deployment webhook.
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
            </>
          ) : (
            /* WordPress Destination Tab */
            <div className="space-y-5">
              {wpStatus?.isConnected ? (
                /* Connected View */
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                        <div>
                          <h4 className="text-xs font-extrabold text-white">
                            {wpStatus.connection?.wpSiteName || "WordPress Destination Connected"}
                          </h4>
                          <a
                            href={wpStatus.connection?.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline"
                          >
                            {wpStatus.connection?.siteUrl} ↗
                          </a>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        CONNECTED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Mapped Pages</span>
                        <span className="font-extrabold text-white">{wpStatus.mappingsCount || 0} pages</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">Last Verified</span>
                        <span className="text-slate-300">
                          {wpStatus.connection?.lastVerifiedAt
                            ? new Date(wpStatus.connection.lastVerifiedAt).toLocaleString()
                            : "Recently"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={handleVerifyWordPress}
                        disabled={isVerifyingWp}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition disabled:opacity-50"
                      >
                        {isVerifyingWp ? "Verifying..." : "Verify Connection"}
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectWordPress}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-bold transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  {/* Publish to WordPress Action */}
                  <div className="rounded-xl border border-blue-900/40 bg-blue-950/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold text-white">Publish Live to WordPress</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Transforms canonical Page JSON into native Gutenberg blocks, updates mapped pages, and syncs media.
                        </p>
                      </div>
                      {approvalWorkflowEnabled && !canPublish ? (
                        <button
                          type="button"
                          onClick={handleSubmitApproval}
                          disabled={isSubmittingApproval}
                          className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 py-2.5 shadow-lg shadow-amber-600/30 transition disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
                        >
                          <span>📋</span>
                          <span>{isSubmittingApproval ? "Submitting..." : "Submit for Approval"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePublishClick("WORDPRESS")}
                          disabled={isPublishing}
                          className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {isPublishing ? "Syncing to WP..." : "Publish to WordPress"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Connect WordPress Form */
                <form onSubmit={handleConnectWordPress} className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 space-y-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Connect WordPress Site</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Connect via the ForgeStudio WordPress Connector plugin using an API key. We never ask for admin passwords.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        WordPress Site URL *
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://mybrand.com or https://wp.mydomain.com"
                        value={wpSiteUrl}
                        onChange={(e) => setWpSiteUrl(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Connector API Key / Secret Token *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Paste connector token from WordPress plugin settings"
                        value={wpApiKey}
                        onChange={(e) => setWpApiKey(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-blue-500"
                      />
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        🔒 Hashed with SHA-256 on the server. Never exposed to browser or frontend storage.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Site Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. My Production WordPress Site"
                        value={wpSiteName}
                        onChange={(e) => setWpSiteName(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400">
                      ForgeStudio remains the brain; WordPress is the destination.
                    </span>
                    <button
                      type="submit"
                      disabled={isConnectingWp}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
                    >
                      {isConnectingWp ? "Connecting..." : "Connect WordPress"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SFTP Destination Panel */}
          {activeTab === "sftp" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
                <h4 className="text-xs font-bold text-amber-400">SFTP Direct Server Deployment</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Publish compiled static website files directly to any Linux/UNIX web server, cPanel, AWS EC2, or DigitalOcean droplet via SSH File Transfer Protocol.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Server Host / IP</label>
                  <input
                    type="text"
                    placeholder="e.g. sftp.example.com or 203.0.113.10"
                    value={sftpHost}
                    onChange={(e) => setSftpHost(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Port</label>
                  <input
                    type="number"
                    value={sftpPort}
                    onChange={(e) => setSftpPort(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Username</label>
                  <input
                    type="text"
                    placeholder="e.g. deploy or root"
                    value={sftpUsername}
                    onChange={(e) => setSftpUsername(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">Password / SSH Key</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={sftpPassword}
                    onChange={(e) => setSftpPassword(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Remote Directory Path</label>
                <input
                  type="text"
                  placeholder="e.g. /var/www/html or /public_html"
                  value={sftpRemotePath}
                  onChange={(e) => setSftpRemotePath(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white"
                />
              </div>

              {sftpFeedback && (
                <div
                  className={`rounded-lg p-2.5 text-xs font-semibold text-center ${
                    sftpFeedback.type === "success"
                      ? "bg-emerald-950/60 border border-emerald-500/50 text-emerald-300"
                      : "bg-rose-950/60 border border-rose-500/50 text-rose-300"
                  }`}
                >
                  {sftpFeedback.message}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestSftp}
                  disabled={isTestingSftp}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 text-xs font-bold transition cursor-pointer"
                >
                  {isTestingSftp ? "Testing..." : "Test Connection"}
                </button>
                <button
                  type="button"
                  onClick={handleSyncSftp}
                  disabled={isSyncingSftp}
                  className="rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 text-xs font-bold transition shadow-lg shadow-amber-600/30 cursor-pointer"
                >
                  {isSyncingSftp ? "Syncing Files..." : "Deploy via SFTP Now"}
                </button>
              </div>
            </div>
          )}

          {/* Static ZIP Bundle Panel */}
          {activeTab === "zip" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-4">
                <h4 className="text-xs font-bold text-purple-400">1-Click Static Website Export (.zip)</h4>
                <p className="text-[11px] text-slate-300 mt-1">
                  Download a production-optimized static website bundle ready for instant self-hosting on AWS S3, Cloudflare Pages, Netlify, Vercel, Apache, or Nginx.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Included in Bundle</span>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>HTML pages for all {pages.length} website routes with SEO meta tags</li>
                  <li>Clean standalone stylesheet (<code className="text-blue-400">styles.css</code>) with responsive media queries</li>
                  <li>Lightweight interactive JavaScript runtime (<code className="text-blue-400">runtime.js</code>)</li>
                  <li>Form handling scripts and asset references</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <a
                  href={`/api/websites/${websiteId}/export/zip`}
                  download
                  className="w-full text-center rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-3 shadow-lg shadow-purple-600/30 transition cursor-pointer"
                >
                  📦 Download Static Website Bundle (.zip)
                </a>
                <a
                  href="/api/plugins/wordpress/download"
                  download
                  className="w-full text-center rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs py-2 transition"
                >
                  🔌 Download WordPress Connector Plugin (.zip)
                </a>
              </div>
            </div>
          )}

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
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
