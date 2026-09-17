import React, { useState, useEffect } from "react";
import type { Template } from "../types/template.types";

interface TemplatePreviewModalProps {
  template: Template | null;
  onClose: () => void;
  onInsert: (template: Template) => void;
}

type DeviceMode = "desktop" | "tablet" | "mobile";
type ViewMode = "visual" | "outline";

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  onClose,
  onInsert,
}) => {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [viewMode, setViewMode] = useState<ViewMode>("visual");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (template) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [template, onClose]);

  if (!template) return null;

  const elements = template.templateData?.elements || [];
  const formattedDate = template.createdAt
    ? new Date(template.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const getViewportWidthClass = () => {
    switch (deviceMode) {
      case "tablet":
        return "w-[768px] max-w-full";
      case "mobile":
        return "w-[375px] max-w-full";
      case "desktop":
      default:
        return "w-full max-w-4xl";
    }
  };

  /**
   * Safe recursive visual element renderer for template components
   */
  const renderVisualElement = (item: any, key: string | number) => {
    if (!item || typeof item !== "object") return null;

    const styles: React.CSSProperties = {
      backgroundColor: item.styles?.backgroundColor || "transparent",
      color: item.styles?.color || "inherit",
      fontSize: item.styles?.fontSize ? `${item.styles.fontSize}px` : undefined,
      fontWeight: item.styles?.fontWeight || undefined,
      padding: item.styles?.padding ? `${item.styles.padding}px` : undefined,
      margin: item.styles?.margin ? `${item.styles.margin}px` : undefined,
      borderRadius: item.styles?.borderRadius ? `${item.styles.borderRadius}px` : undefined,
      textAlign: item.styles?.textAlign || undefined,
      display: item.styles?.display || (item.type === "container" ? "flex" : undefined),
      flexDirection: item.styles?.flexDirection || (item.type === "container" ? "column" : undefined),
      justifyContent: item.styles?.justifyContent || undefined,
      alignItems: item.styles?.alignItems || undefined,
      gap: item.styles?.gap ? `${item.styles.gap}px` : undefined,
    };

    switch (item.type) {
      case "heading": {
        const headingLevel = typeof item.tag === "string" ? item.tag.toLowerCase() : "h2";
        const content = item.content || "Sample Heading";
        switch (headingLevel) {
          case "h1":
            return <h1 key={key} style={styles} className="font-bold text-2xl tracking-tight my-1 text-slate-900">{content}</h1>;
          case "h3":
            return <h3 key={key} style={styles} className="font-bold text-lg tracking-tight my-1 text-slate-900">{content}</h3>;
          case "h4":
            return <h4 key={key} style={styles} className="font-bold text-base tracking-tight my-1 text-slate-900">{content}</h4>;
          case "h5":
            return <h5 key={key} style={styles} className="font-bold text-sm tracking-tight my-1 text-slate-900">{content}</h5>;
          case "h6":
            return <h6 key={key} style={styles} className="font-bold text-xs tracking-tight my-1 text-slate-900">{content}</h6>;
          case "h2":
          default:
            return <h2 key={key} style={styles} className="font-bold text-xl tracking-tight my-1 text-slate-900">{content}</h2>;
        }
      }

      case "text":
        return (
          <p key={key} style={styles} className="text-sm text-slate-600 leading-relaxed my-1">
            {item.content || "Sample text content paragraph goes here."}
          </p>
        );

      case "button":
        return (
          <div key={key} className="my-1.5">
            <button
              type="button"
              style={styles}
              className="px-4 py-2 bg-purple-600 text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-purple-700 transition pointer-events-none"
            >
              {item.content || "Click Here"}
            </button>
          </div>
        );

      case "image":
        return (
          <div key={key} className="my-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 max-w-full">
            {item.url ? (
              <img
                src={item.url}
                alt={item.altText || "Template Preview Media"}
                className="max-h-64 w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-36 items-center justify-center text-slate-400 text-xs font-mono">
                🖼️ Image Placeholder
              </div>
            )}
          </div>
        );

      case "blockquote":
        return (
          <blockquote
            key={key}
            style={styles}
            className="my-2 border-l-4 border-purple-500 bg-purple-50/50 p-3 italic text-slate-700 text-xs rounded-r-xl"
          >
            "{item.content || "Quotes inspire creativity and innovation."}"
          </blockquote>
        );

      case "countdown":
        return (
          <div key={key} className="my-2 flex items-center gap-2 p-3 bg-slate-900 text-white rounded-xl text-center">
            {["02", "14", "36", "48"].map((num, idx) => (
              <div key={idx} className="flex-1 bg-slate-800 p-2 rounded-lg">
                <div className="text-base font-bold font-mono text-purple-400">{num}</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-400">
                  {["Days", "Hours", "Mins", "Secs"][idx]}
                </div>
              </div>
            ))}
          </div>
        );

      case "price-table":
        return (
          <div key={key} className="my-2 rounded-2xl border border-purple-200 bg-white p-4 text-center shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              Pro Plan
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">$29/mo</div>
            <p className="text-xs text-slate-500 mb-3">All essential features included</p>
            <button
              type="button"
              className="w-full rounded-xl bg-purple-600 py-2 text-xs font-bold text-white shadow-xs pointer-events-none"
            >
              Get Started
            </button>
          </div>
        );

      case "container":
      default: {
        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
        return (
          <div
            key={key}
            style={styles}
            className={`my-2 rounded-xl p-3 border transition ${
              item.type === "container"
                ? "border-slate-200 bg-slate-50/40"
                : "border-slate-100"
            }`}
          >
            {hasChildren ? (
              item.children.map((child: any, idx: number) =>
                renderVisualElement(child, child.id || `${key}-${idx}`)
              )
            ) : item.content ? (
              <span className="text-xs text-slate-700">{item.content}</span>
            ) : (
              <div className="text-[11px] text-slate-400 italic py-1">
                [{item.type || "Component"}]
              </div>
            )}
          </div>
        );
      }
    }
  };

  /**
   * Structure tree outline renderer
   */
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
                {item.content || item.name || item.type}
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-preview-title"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-3.5 gap-3">
          {/* Title & Category Badge */}
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-lg shadow-xs">
              👁️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="template-preview-title" className="text-base font-bold text-slate-900">
                  {template.name}
                </h3>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  {template.category || "Other"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Saved {formattedDate} • Type: <span className="font-bold text-slate-700">{template.type}</span>
              </p>
            </div>
          </div>

          {/* Controls: View Mode & Responsive Switcher */}
          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("visual")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  viewMode === "visual"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🖼️ Visual Preview
              </button>
              <button
                type="button"
                onClick={() => setViewMode("outline")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  viewMode === "outline"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📋 Outline
              </button>
            </div>

            {/* Device Switcher (Only in Visual Mode) */}
            {viewMode === "visual" && (
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setDeviceMode("desktop")}
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition cursor-pointer ${
                    deviceMode === "desktop"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Desktop Preview"
                >
                  💻 Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode("tablet")}
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition cursor-pointer ${
                    deviceMode === "tablet"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tablet Preview"
                >
                  📱 Tablet
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode("mobile")}
                  className={`rounded-lg px-2 py-1 text-xs font-bold transition cursor-pointer ${
                    deviceMode === "mobile"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Mobile Preview"
                >
                  📱 Mobile
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
              aria-label="Close preview modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70 flex flex-col items-center min-h-[380px]">
          {/* Description Banner */}
          {template.description && (
            <div className="w-full max-w-4xl mb-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-2xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Description: </span>
                <span>{template.description}</span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-slate-400">
                {elements.length} {elements.length === 1 ? "element" : "elements"}
              </span>
            </div>
          )}

          {/* Visual Mode Rendering Frame */}
          {viewMode === "visual" && (
            <div
              className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-200 ${getViewportWidthClass()}`}
            >
              {template.type === "POPUP" ? (
                <div className="relative rounded-2xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xs min-h-[300px] flex flex-col justify-between overflow-hidden">
                  {/* Backdrop Simulation Label */}
                  <div className="absolute top-3 right-3 text-[9px] uppercase font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full">
                    💬 Popup Overlay Preview
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl relative mt-4">
                    <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs font-bold pointer-events-none">
                      ✕
                    </div>
                    {elements.length > 0 ? (
                      <div className="space-y-2">
                        {elements.map((elem: any, idx: number) =>
                          renderVisualElement(elem, elem.id || `root-${idx}`)
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No elements inside this popup.
                      </div>
                    )}
                  </div>
                </div>
              ) : elements.length > 0 ? (
                <div className="space-y-2">
                  {elements.map((elem: any, idx: number) =>
                    renderVisualElement(elem, elem.id || `root-${idx}`)
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                  <span className="text-3xl">📭</span>
                  <p className="text-xs font-bold text-slate-700">No preview content available.</p>
                  <p className="text-[11px] text-slate-500">This template has no valid elements to render.</p>
                </div>
              )}
            </div>
          )}

          {/* Outline Mode Tree View */}
          {viewMode === "outline" && (
            <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>Template Component Structure</span>
                <span className="text-purple-700 font-mono text-[11px] bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  {elements.length} root components
                </span>
              </h4>

              {elements.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 max-h-[420px] overflow-y-auto">
                  {renderElementTreeSummary(elements)}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-200">
                  No element structure details available.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <div className="text-xs text-slate-500 font-medium">
            💡 Previewing template in isolated view. Click <strong className="text-slate-800">Use Template</strong> to insert onto canvas.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onInsert(template);
                onClose();
              }}
              className="rounded-xl border border-purple-600 bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>✨</span>
              <span>Use Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
