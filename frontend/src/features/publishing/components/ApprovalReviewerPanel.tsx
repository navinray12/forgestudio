import React, { useState, useEffect } from "react";
import { publishingService } from "../services/publishingService";
import { useAuth } from "../../../context/AuthContext";

export interface ApprovalRequestItem {
  id: string;
  websiteId: string;
  requesterId: string;
  reviewerId?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CONSUMED" | "CANCELLED";
  targetVersion: number;
  reviewNotes?: string | null;
  snapshot: any;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  website?: { id: string; name: string; slug: string } | null;
  requester?: { id: string; fullName?: string | null; email?: string | null } | null;
  reviewer?: { id: string; fullName?: string | null; email?: string | null } | null;
}

export interface SnapshotSummary {
  pageCount: number;
  pages: Array<{ name: string; slug: string; elementCount: number }>;
  totalElements: number;
  hasHeader: boolean;
  hasFooter: boolean;
  version: number;
}

export function parseSnapshotSummary(snapshot: any): SnapshotSummary {
  if (!snapshot || typeof snapshot !== "object") {
    return {
      pageCount: 0,
      pages: [],
      totalElements: 0,
      hasHeader: false,
      hasFooter: false,
      version: 1,
    };
  }

  const version = typeof snapshot.version === "number" ? snapshot.version : 1;
  const rawPages = Array.isArray(snapshot.pages) ? snapshot.pages : [];
  const rawElements = Array.isArray(snapshot.elements) ? snapshot.elements : [];

  const pages = rawPages.map((p: any) => ({
    name: p.name || "Untitled Page",
    slug: p.slug || (p.isHome ? "/" : "/page"),
    elementCount: Array.isArray(p.elements) ? p.elements.length : 0,
  }));

  let totalElements = rawElements.length;
  if (pages.length > 0) {
    const sumPageElements = pages.reduce((acc, p) => acc + p.elementCount, 0);
    if (sumPageElements > 0) {
      totalElements = sumPageElements;
    }
  }

  const hasHeader = Boolean(snapshot.siteParts?.header || snapshot.header);
  const hasFooter = Boolean(snapshot.siteParts?.footer || snapshot.footer);

  return {
    pageCount: pages.length > 0 ? pages.length : (rawElements.length > 0 ? 1 : 0),
    pages,
    totalElements,
    hasHeader,
    hasFooter,
    version,
  };
}

interface ApprovalReviewerPanelProps {
  websiteId: string;
  websiteName?: string;
  canPublish?: boolean;
  onDecisionComplete?: (updatedRequest: ApprovalRequestItem) => void;
  className?: string;
}

