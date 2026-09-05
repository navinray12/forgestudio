import React, { useState, useRef, useEffect } from "react";
import type { Template } from "../types/template.types";

interface TemplateCardProps {
  template: Template;
  onPreview: (template: Template) => void;
  onInsert: (template: Template) => void;
  onShare?: (template: Template) => void;
  onExport?: (template: Template) => void;
  onDuplicate?: (template: Template) => void;
  onTransfer?: (template: Template) => void;
  onToggleFavorite?: (template: Template) => void;
  isPendingFavorite?: boolean;
  onRename?: (template: Template) => void;
  onDelete?: (template: Template) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onInsert,
  onShare,
  onExport,
  onDuplicate,
  onTransfer,
  onToggleFavorite,
  isPendingFavorite = false,
  onRename,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const formattedDate = template.createdAt
    ? new Date(template.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const elementCount = template.templateData?.elements?.length || 0;

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "GLOBAL_WIDGET":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "PAGE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "POPUP":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "SECTION":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "WEBSITE":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "GLOBAL_WIDGET":
        return "🌐";
      case "PAGE":
        return "📄";
      case "POPUP":
        return "💬";
      case "SECTION":
        return "🧩";
      case "WEBSITE":
        return "🌐";
      default:
        return "🧱";
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-purple-300 hover:shadow-md">
      {/* Top Banner / Preview Placeholder */}
      <div className="relative mb-3 flex h-24 w-full flex-col items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 p-2 text-white shadow-inner overflow-hidden">
        {/* Favorite Star Button (F-326) */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(template);
            }}
            disabled={isPendingFavorite}
            aria-label={
              template.isFavorite
                ? `Remove ${template.name} from favorites`
                : `Add ${template.name} to favorites`
            }
            className={`absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur-xs transition shadow-xs cursor-pointer ${
              template.isFavorite
                ? "bg-amber-400 text-slate-950 border-amber-300 hover:bg-amber-300"
                : "bg-black/40 text-slate-300 border-white/20 hover:bg-black/60 hover:text-white"
            } ${isPendingFavorite ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="text-sm leading-none">{template.isFavorite ? "★" : "☆"}</span>
          </button>
        )}

        {/* Type Badge */}
        <div className="absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs text-white bg-black/40 border-white/20">
          {getTypeIcon(template.type)} {template.type}
        </div>

        <div className="flex flex-col items-center justify-center text-center p-1">
          <span className="text-2xl mb-1 opacity-90 group-hover:scale-110 transition duration-200">
            {getTypeIcon(template.type)}
          </span>
          <span className="text-[11px] font-mono opacity-70">
            {elementCount} {elementCount === 1 ? "Element" : "Elements"}
          </span>
        </div>
      </div>

      {/* Main Info */}
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-1">
          <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-purple-700 transition">
            {template.name}
          </h4>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {template.isPro && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-900 bg-amber-200/80 border border-amber-300 rounded px-1.5 py-0.2 shadow-2xs">
              👑 PRO
            </span>
          )}
          <span className="inline-block text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded px-1.5 py-0.2">
            {template.category || "Other"}
          </span>
          {template.isFavorite && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2">
              ★ Favorite
            </span>
          )}
          {template.isShared && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.2">
              🔗 Shared
            </span>
          )}
        </div>

        {template.description ? (
          <p className="text-[11px] font-normal text-slate-500 line-clamp-2 leading-relaxed">
            {template.description}
          </p>
        ) : (
          <p className="text-[11px] italic text-slate-400">No description provided</p>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-2.5">
        {formattedDate && (
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Saved {formattedDate}</span>
            <span className={`px-1.5 py-0.2 rounded border font-semibold text-[9px] ${getTypeBadgeColor(template.type)}`}>
              {template.type}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => onPreview(template)}
            className="flex-1 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 cursor-pointer"
            aria-label={`Preview template ${template.name}`}
          >
            Preview
          </button>

          <button
            type="button"
            onClick={() => onInsert(template)}
            className="flex-1 flex items-center justify-center rounded-lg border border-purple-600 bg-purple-600 px-2 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 hover:border-purple-700 transition active:scale-95 cursor-pointer"
            aria-label={`Insert template ${template.name}`}
          >
            Insert
          </button>

          {/* Share Action Button (F-327) */}
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(template)}
              className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition active:scale-95 cursor-pointer"
              aria-label={`Share template ${template.name}`}
              title="Share template"
            >
              🔗 Share
            </button>
          )}

          {/* More Actions Overflow Menu (F-324 / F-325 / F-326 / F-327 / F-329 / F-333) */}
          {(onRename || onDelete || onToggleFavorite || onShare || onExport || onDuplicate) && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                aria-label={`More actions for template ${template.name}`}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
              >
                ⋮
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 bottom-full mb-1 z-30 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in duration-100"
                  role="menu"
                >
                  {onDuplicate && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDuplicate(template);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition text-left cursor-pointer"
                      role="menuitem"
                    >
                      <span>📋</span>
                      <span>Duplicate</span>
                    </button>
                  )}
                  {onTransfer && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onTransfer(template);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition text-left cursor-pointer"
                      role="menuitem"
                    >
                      <span>🔁</span>
                      <span>Transfer</span>
                    </button>
                  )}
                  {onExport && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onExport(template);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition text-left cursor-pointer"
                      role="menuitem"
                    >
                      <span>📤</span>
                      <span>Export</span>
                    </button>
                  )}

                  {onShare && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onShare(template);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition text-left cursor-pointer"
                      role="menuitem"
                    >
                      <span>🔗</span>
                      <span>Share</span>
                    </button>
                  )}
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onToggleFavorite(template);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition text-left cursor-pointer"
                      role="menuitem"
                    >
                      <span className="text-amber-500">{template.isFavorite ? "★" : "☆"}</span>
                      <span>{template.isFavorite ? "Unfavorite" : "Favorite"}</span>
                    </button>
                  )}
                  {onRename && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRename(template);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition text-left cursor-pointer"
                      role="menuitem"
                    >
                      <span>✏️</span>
                      <span>Edit</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDelete(template);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition text-left cursor-pointer"
                      role="menuitem"
                    >
                      <span>🗑️</span>
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
