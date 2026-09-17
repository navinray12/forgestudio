import React, { useState, useEffect, useCallback } from "react";
import { wordpressApi } from "../wordpress-api";
import type { WordPressMediaItem } from "../wordpress-types";

interface WpMediaPickerModalProps {
  isOpen: boolean;
  websiteId: string;
  onClose: () => void;
  onSelectMedia: (item: WordPressMediaItem) => void;
}

export const WpMediaPickerModal: React.FC<WpMediaPickerModalProps> = ({
  isOpen,
  websiteId,
  onClose,
  onSelectMedia,
}) => {
  const [items, setItems] = useState<WordPressMediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<WordPressMediaItem | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchMedia = useCallback(async () => {
    if (!websiteId || !isOpen) return;

    setLoading(true);
    setError(null);
    try {
      const res = await wordpressApi.getMedia(websiteId, page, 20, debouncedSearch);
      setItems(res.items || []);
      setTotalItems(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / (res.perPage || 20)) || 1);
    } catch (err: any) {
      setError(err?.message || "Unable to load WordPress media. Please check your WordPress connection.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId, isOpen, page, debouncedSearch]);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    } else {
      setSelectedItem(null);
    }
  }, [isOpen, fetchMedia]);

  if (!isOpen) return null;

  const handleConfirmSelect = () => {
    if (selectedItem) {
      onSelectMedia(selectedItem);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🖼️</span>
            <div>
              <h2 className="text-base font-bold text-slate-800">Select WordPress Image</h2>
              <p className="text-xs text-slate-500">Browse & select images from your connected WordPress Media Library</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Search */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search WordPress media by title or alt text..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
          {totalItems > 0 && (
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              {totalItems} {totalItems === 1 ? "image" : "images"} found
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[320px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-500">Loading WordPress media...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-xl">⚠️</div>
              <p className="text-xs font-bold text-slate-800 max-w-md">{error}</p>
              <button
                type="button"
                onClick={() => fetchMedia()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                🔄 Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <span className="text-3xl">🖼️</span>
              <p className="text-xs font-bold text-slate-700">
                {debouncedSearch ? `No images found matching "${debouncedSearch}"` : "No images found in WordPress Media Library"}
              </p>
              <p className="text-[11px] text-slate-400">
                Upload images in your WordPress Media Library to choose them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className={`group relative rounded-xl overflow-hidden border text-left transition cursor-pointer flex flex-col bg-slate-50 ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20"
                        : "border-slate-200 hover:border-blue-400"
                    }`}
                  >
                    <div className="aspect-square relative w-full overflow-hidden bg-slate-100">
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.alt || item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-white flex-1 flex flex-col justify-between">
                      <p className="text-[11px] font-bold text-slate-700 truncate" title={item.title}>
                        {item.title || `Media #${item.id}`}
                      </p>
                      {item.width > 0 && item.height > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.width} × {item.height}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: Pagination & Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                ◀ Previous
              </button>
              <span className="text-xs font-semibold text-slate-600 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Next ▶
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedItem}
              onClick={handleConfirmSelect}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              Select Image
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