export const ApprovalReviewerPanel: React.FC<ApprovalReviewerPanelProps> = ({
  websiteId,
  websiteName,
  canPublish = true,
  onDecisionComplete,
  className = "",
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<"pending" | "history">("pending");
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);
  const [copiedSnapshotId, setCopiedSnapshotId] = useState<string | null>(null);

  // Review decision states per request
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    requestId?: string;
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadRequests = async () => {
    if (!websiteId) return;
    try {
      setLoading(true);
      const data = await publishingService.getApprovalRequests(websiteId);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load approval requests.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (websiteId) {
      queueMicrotask(() => {
        loadRequests();
      });
    }
  }, [websiteId]);

  const handleReviewDecision = async (
    request: ApprovalRequestItem,
    decision: "APPROVED" | "REJECTED"
  ) => {
    if (reviewingId) return;

    // Backend and frontend four-eyes check
    if (user?.id && request.requesterId === user.id) {
      setFeedback({
        requestId: request.id,
        type: "error",
        message:
          "Four-eyes principle enforced: You cannot review or approve your own publication request.",
      });
      return;
    }

    const note = (reviewNotesMap[request.id] || "").trim();

    // Confirmation dialog
    const confirmMessage =
      decision === "APPROVED"
        ? `Are you sure you want to APPROVE publication request v${request.targetVersion}? This will allow live deployment of the submitted snapshot.`
        : `Are you sure you want to REJECT publication request v${request.targetVersion}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setReviewingId(request.id);
      setFeedback(null);

      const updated = await publishingService.reviewApprovalRequest(
        request.id,
        decision,
        note || undefined
      );

      setFeedback({
        requestId: request.id,
        type: "success",
        message:
          decision === "APPROVED"
            ? `Successfully approved publication request v${request.targetVersion}! It is now eligible for publishing.`
            : `Publication request v${request.targetVersion} has been rejected.`,
      });

      // Clear note
      setReviewNotesMap((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });

      // Refresh list
      await loadRequests();

      if (onDecisionComplete) {
        onDecisionComplete(updated);
      }
    } catch (err: any) {
      setFeedback({
        requestId: request.id,
        type: "error",
        message: err?.message || `Failed to ${decision.toLowerCase()} request.`,
      });
    } finally {
      setReviewingId(null);
    }
  };

  const handleCopySnapshotJson = (requestId: string, snapshot: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setCopiedSnapshotId(requestId);
      setTimeout(() => setCopiedSnapshotId(null), 2500);
    } catch (_) {
      /* ignore clipboard write failure in unsecured context */
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const historyRequests = requests.filter((r) => r.status !== "PENDING");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            PENDING REVIEW
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <span>✓</span> APPROVED
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <span>✕</span> REJECTED
          </span>
        );
      case "CONSUMED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <span>🚀</span> PUBLISHED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 text-slate-200 overflow-hidden shadow-xl ${className}`}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-bold">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Publish Approval Reviews
              </h3>
              {pendingRequests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold animate-pulse">
                  {pendingRequests.length} PENDING
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Authorize or reject publication submissions with snapshot verification and audit logging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View toggle */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveView("pending")}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                activeView === "pending"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pending ({pendingRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView("history")}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                activeView === "history"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              History ({historyRequests.length})
            </button>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
            title="Refresh Approval Requests"
          >
            <span className={`inline-block ${loading ? "animate-spin" : ""}`}>🔄</span>
          </button>
        </div>
      </div>

      {/* Global feedback message if not attached to a specific card */}
      {feedback && !feedback.requestId && (
        <div
          className={`m-4 p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-600/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-600/40 text-rose-300"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[10px] underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Body Content */}
      <div className="p-4 space-y-4">
        {loading && requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <span className="text-xl animate-spin">⏳</span>
            <span>Loading approval requests...</span>
          </div>
        ) : activeView === "pending" ? (
          pendingRequests.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/30 text-xs text-slate-400 space-y-2">
              <div className="text-2xl">✨</div>
              <p className="font-bold text-slate-300">All caught up! No pending approvals.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                When collaborators without direct publish access submit website changes, their requests and proposed snapshots will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => {
                const summary = parseSnapshotSummary(req.snapshot);
                const isSelf = user?.id && req.requesterId === user.id;
                const isReviewingThis = reviewingId === req.id;
                const isSnapshotExpanded = expandedSnapshotId === req.id;
                const isCopied = copiedSnapshotId === req.id;
                const siteTitle = req.website?.name || websiteName || "Website";

                return (
                  <div
                    key={req.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3.5 transition hover:border-slate-700"
                  >
                    {/* Top Meta Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm">{siteTitle}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                            Target: v{req.targetVersion}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span>
                            Requester:{" "}
                            <strong className="text-slate-200">
                              {req.requester?.fullName || req.requester?.email || "Collaborator"}
                            </strong>
                            {req.requester?.email && req.requester?.fullName ? (
                              <span className="text-slate-500 font-mono"> ({req.requester.email})</span>
                            ) : null}
                          </span>
                          <span>•</span>
                          <span>
                            Submitted: {new Date(req.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Requester's Submission Notes */}
                    {req.reviewNotes && (
                      <div className="rounded-lg bg-amber-950/20 border border-amber-600/30 p-2.5 text-xs text-amber-200/90 space-y-0.5">
                        <div className="text-[10px] uppercase font-bold text-amber-400">
                          Requester's Change Note:
                        </div>
                        <p className="italic">"{req.reviewNotes}"</p>
                      </div>
                    )}

                    {/* Snapshot Summary Card */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Proposed Snapshot Summary
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSnapshotId(isSnapshotExpanded ? null : req.id)
                          }
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isSnapshotExpanded ? "▲ Hide Raw Snapshot" : "▼ Inspect Snapshot JSON"}</span>
                        </button>
                      </div>

                      {/* Summary Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Pages</div>
                          <div className="text-base font-extrabold text-white mt-0.5">
                            {summary.pageCount}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Total Elements</div>
                          <div className="text-base font-extrabold text-white mt-0.5">
                            {summary.totalElements}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Header</div>
                          <div className="text-xs font-bold mt-1 text-slate-300">
                            {summary.hasHeader ? "✅ Configured" : "None"}
                          </div>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">Footer</div>
                          <div className="text-xs font-bold mt-1 text-slate-300">
                            {summary.hasFooter ? "✅ Configured" : "None"}
                          </div>
                        </div>
                      </div>

                      {/* Page list preview if available */}
                      {summary.pages.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <div className="text-[10px] font-semibold text-slate-400 mb-1.5">
                            Pages in Snapshot:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {summary.pages.map((p, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-mono"
                              >
                                {p.name} <span className="text-indigo-400">({p.slug})</span> — {p.elementCount} elements
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expandable JSON Inspector */}
                      {isSnapshotExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-mono">
                              Raw Snapshot JSON ({JSON.stringify(req.snapshot).length.toLocaleString()} bytes)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopySnapshotJson(req.id, req.snapshot)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                            >
                              <span>{isCopied ? "✓ Copied" : "📋 Copy JSON"}</span>
                            </button>
                          </div>
                          <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-60 overflow-y-auto leading-relaxed select-all">
                            {JSON.stringify(req.snapshot, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Review Feedback & Decision Box */}
                    <div className="pt-2 space-y-3">
                      {/* Self-approval notice */}
                      {isSelf && (
                        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/30 text-amber-300 text-xs flex items-center gap-2">
                          <span>⚠️</span>
                          <span>
                            <strong>Four-Eyes Principle:</strong> You submitted this request and cannot review your own changes. Another Owner or Admin must review.
                          </span>
                        </div>
                      )}

                      {/* Reviewer Notes Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                          Reviewer Decision Feedback Notes (Optional)
                        </label>
                        <textarea
                          rows={2}
                          maxLength={1000}
                          placeholder="e.g. Verified layout integrity across mobile and desktop. Approved for live release."
                          value={reviewNotesMap[req.id] || ""}
                          onChange={(e) =>
                            setReviewNotesMap({
                              ...reviewNotesMap,
                              [req.id]: e.target.value,
                            })
                          }
                          disabled={Boolean(reviewingId) || Boolean(isSelf)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                        />
                      </div>

                      {/* Decision Card Feedback */}
                      {feedback && feedback.requestId === req.id && (
                        <div
                          className={`p-2.5 rounded-lg text-xs font-semibold border flex items-center justify-between ${
                            feedback.type === "success"
                              ? "bg-emerald-950/40 border-emerald-600 text-emerald-300"
                              : "bg-rose-950/40 border-rose-600 text-rose-300"
                          }`}
                        >
                          <span>{feedback.message}</span>
                          <button
                            type="button"
                            onClick={() => setFeedback(null)}
                            className="text-[10px] underline ml-2 cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleReviewDecision(req, "REJECTED")}
                          disabled={Boolean(reviewingId) || Boolean(isSelf) || !canPublish}
                          className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-800/50 text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          title={isSelf ? "Self-approval forbidden" : "Reject this publish request"}
                        >
                          <span>✕</span>
                          <span>{isReviewingThis ? "Processing..." : "Reject Request"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReviewDecision(req, "APPROVED")}
                          disabled={Boolean(reviewingId) || Boolean(isSelf) || !canPublish}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          title={isSelf ? "Self-approval forbidden" : "Approve this publish request"}
                        >
                          <span>✓</span>
                          <span>{isReviewingThis ? "Approving..." : "Approve Release"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* History View */
          historyRequests.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/30 text-xs text-slate-500">
              No historical approval decisions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden text-xs">
              {historyRequests.map((req) => {
                const summary = parseSnapshotSummary(req.snapshot);
                const isExpanded = expandedSnapshotId === req.id;
                const isCopied = copiedSnapshotId === req.id;

                return (
                  <div key={req.id} className="p-4 space-y-2.5 hover:bg-slate-900/40 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">v{req.targetVersion}</span>
                        {getStatusBadge(req.status)}
                        <span className="text-[11px] text-slate-400">
                          Requester: {req.requester?.fullName || req.requester?.email || "Collaborator"}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {req.reviewedAt
                          ? `Decided on ${new Date(req.reviewedAt).toLocaleString()}`
                          : `Created ${new Date(req.createdAt).toLocaleString()}`}
                      </div>
                    </div>

                    {req.reviewer && (
                      <div className="text-[11px] text-slate-300">
                        Reviewed by:{" "}
                        <strong className="text-white">
                          {req.reviewer.fullName || req.reviewer.email}
                        </strong>
                      </div>
                    )}

                    {req.reviewNotes && (
                      <div className="text-[11px] text-slate-300 italic bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                        Review notes: "{req.reviewNotes}"
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>
                        Snapshot: {summary.pageCount} page{summary.pageCount === 1 ? "" : "s"} &bull;{" "}
                        {summary.totalElements} element{summary.totalElements === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedSnapshotId(isExpanded ? null : req.id)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer"
                      >
                        {isExpanded ? "Hide Details" : "Inspect Details"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-slate-400">
                            Snapshot Content (JSON)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopySnapshotJson(req.id, req.snapshot)}
                            className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            {isCopied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="p-2.5 rounded bg-slate-950 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-48 overflow-y-auto leading-normal">
                          {JSON.stringify(req.snapshot, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};
