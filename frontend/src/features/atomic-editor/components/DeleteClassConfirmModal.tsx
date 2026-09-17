import React from "react";
import type { AtomicClass } from "../types/classes.types";

interface DeleteClassConfirmModalProps {
  isOpen: boolean;
  atomicClass: AtomicClass | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void>;
}

export const DeleteClassConfirmModal: React.FC<DeleteClassConfirmModalProps> = ({
  isOpen,
  atomicClass,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !atomicClass) return null;

  const isGlobal = Boolean(atomicClass.isGlobal || atomicClass.scope === "global");
  const count = atomicClass.assignedCount || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-class-modal-title"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xl">{isGlobal ? "DELETE GLOBAL CLASS?" : "DELETE CLASS?"}</span>
        </div>

        {/* Warning Body */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to delete {isGlobal ? "Global Class" : "class"}{" "}
          <strong>"{atomicClass.name}"</strong> (
          <span className="font-mono text-purple-600 dark:text-purple-400">.{atomicClass.key}</span>)?
        </p>

        {/* Highlight Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
          ⚠️ This {isGlobal ? "Global Class" : "class"} is currently used by {count} element{count === 1 ? "" : "s"}{" "}
          {isGlobal ? "across your website" : "on this page"}. Deleting it will safely detach the class reference from those elements without deleting the elements.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmDelete(atomicClass.id)}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-red-700 transition cursor-pointer"
          >
            {isGlobal ? "Delete Global Class" : "Delete Class"}
          </button>
        </div>
      </div>
    </div>
  );
};
