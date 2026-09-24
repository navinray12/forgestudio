import React from "react";
import { Lock, FileText, Image as ImageIcon, Link as LinkIcon, Sparkles } from "lucide-react";
import type { EditorElement } from "../types";

interface ContentOnlyInspectorProps {
  element: EditorElement | null;
  onUpdateElement: (id: string, updates: Partial<EditorElement>) => void;
  onTriggerImagePicker?: (callback: (url: string) => void) => void;
}

/**
 * Enterprise Content-Only Sandbox Inspector
 * For CLIENT and CONTENT_EDITOR roles: allows safe modification of text copy,
 * media sources, and link URLs while strictly preventing layout or structural tampering.
 */
export const ContentOnlyInspector: React.FC<ContentOnlyInspectorProps> = ({
  element,
  onUpdateElement,
  onTriggerImagePicker,
}) => {
  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <Lock className="w-8 h-8 mb-2 text-slate-300" />
        <p className="text-xs font-semibold">Select an element to edit its content</p>
        <span className="text-[10px] text-slate-400 mt-1">
          Layout and structural styling are managed by the site designer.
        </span>
      </div>
    );
  }

  const isTextElement = [
    "heading",
    "paragraph",
    "text",
    "button",
    "blockquote",
    "alert",
  ].includes(element.type.toLowerCase()) || element.content !== undefined || element.text !== undefined;

  const isMediaElement = [
    "image",
    "img",
    "avatar",
    "banner",
    "video",
  ].includes(element.type.toLowerCase()) || element.src !== undefined || element.image_asset_id !== undefined;

  const isLinkElement = [
    "button",
    "link",
    "nav_link",
    "cta",
  ].includes(element.type.toLowerCase()) || element.href !== undefined || element.settings?.href !== undefined;

  const currentText = element.content ?? element.text ?? "";
  const currentSrc = element.src ?? "";
  const currentAlt = element.alt ?? "";
  const currentHref = element.href ?? element.settings?.href ?? "";

  return (
    <div className="space-y-4">
      {/* Sandbox Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 flex items-start gap-2 shadow-xs">
        <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <span className="block text-xs font-bold leading-tight">Content-Only Sandbox</span>
          <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 mt-0.5 leading-snug">
            You can modify text copy, images, and link targets. Structural layout and styling are locked.
          </p>
        </div>
      </div>

      {/* Element Info */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">
            {element.type}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">ID: {element.id.slice(0, 8)}</span>
      </div>

      {/* 1. Text / Copy Editor */}
      {isTextElement && (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Text Content</span>
          </label>
          <textarea
            rows={element.type === "paragraph" || currentText.length > 60 ? 4 : 2}
            value={currentText}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateElement(element.id, {
                content: val,
                text: val,
              });
            }}
            placeholder="Enter text content..."
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 p-2.5 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* 2. Media Source & Alt Text */}
      {(isMediaElement || currentSrc) && (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 space-y-3">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>Image Source</span>
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={currentSrc}
                onChange={(e) => onUpdateElement(element.id, { src: e.target.value })}
                placeholder="https://... or image URL"
                className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {onTriggerImagePicker && (
                <button
                  type="button"
                  onClick={() => {
                    onTriggerImagePicker((chosenUrl) => {
                      onUpdateElement(element.id, { src: chosenUrl });
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition"
                >
                  Browse
                </button>
              )}
            </div>
            {currentSrc && (
              <div className="relative rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800/50 p-1 flex justify-center max-h-36 overflow-hidden">
                <img
                  src={currentSrc}
                  alt={currentAlt || "Preview"}
                  className="max-h-32 object-contain rounded"
                  onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                />
              </div>
            )}
            <div>
              <span className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                Alt Text (Accessibility)
              </span>
              <input
                type="text"
                value={currentAlt}
                onChange={(e) => onUpdateElement(element.id, { alt: e.target.value })}
                placeholder="Descriptive text for screen readers"
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Link Target URL */}
      {(isLinkElement || currentHref) && (
        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>Link URL / Target</span>
          </label>
          <input
            type="text"
            value={currentHref}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateElement(element.id, {
                href: val,
                settings: { ...(element.settings || {}), href: val },
              });
            }}
            placeholder="https://... or /page-slug"
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 px-2.5 py-1.5 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
};

export default ContentOnlyInspector;
