import React, { useState } from "react";
import type { TemplatePart, TemplatePartArea } from "../types/block.types";
import { Layers, Plus, X, Navigation, Sidebar, LayoutGrid } from "lucide-react";

interface TemplatePartManagerProps {
  isOpen: boolean;
  onClose: () => void;
  templateParts: TemplatePart[];
  onSelectPart?: (part: TemplatePart) => void;
  onCreatePart?: (title: string, area: TemplatePartArea) => void;
}

const AREAS: { key: TemplatePartArea; label: string; icon: React.ReactNode }[] = [
  { key: "header", label: "Headers", icon: <Layers className="w-4 h-4 text-sky-400" /> },
  { key: "footer", label: "Footers", icon: <Layers className="w-4 h-4 text-indigo-400" /> },
  { key: "sidebar", label: "Sidebars", icon: <Sidebar className="w-4 h-4 text-emerald-400" /> },
  { key: "navigation", label: "Navigation Areas", icon: <Navigation className="w-4 h-4 text-amber-400" /> },
  { key: "custom", label: "Custom Areas", icon: <LayoutGrid className="w-4 h-4 text-purple-400" /> },
];

export const TemplatePartManager: React.FC<TemplatePartManagerProps> = ({
  isOpen,
  onClose,
  templateParts,
  onSelectPart,
  onCreatePart,
}) => {
  const [activeArea, setActiveArea] = useState<TemplatePartArea>("header");
  const [newTitle, setNewTitle] = useState("");

  if (!isOpen) return null;

  const filteredParts = templateParts.filter((p) => p.area === activeArea);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (onCreatePart) {
      onCreatePart(newTitle.trim(), activeArea);
      setNewTitle("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-750 text-slate-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Template Part Manager</h2>
              <p className="text-xs text-slate-400">Manage reusable Header, Footer, Sidebar, and Navigation areas (F-518)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 gap-2 overflow-x-auto">
          {AREAS.map((areaObj) => (
            <button
              key={areaObj.key}
              type="button"
              onClick={() => setActiveArea(areaObj.key)}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeArea === areaObj.key
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {areaObj.icon}
              {areaObj.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {templateParts.filter((p) => p.area === areaObj.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create Form */}
          <form onSubmit={handleCreate} className="bg-slate-950/40 p-4 rounded-lg border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Create New {AREAS.find((a) => a.key === activeArea)?.label} Part
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. Transparent Sticky Header"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Part
              </button>
            </div>
          </form>

          {/* Parts List */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Available Parts ({filteredParts.length})
            </div>
            {filteredParts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                No template parts created for this area. Add one above to build modular headers, footers, or sidebars.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredParts.map((part) => (
                  <div
                    key={part.id}
                    className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex flex-col justify-between hover:border-indigo-500/50 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-100 mb-1">{part.title}</div>
                      <p className="text-xs text-slate-400 mb-3">Slug: {part.slug}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                      <span className="text-slate-500">v{part.version || 1} • {part.content?.length || 0} blocks</span>
                      {onSelectPart && (
                        <button
                          type="button"
                          onClick={() => onSelectPart(part)}
                          className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded font-medium transition-colors"
                        >
                          Embed / Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
