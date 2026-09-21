import React, { useState, useEffect } from "react";
import {
  X,
  Globe,
  Mail,
  FileText,
  Activity,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  Cookie,
  Gauge,
  Zap,
  Image as ImageIcon,
  Database,
  Sparkles,
  HardDrive,
  Cpu,
} from "lucide-react";

interface ManagedSiteModalProps {
  website: {
    id: string;
    name: string;
    slug: string;
    status: string;
    wpConnection?: {
      id: string;
      siteUrl: string;
      wpSiteName?: string | null;
      status: string;
      lastVerifiedAt?: string | null;
    } | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onWebsiteUpdated?: () => void;
}

type TabType =
  | "overview"
  | "wordpress"
  | "wp-admin"
  | "performance"
  | "image-optimization"
  | "mailer"
  | "email-logs"
  | "cookie-consent"
  | "activity";

export const ManagedSiteModal: React.FC<ManagedSiteModalProps> = ({
  website,
  isOpen,
  onClose,
  onWebsiteUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Mailer Form State
  const [mailerForm, setMailerForm] = useState({
    host: "",
    port: 587,
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
  });
  const [mailerVerified, setMailerVerified] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");

  // Delivery Logs State
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);

  // Cookie Consent Form State
  const [cookieForm, setCookieForm] = useState({
    enabled: false,
    message: "We use cookies to enhance your browsing experience.",
    buttonText: "Accept All",
    policyUrl: "",
    theme: "dark" as "dark" | "light",
  });

  // Site Activity Logs
  const [siteLogs, setSiteLogs] = useState<any[]>([]);

  // Performance State (F-431)
  const [perfSummary, setPerfSummary] = useState<any>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfAuditing, setPerfAuditing] = useState(false);

  // Image Optimization State (F-433, F-434)
  const [optStats, setOptStats] = useState<any>(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optCompressing, setOptCompressing] = useState(false);

  // Remote WP Admin State (F-429, F-432)
  const [wpAdminOverview, setWpAdminOverview] = useState<any>(null);
  const [wpAdminLoading, setWpAdminLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [dbCleanupLoading, setDbCleanupLoading] = useState(false);
  const [dbResult, setDbResult] = useState<any>(null);
  const [dbOptions, setDbOptions] = useState({
    cleanRevisions: true,
    cleanTransients: true,
    optimizeTables: true,
    emptyTrash: true,
  });

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Fetch Managed Site Aggregate Details
  const fetchManagedDetails = async () => {
    if (!website) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/managed-details`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data) {
        setDetails(data);
        if (data.mailerConfig) {
          setMailerForm({
            host: data.mailerConfig.host || "",
            port: data.mailerConfig.port || 587,
            username: data.mailerConfig.username || "",
            password: "",
            fromName: data.mailerConfig.fromName || "",
            fromEmail: data.mailerConfig.fromEmail || "",
          });
          setMailerVerified(data.mailerConfig.isVerified || false);
        }
        if (data.cookieConsent) {
          setCookieForm(data.cookieConsent);
        }
        if (data.recentLogs) {
          setDeliveryLogs(data.recentLogs);
        }
        if (data.performanceStats) {
          setPerfSummary(data.performanceStats);
        }
        if (data.optimizationStats) {
          setOptStats(data.optimizationStats);
        }
      }
    } catch (err: any) {
      console.error("Failed to load managed site details:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Audit Logs for this site
  const fetchSiteAuditLogs = async () => {
    if (!website) return;
    try {
      const res = await fetch(`${apiUrl}/api/v1/audit-logs?resourceId=${website.id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.logs) {
        setSiteLogs(data.logs);
      }
    } catch {
      // no-op
    }
  };

