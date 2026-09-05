import React, { useState, useEffect } from "react";
import type { Template } from "../types/template.types";

interface ShareTemplateDialogProps {
  isOpen: boolean;
  template: Template | null;
  onClose: () => void;
  onToggleShare: (templateId: string, isShared: boolean) => Promise<Template>;
}

export const ShareTemplateDialog: React.FC<ShareTemplateDialogProps> = ({
  isOpen,
  template,
  onClose,
  onToggleShare,
}) => {
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsCopied(false);
      setErrorMessage(null);
    }
  }, [isOpen, template]);

  if (!isOpen || !template) return null;

  const isShared = Boolean(template.isShared);
  const shareToken = template.shareToken;

  const shareUrl = shareToken
    ? `${window.location.origin}/template/share/${shareToken}`
    : "Generating share link...";

  const handleToggleEnable = async () => {
    setIsUpdating(true);
    setErrorMessage(null);
    try {
      await onToggleShare(template.id, !isShared);
    } catch (err: any) {
      const msg = err?.message || "";
      if (
        msg.toLowerCase().includes("unauthorized") ||
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("not found")
      ) {
        setErrorMessage("You don't have permission to share this template.");
      } else {
        setErrorMessage(msg || "Unable to update share settings.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!isShared || !shareToken) return;
    setIsCopying(true);
    setErrorMessage(null);

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setErrorMessage("Unable to copy the link. Please copy it manually.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-template-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-lg">
              🔗
            </span>
            <div>
              <h3 id="share-template-title" className="text-sm font-bold text-slate-800">
                Share Template
              </h3>
              <p className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                {template.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            aria-label="Close share dialog"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Sharing Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800">Public Link Sharing</span>
            <p className="text-[11px] text-slate-500">
              {isShared
                ? "Anyone with the link can view and preview this template."
                : "Only you can access this template."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleEnable}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isShared ? "bg-purple-600" : "bg-slate-300"
            } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
            role="switch"
            aria-checked={isShared}
            aria-label="Toggle public link sharing"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                isShared ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Share Link Input & Copy Button */}
        {isShared && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-200">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Shareable Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700 select-all focus:outline-none focus:ring-1 focus:ring-purple-500"
                aria-label="Shareable link URL"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={isCopying || !shareToken}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${
                  isCopied
                    ? "bg-emerald-600 text-white"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
                aria-label="Copy link to clipboard"
              >
                {isCopied ? "Copied ✓" : "Copy Link"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span className={`h-2 w-2 rounded-full ${isShared ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
            <span>{isShared ? "Sharing Enabled" : "Sharing Disabled"}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
