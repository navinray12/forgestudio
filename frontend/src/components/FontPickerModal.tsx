import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Star, Sparkles, Check, RefreshCw } from 'lucide-react';
import { FontService } from '../features/fonts/FontService';
import type { FontMetadata, FontCategory } from '../features/fonts/types';
import { loadFontBatch, loadFontFamily } from '../features/fonts/FontLoader';

interface FontPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFont?: string;
  onSelectFont: (family: string) => void;
}

const CATEGORY_TABS: { id: FontCategory | 'all' | 'recent' | 'favorites' | 'popular'; label: string }[] = [
  { id: 'all', label: 'All Fonts' },
  { id: 'popular', label: 'Popular' },
  { id: 'recent', label: 'Recently Used' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'sans-serif', label: 'Sans Serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Handwriting' },
  { id: 'monospace', label: 'Monospace' },
  { id: 'system', label: 'System Fonts' },
];

export const FontPickerModal: React.FC<FontPickerModalProps> = ({
  isOpen,
  onClose,
  selectedFont,
  onSelectFont,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FontCategory | 'all' | 'recent' | 'favorites' | 'popular'>('all');
  const [previewText, setPreviewText] = useState('The quick brown fox jumps over 123');
  const [favTrigger, setFavTrigger] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredFonts = useMemo(() => {
    return FontService.searchFonts({
      query: searchQuery,
      category: activeCategory === 'popular' ? 'all' : activeCategory,
      popularOnly: activeCategory === 'popular',
    });
  }, [searchQuery, activeCategory, favTrigger]);

  // Dynamic Batch Loading for previews in modal
  useEffect(() => {
    if (isOpen && filteredFonts.length > 0) {
      const topFamilies = filteredFonts.slice(0, 30).map((f) => f.family);
      loadFontBatch(topFamilies);
    }
  }, [isOpen, filteredFonts]);

  if (!isOpen) return null;

  const handleToggleFavorite = (e: React.MouseEvent, family: string) => {
    e.stopPropagation();
    FontService.toggleFavorite(family);
    setFavTrigger((prev) => prev + 1);
  };

  const handleSelect = (family: string) => {
    FontService.loadFont(family);
    onSelectFont(family);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-black shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Dynamic Font Library</h2>
              <p className="text-xs font-semibold text-slate-500">Explore, search & preview 1000+ dynamic web & system fonts</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="p-5 border-b border-slate-200 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search fonts by name or style (e.g. Abril, Inter, Roboto, Times)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Custom Preview Text */}
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Custom preview text..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font List Container */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-3">
          {filteredFonts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-sm font-bold text-slate-600 mb-1">No fonts found matching your search</p>
              <p className="text-xs text-slate-400 max-w-sm mb-4">Try searching for a different keyword like "Inter", "Playfair", or "Display".</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredFonts.map((font) => {
                const isSelected = selectedFont && selectedFont.replace(/["']/g, '').toLowerCase() === font.family.toLowerCase();
                const isFav = FontService.isFavorite(font.family);
                const fontStyleCss = FontService.getFontFamilyCss(font.family);

                return (
                  <div
                    key={font.family}
                    onClick={() => handleSelect(font.family)}
                    className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200/90 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition">
                          {font.family}
                        </span>
                        {font.source === 'system' ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                            System
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                            Google
                          </span>
                        )}
                        {font.category && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold capitalize">
                            {font.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, font.family)}
                          className={`p-1.5 rounded-lg transition ${
                            isFav
                              ? 'text-amber-500 hover:bg-amber-50'
                              : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100'
                          }`}
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Font Preview Line */}
                    <div className="py-2.5 px-3 bg-slate-50/70 rounded-lg border border-slate-100 overflow-hidden">
                      <p
                        className="text-base text-slate-800 truncate"
                        style={{ fontFamily: fontStyleCss }}
                      >
                        {previewText || 'The quick brown fox jumps over 123'}
                      </p>
                    </div>

                    {/* Metadata Footer */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Weights: {font.weights.join(', ')}</span>
                      {font.hasItalic && <span className="italic font-serif">Italic supported</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
          <span>Showing {filteredFonts.length} font families</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
