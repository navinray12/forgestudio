import React from "react";
import type { WebsiteKit } from "../types/websiteKit.types";

interface WebsiteKitPreviewModalProps {
  isOpen: boolean;
  kit: WebsiteKit | null;
  onClose: () => void;
  onSelectUse: (kit: WebsiteKit) => void;
}

export const WebsiteKitPreviewModal: React.FC<WebsiteKitPreviewModalProps> = ({
  isOpen,
  kit,
  onClose,
  onSelectUse,
}) => {
  if (!isOpen || !kit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kit-preview-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📦</span>
            <div>
              <h3 id="kit-preview-modal-title" className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                WEBSITE KIT PREVIEW
              </h3>
              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                {kit.category}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main Info Banner */}
          <div className="rounded-xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 text-white shadow-md">
            <h2 className="text-xl font-black mb-1.5">{kit.name}</h2>
            <p className="text-xs text-purple-200 leading-relaxed max-w-xl">
              {kit.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Included Pages List */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>📄</span>
                <span>Included Pages ({kit.pages.length})</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {kit.pages.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 font-medium">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>{p.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">/{p.slug}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Included Global Styles & Theme Settings */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🎨</span>
                <span>Global Styles & Theme</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Typography</span>
                  <span className="font-mono text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{kit.globalStyles.fontFamily}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Primary Color</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-full border border-slate-300" style={{ backgroundColor: kit.globalStyles.primaryColor }} />
                    <span className="font-mono text-[10px]">{kit.globalStyles.primaryColor}</span>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Accent Color</span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 rounded-full border border-slate-300" style={{ backgroundColor: kit.globalStyles.accentColor }} />
                    <span className="font-mono text-[10px]">{kit.globalStyles.accentColor}</span>
                  </div>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><span className="text-emerald-500 font-bold">✓</span> Button Styles</span>
                  <span className="font-mono text-[10px]">Border Radius: {kit.globalStyles.buttonBorderRadius}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSelectUse(kit)}
            className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition flex items-center gap-2 cursor-pointer"
          >
            <span>✨</span>
            <span>Use Website Kit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
