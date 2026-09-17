import React, { useState } from 'react';
import { Type, Search, RotateCcw } from 'lucide-react';
import { FontService } from '../features/fonts/FontService';
import { FontRegistry } from '../features/fonts/FontRegistry';

interface FontPickerControlProps {
  label?: string;
  value?: string;
  onChange: (family: string) => void;
  onOpenModal?: () => void;
  onReset?: () => void;
  isConfigured?: boolean;
}

export const FontPickerControl: React.FC<FontPickerControlProps> = ({
  label = 'Font Family',
  value,
  onChange,
  onOpenModal,
  onReset,
  isConfigured,
}) => {
  const currentFont = value || 'inherit';
  const cleanFamily = currentFont.replace(/["']/g, '').trim();
  const fontStyleCss = FontService.getFontFamilyCss(cleanFamily);

  const topFonts = [
    'inherit',
    'Inter',
    'Roboto',
    'Poppins',
    'Abril Fatface',
    'Open Sans',
    'Montserrat',
    'Lato',
    'Playfair Display',
    'Merriweather',
    'Oswald',
    'Raleway',
    'Nunito',
    'Ubuntu',
    'Pacifico',
    'Fira Code',
    'Times New Roman',
    'Arial',
    'Georgia',
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
        {isConfigured && onReset && (
          <button
            type="button"
            onClick={onReset}
            title="Reset Font Family to Inherited / Global Default"
            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Quick Selector Dropdown */}
        <select
          value={cleanFamily}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '__OPEN_MODAL__') {
              if (onOpenModal) onOpenModal();
            } else {
              FontService.loadFont(val);
              onChange(val);
            }
          }}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 truncate cursor-pointer"
          style={{ fontFamily: fontStyleCss }}
        >
          <option value="inherit" style={{ fontFamily: 'sans-serif' }}>Default / Inherited Theme Font</option>
          <optgroup label="Popular Fonts">
            {topFonts.filter(f => f !== 'inherit').map((font) => (
              <option key={font} value={font} style={{ fontFamily: FontService.getFontFamilyCss(font) }}>
                {font}
              </option>
            ))}
          </optgroup>
          <option value="__OPEN_MODAL__" style={{ fontFamily: 'sans-serif', fontWeight: 'bold' }}>
            🔍 Browse 1000+ Fonts...
          </option>
        </select>

        {/* Modal Opener Button */}
        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            title="Search & Browse All Available Fonts"
            className="flex h-8 px-2.5 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-400 text-slate-700 hover:text-blue-600 transition cursor-pointer text-xs font-bold shrink-0"
          >
            <Search className="w-3.5 h-3.5 mr-1" />
            <span>Library</span>
          </button>
        )}
      </div>
    </div>
  );
};
