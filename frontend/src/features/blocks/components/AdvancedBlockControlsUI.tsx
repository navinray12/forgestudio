import React, { useState } from "react";
import type { BlockNode, HTMLAttributeConfig } from "../types/block.types";
import { validateAndCleanCssClasses, normalizeHtmlAnchor, validateUniqueAnchor, sanitizeHtmlAttributes } from "../engine/attributeSanitizer";
import { Shield, Hash, Code, Image as ImageIcon, Layers, Square, Sun, AlertTriangle, Plus, Trash2, Check } from "lucide-react";

interface AdvancedBlockControlsUIProps {
  block: BlockNode;
  allBlocks?: BlockNode[];
  onUpdateBlock: (updated: BlockNode) => void;
}

type TabCategory = "border" | "shadow" | "background" | "image" | "advanced" | "scrollsnap" | "masonry" | "wpwidget";

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
      <div className="grid grid-cols-4 gap-1 border-b border-slate-800 pb-2">
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
          onClick={() => setActiveTab("scrollsnap")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "scrollsnap" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          id="tab-scroll-snap"
        >
          <span>🎯</span>
          Snap
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("masonry")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "masonry" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          id="tab-masonry-layout"
        >
          <span>🧱</span>
          Masonry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("wpwidget")}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            activeTab === "wpwidget" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          id="tab-wp-widget"
        >
          <span>🔌</span>
          WP Widget
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
      {/* Scroll Snap Controls (F-050) */}
      {activeTab === "scrollsnap" && (
        <div className="space-y-3" id="scroll-snap-inspector">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center justify-between">
            <span>🎯 Scroll Snap (F-050)</span>
            <span className="text-[10px] text-indigo-400 font-bold bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800">
              {attributes.scrollSnapType && attributes.scrollSnapType !== "none" ? "ACTIVE" : "OFF"}
            </span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Snap Type (Container)</label>
            <select
              value={attributes.scrollSnapType || "none"}
              onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, scrollSnapType: e.target.value } })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="none">Disabled (None)</option>
              <option value="y mandatory">Vertical Mandatory (y mandatory)</option>
              <option value="y proximity">Vertical Proximity (y proximity)</option>
              <option value="x mandatory">Horizontal Mandatory (x mandatory)</option>
              <option value="x proximity">Horizontal Proximity (x proximity)</option>
              <option value="both mandatory">Both Axes Mandatory</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Snap Alignment (Item)</label>
            <select
              value={attributes.scrollSnapAlign || "none"}
              onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, scrollSnapAlign: e.target.value } })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="none">Default (None)</option>
              <option value="start">Start (Top / Left)</option>
              <option value="center">Center</option>
              <option value="end">End (Bottom / Right)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Snap Stop Behavior</label>
            <select
              value={attributes.scrollSnapStop || "normal"}
              onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, scrollSnapStop: e.target.value } })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="normal">Normal (Pass-through)</option>
              <option value="always">Always Stop (Trap Snap)</option>
            </select>
          </div>
        </div>
      )}

      {/* Masonry Layout Controls (F-051) */}
      {activeTab === "masonry" && (
        <div className="space-y-3" id="masonry-layout-inspector">
          <div className="flex items-center justify-between font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
            <span>🧱 Masonry Layout (F-051)</span>
            <input
              type="checkbox"
              checked={!!attributes.masonryMode}
              onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, masonryMode: e.target.checked } })}
              className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
          </div>

          {attributes.masonryMode && (
            <div className="rounded-lg border border-purple-900/60 bg-purple-950/30 p-2.5 space-y-2.5">
              <div>
                <label className="block text-slate-400 mb-1">Columns Count</label>
                <select
                  value={attributes.masonryColumns || 3}
                  onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, masonryColumns: Number(e.target.value) } })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value={1}>1 Column</option>
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                  <option value={4}>4 Columns</option>
                  <option value={5}>5 Columns</option>
                  <option value={6}>6 Columns</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Gap Spacing (px)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={attributes.masonryGap ?? 16}
                  onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, masonryGap: Number(e.target.value) } })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Masonry Engine</label>
                <select
                  value={attributes.masonryEngine || "css-columns"}
                  onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, masonryEngine: e.target.value } })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="css-columns">CSS Multi-Column Auto-Wrap</option>
                  <option value="js-auto-flow">Dynamic JS Height Auto-Pack Engine</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legacy WP Widget Controls (X-787) */}
      {activeTab === "wpwidget" && (
        <div className="space-y-3" id="wp-legacy-widget-inspector">
          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <span>🔌 Legacy WP Widget (X-787)</span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Widget Title</label>
            <input
              type="text"
              value={attributes.wpWidgetTitle || "WordPress Widget"}
              onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, wpWidgetTitle: e.target.value } })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Select Legacy WP Widget</label>
            <select
              value={attributes.wpWidgetType || "calendar"}
              onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, wpWidgetType: e.target.value } })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="calendar">Calendar (WP_Widget_Calendar)</option>
              <option value="search">Search Form (WP_Widget_Search)</option>
              <option value="categories">Categories List (WP_Widget_Categories)</option>
              <option value="recent_posts">Recent Posts (WP_Widget_Recent_Posts)</option>
              <option value="tag_cloud">Tag Cloud (WP_Widget_Tag_Cloud)</option>
              <option value="custom_html">Custom HTML Block (WP_Widget_Custom_HTML)</option>
              <option value="nav_menu">Navigation Menu (WP_Widget_Nav_Menu)</option>
              <option value="archives">Archives List (WP_Widget_Archives)</option>
              <option value="meta">Site Meta Links (WP_Widget_Meta)</option>
              <option value="rss">RSS Feed Reader (WP_Widget_RSS)</option>
            </select>
          </div>

          {attributes.wpWidgetType === "custom_html" && (
            <div>
              <label className="block text-slate-400 mb-1">Widget Custom HTML</label>
              <textarea
                rows={3}
                value={attributes.wpWidgetContent || ""}
                onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, wpWidgetContent: e.target.value } })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
              />
            </div>
          )}

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={attributes.wpWidgetShowCount !== false}
                onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, wpWidgetShowCount: e.target.checked } })}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600"
              />
              <span>Show Post/Category Counts</span>
            </label>
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={!!attributes.wpWidgetDropdown}
                onChange={(e) => onUpdateBlock({ ...block, attributes: { ...attributes, wpWidgetDropdown: e.target.checked } })}
                className="rounded bg-slate-900 border-slate-700 text-indigo-600"
              />
              <span>Display as Dropdown Select</span>
            </label>
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
              <span title="Whitelisted & Sanitized"><Shield className="w-3.5 h-3.5 text-emerald-400" /></span>
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
