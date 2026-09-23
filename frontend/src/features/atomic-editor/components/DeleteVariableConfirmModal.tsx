import React from "react";
import type { AtomicVariable } from "../types/variables.types";
import { useClasses } from "../hooks/useClasses";
import { findClassesUsingVariable } from "../utils/variableClassResolver";

interface DeleteVariableConfirmModalProps {
  isOpen: boolean;
  variable: AtomicVariable | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void>;
}

export const DeleteVariableConfirmModal: React.FC<DeleteVariableConfirmModalProps> = ({
  isOpen,
  variable,
  onClose,
  onConfirmDelete,
}) => {
  const { classes } = useClasses();

  if (!isOpen || !variable) return null;

  const usageInfo = findClassesUsingVariable(variable, classes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-variable-modal-title"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xl">DELETE VARIABLE?</span>
        </div>

        {/* Warning Body */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to delete variable <strong>"{variable.name}"</strong> (<span className="font-mono text-purple-600 dark:text-purple-400">--{variable.key}</span>)?
        </p>

        {/* Highlight Banner */}
        {usageInfo.usageCount > 0 ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300 space-y-1">
            <p className="font-bold">⚠️ Warning: Active References Detected!</p>
            <p>
              This Variable is currently referenced by <strong>{usageInfo.usageCount} Class style{usageInfo.usageCount > 1 ? "s" : ""}</strong>:
            </p>
            <ul className="list-disc list-inside font-mono text-[11px] text-red-700 dark:text-red-400 pl-1 pt-0.5">
              {usageInfo.referencingClasses.slice(0, 3).map((c) => (
                <li key={c.id}>.{c.key}</li>
              ))}
              {usageInfo.usageCount > 3 && <li>...and {usageInfo.usageCount - 3} more</li>}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
            ℹ️ No Class styles are currently using this Variable.
          </div>
        )}

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
            onClick={() => onConfirmDelete(variable.id)}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-red-700 transition cursor-pointer"
          >
            Delete Variable
          </button>
        </div>
      </div>
    </div>
  );
};
