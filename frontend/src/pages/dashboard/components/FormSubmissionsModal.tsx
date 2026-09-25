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

  useEffect(() => {
    if (websiteId && (isEmbedded || isOpen)) {
      fetchSubmissions();
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

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `form-submissions-${websiteId}-${new Date().toISOString().split("T")[0]}.csv`;
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

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
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
            disabled={isExporting || totalSubmissions === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-xs font-bold text-white shadow-lg shadow-emerald-950/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExporting ? "Exporting..." : "Export to CSV"}</span>
          </button>
        </div>
      </div>

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
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Form Submissions & Leads</h3>
              <p className="text-xs text-slate-400">{websiteName}</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
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
