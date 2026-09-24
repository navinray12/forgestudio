import React, { useState } from "react";
import type { BlockTemplate, TemplateType, TemplateLockMode } from "../types/block.types";
import { Layout, Lock, Plus, Check, ShieldAlert, Sparkles, X } from "lucide-react";

interface BlockTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  templates: BlockTemplate[];
  onSelectTemplate?: (template: BlockTemplate) => void;
  onCreateTemplate?: (title: string, type: TemplateType, lock: TemplateLockMode) => void;
}

const TEMPLATE_TYPES: { key: TemplateType; label: string; desc: string }[] = [
  { key: "page", label: "Page Template", desc: "Default layout structure for standard pages" },
  { key: "single", label: "Single Post Template", desc: "Layout for single blog posts & custom CPTs" },
  { key: "archive", label: "Archive Template", desc: "Layout for category, tag, and date archive listings" },
  { key: "404", label: "404 Error Template", desc: "Page rendered for missing/not-found URLs" },
  { key: "front-page", label: "Front Page Template", desc: "Dedicated homepage template layout" },
  { key: "custom", label: "Custom Template", desc: "Reusable layout assigned to specific pages" },
];

export const BlockTemplateManager: React.FC<BlockTemplateManagerProps> = ({
  isOpen,
  onClose,
  templates,
  onSelectTemplate,
  onCreateTemplate,
}) => {
  const [activeType, setActiveType] = useState<TemplateType>("page");
  const [newTitle, setNewTitle] = useState("");
  const [newLockMode, setNewLockMode] = useState<TemplateLockMode>(false);

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((t) => t.type === activeType);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (onCreateTemplate) {
      onCreateTemplate(newTitle.trim(), activeType, newLockMode);
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
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Block Template Manager</h2>
              <p className="text-xs text-slate-400">Manage FSE Block Templates, hierarchy & template locking (F-517)</p>
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

        {/* Hierarchy Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 gap-2 overflow-x-auto">
          {TEMPLATE_TYPES.map((typeObj) => (
            <button
              key={typeObj.key}
              type="button"
              onClick={() => setActiveType(typeObj.key)}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                activeType === typeObj.key
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {typeObj.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {templates.filter((t) => t.type === typeObj.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Create Template Form */}
          <form onSubmit={handleCreate} className="bg-slate-950/40 p-4 rounded-lg border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Create New {TEMPLATE_TYPES.find((t) => t.key === activeType)?.label}</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {TEMPLATE_TYPES.find((t) => t.key === activeType)?.desc}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="e.g. Modern Full-Width Page Template"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <select
                  value={String(newLockMode)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewLockMode(val === "false" ? false : (val as TemplateLockMode));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="false">Unlock (No Restrictions)</option>
                  <option value="all">Lock All (Strict Structural Lock)</option>
                  <option value="insert">Lock Insert/Delete Only</option>
                  <option value="contentOnly">Content Only (Edit text/media only)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Template
              </button>
            </div>
          </form>

          {/* List of Templates */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Templates ({filteredTemplates.length})
            </div>
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                No templates configured for this hierarchy type. Create one above to define structural layouts.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg flex flex-col justify-between hover:border-indigo-500/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                          {template.title}
                          {template.isDefault && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        {template.templateLock && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" />
                            {template.templateLock}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{template.description || `Slug: ${template.slug}`}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                      <span className="text-slate-500">v{template.version || 1} • {template.content?.length || 0} blocks</span>
                      {onSelectTemplate && (
                        <button
                          type="button"
                          onClick={() => onSelectTemplate(template)}
                          className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded font-medium transition-colors"
                        >
                          Edit Layout
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
