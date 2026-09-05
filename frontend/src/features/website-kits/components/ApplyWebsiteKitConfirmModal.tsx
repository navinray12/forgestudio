import React from "react";
import type { WebsiteKit } from "../types/websiteKit.types";

interface ApplyWebsiteKitConfirmModalProps {
  isOpen: boolean;
  kit: WebsiteKit | null;
  isApplying: boolean;
  onClose: () => void;
  onConfirmApply: (kit: WebsiteKit) => void;
}

export const ApplyWebsiteKitConfirmModal: React.FC<ApplyWebsiteKitConfirmModalProps> = ({
  isOpen,
  kit,
  isApplying,
  onClose,
  onConfirmApply,
}) => {
  if (!isOpen || !kit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-kit-dialog-title"
      >
        {/* Title */}
        <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400 font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xl">APPLY WEBSITE KIT?</span>
        </div>

        {/* Warning Body */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          This will update supported website content and settings using the selected <strong>"{kit.name}"</strong> kit.
        </p>

        {/* Highlight Banner */}
        <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3.5 text-xs text-purple-900 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <span>✨ Included Content:</span>
          </div>
          <ul className="text-[11px] list-disc list-inside space-y-0.5 opacity-90">
            <li>{kit.pageCount} Complete Pages ({kit.pages.map((p) => p.title).join(", ")})</li>
            <li>Global Theme Styles & Typography</li>
            <li>Header & Footer Layout Components</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmApply(kit)}
            disabled={isApplying}
            className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isApplying ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Applying Website Kit...</span>
              </>
            ) : (
              <span>Apply Kit</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
