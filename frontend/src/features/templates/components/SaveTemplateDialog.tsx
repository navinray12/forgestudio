import React, { useEffect, useRef } from "react";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";
import type { PageSettingsData } from "../../revision-history/types/revisionHistory.types";
import type { TemplateCategory, TemplateType } from "../types/template.types";
import { TEMPLATE_CATEGORIES } from "../types/template.types";

interface SaveTemplateDialogProps {
  isOpen: boolean;
  isUpdateMode?: boolean;
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  type: TemplateType;
  setType: (type: TemplateType) => void;
  category?: TemplateCategory | string;
  setCategory?: (category: TemplateCategory | string) => void;
  isSaving: boolean;
  error: string | null;
  validationError: string | null;
  onClose: () => void;
  onSave: (elements: EditorElement[], pageSettings: PageSettingsData) => void;
  elements: EditorElement[];
  pageSettings: PageSettingsData;
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  isOpen,
  isUpdateMode = false,
  name,
  setName,
  description,
  setDescription,
  type,
  setType,
  category = "Other",
  setCategory,
  isSaving,
  error,
  validationError,
  onClose,
  onSave,
  elements,
  pageSettings,
}) => {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === "Escape" && !isSaving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSaving) {
      onSave(elements, pageSettings);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-template-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{isUpdateMode ? "🔄" : "📄"}</span>
            <h2 id="save-template-dialog-title" className="text-lg font-bold">
              {isUpdateMode ? "Update Template" : "Save as Template"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Error / Validation Feedback */}
        {(validationError || error) && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 leading-relaxed">
            {validationError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Name (Required) */}
          <div>
            <label
              htmlFor="template-name-input"
              className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
            >
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              id="template-name-input"
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Modern Landing Page"
              disabled={isSaving}
              className={`h-11 w-full rounded-xl border px-4 text-xs outline-none transition bg-slate-50 dark:bg-slate-900 ${
                validationError
                  ? "border-red-500 ring-2 ring-red-500/20"
                  : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              }`}
            />
          </div>

          {/* Description (Optional) */}
          <div>
            <label
              htmlFor="template-description-input"
              className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
            >
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="template-description-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this design template..."
              disabled={isSaving}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-xs outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none"
            />
          </div>

          {/* Category Selector */}
          <div>
            <label
              htmlFor="template-category-select"
              className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
            >
              Category
            </label>
            <select
              id="template-category-select"
              value={category}
              onChange={(e) => setCategory && setCategory(e.target.value)}
              disabled={isSaving}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-medium outline-none transition cursor-pointer"
            >
              {TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Template Type Selector */}
          <div>
            <label
              htmlFor="template-type-select"
              className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
            >
              Template Type
            </label>
            <select
              id="template-type-select"
              value={type}
              onChange={(e) => setType(e.target.value as TemplateType)}
              disabled={isSaving}
              className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-medium outline-none transition cursor-pointer"
            >
              <option value="PAGE">Page Template</option>
              <option value="GLOBAL_WIDGET">Global Widget 🌐</option>
              <option value="POPUP">Popup Template 💬</option>
              <option value="SECTION">Section Template</option>
              <option value="WEBSITE">Website Template</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{isUpdateMode ? "Updating..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isUpdateMode ? "Update Template" : "Save Template"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
