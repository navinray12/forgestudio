import React, { useState, useEffect } from "react";
import type { Template, TemplateCategory } from "../types/template.types";
import { TEMPLATE_CATEGORIES } from "../types/template.types";

interface RenameTemplateDialogProps {
  isOpen: boolean;
  template: Template | null;
  onClose: () => void;
  onSave: (templateId: string, name: string, description?: string, category?: string) => Promise<void>;
}

export const RenameTemplateDialog: React.FC<RenameTemplateDialogProps> = ({
  isOpen,
  template,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<TemplateCategory | string>("Other");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setDescription(template.description || "");
      setCategory(template.category || "Other");
      setValidationError(null);
      setServerError(null);
    }
  }, [template]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSaving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setServerError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Template name is required.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(template.id, trimmedName, description.trim(), category);
      onClose();
    } catch (err: any) {
      setServerError(err?.message || "Unable to update template.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-template-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <h2 id="rename-template-title" className="text-base font-extrabold text-slate-800">
              EDIT TEMPLATE DETAILS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close dialog"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="rename-template-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              id="rename-template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name..."
              disabled={isSaving}
              autoFocus
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition"
            />
            {validationError && (
              <p className="mt-1 text-xs font-semibold text-red-500">{validationError}</p>
            )}
          </div>

          <div>
            <label htmlFor="rename-template-description" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="rename-template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter optional template description..."
              rows={2}
              disabled={isSaving}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition resize-none"
            />
          </div>

          <div>
            <label htmlFor="rename-template-category" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Category
            </label>
            <select
              id="rename-template-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isSaving}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition cursor-pointer"
            >
              {TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {serverError && (
            <div className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs font-medium text-red-700">
              ⚠️ {serverError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
