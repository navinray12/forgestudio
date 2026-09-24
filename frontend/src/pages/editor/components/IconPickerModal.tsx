import React, { useState, useEffect, useMemo } from "react";
import {
  ICON_CATEGORIES,
  ICON_REGISTRY,
  searchIcons,
  IconRenderer,
} from "../widgets/icons";
import type { IconDefinition } from "../widgets/icons";

export interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string, iconProvider?: string) => void;
  onRemoveIcon?: () => void;
  currentIcon?: string;
}

const RECENT_STORAGE_KEY = "fs_recent_icons";
const FAVORITE_STORAGE_KEY = "fs_favorite_icons";

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
  onRemoveIcon,
  currentIcon = "",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [hoveredIcon, setHoveredIcon] = useState<IconDefinition | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(120);
  const [activeTab, setActiveTab] = useState<"library" | "custom">("library");
  const [customIconInput, setCustomIconInput] = useState<string>(currentIcon || "");

  // Favorites & Recents state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ["star", "heart", "check", "arrow-right", "shopping-cart"];
    } catch {
      return ["star", "heart", "check", "arrow-right", "shopping-cart"];
    }
  });

  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ["arrow-right", "check", "user", "mail", "star"];
    } catch {
      return ["arrow-right", "check", "user", "mail", "star"];
    }
  });

  // Reset display limit when query or category changes
  useEffect(() => {
    setDisplayLimit(120);
  }, [searchQuery, selectedCategory]);

  // Save favorites to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  // Save recents to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recents));
    } catch {}
  }, [recents]);

  const toggleFavorite = (iconId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(iconId) ? prev.filter((id) => id !== iconId) : [...prev, iconId]
    );
  };

  const handleSelect = (icon: IconDefinition) => {
    // Add to recents
    setRecents((prev) => {
      const filtered = prev.filter((id) => id !== icon.id);
      return [icon.id, ...filtered].slice(0, 20);
    });

    onSelectIcon(icon.lucideName || icon.id, icon.provider);
    onClose();
  };

  const handleCustomApply = () => {
    if (!customIconInput.trim()) return;
    onSelectIcon(customIconInput.trim(), "custom");
    onClose();
  };

  const filteredIcons = useMemo(() => {
    return searchIcons(searchQuery, selectedCategory, favorites, recents);
  }, [searchQuery, selectedCategory, favorites, recents]);

  const visibleIcons = useMemo(() => {
    return filteredIcons.slice(0, displayLimit);
  }, [filteredIcons, displayLimit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="relative flex h-[85vh] max-h-[700px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <span className="text-base font-bold">🎨</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Advanced Icon Library</h2>
              <p className="text-xs font-medium text-slate-500">
                Browse & customize over 1,400+ production vector icons or enter a custom SVG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-lg bg-slate-200/80 p-0.5 mr-2">
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  activeTab === "library"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                ✨ Icon Library
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={`rounded-md px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  activeTab === "custom"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                ⚡ Custom SVG / Name
              </button>
            </div>

            {onRemoveIcon && currentIcon && (
              <button
                type="button"
                onClick={() => {
                  onRemoveIcon();
                  onClose();
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 hover:text-red-700 transition cursor-pointer"
              >
                ✕ Remove Icon
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {activeTab === "library" ? (
          <>
            {/* Search & Filter Section */}
            <div className="space-y-3 border-b border-slate-100 bg-white p-4">
              {/* Search Input */}
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 1,400+ vector icons by name, keyword (e.g. arrow, user, mail, shield, wifi)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-10 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {ICON_CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                      }`}
                    >
                      {cat === "Favorites" ? "★ Favorites" : cat === "Recently Used" ? "🕒 Recent" : cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icons Grid Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/40">
              {filteredIcons.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-500 mb-2">
                    🔎
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No icons found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    No matching icons found for "{searchQuery}". Try searching for broader terms like "arrow", "user", or "media".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("All");
                    }}
                    className="mt-3 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 cursor-pointer"
                  >
                    Reset Search Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                    {visibleIcons.map((iconDef) => {
                      const isSelected =
                        currentIcon === iconDef.id ||
                        currentIcon === iconDef.name ||
                        currentIcon === iconDef.lucideName;
                      const isFav = favorites.includes(iconDef.id);

                      return (
                        <div
                          key={iconDef.id}
                          onClick={() => handleSelect(iconDef)}
                          onMouseEnter={() => setHoveredIcon(iconDef)}
                          onMouseLeave={() => setHoveredIcon(null)}
                          className={`group relative flex flex-col items-center justify-center rounded-xl border p-3 transition-all cursor-pointer ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-500/30"
                              : "border-slate-200/80 bg-white hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-sm"
                          }`}
                        >
                          {/* Favorite Star Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(iconDef.id, e)}
                            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                            className={`absolute top-1.5 right-1.5 text-[11px] transition-opacity cursor-pointer ${
                              isFav
                                ? "text-amber-500 opacity-100"
                                : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-500"
                            }`}
                          >
                            {isFav ? "★" : "☆"}
                          </button>

                          {/* Icon SVG */}
                          <div className="my-1 text-slate-700 transition group-hover:scale-110 group-hover:text-blue-600">
                            <IconRenderer iconName={iconDef.lucideName || iconDef.id} size={28} />
                          </div>

                          {/* Label */}
                          <span className="mt-1.5 text-[10px] font-semibold text-slate-600 truncate w-full text-center group-hover:text-blue-900">
                            {iconDef.name}
                          </span>

                          {/* Selected Indicator */}
                          {isSelected && (
                            <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white shadow-xs">
                              ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Load More Button & Icon Count */}
                  {displayLimit < filteredIcons.length && (
                    <div className="flex flex-col items-center justify-center pt-2 pb-4 border-t border-slate-200/60">
                      <span className="text-[11px] font-medium text-slate-500 mb-2">
                        Showing <strong className="text-slate-700">{displayLimit}</strong> of <strong className="text-slate-700">{filteredIcons.length}</strong> matching icons
                      </span>
                      <button
                        type="button"
                        onClick={() => setDisplayLimit((prev) => prev + 120)}
                        className="rounded-xl bg-blue-50 border border-blue-200 px-6 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 hover:text-blue-800 shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        ⚡ Load More Icons (+120)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Custom SVG / Custom Name Input Section */
          <div className="flex-1 p-6 space-y-4 bg-slate-50/40">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Custom Icon Identifier or SVG String
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Enter any Lucide icon name (e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">Sparkles</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600">Rocket</code>), custom icon class, or raw SVG code.
                </p>
                <textarea
                  value={customIconInput}
                  onChange={(e) => setCustomIconInput(e.target.value)}
                  placeholder="e.g. Rocket, ShieldAlert, or <svg>...</svg>"
                  rows={6}
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Live Preview */}
              <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600">Live Preview:</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-blue-600">
                  <IconRenderer iconName={customIconInput || "Star"} size={32} />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {customIconInput ? (
                    <span>Using custom icon: <strong className="text-slate-800">{customIconInput}</strong></span>
                  ) : (
                    <span>Default preview fallback icon</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCustomApply}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-95 cursor-pointer"
                >
                  Apply Custom Icon
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer & Dynamic Preview */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            {hoveredIcon ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5">
                <IconRenderer iconName={hoveredIcon.lucideName || hoveredIcon.id} size={24} color="#2563eb" />
                <div>
                  <div className="text-xs font-bold text-slate-800">{hoveredIcon.name}</div>
                  <div className="text-[10px] font-medium text-slate-500">
                    Category: <span className="font-semibold text-slate-700">{hoveredIcon.category}</span>
                  </div>
                </div>
              </div>
            ) : currentIcon ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Selected:</span>
                <span className="font-mono text-blue-600 font-bold">{currentIcon}</span>
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-400">Hover over an icon to preview details</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconPickerModal;
