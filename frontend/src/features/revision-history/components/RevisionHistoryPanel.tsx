import React, { useEffect, useState } from "react";
import { useRevisionHistory } from "../hooks/useRevisionHistory";
import type { RevisionItem, PageSettingsData } from "../types/revisionHistory.types";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";

interface RevisionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  onRestore: (elements: EditorElement[], pageSettings?: PageSettingsData) => void;
}

/**
 * Formats timestamps into human readable relative date headers and formatted time strings.
 */
function formatRevisionTime(timestamp: number): { dateGroup: string; formattedTime: string } {
  const date = new Date(timestamp);
  const now = new Date();
  
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  let dateGroup = "Earlier";
  if (isToday) dateGroup = "Today";
  else if (isYesterday) dateGroup = "Yesterday";
  else {
    dateGroup = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { dateGroup, formattedTime };
}

export const RevisionHistoryPanel: React.FC<RevisionHistoryPanelProps> = ({
  isOpen,
  onClose,
  websiteId,
  onRestore,
}) => {
  const {
    revisions,
    selectedRevision,
    confirmRestoreState,
    isLoading,
    error,
    setSelectedRevision,
    promptRestore,
    cancelRestore,
    confirmRestore,
    deleteRevision,
  } = useRevisionHistory(websiteId);

  const [activeFilter, setActiveFilter] = useState<"all" | "today">("all");

  // Keyboard accessibility: ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmRestoreState.isOpen) {
          cancelRestore();
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, confirmRestoreState.isOpen, onClose, cancelRestore]);

  if (!isOpen) return null;

  // Filter revisions if needed
  const filteredRevisions = revisions.filter((rev) => {
    if (activeFilter === "today") {
      const { dateGroup } = formatRevisionTime(rev.timestamp);
      return dateGroup === "Today";
    }
    return true;
  });

  // Group revisions by date category
  const groupedRevisions = filteredRevisions.reduce<Record<string, RevisionItem[]>>((acc, rev) => {
    const { dateGroup } = formatRevisionTime(rev.timestamp);
    if (!acc[dateGroup]) acc[dateGroup] = [];
    acc[dateGroup].push(rev);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Overlay Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Revision History
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                View & restore saved page versions (F-320)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Revision History drawer"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Controls & Status */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2.5 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                activeFilter === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              All ({revisions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("today")}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                activeFilter === "today"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              Today
            </button>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Max 30 snapshots
          </span>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {isLoading ? (
            /* Loading State */
            <div className="space-y-4 py-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-start gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(groupedRevisions).length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                No revisions yet
              </h3>
              <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                Saved design updates will automatically create restore points here as you save changes.
              </p>
            </div>
          ) : (
            /* Timeline List grouped by Date */
            Object.entries(groupedRevisions).map(([dateGroup, items]) => (
              <div key={dateGroup} className="space-y-3">
                <div className="sticky top-0 z-10 flex items-center gap-2 bg-white/90 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 backdrop-blur-xs dark:bg-slate-900/90 dark:text-slate-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{dateGroup}</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="space-y-2.5 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                  {items.map((rev) => {
                    const isLatest = rev.id === revisions[0]?.id;
                    const isSelected = selectedRevision?.id === rev.id;
                    const { formattedTime } = formatRevisionTime(rev.timestamp);

                    return (
                      <div
                        key={rev.id}
                        onClick={() => setSelectedRevision(rev)}
                        className={`group relative flex flex-col gap-2 rounded-xl border p-3.5 transition cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 shadow-xs"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700"
                        }`}
                      >
                        {/* Timeline Node Icon */}
                        <div
                          className={`absolute -left-[17px] top-4 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                            isLatest ? "bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/40" : "bg-slate-400"
                          }`}
                        />

                        {/* Revision Meta Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {formattedTime}
                            </span>
                            {isLatest && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span>{rev.elementCount} elements</span>
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug">
                          {rev.description || "Saved design snapshot"}
                        </p>

                        {/* Actions */}
                        <div className="mt-1 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRevision(rev.id);
                            }}
                            className="text-[10px] font-semibold text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition flex items-center gap-1"
                            title="Delete snapshot"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              promptRestore(rev);
                            }}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition flex items-center gap-1"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Restore Revision</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/90 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Restoring replaces current layout with selected snapshot state.
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmRestoreState.isOpen && confirmRestoreState.revision && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 text-xl font-bold mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Restore this revision?
            </h3>

            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your current editable page state will be replaced by the snapshot from{" "}
              <strong>
                {formatRevisionTime(confirmRestoreState.revision.timestamp).formattedTime} (
                {formatRevisionTime(confirmRestoreState.revision.timestamp).dateGroup})
              </strong>.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold">Snapshot details:</span>
              <ul className="mt-1 space-y-1 text-[11px]">
                <li>• Description: {confirmRestoreState.revision.description}</li>
                <li>• Element count: {confirmRestoreState.revision.elementCount} elements</li>
              </ul>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelRestore}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmRestore(onRestore)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition"
              >
                Restore Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
