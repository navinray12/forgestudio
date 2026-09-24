import React, { useState } from "react";
import type { GlobalStyleConfig } from "../types/block.types";
import { Palette, Type, Move, Layout, Maximize, X, Check, RotateCcw } from "lucide-react";

interface GlobalStylesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  globalStyles: GlobalStyleConfig;
  onSaveStyles: (updated: GlobalStyleConfig) => void;
}

type TabType = "colors" | "typography" | "spacing" | "layout" | "dimensions";

export const GlobalStylesPanel: React.FC<GlobalStylesPanelProps> = ({
  isOpen,
  onClose,
  globalStyles,
  onSaveStyles,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("colors");
  const [localStyles, setLocalStyles] = useState<GlobalStyleConfig>(globalStyles);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleColorChange = (key: string, val: string) => {
    setLocalStyles((prev) => ({
      ...prev,
      colors: {
        ...(prev.colors || {}),
        [key]: val,
      },
    }));
  };

  const handleSave = () => {
    onSaveStyles(localStyles);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  const handleReset = () => {
    setLocalStyles(globalStyles);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-slate-900 border-l border-slate-750 text-slate-100 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-sm">Global Styles Engine</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-950/30 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("colors")}
          className={`py-2 flex flex-col items-center gap-1 border-b-2 font-medium transition-colors ${
            activeTab === "colors" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
          title="Colors"
        >
          <Palette className="w-3.5 h-3.5" />
          Color
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("typography")}
          className={`py-2 flex flex-col items-center gap-1 border-b-2 font-medium transition-colors ${
            activeTab === "typography" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
          title="Typography"
        >
          <Type className="w-3.5 h-3.5" />
          Type
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("spacing")}
          className={`py-2 flex flex-col items-center gap-1 border-b-2 font-medium transition-colors ${
            activeTab === "spacing" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
          title="Spacing"
        >
          <Move className="w-3.5 h-3.5" />
          Space
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("layout")}
          className={`py-2 flex flex-col items-center gap-1 border-b-2 font-medium transition-colors ${
            activeTab === "layout" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
          title="Layout"
        >
          <Layout className="w-3.5 h-3.5" />
          Layout
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("dimensions")}
          className={`py-2 flex flex-col items-center gap-1 border-b-2 font-medium transition-colors ${
            activeTab === "dimensions" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
          title="Dimensions"
        >
          <Maximize className="w-3.5 h-3.5" />
          Dim
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === "colors" && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Global Palette Tokens</div>
            {Object.entries(localStyles.colors || { primary: "#3699ff", secondary: "#2b2b40", accent: "#7367f0", background: "#151521", text: "#ffffff" }).map(
              ([name, val]) => (
                <div key={name} className="flex items-center justify-between bg-slate-950/40 p-2 rounded border border-slate-800">
                  <span className="capitalize font-mono text-slate-300">--fs-color-{name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={val.startsWith("#") && val.length === 7 ? val : "#3699ff"}
                      onChange={(e) => handleColorChange(name, e.target.value)}
                      className="w-6 h-6 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleColorChange(name, e.target.value)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-[11px]"
                    />
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === "typography" && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Global Typography System</div>
            <div>
              <label className="block text-slate-400 mb-1">Font Family</label>
              <input
                type="text"
                value={localStyles.typography?.fontFamily || "Inter, sans-serif"}
                onChange={(e) =>
                  setLocalStyles((prev) => ({
                    ...prev,
                    typography: { ...prev.typography, fontFamily: e.target.value },
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Base Font Size</label>
              <input
                type="text"
                value={localStyles.typography?.fontSize || "16px"}
                onChange={(e) =>
                  setLocalStyles((prev) => ({
                    ...prev,
                    typography: { ...prev.typography, fontSize: e.target.value },
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Line Height</label>
              <input
                type="text"
                value={localStyles.typography?.lineHeight || "1.5"}
                onChange={(e) =>
                  setLocalStyles((prev) => ({
                    ...prev,
                    typography: { ...prev.typography, lineHeight: e.target.value },
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
          </div>
        )}

        {activeTab === "spacing" && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Global Spacing System</div>
            <div>
              <label className="block text-slate-400 mb-1">Block Gap Preset</label>
              <input
                type="text"
                value={localStyles.spacing?.gap || "16px"}
                onChange={(e) =>
                  setLocalStyles((prev) => ({
                    ...prev,
                    spacing: { ...prev.spacing, gap: e.target.value },
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
          </div>
        )}

        {activeTab === "layout" && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Global Container Layout</div>
            <div>
              <label className="block text-slate-400 mb-1">Constrained Width (px)</label>
              <input
                type="text"
                value={localStyles.layout?.contentSize || "1200px"}
                onChange={(e) =>
                  setLocalStyles((prev) => ({
                    ...prev,
                    layout: { ...prev.layout, contentSize: e.target.value },
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Wide Alignment Width (px)</label>
              <input
                type="text"
                value={localStyles.layout?.wideSize || "1400px"}
                onChange={(e) =>
                  setLocalStyles((prev) => ({
                    ...prev,
                    layout: { ...prev.layout, wideSize: e.target.value },
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
          </div>
        )}

        {activeTab === "dimensions" && (
          <div className="space-y-3">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Global Dimensions Defaults</div>
            <div>
              <label className="block text-slate-400 mb-1">Default Aspect Ratio</label>
              <input
                type="text"
                value={localStyles.dimensions?.aspectRatio || "auto"}
                onChange={(e) =>
                  setLocalStyles((prev) => ({
                    ...prev,
                    dimensions: { ...prev.dimensions, aspectRatio: e.target.value },
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
          title="Reset overrides"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
        >
          {savedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Applied!
            </>
          ) : (
            "Save & Apply Styles"
          )}
        </button>
      </div>
    </div>
  );
};
