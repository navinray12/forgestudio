import React, { useState } from "react";
import type { BlockNode, HTMLAttributeConfig } from "../types/block.types";
import { validateAndCleanCssClasses, normalizeHtmlAnchor, validateUniqueAnchor, sanitizeHtmlAttributes } from "../engine/attributeSanitizer";
import { Shield, Hash, Code, Image as ImageIcon, Layers, Square, Sun, AlertTriangle, Plus, Trash2, Check } from "lucide-react";

interface AdvancedBlockControlsUIProps {
  block: BlockNode;
  allBlocks?: BlockNode[];
  onUpdateBlock: (updated: BlockNode) => void;
}

type TabCategory = "border" | "shadow" | "background" | "image" | "advanced";

export const AdvancedBlockControlsUI: React.FC<AdvancedBlockControlsUIProps> = ({
  block,
  allBlocks = [],
  onUpdateBlock,
}) => {
  const [activeTab, setActiveTab] = useState<TabCategory>("border");
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrValue, setNewAttrValue] = useState("");

  const currentStyle = block.style || {};
  const attributes = block.attributes || {};

  // Custom CSS Classes Validation (F-529)
  const classValidation = validateAndCleanCssClasses(block.className || "");

  // HTML Anchor Validation (F-530)
  const anchorValidation = validateUniqueAnchor(block.anchor || "", block.id, allBlocks);

  const handleUpdateStyle = (section: string, updatedValues: Record<string, any>) => {
    onUpdateBlock({
      ...block,
      style: {
        ...currentStyle,
        [section]: {
          ...((currentStyle as any)[section] || {}),
          ...updatedValues,
        },
      },
    });
  };

  const handleAddAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrName.trim()) return;

    const existingAttrs: HTMLAttributeConfig[] = attributes.htmlAttributes || [];
    const updatedRaw = [...existingAttrs, { name: newAttrName.trim(), value: newAttrValue.trim() }];
    const sanitized = sanitizeHtmlAttributes(updatedRaw);

    onUpdateBlock({
      ...block,
      attributes: {
        ...attributes,
        htmlAttributes: sanitized,
      },
    });

    setNewAttrName("");
    setNewAttrValue("");
  };

  const handleRemoveAttribute = (index: number) => {
    const existingAttrs: HTMLAttributeConfig[] = attributes.htmlAttributes || [];
    const updated = existingAttrs.filter((_, i) => i !== index);
    onUpdateBlock({
      ...block,
      attributes: {
        ...attributes,
        htmlAttributes: updated,
      },
    });
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Category Tabs */}
      <div className="grid grid-cols-5 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("border")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "border" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Square className="w-3.5 h-3.5" />
          Border
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("shadow")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "shadow" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          Shadow
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("background")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "background" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          BG
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("image")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "image" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Image
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("advanced")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "advanced" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Attrs
        </button>
      </div>

      {/* Border Controls (F-525) */}
      {activeTab === "border" && (
        <div className="space-y-3">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Border Settings</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Border Width</label>
              <input
                type="text"
                placeholder="1px / 2px"
                value={(currentStyle as any).border?.width || ""}
                onChange={(e) => handleUpdateStyle("border", { width: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Border Style</label>
              <select
                value={(currentStyle as any).border?.style || "solid"}
                onChange={(e) => handleUpdateStyle("border", { style: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value="none">None</option>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="double">Double</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Border Color</label>
            <input
              type="text"
              placeholder="#3b82f6 or var(--fs-color-primary)"
              value={(currentStyle as any).border?.color || ""}
              onChange={(e) => handleUpdateStyle("border", { color: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Border Radius</label>
            <input
              type="text"
              placeholder="8px / 50% / 0.5rem"
              value={(currentStyle as any).border?.radius || ""}
              onChange={(e) => handleUpdateStyle("border", { radius: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Shadow Controls (F-526) */}
      {activeTab === "shadow" && (
        <div className="space-y-3">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Box Shadow Settings</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Offset X</label>
              <input
                type="text"
                placeholder="0px"
                value={(currentStyle as any).shadow?.x || "0px"}
                onChange={(e) => handleUpdateStyle("shadow", { x: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Offset Y</label>
              <input
                type="text"
                placeholder="4px"
                value={(currentStyle as any).shadow?.y || "4px"}
                onChange={(e) => handleUpdateStyle("shadow", { y: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Blur Radius</label>
              <input
                type="text"
                placeholder="10px"
                value={(currentStyle as any).shadow?.blur || "10px"}
                onChange={(e) => handleUpdateStyle("shadow", { blur: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Spread Radius</label>
              <input
                type="text"
                placeholder="0px"
                value={(currentStyle as any).shadow?.spread || "0px"}
                onChange={(e) => handleUpdateStyle("shadow", { spread: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Shadow Color</label>
            <input
              type="text"
              placeholder="rgba(0,0,0,0.15)"
              value={(currentStyle as any).shadow?.color || "rgba(0,0,0,0.15)"}
              onChange={(e) => handleUpdateStyle("shadow", { color: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="shadow-inset"
              checked={!!(currentStyle as any).shadow?.inset}
              onChange={(e) => handleUpdateStyle("shadow", { inset: e.target.checked })}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="shadow-inset" className="text-slate-300 cursor-pointer">
              Inset Shadow (Inner)
            </label>
          </div>
        </div>
      )}

      {/* Background Controls (F-527) */}
      {activeTab === "background" && (
        <div className="space-y-3">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Background Image & Gradient</div>
          <div>
            <label className="block text-slate-400 mb-1">Background Image URL</label>
            <input
              type="text"
              placeholder="https://example.com/hero-bg.jpg"
              value={(currentStyle as any).background?.image || ""}
              onChange={(e) => handleUpdateStyle("background", { image: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Size</label>
              <select
                value={(currentStyle as any).background?.size || "cover"}
                onChange={(e) => handleUpdateStyle("background", { size: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Repeat</label>
              <select
                value={(currentStyle as any).background?.repeat || "no-repeat"}
                onChange={(e) => handleUpdateStyle("background", { repeat: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value="no-repeat">No Repeat</option>
                <option value="repeat">Repeat Both</option>
                <option value="repeat-x">Repeat X</option>
                <option value="repeat-y">Repeat Y</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">CSS Gradient Overlay</label>
            <input
              type="text"
              placeholder="linear-gradient(135deg, #3699ff 0%, #2b2b40 100%)"
              value={(currentStyle as any).background?.gradient || ""}
              onChange={(e) => handleUpdateStyle("background", { gradient: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
          </div>
        </div>
      )}

      {/* Responsive Image Controls (F-528) */}
      {activeTab === "image" && (
        <div className="space-y-3">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Responsive Image (srcset & sizes)</div>
          <div>
            <label className="block text-slate-400 mb-1">Srcset Attribute</label>
            <textarea
              rows={2}
              placeholder="img-300.jpg 300w, img-768.jpg 768w, img-1024.jpg 1024w"
              value={attributes.srcset || ""}
              onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, srcset: e.target.value } })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Sizes Attribute</label>
            <input
              type="text"
              placeholder="(max-width: 768px) 100vw, 50vw"
              value={attributes.sizes || ""}
              onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, sizes: e.target.value } })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Loading</label>
              <select
                value={attributes.loading || "lazy"}
                onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, loading: e.target.value } })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                <option value="lazy">Lazy (Default)</option>
                <option value="eager">Eager</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Alt Text</label>
              <input
                type="text"
                placeholder="Accessible image description"
                value={attributes.alt || ""}
                onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, alt: e.target.value } })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Classes, Anchors & Attributes (F-529, F-530, F-531) */}
      {activeTab === "advanced" && (
        <div className="space-y-4">
          {/* Custom CSS Classes (F-529) */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              Custom CSS Classes (F-529)
            </label>
            <input
              type="text"
              value={block.className || ""}
              onChange={(e) => {
                const val = e.target.value;
                const validated = validateAndCleanCssClasses(val);
                onUpdateBlock({
                  ...block,
                  className: validated.cleaned || val,
                });
              }}
              placeholder="my-card highlight-box"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
            {classValidation.errors.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                {classValidation.errors[0]}
              </div>
            )}
          </div>

          {/* HTML Anchor (F-530) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              HTML Anchor / Deep-Link (F-530)
            </label>
            <input
              type="text"
              value={block.anchor || ""}
              onChange={(e) => {
                const normalized = normalizeHtmlAnchor(e.target.value);
                onUpdateBlock({ ...block, anchor: normalized });
              }}
              placeholder="hero-section"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
            />
            {!anchorValidation.unique && (
              <div className="flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                <AlertTriangle className="w-3 h-3" />
                Duplicate anchor! Anchor "{block.anchor}" already used on block {anchorValidation.duplicateBlockId}.
              </div>
            )}
          </div>

          {/* Additional Safe HTML Attributes (F-531) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                Safe HTML Attributes (F-531)
              </label>
              <Shield className="w-3.5 h-3.5 text-emerald-400" title="Whitelisted & Sanitized" />
            </div>

            <form onSubmit={handleAddAttribute} className="grid grid-cols-5 gap-2">
              <input
                type="text"
                placeholder="aria-label"
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                className="col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
              />
              <input
                type="text"
                placeholder="Header Region"
                value={newAttrValue}
                onChange={(e) => setNewAttrValue(e.target.value)}
                className="col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded p-1 flex items-center justify-center transition-colors"
                title="Add attribute"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="space-y-1.5 pt-1">
              {(attributes.htmlAttributes || []).map((attr: HTMLAttributeConfig, idx: number) => (
                <div key={`${attr.name}-${idx}`} className="flex items-center justify-between bg-slate-950/40 p-1.5 rounded border border-slate-800 font-mono text-[11px]">
                  <span className="text-indigo-400 font-semibold">{attr.name}=<span className="text-emerald-300">"{attr.value}"</span></span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(idx)}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
