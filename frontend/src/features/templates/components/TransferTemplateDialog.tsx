import React, { useState, useEffect } from "react";
import type { Template } from "../types/template.types";

interface WebsiteTarget {
  id: string;
  name: string;
  slug: string;
}

interface TransferTemplateDialogProps {
  isOpen: boolean;
  template: Template | null;
  apiUrl: string;
  onClose: () => void;
  onTransfer: (template: Template, targetWebsiteId: string, targetWebsiteName: string) => Promise<void>;
}

export const TransferTemplateDialog: React.FC<TransferTemplateDialogProps> = ({
  isOpen,
  template,
  apiUrl,
  onClose,
  onTransfer,
}) => {
  const [websites, setWebsites] = useState<WebsiteTarget[]>([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");
  const [loadingWebsites, setLoadingWebsites] = useState<boolean>(false);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedWebsiteId("");
      setError(null);
      setIsTransferring(false);
      fetchUserWebsites();
    }
  }, [isOpen]);

  const fetchUserWebsites = async () => {
    try {
      setLoadingWebsites(true);
      const res = await fetch(`${apiUrl}/api/websites`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.websites)) {
        setWebsites(data.websites);
        if (data.websites.length > 0) {
          setSelectedWebsiteId(data.websites[0].id);
        }
      } else {
        setError("Unable to load destination websites.");
      }
    } catch (err) {
      console.error("Failed to fetch websites for transfer:", err);
      setError("Failed to connect to server.");
    } finally {
      setLoadingWebsites(false);
    }
  };

  if (!isOpen || !template) return null;

  const handleConfirmTransfer = async () => {
    if (!selectedWebsiteId || isTransferring) return;

    const targetSite = websites.find((w) => w.id === selectedWebsiteId);
    const targetName = targetSite ? targetSite.name : "Target Project";

    setIsTransferring(true);
    setError(null);

    try {
      await onTransfer(template, selectedWebsiteId, targetName);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Transfer failed. Please try again.");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-template-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-lg">
              🔁
            </span>
            <h3 id="transfer-template-dialog-title" className="text-base font-bold">
              TRANSFER TEMPLATE
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isTransferring}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
            aria-label="Close transfer template dialog"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Transfer a copy of <strong className="text-slate-800 dark:text-slate-200">"{template.name}"</strong> to another website project.
        </p>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {/* Selected Template Info */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Source Template:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{template.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Category:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">{template.category || "Other"}</span>
          </div>
        </div>

        {/* Target Website Selector */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
            Target Destination Website
          </label>

          {loadingWebsites ? (
            <div className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 flex items-center text-xs text-slate-400">
              Loading user websites...
            </div>
          ) : websites.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
              No other website projects found in your account.
            </div>
          ) : (
            <select
              value={selectedWebsiteId}
              onChange={(e) => setSelectedWebsiteId(e.target.value)}
              disabled={isTransferring}
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 text-xs font-semibold outline-none transition cursor-pointer"
            >
              {websites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.slug})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isTransferring}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmTransfer}
            disabled={!selectedWebsiteId || isTransferring || websites.length === 0}
            className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isTransferring ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Transferring...</span>
              </>
            ) : (
              <span>Transfer Template</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
