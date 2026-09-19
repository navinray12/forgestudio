import React, { useState, useEffect, useRef } from "react";
import type { EditorElement } from "../../../pages/editor/WebsiteEditor";

interface SaveGlobalWidgetDialogProps {
  isOpen: boolean;
  elementToSave?: EditorElement | null;
  elementsToSave?: EditorElement[];
  isSaving: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (name: string, description: string, elements: EditorElement[]) => void;
}

export const SaveGlobalWidgetDialog: React.FC<SaveGlobalWidgetDialogProps> = ({
  isOpen,
  elementToSave,
  elementsToSave,
  isSaving,
  error,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(elementToSave?.content || (elementToSave as any)?.name || "My Global Widget");
      setDescription("");
      setValidationError(null);
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 50);
    }
  }, [isOpen, elementToSave]);

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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Widget name is required.");
      return;
    }

    const targetElements = elementsToSave || (elementToSave ? [elementToSave] : []);
    if (targetElements.length === 0) {
      setValidationError("No valid element selected to save as Global Widget.");
      return;
    }

    setValidationError(null);
    onSave(trimmedName, description.trim(), targetElements);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-global-widget-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <h2 id="save-global-widget-title" className="text-base font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              SAVE AS GLOBAL WIDGET
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Error Feedback */}
        {(validationError || error) && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 leading-relaxed">
            {validationError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Widget Name */}
          <div>
            <label
              htmlFor="global-widget-name-input"
              className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
            >
              Widget Name <span className="text-red-500">*</span>
            </label>
            <input
              id="global-widget-name-input"
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Header Navigation Bar"
              disabled={isSaving}
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 text-xs outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="global-widget-desc-input"
              className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300"
            >
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="global-widget-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this reusable Global Widget..."
              disabled={isSaving}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-xs outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 resize-none"
            />
          </div>

          {/* Info Banner */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-[11px] text-purple-800 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300 leading-relaxed">
            💡 Global Widgets auto-sync across all instances on your website when updated.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving Global Widget...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
