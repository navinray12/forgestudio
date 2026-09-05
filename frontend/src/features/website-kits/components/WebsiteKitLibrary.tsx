import React, { useState } from "react";
import type { WebsiteKit, WebsiteKitCategory } from "../types/websiteKit.types";
import { useWebsiteKits } from "../hooks/useWebsiteKits";
import { WebsiteKitPreviewModal } from "./WebsiteKitPreviewModal";
import { ApplyWebsiteKitConfirmModal } from "./ApplyWebsiteKitConfirmModal";

interface WebsiteKitLibraryProps {
  apiUrl: string;
  onKitApplied?: (message: string) => void;
}

const CATEGORIES: WebsiteKitCategory[] = ["All", "Business", "Portfolio", "SaaS", "Agency"];

export const WebsiteKitLibrary: React.FC<WebsiteKitLibraryProps> = ({
  apiUrl,
  onKitApplied,
}) => {
  const {
    kits,
    filteredKits,
    isLoading,
    isApplying,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    previewKit,
    setPreviewKit,
    confirmKit,
    setConfirmKit,
    applyKit,
  } = useWebsiteKits({ apiUrl });

  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  const handleConfirmApplyKit = async (kit: WebsiteKit) => {
    try {
      const res = await applyKit(kit);
      const msg = res.message || "Website Kit applied successfully.";
      setAppliedToast(msg);
      if (onKitApplied) {
        onKitApplied(msg);
      }
      setTimeout(() => setAppliedToast(null), 4000);
    } catch (e) {
      // Error handled by hook
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header & Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>📦</span>
            <span>WEBSITE KITS</span>
          </h3>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search website kits..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 shadow-2xs"
            aria-label="Search website kits"
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

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1 text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat === "All" ? "All Kits" : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Notification */}
      {appliedToast && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in shadow-2xs">
          <span>✅</span>
          <span>{appliedToast}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Loading Website Kits...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && kits.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center py-10 space-y-2">
          <span className="text-3xl">📦</span>
          <h4 className="text-xs font-bold text-slate-800">No Website Kits available.</h4>
          <p className="text-[11px] text-slate-500 max-w-xs">
            Check back soon for new complete website kit packages.
          </p>
        </div>
      )}

      {/* Search Empty State */}
      {!isLoading && !error && kits.length > 0 && filteredKits.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center py-8 space-y-2">
          <span className="text-2xl">🔍</span>
          <h4 className="text-xs font-bold text-slate-800">No Website Kits found</h4>
          <p className="text-[11px] text-slate-500">
            No website kit matched your search "{searchQuery}".
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
            className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
          >
            Clear Search & Filters
          </button>
        </div>
      )}

      {/* Kit Grid */}
      {!isLoading && !error && filteredKits.length > 0 && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto max-h-[600px] p-0.5">
          {filteredKits.map((kit) => (
            <div
              key={kit.id}
              className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-purple-400 hover:shadow-md"
            >
              {/* Kit Preview Card Top Banner */}
              <div className="relative mb-3 flex h-28 w-full flex-col items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 p-3 text-white shadow-inner overflow-hidden">
                <div className="absolute right-2 top-2 rounded-full border border-purple-300/30 bg-purple-950/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-300 backdrop-blur-xs">
                  {kit.category}
                </div>
                <span className="text-3xl mb-1 group-hover:scale-110 transition duration-200">
                  📦
                </span>
                <span className="text-[10px] font-mono opacity-80 font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                  Pages: {kit.pageCount}
                </span>
              </div>

              {/* Kit Info */}
              <div className="flex-1 space-y-1 mb-3">
                <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-purple-700 transition">
                  {kit.name}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {kit.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setPreviewKit(kit)}
                  className="flex-1 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                  aria-label={`Preview ${kit.name}`}
                >
                  Preview
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmKit(kit)}
                  className="flex-1 flex items-center justify-center rounded-lg border border-purple-600 bg-purple-600 px-2 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition active:scale-95 cursor-pointer"
                  aria-label={`Use ${kit.name}`}
                >
                  Use Kit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <WebsiteKitPreviewModal
        isOpen={Boolean(previewKit)}
        kit={previewKit}
        onClose={() => setPreviewKit(null)}
        onSelectUse={(kit) => {
          setPreviewKit(null);
          setConfirmKit(kit);
        }}
      />

      {/* Confirmation Modal */}
      <ApplyWebsiteKitConfirmModal
        isOpen={Boolean(confirmKit)}
        kit={confirmKit}
        isApplying={isApplying}
        onClose={() => setConfirmKit(null)}
        onConfirmApply={handleConfirmApplyKit}
      />
    </div>
  );
};
