import React, { useState, useEffect } from "react";
import { useAccessibility } from "../../context/AccessibilityContext";
import type { AccessibilityWidgetConfig, ContrastMode } from "../../types/accessibility.types";

export interface AccessibilityWidgetProps {
  config?: Partial<AccessibilityWidgetConfig>;
  onOpenStatement?: () => void;
}

export const AccessibilityWidget: React.FC<AccessibilityWidgetProps> = ({
  config,
  onOpenStatement,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    prefs,
    setFontScale,
    toggleDyslexicFont,
    setContrastMode,
    togglePauseAnimations,
    toggleReadingGuide,
    toggleHideImages,
    toggleKeyboardFocusRing,
    toggleBigCursor,
    toggleHighlightLinks,
    toggleTextToSpeech,
    speakText,
    resetPreferences,
  } = useAccessibility();

  // Close toolbar on Escape key press (F-362)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const position = config?.position || "bottom-right";
  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  }[position];

  if (config?.enabled === false) return null;

  return (
    <div className={`fixed ${positionClasses} z-[99999] font-sans antialiased`}>
      {/* Floating Trigger Button */}
      <button
        type="button"
        role="button"
        id="a11y-widget-trigger-btn"
        aria-label="Open Visitor Accessibility Usability Toolbar"
        aria-expanded={isOpen}
        aria-controls="a11y-toolbar-dialog"
        aria-haspopup="dialog"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) speakText("Accessibility toolbar opened");
        }}
        className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-400 cursor-pointer"
      >
        <span className="text-2xl transition-transform group-hover:scale-110">♿</span>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
        </span>
      </button>

      {/* Accessibility Toolbar Dialog Drawer */}
      {isOpen && (
        <div
          id="a11y-toolbar-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Visitor Accessibility Toolbar"
          className="absolute bottom-20 right-0 w-88 max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-xl p-5 shadow-2xl shadow-indigo-900/20 space-y-4 text-slate-800 text-xs transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          {/* Header Bar */}
          <div role="banner" className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-extrabold text-lg shadow-inner">
                ♿
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">Accessibility Tools</h2>
                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-full">
                    WCAG 2.1 AAA
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Visitor Usability & Universal Design</p>
              </div>
            </div>
            <button
              type="button"
              role="button"
              aria-label="Close Accessibility Toolbar"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* F-365: Text Size Scaling */}
          <section role="region" aria-label="Text Size Controls" className="space-y-1.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
            <label className="font-bold text-slate-800 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span>🔍</span>
                <span>Text Size Scaling</span>
              </span>
              <span className="font-mono text-indigo-700 font-extrabold text-sm bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                {prefs.fontScale}%
              </span>
            </label>
            <div role="group" aria-label="Font scale options" className="flex items-center gap-2 pt-1">
              <button
                type="button"
                role="button"
                aria-label="Decrease text size"
                onClick={() => {
                  setFontScale(prefs.fontScale - 10);
                  speakText(`Font scale ${prefs.fontScale - 10} percent`);
                }}
                className="flex-1 py-2 rounded-xl bg-white border border-slate-200 font-extrabold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition cursor-pointer shadow-2xs text-xs"
              >
                A-
              </button>
              <button
                type="button"
                role="button"
                aria-label="Reset text size to default 100%"
                onClick={() => {
                  setFontScale(100);
                  speakText("Font scale reset to 100 percent");
                }}
                className="flex-1 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer text-xs"
              >
                Reset
              </button>
              <button
                type="button"
                role="button"
                aria-label="Increase text size"
                onClick={() => {
                  setFontScale(prefs.fontScale + 10);
                  speakText(`Font scale ${prefs.fontScale + 10} percent`);
                }}
                className="flex-1 py-2 rounded-xl bg-white border border-slate-200 font-extrabold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition cursor-pointer shadow-2xs text-xs"
              >
                A+
              </button>
            </div>
          </section>

          {/* F-375: Contrast Controls */}
          <section role="region" aria-label="Color Contrast Options" className="space-y-1.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
            <label className="font-bold text-slate-800 block text-xs mb-1.5">🎨 Contrast & Display Mode</label>
            <div role="group" aria-label="Contrast Modes" className="grid grid-cols-2 gap-1.5">
              {[
                { mode: "normal", label: "Normal Display", icon: "☀️" },
                { mode: "high-contrast", label: "High Contrast", icon: "⚡" },
                { mode: "dark-contrast", label: "Dark Mode", icon: "🌙" },
                { mode: "monochrome", label: "Monochrome", icon: "🔳" },
              ].map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  type="button"
                  role="button"
                  aria-pressed={prefs.contrastMode === mode}
                  onClick={() => {
                    setContrastMode(mode as ContrastMode);
                    speakText(`Contrast mode set to ${label}`);
                  }}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-between border cursor-pointer ${
                    prefs.contrastMode === mode
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </span>
                  {prefs.contrastMode === mode && <span>✓</span>}
                </button>
              ))}
            </div>
          </section>

          {/* Interactive Feature Toggles */}
          <section role="region" aria-label="Usability Preference Toggles" className="space-y-2 pt-1">
            {/* Text to Speech Voice Reader */}
            <button
              type="button"
              role="button"
              aria-pressed={prefs.textToSpeech}
              onClick={toggleTextToSpeech}
              className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition border cursor-pointer shadow-2xs ${
                prefs.textToSpeech
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🔊</span>
                <span>Text-to-Speech Screen Reader</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${prefs.textToSpeech ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {prefs.textToSpeech ? "ACTIVE" : "OFF"}
              </span>
            </button>

            {/* F-370: Dyslexia Font */}
            <button
              type="button"
              role="button"
              aria-pressed={prefs.dyslexicFont}
              onClick={() => {
                toggleDyslexicFont();
                speakText(prefs.dyslexicFont ? "Dyslexia font disabled" : "Dyslexia font enabled");
              }}
              className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition border cursor-pointer ${
                prefs.dyslexicFont
                  ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-extrabold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📖</span>
                <span>Dyslexia-Friendly Font</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${prefs.dyslexicFont ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {prefs.dyslexicFont ? "ON" : "OFF"}
              </span>
            </button>

            {/* Big Cursor */}
            <button
              type="button"
              role="button"
              aria-pressed={prefs.bigCursor}
              onClick={() => {
                toggleBigCursor();
                speakText(prefs.bigCursor ? "Big cursor disabled" : "Big cursor enabled");
              }}
              className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition border cursor-pointer ${
                prefs.bigCursor
                  ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-extrabold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🎯</span>
                <span>Enlarged Cursor</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${prefs.bigCursor ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {prefs.bigCursor ? "ON" : "OFF"}
              </span>
            </button>

            {/* Highlight Links */}
            <button
              type="button"
              role="button"
              aria-pressed={prefs.highlightLinks}
              onClick={() => {
                toggleHighlightLinks();
                speakText(prefs.highlightLinks ? "Highlight links disabled" : "Highlight links enabled");
              }}
              className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition border cursor-pointer ${
                prefs.highlightLinks
                  ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-extrabold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🔗</span>
                <span>Highlight Interactive Links</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${prefs.highlightLinks ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {prefs.highlightLinks ? "ON" : "OFF"}
              </span>
            </button>

            {/* F-369: Pause Animations */}
            <button
              type="button"
              role="button"
              aria-pressed={prefs.pauseAnimations}
              onClick={() => {
                togglePauseAnimations();
                speakText(prefs.pauseAnimations ? "Animations resumed" : "Animations paused");
              }}
              className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition border cursor-pointer ${
                prefs.pauseAnimations
                  ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-extrabold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>⏸️</span>
                <span>Pause Animations & Motion</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${prefs.pauseAnimations ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {prefs.pauseAnimations ? "ON" : "OFF"}
              </span>
            </button>

            {/* F-376: Reading Guide */}
            <button
              type="button"
              role="button"
              aria-pressed={prefs.readingGuide}
              onClick={() => {
                toggleReadingGuide();
                speakText(prefs.readingGuide ? "Reading guide hidden" : "Reading guide displayed");
              }}
              className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition border cursor-pointer ${
                prefs.readingGuide
                  ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-extrabold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📏</span>
                <span>Reading Focus Guide Bar</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${prefs.readingGuide ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {prefs.readingGuide ? "ON" : "OFF"}
              </span>
            </button>

            {/* F-377: Hide Images */}
            <button
              type="button"
              role="button"
              aria-pressed={prefs.hideImages}
              onClick={() => {
                toggleHideImages();
                speakText(prefs.hideImages ? "Images visible" : "Images hidden");
              }}
              className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition border cursor-pointer ${
                prefs.hideImages
                  ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-extrabold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🖼️</span>
                <span>Hide Images (Reduce Noise)</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${prefs.hideImages ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {prefs.hideImages ? "ON" : "OFF"}
              </span>
            </button>

            {/* F-368: High Contrast Focus Ring */}
            <button
              type="button"
              role="button"
              aria-pressed={prefs.keyboardFocusRing}
              onClick={() => {
                toggleKeyboardFocusRing();
                speakText(prefs.keyboardFocusRing ? "Focus ring disabled" : "High contrast focus ring enabled");
              }}
              className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition border cursor-pointer ${
                prefs.keyboardFocusRing
                  ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-extrabold"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>🎯</span>
                <span>High-Contrast Focus Ring</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${prefs.keyboardFocusRing ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                {prefs.keyboardFocusRing ? "ON" : "OFF"}
              </span>
            </button>
          </section>

          {/* Action Footer */}
          <footer role="contentinfo" className="pt-3 border-t border-slate-100 space-y-2">
            {onOpenStatement && (
              <button
                type="button"
                role="button"
                aria-label="Open Official Accessibility Compliance Statement"
                onClick={onOpenStatement}
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📄</span>
                <span>View Accessibility Statement</span>
              </button>
            )}
            {/* F-378: Accessibility Reset */}
            <button
              type="button"
              role="button"
              aria-label="Reset all accessibility preferences to default"
              onClick={() => {
                resetPreferences();
                speakText("All accessibility settings reset to default");
              }}
              className="w-full py-2 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer border border-rose-100 flex items-center justify-center gap-1.5"
            >
              <span>🔄</span>
              <span>Reset All Accessibility Settings</span>
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};
