/**
 * @file Atomic editor feature: Delete Component Confirm Modal. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import React from "react";
import type { ReusableComponentDefinition } from "../types/reusableComponents.types";

interface DeleteComponentConfirmModalProps {
  isOpen: boolean;
  component: ReusableComponentDefinition | null;
  usageCount?: number;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void>;
}

/**
 * Render the delete component confirm modal interface and connect its event handlers.
 * @param options Named inputs: isOpen, component, usageCount, onClose, onConfirmDelete.

 * @param options.isOpen Is Open passed by the caller.
 * @param options.component Component passed by the caller.
 * @param options.usageCount Usage Count passed by the caller. Defaults to 0.
 * @param options.onClose Callback invoked when this interface should close.
 * @param options.onConfirmDelete Callback for confirm delete events.
 */
export const DeleteComponentConfirmModal: React.FC<DeleteComponentConfirmModalProps> = ({
  isOpen,
  component,
  usageCount = 0,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !component) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-component-modal-title"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xl">DELETE REUSABLE COMPONENT?</span>
        </div>

        {/* Warning Body */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to delete Reusable Component <strong>"{component.name}"</strong>?
        </p>

        {/* Highlight Banner */}
        {usageCount > 0 ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-bold">⚠️ Notice: Active Component Instances</p>
            <p>
              This Reusable Component is currently used by <strong>{usageCount} instance{usageCount > 1 ? "s" : ""}</strong> on your website. Deleting it will detach those instances into normal standalone structures.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400">
            ℹ️ No active instances are using this component.
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
            onClick={() => onConfirmDelete(component.id)}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-red-700 transition cursor-pointer"
          >
            Delete Component
          </button>
        </div>
      </div>
    </div>
  );
};
