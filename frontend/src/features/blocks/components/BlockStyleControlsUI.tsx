import React, { useState } from "react";
import type {
  BlockNode,
  TypographyControlConfig,
  ColorControlConfig,
  SpacingControlConfig,
  LayoutControlConfig,
  DimensionsControlConfig,
} from "../types/block.types";
import { Monitor, Tablet, Smartphone, Type, Palette, Move, Layout, Maximize } from "lucide-react";

interface BlockStyleControlsUIProps {
  block: BlockNode;
  onUpdateStyle: (updatedStyle: Record<string, any>) => void;
}

type DeviceBreakpoint = "desktop" | "tablet" | "mobile";

export const BlockStyleControlsUI: React.FC<BlockStyleControlsUIProps> = ({ block, onUpdateStyle }) => {
  const [device, setDevice] = useState<DeviceBreakpoint>("desktop");
  const [activeSection, setActiveSection] = useState<"typography" | "color" | "spacing" | "layout" | "dimensions">("color");

  const currentStyle = block.style || {};

  const updateSectionStyle = (section: string, newValues: Record<string, any>) => {
    if (device === "desktop") {
      onUpdateStyle({
        ...currentStyle,
        [section]: {
          ...(currentStyle[section] || {}),
          ...newValues,
        },
      });
    } else {
      // Responsive override
      onUpdateStyle({
        ...currentStyle,
        [section]: {
          ...(currentStyle[section] || {}),
          responsive: {
            ...((currentStyle[section] || {}).responsive || {}),
            [device]: {
              ...(((currentStyle[section] || {}).responsive || {})[device] || {}),
              ...newValues,
            },
          },
        },
      });
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Device Mode Selector */}
      <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded border border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Device Mode</span>
        <div className="flex bg-slate-900 rounded p-0.5 border border-slate-750">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`p-1 rounded transition-colors ${device === "desktop" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            title="Desktop"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("tablet")}
            className={`p-1 rounded transition-colors ${device === "tablet" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            title="Tablet (max 1024px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`p-1 rounded transition-colors ${device === "mobile" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            title="Mobile (max 767px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Control Category Selector */}
      <div className="grid grid-cols-5 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSection("color")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeSection === "color" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Color
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("typography")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeSection === "typography" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          Type
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("spacing")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeSection === "spacing" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          Space
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("layout")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeSection === "layout" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          Layout
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("dimensions")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeSection === "dimensions" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Maximize className="w-3.5 h-3.5" />
          Dim
        </button>
      </div>

      {/* Colors Controls (F-521) */}
      {activeSection === "color" && (
        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 mb-1">Text Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={(currentStyle.color?.text || "#ffffff").startsWith("#") ? currentStyle.color?.text || "#ffffff" : "#ffffff"}
                onChange={(e) => updateSectionStyle("color", { text: e.target.value })}
                className="w-7 h-7 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
              />
              <input
                type="text"
                placeholder="#ffffff or var(--fs-color-primary)"
                value={currentStyle.color?.text || ""}
                onChange={(e) => updateSectionStyle("color", { text: e.target.value })}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Background Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={(currentStyle.color?.background || "#151521").startsWith("#") ? currentStyle.color?.background || "#151521" : "#151521"}
                onChange={(e) => updateSectionStyle("color", { background: e.target.value })}
                className="w-7 h-7 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
              />
              <input
                type="text"
                placeholder="var(--fs-color-background)"
                value={currentStyle.color?.background || ""}
                onChange={(e) => updateSectionStyle("color", { background: e.target.value })}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Border Color</label>
            <input
              type="text"
              placeholder="#3b82f6"
              value={currentStyle.color?.border || ""}
              onChange={(e) => updateSectionStyle("color", { border: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
          </div>
        </div>
      )}

      {/* Typography Controls (F-520) */}
      {activeSection === "typography" && (
        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 mb-1">Font Family</label>
            <input
              type="text"
              placeholder="Inter, Roboto, sans-serif"
              value={currentStyle.typography?.fontFamily || ""}
              onChange={(e) => updateSectionStyle("typography", { fontFamily: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Font Size</label>
              <input
                type="text"
                placeholder="16px / 1.2rem"
                value={currentStyle.typography?.fontSize || ""}
                onChange={(e) => updateSectionStyle("typography", { fontSize: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Font Weight</label>
              <select
                value={currentStyle.typography?.fontWeight || ""}
                onChange={(e) => updateSectionStyle("typography", { fontWeight: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value="">Default</option>
                <option value="300">Light (300)</option>
                <option value="400">Regular (400)</option>
                <option value="600">Semi-Bold (600)</option>
                <option value="700">Bold (700)</option>
                <option value="900">Black (900)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Line Height</label>
              <input
                type="text"
                placeholder="1.5 / 24px"
                value={currentStyle.typography?.lineHeight || ""}
                onChange={(e) => updateSectionStyle("typography", { lineHeight: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Letter Spacing</label>
              <input
                type="text"
                placeholder="0.05em / 1px"
                value={currentStyle.typography?.letterSpacing || ""}
                onChange={(e) => updateSectionStyle("typography", { letterSpacing: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Spacing Controls (F-522) */}
      {activeSection === "spacing" && (
        <div className="space-y-3">
          <div className="font-medium text-slate-300">Padding (px / rem)</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Top (16px)"
              value={currentStyle.spacing?.padding?.top || ""}
              onChange={(e) => updateSectionStyle("spacing", { padding: { ...(currentStyle.spacing?.padding || {}), top: e.target.value } })}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
            <input
              type="text"
              placeholder="Right (16px)"
              value={currentStyle.spacing?.padding?.right || ""}
              onChange={(e) => updateSectionStyle("spacing", { padding: { ...(currentStyle.spacing?.padding || {}), right: e.target.value } })}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
            <input
              type="text"
              placeholder="Bottom (16px)"
              value={currentStyle.spacing?.padding?.bottom || ""}
              onChange={(e) => updateSectionStyle("spacing", { padding: { ...(currentStyle.spacing?.padding || {}), bottom: e.target.value } })}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
            <input
              type="text"
              placeholder="Left (16px)"
              value={currentStyle.spacing?.padding?.left || ""}
              onChange={(e) => updateSectionStyle("spacing", { padding: { ...(currentStyle.spacing?.padding || {}), left: e.target.value } })}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Gap / Block Spacing</label>
            <input
              type="text"
              placeholder="16px / 1rem"
              value={currentStyle.spacing?.gap || ""}
              onChange={(e) => updateSectionStyle("spacing", { gap: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Layout Controls (F-523) */}
      {activeSection === "layout" && (
        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 mb-1">Layout Type</label>
            <select
              value={currentStyle.layout?.type || "constrained"}
              onChange={(e) => updateSectionStyle("layout", { type: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="constrained">Constrained Width</option>
              <option value="wide">Wide Width</option>
              <option value="full">Full Width</option>
              <option value="flex">Flexbox Container</option>
              <option value="grid">Grid Container</option>
            </select>
          </div>
          {currentStyle.layout?.type === "flex" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Orientation</label>
                <select
                  value={currentStyle.layout?.orientation || "horizontal"}
                  onChange={(e) => updateSectionStyle("layout", { orientation: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="horizontal">Row (Horizontal)</option>
                  <option value="vertical">Column (Vertical)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Justify Content</label>
                <select
                  value={currentStyle.layout?.justifyContent || "flex-start"}
                  onChange={(e) => updateSectionStyle("layout", { justifyContent: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="flex-start">Start</option>
                  <option value="center">Center</option>
                  <option value="flex-end">End</option>
                  <option value="space-between">Space Between</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dimensions Controls (F-524) */}
      {activeSection === "dimensions" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Width</label>
              <input
                type="text"
                placeholder="100% / 400px"
                value={currentStyle.dimensions?.width || ""}
                onChange={(e) => updateSectionStyle("dimensions", { width: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Min Height</label>
              <input
                type="text"
                placeholder="200px / 50vh"
                value={currentStyle.dimensions?.minHeight || ""}
                onChange={(e) => updateSectionStyle("dimensions", { minHeight: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Aspect Ratio</label>
            <input
              type="text"
              placeholder="16/9 or 1/1"
              value={currentStyle.dimensions?.aspectRatio || ""}
              onChange={(e) => updateSectionStyle("dimensions", { aspectRatio: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
          </div>
        </div>
      )}
    </div>
  );
};
