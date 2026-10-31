import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  Code,
  FileSpreadsheet,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Bell,
  Mail,
  Send,
  Save,
  Settings,
  Webhook,
  Key,
  Shield,
  RotateCcw,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";

interface FormSubmission {
  id: string;
  websiteId: string;
  formId: string;
  data: Record<string, any>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    referer?: string;
    submittedAt?: string;
    [key: string]: any;
  };
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  websiteId: string;
  eventId: string;
  endpointUrl: string;
  event: string;
  status: "SUCCESS" | "FAILED";
  httpStatus?: number;
  requestPayload: any;
  responseBody?: string;
  errorMessage?: string;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FormSubmissionsModalProps {
  websiteId: string;
  websiteName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const FormSubmissionsModal: React.FC<FormSubmissionsModalProps> = ({
  websiteId,
  websiteName = "Website",
  isOpen = true,
  onClose,
  isEmbedded = false,
}) => {
  const apiUrl =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) ||
    "http://localhost:5000";

  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d">("all");
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Email Notification Settings State (Feature 2)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [subjectTemplate, setSubjectTemplate] = useState("New Lead from {{formName}}");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [savedSettings, setSavedSettings] = useState<{
    id?: string;
    websiteId: string;
    notificationEmail: string;
    enabled: boolean;
    subjectTemplate?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null>(null);

  const fetchSubmissions = async () => {
    if (!websiteId) return;
    setLoading(true);
    setFeedback(null);
    try {
      let query = `page=${page}&limit=10`;
      if (search.trim()) {
        query += `&search=${encodeURIComponent(search.trim())}`;
      }
      if (dateFilter !== "all") {
        query += `&dateRange=${dateFilter}`;
      }

      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/submissions?${query}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSubmissions(json.data || []);
        setTotalSubmissions(json.pagination?.total || (json.data || []).length);
        setTotalPages(json.pagination?.pages || 1);
      } else {
        throw new Error(json.message || json.error || "Failed to load submissions");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Could not retrieve submissions." });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationSettings = async () => {
    if (!websiteId) return;
    try {
      setLoadingSettings(true);
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/notifications`, {
        credentials: "include",
        headers: {
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        if (json.data.notificationEmail) {
          setSavedSettings(json.data);
        } else {
          setSavedSettings(null);
        }
        setNotificationEmail(json.data.notificationEmail || "");
        setNotificationsEnabled(json.data.enabled !== false);
        if (json.data.subjectTemplate) {
          setSubjectTemplate(json.data.subjectTemplate);
        }
      }
    } catch (err) {
      console.warn("Failed to load notification settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Webhook Settings & Deliveries State (Feature 3B)
  const [isWebhooksOpen, setIsWebhooksOpen] = useState(false);
  const [webhookEndpoint, setWebhookEndpoint] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["form.submitted"]);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [hasConfiguredSecret, setHasConfiguredSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [loadingWebhookSettings, setLoadingWebhookSettings] = useState(false);
  const [savingWebhookSettings, setSavingWebhookSettings] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(null);
  const [inspectingDelivery, setInspectingDelivery] = useState<WebhookDelivery | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [webhookUrlError, setWebhookUrlError] = useState<string | null>(null);
  const [webhookUrlTouched, setWebhookUrlTouched] = useState(false);

  const validateWebhookUrl = (url: string): { valid: boolean; error?: string } => {
    const trimmed = (url || "").trim();
    if (!trimmed) {
      return { valid: false, error: "Webhook URL is required" };
    }

    // Reject email addresses or strings lacking protocol scheme
    if (trimmed.includes("@") && !trimmed.includes("://")) {
      return { valid: false, error: "Enter a valid webhook URL starting with https://" };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { valid: false, error: "Enter a valid webhook URL starting with https://" };
    }

    if (!parsed.hostname || parsed.hostname.trim() === "") {
      return { valid: false, error: "Enter a valid webhook URL starting with https://" };
    }

    const isLocalDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (parsed.protocol === "https:") {
      return { valid: true };
    }

    if (parsed.protocol === "http:" && isLocalDev) {
      return { valid: true };
    }

    return { valid: false, error: "Enter a valid webhook URL starting with https://" };
  };

  const fetchWebhookSettings = async () => {
    if (!websiteId) return;
    try {
      setLoadingWebhookSettings(true);
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/webhooks`, {
        credentials: "include",
        headers: {
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setWebhookEndpoint(json.data.endpointUrl || "");
        setWebhookEnabled(json.data.enabled !== false);
        setWebhookEvents(json.data.events || ["form.submitted"]);
        setHasConfiguredSecret(Boolean(json.data?.hasSecret));
        setWebhookSecret(json.data?.signingSecret || "");
        setWebhookUrlError(null);
        setWebhookUrlTouched(false);
      }
    } catch (err) {
      console.warn("Failed to load webhook settings:", err);
    } finally {
      setLoadingWebhookSettings(false);
    }
  };

  const fetchWebhookDeliveries = async () => {
    if (!websiteId) return;
    try {
      setLoadingDeliveries(true);
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/webhooks/deliveries`, {
        credentials: "include",
        headers: {
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      });
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setDeliveries(json.data);
      }
    } catch (err) {
      console.warn("Failed to load webhook deliveries:", err);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleSaveWebhookSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setWebhookUrlTouched(true);
    const cleanUrl = webhookEndpoint.trim();

    if (webhookEnabled || cleanUrl.length > 0) {
      if (!cleanUrl) {
        const errorMsg = "Webhook URL is required";
        setWebhookUrlError(errorMsg);
        setWebhookFeedback({
          type: "error",
          message: errorMsg,
        });
        return;
      }

      const validation = validateWebhookUrl(cleanUrl);
      if (!validation.valid) {
        const errorMsg = validation.error || "Enter a valid webhook URL starting with https://";
        setWebhookUrlError(errorMsg);
        setWebhookFeedback({
          type: "error",
          message: errorMsg,
        });
        return;
      }
    }

    setWebhookUrlError(null);
    setSavingWebhookSettings(true);
    setWebhookFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/webhooks`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify({
          endpointUrl: cleanUrl,
          enabled: webhookEnabled,
          events: webhookEvents,
          signingSecret: webhookSecret.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errMsg = json.error?.message || json.message || "Failed to save webhook settings";
        if (json.error?.code === "INVALID_WEBHOOK_URL") {
          setWebhookUrlError(errMsg);
        }
        throw new Error(errMsg);
      }

      setHasConfiguredSecret(Boolean(json.data?.hasSecret));
      setWebhookSecret(json.data?.signingSecret || "");
      setWebhookFeedback({
        type: "success",
        message: "Webhook settings saved successfully! Future form submissions will be delivered in real-time.",
      });
    } catch (err: any) {
      setWebhookFeedback({
        type: "error",
        message: err.message || "Failed to update webhook settings",
      });
    } finally {
      setSavingWebhookSettings(false);
    }
  };

  const handleSendTestWebhook = async () => {
    setWebhookUrlTouched(true);
    const cleanUrl = webhookEndpoint.trim();
    if (!cleanUrl) {
      const errorMsg = "Webhook URL is required";
      setWebhookUrlError(errorMsg);
      setWebhookFeedback({
        type: "error",
        message: errorMsg,
      });
      return;
    }

    const validation = validateWebhookUrl(cleanUrl);
    if (!validation.valid) {
      const errorMsg = validation.error || "Enter a valid webhook URL starting with https://";
      setWebhookUrlError(errorMsg);
      setWebhookFeedback({
        type: "error",
        message: errorMsg,
      });
      return;
    }

    setWebhookUrlError(null);
    setTestingWebhook(true);
    setWebhookFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/webhooks/test`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify({
          targetUrl: cleanUrl,
          customSecret: webhookSecret.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errMsg = json.error?.message || json.message || "Test webhook delivery failed";
        if (json.error?.code === "INVALID_WEBHOOK_URL") {
          setWebhookUrlError(errMsg);
        }
        throw new Error(errMsg);
      }

      setWebhookFeedback({
        type: "success",
        message: json.message || "✓ Test webhook delivered successfully!",
      });
      fetchWebhookDeliveries();
    } catch (err: any) {
      setWebhookFeedback({
        type: "error",
        message: `Delivery failed: ${err.message || "Unable to reach endpoint"}`,
      });
      fetchWebhookDeliveries();
    } finally {
      setTestingWebhook(false);
    }
  };


  const handleRetryDelivery = async (deliveryId: string) => {
    setRetryingDeliveryId(deliveryId);
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/webhooks/deliveries/${deliveryId}/retry`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Retry failed");
      }

      setWebhookFeedback({
        type: "success",
        message: `Delivery #${deliveryId.slice(0, 8)} retried successfully!`,
      });
      fetchWebhookDeliveries();
    } catch (err: any) {
      setWebhookFeedback({
        type: "error",
        message: `Retry error: ${err.message || "Failed to retry delivery"}`,
      });
      fetchWebhookDeliveries();
    } finally {
      setRetryingDeliveryId(null);
    }
  };

  const handleClearSecret = async () => {
    setWebhookSecret("");
    setHasConfiguredSecret(false);
    setSavingWebhookSettings(true);
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/webhooks`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify({
          endpointUrl: webhookEndpoint.trim(),
          enabled: webhookEnabled,
          events: webhookEvents,
          clearSecret: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setWebhookFeedback({
          type: "success",
          message: "Signing secret cleared successfully.",
        });
      }
    } catch (err: any) {
      setWebhookFeedback({
        type: "error",
        message: err.message || "Failed to clear secret",
      });
    } finally {
      setSavingWebhookSettings(false);
    }
  };

  useEffect(() => {
    if (websiteId && (isEmbedded || isOpen)) {
      queueMicrotask(() => {
        fetchSubmissions();
        fetchNotificationSettings();
        fetchWebhookSettings();
        fetchWebhookDeliveries();
      });
    }
  }, [websiteId, page, dateFilter, isOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  const handleDelete = async (submissionId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this form submission?")) {
      return;
    }
    setIsDeleting(submissionId);
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/submissions/${submissionId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
        setTotalSubmissions((prev) => Math.max(0, prev - 1));
        setFeedback({ type: "success", message: "Submission removed successfully." });
        if (selectedSubmission?.id === submissionId) {
          setSelectedSubmission(null);
        }
      } else {
        throw new Error(json.message || "Failed to delete submission");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Delete failed" });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/export?format=csv`, {
        credentials: "include",
        headers: {
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || "Failed to export CSV");
      }

      // Safely parse server-provided filename from Content-Disposition header with safe fallback
      let filename = `form-submissions-${websiteId}-${new Date().toISOString().split("T")[0]}.csv`;
      const disposition = res.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
        if (match && match[1]?.trim()) {
          filename = match[1].trim();
        }
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      setFeedback({ type: "success", message: "CSV exported successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "CSV export failed" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async (submissionId: string) => {
    setDownloadingPdfId(submissionId);
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/submissions/${submissionId}/pdf`, {
        credentials: "include",
        headers: {
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || "Failed to generate submission PDF");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `submission-${submissionId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      setFeedback({ type: "success", message: "PDF downloaded successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "PDF download failed" });
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleSaveNotificationSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/notifications`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify({
          notificationEmail: notificationEmail.trim(),
          enabled: notificationsEnabled,
          subjectTemplate: subjectTemplate.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save notification settings");
      }

      if (json.data) {
        setSavedSettings(json.data);
      }
      await fetchNotificationSettings();

      setSettingsFeedback({
        type: "success",
        message: "Lead notification settings saved successfully! Future form submissions will notify this address.",
      });
    } catch (err: any) {
      setSettingsFeedback({
        type: "error",
        message: err.message || "Failed to update notification settings",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!notificationEmail.trim()) {
      setSettingsFeedback({
        type: "error",
        message: "Please enter a valid recipient email address first before sending a test notification.",
      });
      return;
    }
    setTestingEmail(true);
    setSettingsFeedback(null);
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/notifications/test`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify({
          targetEmail: notificationEmail.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Test email delivery failed");
      }

      setSettingsFeedback({
        type: "success",
        message: `✓ Test lead notification email delivered successfully to ${notificationEmail.trim()} via SMTP!`,
      });
    } catch (err: any) {
      setSettingsFeedback({
        type: "error",
        message: `Delivery failed: ${err.message || "Unable to send email via SMTP provider"}`,
      });
    } finally {
      setTestingEmail(false);
    }
  };

  if (!isOpen && !isEmbedded) return null;

  const content = (
    <div className="space-y-6">
      {/* Top Banner & Quick Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Form Submissions & Leads
              </h3>
              <p className="text-xs text-slate-400">
                Audited lead records captured across all forms on{" "}
                <span className="font-semibold text-slate-200">{websiteName}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsSettingsOpen(!isSettingsOpen);
              if (!isSettingsOpen && isWebhooksOpen) setIsWebhooksOpen(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isSettingsOpen
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
            title="Configure lead email notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Email Notifications</span>
            {notificationEmail && notificationsEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isWebhooksOpen;
              setIsWebhooksOpen(next);
              if (next) {
                if (isSettingsOpen) setIsSettingsOpen(false);
                setWebhookUrlError(null);
                setWebhookUrlTouched(false);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isWebhooksOpen
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
            title="Configure real-time webhooks"
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks</span>
            {webhookEndpoint && webhookEnabled && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={fetchSubmissions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition disabled:opacity-50 cursor-pointer"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-xs font-bold text-white shadow-lg shadow-emerald-950/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Email Notification Settings Drawer / Panel */}
      {isSettingsOpen && (
        <div className="p-5 rounded-2xl border border-blue-500/30 bg-slate-900/90 shadow-xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Mail className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Lead Notification Email Settings</h4>
                <p className="text-xs text-slate-400">
                  Automatically receive an email whenever a visitor submits any form on this website.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {settingsFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                settingsFeedback.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                  : "bg-red-950/40 border-red-800 text-red-300"
              }`}
            >
              {settingsFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{settingsFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveNotificationSettings} className="space-y-4">
            <div className="flex items-center gap-2.5">
              <input
                id="notif-enabled"
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
              />
              <label htmlFor="notif-enabled" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                Enable instant email alerts when forms are submitted
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Recipient Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required={notificationsEnabled}
                    disabled={savingSettings || testingEmail}
                    value={notificationEmail}
                    onChange={(e) => {
                      setNotificationEmail(e.target.value);
                      if (!notificationsEnabled && e.target.value.trim().length > 0) {
                        setNotificationsEnabled(true);
                      }
                    }}
                    placeholder="leads@yourbusiness.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 transition disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Where visitor inquiries and leads will be sent.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Notification Subject Template
                </label>
                <input
                  type="text"
                  disabled={savingSettings || testingEmail}
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  placeholder="New Lead from {{formName}}"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 transition disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-500 mt-1">Use <code className="text-blue-400">{"{{formName}}"}</code> for dynamic form titles.</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 flex-wrap gap-2">
              <div className="text-[11px] text-slate-400">
                Uses verified transactional SMTP with retry queuing.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  disabled={testingEmail || savingSettings || !notificationEmail.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${testingEmail ? "animate-pulse text-blue-400" : ""}`} />
                  <span>{testingEmail ? "Sending Test..." : "Send Test Email"}</span>
                </button>

                <button
                  type="submit"
                  disabled={savingSettings || testingEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Active Saved Notification Settings Record */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Configured Notification Record
                </h5>
              </div>
              {savedSettings?.updatedAt && (
                <span className="text-[11px] text-slate-500">
                  Last updated: {new Date(savedSettings.updatedAt).toLocaleString()}
                </span>
              )}
            </div>

            {savedSettings && savedSettings.notificationEmail ? (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {savedSettings.notificationEmail}
                    </span>
                    {savedSettings.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        DISABLED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Subject: <code className="text-blue-400 font-mono">{savedSettings.subjectTemplate || "New Lead from {{formName}}"}</code>
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Record ID: {savedSettings.id ? `${savedSettings.id.slice(0, 8)}...` : websiteId.slice(0, 8)}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 text-center">
                <p className="text-xs text-slate-400">No notification record saved yet.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter an email address above and click Save Settings to activate lead notifications.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhook Settings Drawer / Panel (Feature 3B) */}
      {isWebhooksOpen && (
        <div className="p-5 rounded-2xl border border-purple-500/30 bg-slate-900/90 shadow-xl space-y-5 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Webhook className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Webhook Settings & Real-Time Delivery</h4>
                <p className="text-xs text-slate-400">
                  Deliver validated form submission events directly to external HTTP/HTTPS endpoints with HMAC-SHA256 signatures.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsWebhooksOpen(false);
                setWebhookUrlError(null);
                setWebhookUrlTouched(false);
              }}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {webhookFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                webhookFeedback.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                  : "bg-red-950/40 border-red-800 text-red-300"
              }`}
            >
              {webhookFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{webhookFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveWebhookSettings} className="space-y-4">
            <div className="flex items-center gap-2.5">
              <input
                id="webhook-enabled"
                type="checkbox"
                checked={webhookEnabled}
                onChange={(e) => setWebhookEnabled(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
              />
              <label htmlFor="webhook-enabled" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                Enable instant webhook delivery when forms are submitted
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Webhook Endpoint URL <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required={webhookEnabled}
                    disabled={savingWebhookSettings || testingWebhook}
                    value={webhookEndpoint}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWebhookEndpoint(val);
                      if (webhookUrlTouched) {
                        if (!val.trim()) {
                          setWebhookUrlError("Webhook URL is required");
                        } else {
                          const check = validateWebhookUrl(val);
                          setWebhookUrlError(check.valid ? null : check.error || "Enter a valid webhook URL starting with https://");
                        }
                      }
                      if (!webhookEnabled && val.trim().length > 0) {
                        setWebhookEnabled(true);
                      }
                    }}
                    onBlur={() => {
                      setWebhookUrlTouched(true);
                      if (!webhookEndpoint.trim()) {
                        if (webhookEnabled) {
                          setWebhookUrlError("Webhook URL is required");
                        } else {
                          setWebhookUrlError(null);
                        }
                      } else {
                        const check = validateWebhookUrl(webhookEndpoint);
                        setWebhookUrlError(check.valid ? null : check.error || "Enter a valid webhook URL starting with https://");
                      }
                    }}
                    placeholder="https://api.yourdomain.com/webhooks/leads"
                    className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition disabled:opacity-50 ${
                      webhookUrlTouched && webhookUrlError
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30"
                        : "border-slate-800 focus:border-purple-500"
                    }`}
                  />
                </div>
                {webhookUrlTouched && webhookUrlError ? (
                  <p className="text-[11px] text-rose-400 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{webhookUrlError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Target destination. SSRF protection blocks localhost, internal IPs, and private subnets.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Signing Secret (HMAC-SHA256)
                  </label>
                  {hasConfiguredSecret && (
                    <button
                      type="button"
                      onClick={handleClearSecret}
                      disabled={savingWebhookSettings}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Clear Secret
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showSecret ? "text" : "password"}
                    disabled={savingWebhookSettings || testingWebhook}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder={hasConfiguredSecret ? "•••••••••••• (Leave blank to keep current secret)" : "Optional secret key to verify signatures"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-12 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500 transition disabled:opacity-50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="p-1 text-slate-400 hover:text-slate-200 text-xs rounded transition"
                      title={showSecret ? "Hide secret" : "Show secret"}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  ForgeStudio signs payloads via <code className="text-purple-400">X-Webhook-Signature: t=&lt;ts&gt;,v1=&lt;sig&gt;</code>.
                </p>
              </div>
            </div>

            {/* Event Selection */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="block text-xs font-medium text-slate-300 mb-2">Subscribed Events:</span>
              <div className="flex items-center gap-2">
                <input
                  id="event-form-submitted"
                  type="checkbox"
                  checked={webhookEvents.includes("form.submitted")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setWebhookEvents([...webhookEvents, "form.submitted"]);
                    } else {
                      setWebhookEvents(webhookEvents.filter((ev) => ev !== "form.submitted"));
                    }
                  }}
                  className="rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
                />
                <label htmlFor="event-form-submitted" className="text-xs text-slate-200 cursor-pointer">
                  <code className="text-purple-400 font-semibold">form.submitted</code> — Dispatched whenever a visitor successfully submits any valid form.
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 flex-wrap gap-2">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>SSRF-guarded, redirect-checked, and backed by automated retries.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendTestWebhook}
                  disabled={testingWebhook || savingWebhookSettings || !webhookEndpoint.trim() || Boolean(webhookUrlTouched && webhookUrlError)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${testingWebhook ? "animate-pulse text-purple-400" : ""}`} />
                  <span>{testingWebhook ? "Sending Test..." : "Send Test Webhook"}</span>
                </button>

                <button
                  type="submit"
                  disabled={savingWebhookSettings || testingWebhook || (webhookEnabled && webhookUrlTouched && Boolean(webhookUrlError))}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingWebhookSettings ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Delivery History Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Recent Deliveries ({deliveries.length})
                </h5>
              </div>
              <button
                type="button"
                onClick={fetchWebhookDeliveries}
                disabled={loadingDeliveries}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingDeliveries ? "animate-spin" : ""}`} />
                <span>Refresh Log</span>
              </button>
            </div>

            {loadingDeliveries ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading delivery records...</div>
            ) : deliveries.length === 0 ? (
              <div className="p-6 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
                <Webhook className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-400 font-medium">No webhook deliveries recorded yet.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Deliveries will appear here automatically when forms are submitted or tests are triggered.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">Event</th>
                      <th className="px-3.5 py-2.5">HTTP Status</th>
                      <th className="px-3.5 py-2.5">Attempts</th>
                      <th className="px-3.5 py-2.5">Time</th>
                      <th className="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          {delivery.status === "SUCCESS" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                              <CheckCircle2 className="w-3 h-3" />
                              SUCCESS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/60">
                              <AlertCircle className="w-3 h-3" />
                              FAILED
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-300">
                          {delivery.event}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px]">
                          {delivery.httpStatus ? (
                            <span className={delivery.httpStatus < 400 ? "text-emerald-400" : "text-rose-400"}>
                              {delivery.httpStatus}
                            </span>
                          ) : (
                            <span className="text-slate-500">{delivery.errorMessage || "Network Err"}</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-400">
                          {delivery.attemptCount || 1}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-400 text-[11px]">
                          {new Date(delivery.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => setInspectingDelivery(delivery)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 transition cursor-pointer"
                            title="Inspect request payload and headers"
                          >
                            <Code className="w-3 h-3" />
                            <span>Payload</span>
                          </button>

                          {delivery.status === "FAILED" && (
                            <button
                              type="button"
                              onClick={() => handleRetryDelivery(delivery.id)}
                              disabled={retryingDeliveryId === delivery.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 text-[11px] text-rose-200 transition disabled:opacity-50 cursor-pointer"
                              title="Retry delivery now"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingDeliveryId === delivery.id ? "animate-spin" : ""}`} />
                              <span>{retryingDeliveryId === delivery.id ? "Retrying..." : "Retry"}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-medium ${
            feedback.type === "success"
              ? "bg-emerald-950/30 border-emerald-800 text-emerald-300"
              : "bg-red-950/30 border-red-800 text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, email, or content..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-20 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-semibold"
          >
            Find
          </button>
        </form>

        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-900 border border-slate-800 rounded-xl p-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Date:
          </span>
          {(["all", "today", "7d", "30d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => {
                setDateFilter(range);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                dateFilter === range
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {range === "all" ? "All" : range === "today" ? "Today" : range === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table / Card List */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
            <p className="text-xs font-medium">Loading form submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-600 mb-1" />
            <p className="text-sm font-bold text-slate-300">No submissions recorded</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When visitors submit forms on your published site, incoming leads and field answers will be logged here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Form / ID</th>
                  <th className="py-3 px-4">Submitted Data Preview</th>
                  <th className="py-3 px-4">Client Info</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {submissions.map((sub) => {
                  const dataEntries = Object.entries(sub.data || {});
                  const clientIp = sub.metadata?.ip || "Unknown IP";
                  const dateFormatted = new Date(sub.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition group">
                      {/* Form & ID */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-bold text-slate-200 block truncate max-w-[140px]">
                          {sub.formId || "form"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          #{sub.id.slice(0, 8)}
                        </span>
                      </td>

                      {/* Data Preview Pills */}
                      <td className="py-3.5 px-4 align-top max-w-md">
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {dataEntries.length === 0 ? (
                            <span className="text-slate-500 italic">No fields</span>
                          ) : (
                            dataEntries.slice(0, 6).map(([key, val]) => (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700/60"
                              >
                                <span className="font-semibold text-slate-400">{key}:</span>
                                <span className="text-white max-w-[120px] truncate">
                                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                </span>
                              </span>
                            ))
                          )}
                          {dataEntries.length > 6 && (
                            <span className="text-[10px] font-bold text-blue-400 self-center">
                              +{dataEntries.length - 6} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Client Info */}
                      <td className="py-3.5 px-4 align-top text-slate-400">
                        <div className="flex items-center gap-1 text-[11px] text-slate-300">
                          <Globe className="w-3 h-3 text-slate-500" />
                          <span>{clientIp}</span>
                        </div>
                        {sub.metadata?.userAgent && (
                          <span
                            className="text-[10px] text-slate-500 truncate block max-w-[120px]"
                            title={sub.metadata.userAgent}
                          >
                            {sub.metadata.userAgent.includes("Mobile") ? "Mobile" : "Desktop"} Browser
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 align-top text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{dateFormatted}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Download PDF (X-800) */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(sub.id)}
                            disabled={downloadingPdfId === sub.id}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
                            title="Download PDF Lead Report"
                          >
                            <Download className={`w-3.5 h-3.5 ${downloadingPdfId === sub.id ? "animate-bounce" : ""}`} />
                          </button>

                          {/* View Full JSON */}
                          <button
                            type="button"
                            onClick={() => setSelectedSubmission(sub)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition cursor-pointer"
                            title="Inspect Full Submission JSON"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(sub.id)}
                            disabled={isDeleting === sub.id}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/50 text-slate-400 hover:text-red-400 transition disabled:opacity-50 cursor-pointer"
                            title="Delete Submission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
            <span>
              Showing page <strong className="text-white">{page}</strong> of{" "}
              <strong className="text-white">{totalPages}</strong> ({totalSubmissions} leads total)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Full JSON Modal Overlay */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                <h4 className="text-sm font-bold text-white">
                  Submission Payload (#{selectedSubmission.id.slice(0, 8)})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Submitted Fields
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                  {JSON.stringify(selectedSubmission.data, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Submission Metadata
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-blue-300 overflow-x-auto">
                  {JSON.stringify(
                    {
                      id: selectedSubmission.id,
                      websiteId: selectedSubmission.websiteId,
                      formId: selectedSubmission.formId,
                      createdAt: selectedSubmission.createdAt,
                      metadata: selectedSubmission.metadata,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/40">
              <button
                type="button"
                onClick={() => handleDownloadPdf(selectedSubmission.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Report</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Delivery Payload Inspector Modal (Feature 3B) */}
      {inspectingDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">
                  Webhook Delivery Inspector
                </h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inspectingDelivery.status === "SUCCESS" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800"}`}>
                  {inspectingDelivery.status} {inspectingDelivery.httpStatus ? `(${inspectingDelivery.httpStatus})` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDelivery(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block">Event ID:</span>
                  <span className="text-slate-200">{inspectingDelivery.eventId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Delivered At:</span>
                  <span className="text-slate-200">{new Date(inspectingDelivery.createdAt).toLocaleString()}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Destination URL:</span>
                  <span className="text-purple-300 break-all">{inspectingDelivery.endpointUrl}</span>
                </div>
                {inspectingDelivery.errorMessage && (
                  <div className="col-span-2 text-rose-300">
                    <span className="text-slate-500 block">Error Detail:</span>
                    <span>{inspectingDelivery.errorMessage}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-300 text-xs">Request JSON Payload:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(inspectingDelivery.requestPayload, null, 2));
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition"
                  >
                    {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSecret ? "Copied!" : "Copy Payload"}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto max-h-56">
                  {JSON.stringify(inspectingDelivery.requestPayload, null, 2)}
                </pre>
              </div>

              {inspectingDelivery.responseBody && (
                <div>
                  <span className="font-semibold text-slate-300 text-xs block mb-1.5">Receiver Response Body:</span>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-36">
                    {inspectingDelivery.responseBody}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end px-5 py-3 border-t border-slate-800 bg-slate-950/60">
              <button
                type="button"
                onClick={() => setInspectingDelivery(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-form-submissions-title"
        className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 id="dashboard-form-submissions-title" className="text-base font-bold text-white">Form Submissions & Leads</h3>
              <p className="text-xs text-slate-400">{websiteName}</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close submissions modal"
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto">{content}</div>
      </div>
    </div>
  );
};
export default FormSubmissionsModal;
