import React, { useState, useEffect } from "react";
import type { WebsiteKit } from "../types/websiteKit.types";

interface ApplyWebsiteKitConfirmModalProps {
  isOpen: boolean;
  kit: WebsiteKit | null;
  isApplying: boolean;
  websiteId?: string;
  errorMessage?: string | null;
  hasUnsavedChanges?: boolean;
  isAutosaving?: boolean;
  hasExistingContent?: boolean;
  onClose: () => void;
  onConfirmApply: (kit: WebsiteKit, options?: { confirmOverwrite?: boolean }) => void | Promise<void>;
}

export const ApplyWebsiteKitConfirmModal: React.FC<ApplyWebsiteKitConfirmModalProps> = ({
  isOpen,
  kit,
  isApplying,
  websiteId,
  errorMessage,
  hasUnsavedChanges = false,
  isAutosaving = false,
  hasExistingContent = false,
  onClose,
  onConfirmApply,
}) => {
  const [confirmedReplacement, setConfirmedReplacement] = useState(false);

  // Reset acknowledgment state whenever the dialog opens or kit changes
  useEffect(() => {
    if (isOpen) {
      setConfirmedReplacement(false);
    }
  }, [isOpen, kit]);

  if (!isOpen || !kit) return null;

  const hasTargetWebsite = Boolean(websiteId && websiteId.trim());
  const isBlockedByUnsaved = hasUnsavedChanges || isAutosaving;
  const isBlockedByConfirmation = hasExistingContent && !confirmedReplacement;
  const canApply = hasTargetWebsite && !isApplying && !isBlockedByUnsaved && !isBlockedByConfirmation;

  const handleConfirm = () => {
    if (!canApply) return;
    onConfirmApply(kit, {
      confirmOverwrite: hasExistingContent ? confirmedReplacement : true,
    });
  };

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
            <li>{kit.pageCount} Pages ({kit.pages.map((p) => p.title).join(", ")})</li>
            <li>Global Theme Styles & Typography</li>
            <li>Header & Footer Layout Components</li>
          </ul>
        </div>

        {/* Fix 1: Explicit Destructive Replacement Warning */}
        {hasExistingContent && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <span>⚠️ Replacement Warning</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Applying this kit will <strong>replace all existing pages, layout elements, and theme styles</strong> on your website. Your previous content will be overwritten.
            </p>
            <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedReplacement}
                onChange={(e) => setConfirmedReplacement(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                id="confirm-destructive-overwrite"
              />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                I understand that this will replace my existing website content and layout.
              </span>
            </label>
          </div>
        )}

        {/* Fix 2: Unsaved Editor Changes Blocker */}
        {isAutosaving && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/40 p-3 text-xs text-blue-800 dark:text-blue-300 font-medium flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent inline-block" />
            <span>Autosave is currently in progress. Please wait for saving to finish before applying a kit.</span>
          </div>
        )}

        {hasUnsavedChanges && !isAutosaving && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
            ⚠️ You have unsaved editor changes. Please save or resolve your pending edits before applying a Website Kit to avoid losing work.
          </div>
        )}

        {/* No Target Website Warning */}
        {!hasTargetWebsite && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
            ⚠️ No active target website is selected. Please open a website in ForgeStudio Editor before applying a kit.
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

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
            onClick={handleConfirm}
            disabled={!canApply}
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
