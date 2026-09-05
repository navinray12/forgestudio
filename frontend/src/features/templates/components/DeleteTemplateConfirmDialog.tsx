import React, { useState, useEffect } from "react";
import type { Template } from "../types/template.types";

interface DeleteTemplateConfirmDialogProps {
  isOpen: boolean;
  template: Template | null;
  onClose: () => void;
  onConfirmDelete: (templateId: string) => Promise<void>;
}

export const DeleteTemplateConfirmDialog: React.FC<DeleteTemplateConfirmDialogProps> = ({
  isOpen,
  template,
  onClose,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !template) return null;

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirmDelete(template.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Unable to delete template.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-template-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl text-red-500">🗑️</span>
            <h2 id="delete-template-title" className="text-base font-extrabold text-slate-800">
              DELETE TEMPLATE?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-600">
            Are you sure you want to delete this template?
          </p>

          <div className="rounded-xl border border-red-100 bg-red-50/50 p-3.5 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-500">
              Template to delete:
            </div>
            <div className="text-xs font-bold text-slate-800 truncate">
              {template.name}
            </div>
            {template.type && (
              <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-extrabold text-red-700 uppercase tracking-wider">
                {template.type}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            This action cannot be undone. Page content and history will remain unaffected.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            ⚠️ {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 transition disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
