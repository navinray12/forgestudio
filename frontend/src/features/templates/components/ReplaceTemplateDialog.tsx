import React, { useState } from "react";
import type { Template } from "../types/template.types";
import { TEMPLATE_CATEGORIES } from "../types/template.types";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

interface ReplaceTemplateDialogProps {
  isOpen: boolean;
  targetElementName: string;
  templates: Template[];
  onClose: () => void;
  onConfirmReplace: (template: Template) => void;
}

export const ReplaceTemplateDialog: React.FC<ReplaceTemplateDialogProps> = ({
  isOpen,
  targetElementName,
  templates,
  onClose,
  onConfirmReplace,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((tmpl) => {
    const matchesCategory =
      selectedCategory === "ALL" ||
      (selectedCategory === "FAVORITES" && tmpl.isFavorite) ||
      tmpl.category?.toLowerCase() === selectedCategory.toLowerCase();

    if (!matchesCategory) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    return (
      tmpl.name.toLowerCase().includes(q) ||
      (tmpl.description && tmpl.description.toLowerCase().includes(q)) ||
      (tmpl.category && tmpl.category.toLowerCase().includes(q)) ||
      tmpl.type.toLowerCase().includes(q)
    );
  });

  const handleSelectForReplace = (template: Template) => {
    setSelectedTemplate(template);
    setIsConfirming(true);
  };

  const handleExecuteReplace = () => {
    if (!selectedTemplate) return;
    onConfirmReplace(selectedTemplate);
    setIsConfirming(false);
    setSelectedTemplate(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="replace-template-title"
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-lg shadow-xs">
              🔄
            </span>
            <div>
              <h3 id="replace-template-title" className="text-base font-bold text-slate-900">
                Replace Template
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Target Element: <span className="font-bold text-purple-700">{targetElementName || "Selected Element"}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        {!isConfirming ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Search & Category Filter Bar */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates to replace with..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-8 pr-7 text-xs font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition shadow-xs"
                />
                <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {["ALL", "FAVORITES", ...TEMPLATE_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {cat === "FAVORITES" ? "⭐ Favorites" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates List */}
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-purple-300 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">
                          {template.name}
                        </span>
                        <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 uppercase">
                          {template.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {template.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(template)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectForReplace(template)}
                        className="rounded-lg bg-purple-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-purple-700 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>🔄</span>
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2 rounded-xl border border-dashed border-slate-200">
                <div className="text-2xl">📭</div>
                <p className="font-semibold text-slate-600">No templates found matching your filter.</p>
              </div>
            )}
          </div>
        ) : (
          /* Confirmation Step */
          <div className="p-6 space-y-5 animate-in fade-in duration-150">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <span>⚠️</span>
                <span>REPLACE TEMPLATE CONFIRMATION</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed">
                You are about to replace <strong className="text-slate-900">{targetElementName}</strong> with template <strong className="text-purple-800">"{selectedTemplate?.name}"</strong>.
              </p>
              <p className="text-[11px] text-amber-800">
                • Content inside the selected container will be replaced.<br />
                • Surrounding page elements, headers, and footers will remain unchanged.<br />
                • You can press <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">Ctrl + Z</kbd> to undo if needed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Back / Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReplace}
                className="rounded-xl border border-purple-600 bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>Confirm Replacement</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!isConfirming && (
          <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              Select a template to safely replace <strong className="text-slate-800">{targetElementName}</strong>.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Embedded Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onInsert={(templateToInsert) => {
          setPreviewTemplate(null);
          handleSelectForReplace(templateToInsert);
        }}
      />
    </div>
  );
};
