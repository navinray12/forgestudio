import { useEffect, useState } from "react";
import type { FormSubmissionRecord } from "../../../../types/form.types";

interface FormSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId?: string;
  apiUrl?: string;
}

export default function FormSubmissionsModal({
  isOpen,
  onClose,
  websiteId,
  apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000",
}: FormSubmissionsModalProps) {
  const [submissions, setSubmissions] = useState<FormSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmissionRecord | null>(null);

  const fetchSubmissions = async () => {
    if (!websiteId) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/submissions`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.submissions) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error("Error fetching form submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && websiteId) {
      fetchSubmissions();
    }
  }, [isOpen, websiteId]);

  if (!isOpen) return null;

  const handleDelete = async (submissionId: string) => {
    if (!websiteId) return;
    try {
      const res = await fetch(`${apiUrl}/api/forms/${websiteId}/submissions/${submissionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
        if (selectedSubmission?.id === submissionId) setSelectedSubmission(null);
      }
    } catch (err) {
      console.error("Error deleting submission:", err);
    }
  };

  const handleExport = (format: "csv" | "json") => {
    if (!websiteId) return;
    window.open(`${apiUrl}/api/forms/${websiteId}/export?format=${format}`, "_blank");
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const formMatch = s.formName?.toLowerCase().includes(q);
    const dataMatch = JSON.stringify(s.data || {}).toLowerCase().includes(q);
    return formMatch || dataMatch;
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
              📊
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Leads & Form Submissions</h2>
              <p className="text-xs text-slate-500">
                View, search, and export visitor leads captured by your site forms
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("csv")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              Export CSV ⬇
            </button>
            <button
              onClick={() => handleExport("json")}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              Export JSON ⬇
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search leads by name, email, or field value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
            />
            <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Total Leads: {filteredSubmissions.length}
          </span>
        </div>

        {/* Submissions Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50/50">
              <span className="text-3xl mb-2">📥</span>
              <h3 className="text-sm font-bold text-slate-800">No form submissions yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                When visitors submit forms on your published site or preview mode, leads will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Form Name</th>
                    <th className="px-4 py-3">Submitted Data</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                        {s.createdAt ? new Date(s.createdAt).toLocaleString() : "Just now"}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {s.formName || "Contact Form"}
                      </td>
                      <td className="px-4 py-3 max-w-md truncate">
                        {Object.entries(s.data || {}).map(([k, v]) => (
                          <span key={k} className="inline-block mr-2 text-[11px] bg-slate-100 rounded px-1.5 py-0.5">
                            <strong className="text-slate-700">{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedSubmission(s)}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Submission Viewer Modal */}
        {selectedSubmission && (
          <div
            onClick={() => setSelectedSubmission(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Lead Submission Details</h3>
                  <span className="text-[11px] text-slate-500">
                    {selectedSubmission.formName} • {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2">
                  Form Fields Data
                </h4>
                <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 border border-slate-200">
                  {Object.entries(selectedSubmission.data || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-600 capitalize">{key}:</span>
                      <span className="font-bold text-slate-900">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2">
                  Submission Metadata
                </h4>
                <div className="rounded-xl bg-slate-50 p-3 space-y-1 border border-slate-200 text-[11px] text-slate-600 font-mono">
                  <div>IP: {selectedSubmission.metadata?.ip || "unknown"}</div>
                  <div>User Agent: {selectedSubmission.metadata?.userAgent || "unknown"}</div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