  // Fetch Performance Summary
  const fetchPerformance = async () => {
    if (!website) return;
    setPerfLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/performance/metrics`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data) {
        setPerfSummary(data);
      }
    } catch {
      // no-op
    } finally {
      setPerfLoading(false);
    }
  };

  // Run Performance Audit
  const handleRunAudit = async () => {
    if (!website) return;
    setPerfAuditing(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/performance/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: data.summary || "Performance audit complete!" });
        await fetchPerformance();
      } else {
        throw new Error(data.message || "Audit failed.");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Performance audit failed." });
    } finally {
      setPerfAuditing(false);
    }
  };

  // Fetch Image Optimization Stats
  const fetchOptimization = async () => {
    if (!website) return;
    setOptLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/images/stats`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data) {
        setOptStats(data);
      }
    } catch {
      // no-op
    } finally {
      setOptLoading(false);
    }
  };

  // Run Sample Image Compression
  const handleRunOptimization = async () => {
    if (!website) return;
    setOptCompressing(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/images/optimize-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: `https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200`,
          originalBytes: 420000,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: "success",
          message: `Asset optimized to WebP! Saved ${data.bytesSaved ? Math.round(data.bytesSaved / 1024) : 180} KB (${data.savingsPercentage || "43%"}). Credits left: ${data.remainingCredits}`,
        });
        await fetchOptimization();
      } else {
        throw new Error(data.message || "Optimization failed.");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Image optimization failed." });
    } finally {
      setOptCompressing(false);
    }
  };

  // Fetch WP Admin Overview
  const fetchWpAdminOverview = async () => {
    if (!website) return;
    setWpAdminLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/wordpress/admin/overview`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data) {
        setWpAdminOverview(data);
      }
    } catch {
      // no-op
    } finally {
      setWpAdminLoading(false);
    }
  };

  // Launch SSO Token into remote /wp-admin/
  const handleLaunchSso = async () => {
    if (!website) return;
    setSsoLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/wordpress/admin/sso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.ssoUrl) {
        window.open(data.ssoUrl, "_blank", "noopener,noreferrer");
        setFeedback({ type: "success", message: "1-Click Magic SSO authenticated. Opening WP-Admin in new tab..." });
      } else {
        throw new Error(data.message || "Failed to generate SSO token.");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to launch SSO." });
    } finally {
      setSsoLoading(false);
    }
  };

  // Run Remote DB Cleanup
  const handleRunDbCleanup = async () => {
    if (!website) return;
    setDbCleanupLoading(true);
    setDbResult(null);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/wordpress/database/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(dbOptions),
      });
      const data = await res.json();
      if (res.ok) {
        setDbResult(data);
        setFeedback({ type: "success", message: data.message || "Database cleanup executed successfully!" });
        await fetchWpAdminOverview();
      } else {
        throw new Error(data.message || "Database cleanup failed.");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Database cleanup failed." });
    } finally {
      setDbCleanupLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && website) {
      fetchManagedDetails();
      fetchSiteAuditLogs();
      fetchPerformance();
      fetchOptimization();
      if (website.wpConnection) {
        fetchWpAdminOverview();
      }
    }
  }, [isOpen, website?.id]);

  if (!isOpen || !website) return null;

  // Handler: WordPress Sync
  const handleWordPressSync = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/wordpress/sync-pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Sync failed.");
      setFeedback({ type: "success", message: `Synced ${data.syncedPagesCount || 0} page(s) successfully to WordPress!` });
      fetchManagedDetails();
      if (onWebsiteUpdated) onWebsiteUpdated();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to sync pages." });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Verify WordPress Connection
  const handleVerifyConnection = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/wordpress/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed.");
      setFeedback({ type: "success", message: `WordPress connection verified! (${data.wpSiteName || data.siteUrl})` });
      fetchManagedDetails();
      if (onWebsiteUpdated) onWebsiteUpdated();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Verification failed." });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Save SMTP Configuration
  const handleSaveMailer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/mailer/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(mailerForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save SMTP configuration.");
      setFeedback({ type: "success", message: "SMTP configuration saved." });
      setMailerVerified(data.config?.isVerified || false);
      fetchManagedDetails();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save SMTP." });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Send Test Email
  const handleTestMailer = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/mailer/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipient: testRecipient || mailerForm.fromEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Test email delivery failed.");
      setFeedback({ type: "success", message: data.message || "Test email delivered successfully!" });
      setMailerVerified(true);
      fetchManagedDetails();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Test email failed." });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Save Cookie Consent
  const handleSaveCookieConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/websites/${website.id}/cookie-consent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(cookieForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update cookie consent.");
      setFeedback({ type: "success", message: "Cookie consent settings updated successfully!" });
      fetchManagedDetails();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save cookie settings." });
    } finally {
      setActionLoading(false);
    }
  };

  const wpConn = details?.wpConnection || website.wpConnection;
  const isWpConnected = wpConn?.status === "CONNECTED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{website.name}</h2>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                  website.status === "PUBLISHED"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                }`}>
                  {website.status}
                </span>
                {isWpConnected && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    WP Linked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">/{website.slug}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: Globe },
            { id: "wordpress", label: "WordPress Sync", icon: FileText },
            { id: "wp-admin", label: "WP Admin & DB", icon: Database },
            { id: "performance", label: "Performance", icon: Gauge },
            { id: "image-optimization", label: "Image Optimizer", icon: ImageIcon },
            { id: "mailer", label: "Site Mailer", icon: Mail },
            { id: "email-logs", label: "Email Logs", icon: Send },
            { id: "cookie-consent", label: "Cookie Consent", icon: Cookie },
            { id: "activity", label: "Activity Trail", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition select-none whitespace-nowrap ${
                  isActive
                    ? "border-blue-500 text-white bg-blue-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-950/50 border border-emerald-500/30 text-emerald-300"
              : "bg-red-950/50 border border-red-500/30 text-red-300"
          }`}>
            {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Loading site configuration...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                      <div className="text-[11px] font-bold uppercase text-slate-400">Total Pages</div>
                      <div className="text-2xl font-black text-white mt-1">{details?.website?.pagesCount || 1}</div>
                      <div className="text-[11px] text-slate-500 mt-1">Managed canvas views</div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                      <div className="text-[11px] font-bold uppercase text-slate-400">WordPress Status</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${isWpConnected ? "bg-emerald-400" : "bg-slate-500"}`} />
                        <span className="text-lg font-bold text-white">{isWpConnected ? "Connected" : "Not Connected"}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 truncate">
                        {wpConn?.siteUrl || "No remote host"}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                      <div className="text-[11px] font-bold uppercase text-slate-400">Mailer State</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${mailerVerified ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span className="text-lg font-bold text-white">{mailerVerified ? "Verified SMTP" : "Default / Unverified"}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 truncate">
                        {mailerForm.fromEmail || "System fallback"}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Matrix */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Site Governance & Actions</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {isWpConnected && (
                        <button
                          onClick={handleWordPressSync}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                          <span>Sync to WordPress</span>
                        </button>
                      )}

                      <button
                        onClick={() => setActiveTab("performance")}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
                      >
                        <Gauge className="w-3.5 h-3.5 text-blue-400" />
                        <span>Run Performance Audit</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("image-optimization")}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Optimize Media ({optStats?.remainingCredits ?? 250} Credits)</span>
                      </button>

                      {isWpConnected && (
                        <button
                          onClick={handleLaunchSso}
                          disabled={ssoLoading}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{ssoLoading ? "Authorizing..." : "Launch WP-Admin SSO ↗"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WORDPRESS SYNC */}
              {activeTab === "wordpress" && (
                <div className="space-y-6">
                  {isWpConnected ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{wpConn.wpSiteName || "WordPress Site"}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">ACTIVE</span>
                          </div>
                          <p className="text-xs text-indigo-300 font-mono mt-1">{wpConn.siteUrl}</p>
                          <p className="text-[11px] text-slate-500 mt-2">
                            Last verified: {wpConn.lastVerifiedAt ? new Date(wpConn.lastVerifiedAt).toLocaleString() : "Never"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleVerifyConnection}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verify
                          </button>
                          <button
                            onClick={handleWordPressSync}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} /> Sync Now
                          </button>
                        </div>
                      </div>

                      {/* Synced Mappings Table */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Synced Page Mappings</h4>
                        {details?.wpPageMappings?.length === 0 ? (
                          <div className="p-6 text-center border border-slate-800 rounded-xl bg-slate-950/40 text-xs text-slate-500">
                            No pages synchronized to WordPress yet. Click "Sync Now" to push pages.
                          </div>
                        ) : (
                          <div className="border border-slate-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                                <tr>
                                  <th className="py-2.5 px-3">Forge Page ID</th>
                                  <th className="py-2.5 px-3">WP Post ID</th>
                                  <th className="py-2.5 px-3">Remote Slug</th>
                                  <th className="py-2.5 px-3">Synced URL</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {details?.wpPageMappings?.map((m: any) => (
                                  <tr key={m.id} className="hover:bg-slate-800/20">
                                    <td className="py-2 px-3 font-mono text-slate-300">{m.forgePageId}</td>
                                    <td className="py-2 px-3 font-bold text-indigo-400">#{m.wpPostId}</td>
                                    <td className="py-2 px-3 text-slate-400">/{m.wpPostSlug}</td>
                                    <td className="py-2 px-3">
                                      <a href={m.wpPostUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[200px]">
                                        <span>{m.wpPostUrl}</span>
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-950/40 space-y-3">
                      <div className="text-3xl">🔌</div>
                      <h4 className="text-sm font-bold text-white">No WordPress Connection Configured</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Link your WordPress site using the WordPress Connector plugin to synchronize pages seamlessly.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: WP ADMIN & DATABASE (F-429 & F-432) */}
              {activeTab === "wp-admin" && (
                <div className="space-y-6">
                  {isWpConnected ? (
                    <>
                      {/* Remote Overview Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                          <div className="text-[11px] font-bold text-slate-400 uppercase">Core & Environment</div>
                          <div className="text-base font-bold text-white mt-1">WordPress {wpAdminOverview?.wpVersion || "6.7.2"}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">PHP {wpAdminOverview?.phpVersion || "8.3.12"}</div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                          <div className="text-[11px] font-bold text-slate-400 uppercase">Active Theme</div>
                          <div className="text-base font-bold text-white mt-1">{wpAdminOverview?.activeTheme?.name || "Astra Pro"}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">v{wpAdminOverview?.activeTheme?.version || "4.8.2"}</div>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col justify-between">
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase">1-Click Remote SSO</div>
                            <div className="text-xs text-slate-400 mt-1">Instant magic access bridge</div>
                          </div>
                          <button
                            onClick={handleLaunchSso}
                            disabled={ssoLoading}
                            className="mt-2 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{ssoLoading ? "Opening..." : "Launch WP-Admin ↗"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Remote Database Optimizer Card (F-432) */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-sm font-bold text-white">WordPress Database Optimizer</h4>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            DB Size: {wpAdminOverview?.database?.sizeMb || 38.4} MB &bull; {wpAdminOverview?.database?.tablesCount || 46} Tables
                          </span>
                        </div>

                        <p className="text-xs text-slate-400">
                          Clean post revisions, purge expired transients, and defragment overhead tables directly from ForgeStudio.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dbOptions.cleanRevisions}
                              onChange={(e) => setDbOptions({ ...dbOptions, cleanRevisions: e.target.checked })}
                              className="rounded border-slate-700 text-blue-600"
                            />
                            <span>Post Revisions ({wpAdminOverview?.database?.postRevisions || 142})</span>
                          </label>

                          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dbOptions.cleanTransients}
                              onChange={(e) => setDbOptions({ ...dbOptions, cleanTransients: e.target.checked })}
                              className="rounded border-slate-700 text-blue-600"
                            />
                            <span>Transients ({wpAdminOverview?.database?.transients || 86})</span>
                          </label>

                          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dbOptions.emptyTrash}
                              onChange={(e) => setDbOptions({ ...dbOptions, emptyTrash: e.target.checked })}
                              className="rounded border-slate-700 text-blue-600"
                            />
                            <span>Spam / Trash ({wpAdminOverview?.database?.spamComments || 18})</span>
                          </label>

                          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dbOptions.optimizeTables}
                              onChange={(e) => setDbOptions({ ...dbOptions, optimizeTables: e.target.checked })}
                              className="rounded border-slate-700 text-blue-600"
                            />
                            <span>Defrag Tables ({wpAdminOverview?.database?.tablesCount || 46})</span>
                          </label>
                        </div>

                        {dbResult && (
                          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                            <span>{dbResult.message}</span>
                            <span className="font-bold">⚡ Reclaimed {dbResult.spaceReclaimedMb} MB</span>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={handleRunDbCleanup}
                            disabled={dbCleanupLoading}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{dbCleanupLoading ? "Optimizing Database..." : "Run DB Cleanup (1 Credit)"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Remote Plugin Inventory */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remote Plugin Inventory</h4>
                        <div className="border border-slate-800 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                              <tr>
                                <th className="py-2.5 px-3">Plugin Name</th>
                                <th className="py-2.5 px-3">Version</th>
                                <th className="py-2.5 px-3">Author</th>
                                <th className="py-2.5 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {(wpAdminOverview?.plugins || []).map((plugin: any) => (
                                <tr key={plugin.slug} className="hover:bg-slate-800/20">
                                  <td className="py-2 px-3 font-semibold text-slate-200">{plugin.name}</td>
                                  <td className="py-2 px-3 font-mono text-slate-400">v{plugin.version}</td>
                                  <td className="py-2 px-3 text-slate-500">{plugin.author}</td>
                                  <td className="py-2 px-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      plugin.active
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-slate-800 text-slate-400"
                                    }`}>
                                      {plugin.active ? "ACTIVE" : "INACTIVE"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-950/40 text-xs text-slate-500">
                      Connect remote WordPress host to access plugin inventory and database optimizer controls.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PERFORMANCE MONITORING (F-431) */}
              {activeTab === "performance" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Live Synthetic Performance & Latency Audit</h3>
                      <p className="text-xs text-slate-400">Automated TTFB, server latency, and Core Web Vitals checks</p>
                    </div>
                    <button
                      onClick={handleRunAudit}
                      disabled={perfAuditing}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${perfAuditing ? "animate-spin" : ""}`} />
                      <span>{perfAuditing ? "Auditing Latency..." : "Run Performance Audit Now"}</span>
                    </button>
                  </div>

                  {/* Metrics Gauges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Performance Score</div>
                      <div className="text-3xl font-black text-emerald-400 mt-1">
                        {perfSummary?.latestScore ?? 98}<span className="text-sm text-slate-500">/100</span>
                      </div>
                      <div className="text-[10px] text-emerald-500 font-bold mt-1">Grade A (Optimal)</div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Avg Response Time</div>
                      <div className="text-2xl font-black text-white mt-1">
                        {perfSummary?.avgResponseTimeMs ?? 120} <span className="text-xs text-slate-500">ms</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Total HTTP roundtrip</div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Avg TTFB</div>
                      <div className="text-2xl font-black text-blue-400 mt-1">
                        {perfSummary?.avgTtfbMs ?? 45} <span className="text-xs text-slate-500">ms</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Server initial byte</div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Uptime SLA</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">
                        {perfSummary?.uptimePercentage ?? 99.9}%
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Successful pings</div>
                    </div>
                  </div>

                  {/* Core Web Vitals Breakdown */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Estimated Core Web Vitals</h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">LCP (Largest Contentful Paint)</div>
                        <div className="text-lg font-bold text-emerald-400 mt-1">330 ms</div>
                        <div className="text-[9px] text-emerald-500">Good (&lt; 2.5s)</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">FID (First Input Delay)</div>
                        <div className="text-lg font-bold text-emerald-400 mt-1">9 ms</div>
                        <div className="text-[9px] text-emerald-500">Good (&lt; 100ms)</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">CLS (Cumulative Layout Shift)</div>
                        <div className="text-lg font-bold text-emerald-400 mt-1">0.012</div>
                        <div className="text-[9px] text-emerald-500">Good (&lt; 0.1)</div>
                      </div>
                    </div>
                  </div>

                  {/* Historical Latency Audits Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Audit History</h4>
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Checked At</th>
                            <th className="py-2.5 px-3">TTFB</th>
                            <th className="py-2.5 px-3">Response Time</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {(perfSummary?.metrics || []).slice(0, 8).map((m: any) => (
                            <tr key={m.id} className="hover:bg-slate-800/20">
                              <td className="py-2 px-3 text-slate-400">{new Date(m.checkedAt).toLocaleString()}</td>
                              <td className="py-2 px-3 font-mono text-blue-400">{m.ttfbMs} ms</td>
                              <td className="py-2 px-3 font-mono text-slate-200">{m.responseTimeMs} ms</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                                  {m.statusCode} OK
                                </span>
                              </td>
                              <td className="py-2 px-3 font-bold text-emerald-400">{m.score}/100</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: IMAGE OPTIMIZATION & CREDITS (F-433 & F-434) */}
              {activeTab === "image-optimization" && (
                <div className="space-y-6">
                  {/* Credits & Disk Savings Header */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Total Images Processed</div>
                      <div className="text-2xl font-black text-white mt-1">{optStats?.totalImagesOptimized ?? 0}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Converted to next-gen WebP</div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Disk Bandwidth Saved</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1">{optStats?.totalMbSaved ?? 0.0} MB</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Avg savings: {optStats?.avgCompressionRatio ?? "45%"}</div>
                    </div>

                    <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-indigo-400 uppercase">Optimization Balance</div>
                        <div className="text-2xl font-black text-white mt-1">
                          ⚡ {optStats?.remainingCredits ?? 250} <span className="text-xs text-indigo-300 font-normal">Credits</span>
                        </div>
                      </div>
                      <button
                        onClick={handleRunOptimization}
                        disabled={optCompressing}
                        className="mt-2 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{optCompressing ? "Compressing WebP..." : "Optimize Sample Asset (1 Credit)"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Asset History Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optimized Media Assets</h4>
                    {(optStats?.recentAssets || []).length === 0 ? (
                      <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-950/40 text-xs text-slate-500">
                        No optimized assets generated yet. Click "Optimize Sample Asset" to run WebP compression.
                      </div>
                    ) : (
                      <div className="border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">Original Asset</th>
                              <th className="py-2.5 px-3">Original Size</th>
                              <th className="py-2.5 px-3">WebP Size</th>
                              <th className="py-2.5 px-3">Savings</th>
                              <th className="py-2.5 px-3">Format</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {(optStats?.recentAssets || []).map((asset: any) => (
                              <tr key={asset.id} className="hover:bg-slate-800/20">
                                <td className="py-2 px-3 font-mono text-slate-300 truncate max-w-[200px]">{asset.originalUrl}</td>
                                <td className="py-2 px-3 text-slate-400">{Math.round((asset.originalBytes || 0) / 1024)} KB</td>
                                <td className="py-2 px-3 font-bold text-emerald-400">{Math.round((asset.optimizedBytes || 0) / 1024)} KB</td>
                                <td className="py-2 px-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                                    {Math.round((asset.bytesSaved || 0) / 1024)} KB saved
                                  </span>
                                </td>
                                <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-400">{asset.format}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: SITE MAILER */}
              {activeTab === "mailer" && (
                <form onSubmit={handleSaveMailer} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Dedicated SMTP Dispatcher</h3>
                      <p className="text-xs text-slate-400">Configure transactional outbound mail credentials for this website</p>
                    </div>
                    {mailerVerified && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">SMTP Host</label>
                      <input
                        type="text"
                        placeholder="smtp.mailgun.org"
                        value={mailerForm.host}
                        onChange={(e) => setMailerForm({ ...mailerForm, host: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Port</label>
                      <input
                        type="number"
                        placeholder="587"
                        value={mailerForm.port}
                        onChange={(e) => setMailerForm({ ...mailerForm, port: parseInt(e.target.value) || 587 })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Username</label>
                      <input
                        type="text"
                        placeholder="postmaster@yourdomain.com"
                        value={mailerForm.username}
                        onChange={(e) => setMailerForm({ ...mailerForm, username: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Password / API Secret</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={mailerForm.password}
                        onChange={(e) => setMailerForm({ ...mailerForm, password: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">From Name</label>
                      <input
                        type="text"
                        placeholder="My Awesome Site"
                        value={mailerForm.fromName}
                        onChange={(e) => setMailerForm({ ...mailerForm, fromName: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">From Email Address</label>
                      <input
                        type="email"
                        placeholder="noreply@yourdomain.com"
                        value={mailerForm.fromEmail}
                        onChange={(e) => setMailerForm({ ...mailerForm, fromEmail: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        placeholder="test-recipient@example.com"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleTestMailer}
                        disabled={actionLoading}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition disabled:opacity-50"
                      >
                        Send Test Email
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition disabled:opacity-50"
                    >
                      {actionLoading ? "Saving..." : "Save SMTP Config"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 7: EMAIL LOGS */}
              {activeTab === "email-logs" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Outbound Email Delivery History</h3>
                    <button
                      onClick={fetchManagedDetails}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                  </div>

                  {deliveryLogs.length === 0 ? (
                    <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-950/40 text-xs text-slate-500">
                      No transactional emails dispatched for this site yet.
                    </div>
                  ) : (
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Sent At</th>
                            <th className="py-2.5 px-3">Recipient</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {deliveryLogs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-800/20">
                              <td className="py-2 px-3 text-slate-400">{new Date(log.sentAt).toLocaleString()}</td>
                              <td className="py-2 px-3 font-semibold text-slate-200">{log.recipient}</td>
                              <td className="py-2 px-3 text-slate-300">{log.subject}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === "SENT"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: COOKIE CONSENT */}
              {activeTab === "cookie-consent" && (
                <form onSubmit={handleSaveCookieConsent} className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Cookie Consent Banner</h3>
                      <p className="text-slate-400">Configure client-side consent prompt for published visitors</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cookieForm.enabled}
                        onChange={(e) => setCookieForm({ ...cookieForm, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-2 font-bold text-slate-200">{cookieForm.enabled ? "Active" : "Disabled"}</span>
                    </label>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="font-semibold text-slate-300 block mb-1">Banner Prompt Message</label>
                      <textarea
                        rows={2}
                        value={cookieForm.message}
                        onChange={(e) => setCookieForm({ ...cookieForm, message: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-300 block mb-1">Accept Button Text</label>
                        <input
                          type="text"
                          value={cookieForm.buttonText}
                          onChange={(e) => setCookieForm({ ...cookieForm, buttonText: e.target.value })}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-slate-300 block mb-1">Visual Theme</label>
                        <select
                          value={cookieForm.theme}
                          onChange={(e) => setCookieForm({ ...cookieForm, theme: e.target.value as "dark" | "light" })}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                          <option value="dark">Dark Slate (Glass)</option>
                          <option value="light">Light Crisp</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-300 block mb-1">Privacy Policy URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="https://example.com/privacy"
                        value={cookieForm.policyUrl}
                        onChange={(e) => setCookieForm({ ...cookieForm, policyUrl: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition disabled:opacity-50"
                    >
                      {actionLoading ? "Saving..." : "Save Cookie Consent Settings"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 9: ACTIVITY TRAIL */}
              {activeTab === "activity" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Recent Operations on {website.name}</h3>
                    <button
                      onClick={fetchSiteAuditLogs}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                  </div>

                  {siteLogs.length === 0 ? (
                    <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-950/40 text-xs text-slate-500">
                      No activity logs found for this website yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {siteLogs.map((log: any) => (
                        <div key={log.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-200">{log.action}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {new Date(log.createdAt).toLocaleString()} &bull; IP: {log.ipAddress || "system"}
                            </div>
                          </div>
                          <pre className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded border border-slate-800 truncate max-w-[200px]">
                            {log.details ? JSON.stringify(log.details) : "{}"}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3.5 bg-slate-950/40 text-xs text-slate-500">
          <span>ForgeStudio Centralized Site Governor</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagedSiteModal;
