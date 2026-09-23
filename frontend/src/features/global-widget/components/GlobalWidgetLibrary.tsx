import React, { useState } from "react";
import type { GlobalWidget } from "../types/globalWidget.types";
import { useGlobalWidgets } from "../hooks/useGlobalWidgets";

interface GlobalWidgetLibraryProps {
  apiUrl: string;
  onInsertWidget: (widget: GlobalWidget) => void;
  onOpenSaveDialog?: () => void;
}

export const GlobalWidgetLibrary: React.FC<GlobalWidgetLibraryProps> = ({
  apiUrl,
  onInsertWidget,
  onOpenSaveDialog,
}) => {
  const {
    globalWidgets,
    filteredWidgets,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    previewWidget,
    setPreviewWidget,
    removeWidget,
  } = useGlobalWidgets({ apiUrl });

  const [deleteCandidate, setDeleteCandidate] = useState<GlobalWidget | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await removeWidget(deleteCandidate.id);
      setDeleteCandidate(null);
    } catch (err: any) {
      setDeleteError(err?.message || "Unable to delete Global Widget.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header & Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>🌐</span>
            <span>GLOBAL WIDGETS</span>
          </h3>
          {onOpenSaveDialog && (
            <button
              type="button"
              onClick={onOpenSaveDialog}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 hover:border-purple-300 transition shadow-2xs cursor-pointer"
              aria-label="Create Global Widget"
            >
              <span>+</span>
              <span>Create Global Widget</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search widgets..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 shadow-2xs"
            aria-label="Search widgets"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Loading Global Widgets...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Empty State (No Global Widgets yet) */}
      {!isLoading && !error && globalWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center py-10 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 text-2xl shadow-xs">
            🌐
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800">No Global Widgets yet.</h4>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
              Save any element or component as a Global Widget to reuse it across your website.
            </p>
          </div>
          {onOpenSaveDialog && (
            <button
              type="button"
              onClick={onOpenSaveDialog}
              className="rounded-xl border border-purple-600 bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition cursor-pointer"
            >
              Create Global Widget
            </button>
          )}
        </div>
      )}

      {/* Search Empty State */}
      {!isLoading && !error && globalWidgets.length > 0 && filteredWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center py-8 space-y-2">
          <span className="text-2xl">🔍</span>
          <h4 className="text-xs font-bold text-slate-800">No Global Widgets found</h4>
          <p className="text-[11px] text-slate-500">
            No global widget matched your search "{searchQuery}".
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Grid of Global Widgets */}
      {!isLoading && !error && filteredWidgets.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto max-h-[600px] p-0.5">
          {filteredWidgets.map((widget) => {
            const count = widget.elements?.length || 0;
            return (
              <div
                key={widget.id}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-purple-300 hover:shadow-md"
              >
                {/* Thumbnail / Header */}
                <div className="relative mb-3 flex h-24 w-full flex-col items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-2 text-white shadow-inner overflow-hidden">
                  <div className="absolute right-2 top-2 rounded-full border border-purple-300/30 bg-purple-950/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-300 backdrop-blur-xs">
                    🌐 GLOBAL
                  </div>
                  <span className="text-2xl mb-1 group-hover:scale-110 transition duration-200">
                    🧩
                  </span>
                  <span className="text-[10px] font-mono opacity-70">
                    {count} {count === 1 ? "Element" : "Elements"}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-1 mb-3">
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-purple-700 transition">
                    {widget.name}
                  </h4>
                  {widget.description ? (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {widget.description}
                    </p>
                  ) : (
                    <p className="text-[11px] italic text-slate-400">Reusable global component</p>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                  <button
                    type="button"
                    onClick={() => setPreviewWidget(widget)}
                    className="flex-1 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                    aria-label={`Preview ${widget.name}`}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => onInsertWidget(widget)}
                    className="flex-1 flex items-center justify-center rounded-lg border border-purple-600 bg-purple-600 px-2 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition active:scale-95 cursor-pointer"
                    aria-label={`Insert ${widget.name}`}
                  >
                    Insert
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(widget)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition cursor-pointer"
                    aria-label={`Delete ${widget.name}`}
                    title="Delete Global Widget"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
              <span>⚠️</span>
              <h3>DELETE GLOBAL WIDGET?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This Global Widget is currently used on your website. Deleting it will remove the source definition.
            </p>
            {deleteError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Deleting Global Widget...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simple Preview Modal */}
      {previewWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌐</span>
                <h3 className="text-sm font-bold text-slate-900">{previewWidget.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewWidget(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-6 bg-slate-100/50 min-h-[220px] flex items-center justify-center">
              <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xs text-xs text-slate-700 space-y-2">
                <div className="text-[10px] font-mono font-semibold text-purple-600 uppercase">
                  Global Widget Components ({previewWidget.elements?.length || 0})
                </div>
                <pre className="text-[11px] font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto max-h-48 text-slate-800">
                  {JSON.stringify(previewWidget.elements, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3">
              <button
                type="button"
                onClick={() => setPreviewWidget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onInsertWidget(previewWidget);
                  setPreviewWidget(null);
                }}
                className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>✨</span>
                <span>Insert Global Widget</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
