import React, { useState } from "react";
import { X, Languages, Download, Copy, Check, Info, ShieldCheck } from "lucide-react";
import {
  exportMultilingualStrings,
  generateHreflangTags,
} from "../../services/multilingualCompatibility.service";
import type { MultilingualExportOptions } from "../../types/accessibility.types";

export interface MultilingualExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: any;
  websiteData: any;
}

export const MultilingualExportModal: React.FC<MultilingualExportModalProps> = ({
  isOpen,
  onClose,
  activePage,
  websiteData,
}) => {
  const [engine, setEngine] = useState<MultilingualExportOptions["engine"]>("wpml");
  const [sourceLang, setSourceLang] = useState<string>("en");
  const [targetLangs, setTargetLangs] = useState<string[]>(["es", "fr", "de"]);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const elements = activePage?.elements || [];
  const siteName = websiteData?.name || websiteData?.siteSettings?.siteName || "ForgeStudio Site";
  const baseUrl = websiteData?.domain || "https://example.com";
  const pageSlug = activePage?.slug || "";

  const options: MultilingualExportOptions = {
    engine,
    sourceLanguage: sourceLang,
    targetLanguages: targetLangs,
  };

  const exportedJson = exportMultilingualStrings(elements, options);
  const hreflangTags = generateHreflangTags(baseUrl, pageSlug, [sourceLang, ...targetLangs]);

  const handleToggleTargetLang = (langCode: string) => {
    setTargetLangs((prev) =>
      prev.includes(langCode) ? prev.filter((l) => l !== langCode) : [...prev, langCode]
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${siteName.toLowerCase().replace(/\s+/g, "_")}_${engine}_translation_package.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multilingual-modal-title"
    >
      <div className="relative w-full max-w-4xl h-[85vh] flex flex-col bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="multilingual-modal-title" className="text-base font-bold text-white tracking-tight">
                  Multilingual Plugin Compatibility (F-381)
                </h2>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Adapter Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Export text content packages for WPML, Polylang, TranslatePress, and Weglot
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Multilingual Modal"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50 space-y-6 text-xs">
          {/* Engine Selector */}
          <div className="space-y-3">
            <label className="font-bold text-slate-200 block text-xs uppercase tracking-wider">
              1. Select Multilingual Translation Engine
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: "wpml", label: "WPML Package", desc: "WordPress WPML String Trans" },
                { id: "polylang", label: "Polylang", desc: "Polylang Strings Array" },
                { id: "translatepress", label: "TranslatePress", desc: "TranslatePress Key Map" },
                { id: "weglot", label: "Weglot API", desc: "Weglot Dynamic Words" },
              ].map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => setEngine(eng.id as any)}
                  className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                    engine === eng.id
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <div className="font-bold text-sm text-indigo-300">{eng.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{eng.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Languages Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <label className="font-bold text-slate-200 block text-xs uppercase tracking-wider">
                Source Language
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-indigo-500"
              >
                <option value="en">English (en)</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="de">German (de)</option>
                <option value="ta">Tamil (ta)</option>
                <option value="ar">Arabic (ar)</option>
              </select>
            </div>

            <div className="space-y-2 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <label className="font-bold text-slate-200 block text-xs uppercase tracking-wider">
                Target Export Languages
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { code: "es", name: "Spanish" },
                  { code: "fr", name: "French" },
                  { code: "de", name: "German" },
                  { code: "it", name: "Italian" },
                  { code: "ar", name: "Arabic (RTL)" },
                  { code: "ta", name: "Tamil" },
                  { code: "zh", name: "Chinese" },
                  { code: "ja", name: "Japanese" },
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleToggleTargetLang(l.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                      targetLangs.includes(l.code)
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    {l.name} ({l.code})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Provider Connection Status */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-300">Adapter & Compatibility Status</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  External Provider Standby
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                ForgeStudio automatically formats all canvas elements into valid multi-lingual JSON packages. If a live API key for {engine.toUpperCase()} is not set in environment settings, export the translation package file below to import directly into your CMS or translation plugin dashboard.
              </p>
            </div>
          </div>

          {/* Generated Hreflang Tags Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 block text-xs uppercase tracking-wider">
                Generated SEO Hreflang Tags
              </label>
              <span className="text-[10px] text-slate-400">Auto-injected into published website &lt;head&gt;</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950 font-mono text-[11px] text-emerald-400 space-y-1 overflow-x-auto">
              {hreflangTags.map((t, idx) => (
                <div key={idx}>
                  &lt;link rel="alternate" hreflang="{t.lang}" href="{t.url}" /&gt;
                </div>
              ))}
            </div>
          </div>

          {/* Package Output Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 block text-xs uppercase tracking-wider">
                Translation Package Output ({engine.toUpperCase()})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied JSON" : "Copy JSON"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {downloadSuccess ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{downloadSuccess ? "Downloaded!" : "Download Package"}</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
              <pre className="p-4 text-xs font-mono text-indigo-300 overflow-x-auto max-h-64 leading-relaxed">
                {exportedJson}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <footer className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
