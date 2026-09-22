import React, { useState } from "react";
import { AccessibilityService } from "../../services/AccessibilityService";
import type { EditorElement, DeviceMode, ElementStyles } from "../../types";

export const LanguageSwitcherWidgetRenderer: React.FC<{
  el: EditorElement;
  getMergedStyles?: any;
  activeDevice?: DeviceMode;
  isPreview?: boolean;
  mergedStyles?: React.CSSProperties | ElementStyles | any;
}> = ({ el, getMergedStyles, activeDevice, mergedStyles }) => {
  const styles = mergedStyles || (getMergedStyles ? getMergedStyles(el, activeDevice) : {});
  const i18n = AccessibilityService.getI18nSettings();
  const [currentLang, setCurrentLang] = useState(i18n.frontendLanguage || "en");
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectLang = (code: string) => {
    setCurrentLang(code);
    AccessibilityService.saveI18nSettings({
      ...i18n,
      frontendLanguage: code
    });
    setIsOpen(false);
  };

  const activeLangObj = i18n.enabledLanguages.find((l) => l.code === currentLang) || i18n.enabledLanguages[0];

  return (
    <div style={styles as React.CSSProperties} className="relative inline-block text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs hover:border-slate-400 transition cursor-pointer font-bold text-slate-800"
      >
        <span>{activeLangObj.flag || "🌐"}</span>
        <span>{activeLangObj.name}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 divide-y divide-slate-100">
          {i18n.enabledLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelectLang(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition font-medium ${
                currentLang === lang.code
                  ? "bg-purple-50 text-purple-700 font-bold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{lang.flag || "🌐"}</span>
                <span>{lang.name}</span>
              </span>
              {lang.dir === "rtl" && (
                <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  RTL
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
