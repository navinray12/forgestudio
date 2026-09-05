import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Template } from "../../features/templates/types/template.types";
import { getPublicTemplate, saveAsTemplate } from "../../features/templates/services/templateService";
import { sanitizeAndRegenerateElementIds } from "../../features/templates/utils/templateValidation";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const SharedTemplatePreviewPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setError("This template is no longer available.");
      setIsLoading(false);
      return;
    }

    const fetchSharedTemplate = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getPublicTemplate(API_URL, shareToken);
        setTemplate(data);
      } catch (err: any) {
        setError(err?.message || "This template is no longer available or sharing is disabled.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedTemplate();
  }, [shareToken]);

  const handleUseTemplate = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!template) return;

    setIsImporting(true);
    try {
      const originalElements = template.templateData?.elements || [];
      const sanitizedElements = sanitizeAndRegenerateElementIds(originalElements);
      const sanitizedPageSettings = JSON.parse(JSON.stringify(template.templateData?.pageSettings || {}));

      await saveAsTemplate(API_URL, {
        name: `${template.name} (Shared)`,
        description: template.description || "Imported from shared template link",
        type: template.type || "PAGE",
        category: template.category || "Other",
        isFavorite: false,
        isShared: false,
        templateData: {
          elements: sanitizedElements,
          pageSettings: sanitizedPageSettings,
        },
      });

      setImportSuccess(true);
    } catch (err: any) {
      alert(err?.message || "Failed to add shared template to your library.");
    } finally {
      setIsImporting(false);
    }
  };

  const renderElementTreeSummary = (items: any[], level = 0) => {
    if (!items || items.length === 0) return null;
    return (
      <ul className={`space-y-1.5 ${level > 0 ? "ml-4 border-l border-slate-200 pl-3 mt-1.5" : ""}`}>
        {items.map((item, idx) => (
          <li key={item.id || idx} className="text-xs text-slate-700">
            <div className="flex items-center gap-2 py-0.5">
              <span className="font-semibold text-purple-600 capitalize bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 text-[10px]">
                {item.type || "Element"}
              </span>
              <span className="truncate max-w-xs text-slate-800 font-medium">
                {item.content || item.type}
              </span>
              {item.children && item.children.length > 0 && (
                <span className="text-[10px] text-slate-400 font-normal">
                  ({item.children.length} nested)
                </span>
              )}
            </div>
            {item.children && item.children.length > 0 && renderElementTreeSummary(item.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  const elements = template?.templateData?.elements || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white font-bold text-lg shadow-lg">
            ⚡
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>ForgeStudio</span>
              <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-950/80 border border-purple-800 px-2 py-0.5 rounded-full">
                Public Shared Template
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Reusable Design System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(user ? "/dashboard" : "/login")}
            className="rounded-xl border border-purple-600 bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition cursor-pointer"
          >
            {user ? "Go to Dashboard" : "Open ForgeStudio"}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
            <p className="text-sm text-slate-400 font-medium">
              Loading shared template preview...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-900/50 bg-rose-950/30 p-8 text-center my-12 space-y-4 max-w-md mx-auto">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-900/50 text-rose-300 text-3xl">
              🚫
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-rose-200">
                Template Unavailable
              </h2>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(user ? "/dashboard" : "/login")}
              className="mt-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
            >
              Go to ForgeStudio
            </button>
          </div>
        )}

        {/* Import Success State */}
        {importSuccess && (
          <div className="rounded-3xl border border-emerald-800 bg-emerald-950/40 p-6 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900/60 text-emerald-300 text-2xl mx-auto">
              ✓
            </div>
            <h3 className="text-lg font-bold text-emerald-200">
              Template Added Successfully!
            </h3>
            <p className="text-xs text-emerald-300/80">
              This template has been saved to your Template Library.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Template Detail Card */}
        {!isLoading && !error && template && !importSuccess && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl p-6 sm:p-8 space-y-6 backdrop-blur-md">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-950/90 border border-purple-800 px-2.5 py-0.5 rounded-md">
                    {template.category || "Other"}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-md">
                    {template.type}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">
                  {template.name}
                </h2>
                {template.description ? (
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                    {template.description}
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-500">No description provided</p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseTemplate}
                  disabled={isImporting}
                  className="w-full sm:w-auto rounded-xl border border-purple-600 bg-purple-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg hover:bg-purple-700 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  aria-label="Use or import this shared template into your library"
                >
                  <span>✨</span>
                  <span>{isImporting ? "Importing..." : "Use This Template"}</span>
                </button>
              </div>
            </div>

            {/* Tree Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Template Component Hierarchy</span>
                <span className="font-mono text-[11px] text-purple-400">
                  {elements.length} root elements
                </span>
              </h3>

              {elements.length > 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 max-h-96 overflow-y-auto">
                  {renderElementTreeSummary(elements)}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-800">
                  No elements found in template data.
                </div>
              )}
            </div>

            {/* Safe usage notice */}
            <div className="rounded-2xl border border-purple-900/40 bg-purple-950/30 p-4 text-xs text-purple-200/90 leading-relaxed">
              💡 <strong>ForgeStudio Safe Sharing:</strong> This template preview is rendered safely without exposing authentication tokens, private user data, or internal editor state.
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedTemplatePreviewPage;
