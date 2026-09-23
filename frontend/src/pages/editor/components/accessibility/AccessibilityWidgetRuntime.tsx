import React, { useEffect, useState, useRef } from "react";
import { AccessibilityService } from "../../services/AccessibilityService";
import type { SiteAccessibilitySettings, AccessibilityVisitorPreferences } from "../../types";

export const AccessibilityWidgetRuntime: React.FC<{
  settings?: SiteAccessibilitySettings;
  isPreview?: boolean;
}> = ({ settings: propSettings, isPreview = false }) => {
  const [settings, setSettings] = useState<SiteAccessibilitySettings>(() => propSettings || AccessibilityService.getSiteSettings());
  const [prefs, setPrefs] = useState<AccessibilityVisitorPreferences>(() => AccessibilityService.getVisitorPreferences());
  const [isOpen, setIsOpen] = useState(false);
  const [mouseY, setMouseY] = useState(200);

  useEffect(() => {
    if (propSettings) setSettings(propSettings);
  }, [propSettings]);

  useEffect(() => {
    // Initial DOM application
    AccessibilityService.applyPreferencesToDOM(prefs);
    AccessibilityService.applyI18nToDOM();

    // Subscribe to state changes
    const unsub = AccessibilityService.subscribe(() => {
      setPrefs(AccessibilityService.getVisitorPreferences());
      if (!propSettings) setSettings(AccessibilityService.getSiteSettings());
    });

    return unsub;
  }, [propSettings]);

  // Track cursor position for F-376 Reading Guide
  useEffect(() => {
    if (!prefs.readingGuideEnabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefs.readingGuideEnabled]);

  if (!settings.widgetEnabled && !isPreview) return null;

  const enabled = settings.enabledControls || {
    textScaling: true,
    contrast: true,
    fontOptions: true,
    readingGuide: true,
    hideImages: true,
    pauseAnimations: true,
    keyboardAssist: true,
    reset: true
  };

  const handleUpdate = (updates: Partial<AccessibilityVisitorPreferences>, analyticsKey?: string) => {
    const updated = AccessibilityService.updateVisitorPreferences(updates);
    setPrefs(updated);
    if (analyticsKey) AccessibilityService.logAnalyticsEvent(analyticsKey);
  };

  const handleReset = () => {
    const reset = AccessibilityService.resetVisitorPreferences();
    setPrefs(reset);
  };

  // F-374 Widget Positioning styles
  const positionClass =
    settings.widgetPosition === "bottom-left" ? "bottom-6 left-6" :
    settings.widgetPosition === "top-right" ? "top-6 right-6" :
    settings.widgetPosition === "top-left" ? "top-6 left-6" :
    "bottom-6 right-6";

  return (
    <>
      {/* F-366 Dynamic Skip Links */}
      <div className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-2 focus-within:left-2 focus-within:z-[999999]">
        <a
          href="#main-content"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-xl hover:bg-indigo-700 outline-none focus:ring-4 focus:ring-amber-400"
        >
          Skip to main content
        </a>
        <a
          href="#site-navigation"
          className="ml-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-xl hover:bg-slate-800 outline-none focus:ring-4 focus:ring-amber-400"
        >
          Skip to navigation
        </a>
      </div>

      {/* F-376 Reading Guide Overlay */}
      {prefs.readingGuideEnabled && (
        <div
          style={{
            position: "fixed",
            top: `${mouseY - (prefs.readingGuideThickness || 12) / 2}px`,
            left: 0,
            right: 0,
            height: `${prefs.readingGuideThickness || 12}px`,
            backgroundColor: "rgba(245, 158, 11, 0.45)",
            borderTop: "2px solid #d97706",
            borderBottom: "2px solid #d97706",
            pointerEvents: "none",
            zIndex: 999990,
            transition: "top 0.05s ease-out"
          }}
          aria-hidden="true"
        />
      )}

      {/* F-364 Floating Widget Trigger Button */}
      <div className={`fixed z-[99998] ${positionClass}`}>
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) AccessibilityService.logAnalyticsEvent("widget_open");
          }}
          aria-label={settings.widgetLabel || "Accessibility Options"}
          aria-expanded={isOpen}
          style={{
            backgroundColor: settings.buttonBgColor || "#4f46e5",
            color: settings.buttonTextColor || "#ffffff",
            borderRadius: settings.buttonRadius || "9999px"
          }}
          className="inline-flex items-center gap-2 px-4 py-3 shadow-2xl hover:scale-105 active:scale-95 transition cursor-pointer font-bold text-sm focus:outline-none focus:ring-4 focus:ring-amber-400"
        >
          <span className="text-lg">{settings.widgetIcon || "♿"}</span>
          <span className="hidden sm:inline">{settings.widgetLabel || "Accessibility"}</span>
        </button>

        {/* F-364 Visitor Accessibility Control Drawer Panel */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl z-[99999] text-slate-900 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">♿</span>
                <h3 className="text-base font-extrabold text-slate-900">Accessibility Preferences</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Close accessibility options"
              >
                ✕
              </button>
            </div>

            {/* F-365 Text Scaling Controls */}
            {enabled.textScaling && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Text Size Scale</span>
                  <span className="text-indigo-600 font-extrabold">{prefs.textSize}%</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[100, 110, 120, 130].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleUpdate({ textSize: size }, "text_scaling")}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                        prefs.textSize === size
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {size}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* F-375 Contrast Controls */}
            {enabled.contrast && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Contrast & Color Mode</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "default", label: "Default" },
                    { id: "high-contrast", label: "High Contrast" },
                    { id: "dark-contrast", label: "Dark Mode" },
                    { id: "light-contrast", label: "Light Mode" },
                    { id: "grayscale", label: "Grayscale" },
                    { id: "invert", label: "Invert Colors" }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleUpdate({ contrastMode: mode.id as any }, "contrast_mode")}
                      className={`py-2 px-3 text-left font-bold rounded-xl border transition ${
                        prefs.contrastMode === mode.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* F-370 Font Accessibility Controls */}
            {enabled.fontOptions && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Typography Options</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "default", label: "Site Default" },
                    { id: "opendyslexic", label: "Dyslexic Friendly" },
                    { id: "sans-serif", label: "Clean Sans-Serif" },
                    { id: "monospace", label: "Monospace" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleUpdate({ fontMode: f.id as any }, "font_mode")}
                      className={`py-2 px-2.5 text-center font-bold rounded-xl border transition ${
                        prefs.fontMode === f.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* F-369, F-376, F-377, F-368 Toggles */}
            <div className="space-y-2.5 border-t border-slate-100 pt-3 text-xs">
              {enabled.pauseAnimations && (
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-50">
                  <span className="font-bold text-slate-800">Pause Animations</span>
                  <input
                    type="checkbox"
                    checked={prefs.pauseAnimations}
                    onChange={(e) => handleUpdate({ pauseAnimations: e.target.checked }, "pause_animations")}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              )}

              {enabled.hideImages && (
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-50">
                  <span className="font-bold text-slate-800">Hide Images</span>
                  <input
                    type="checkbox"
                    checked={prefs.hideImages}
                    onChange={(e) => handleUpdate({ hideImages: e.target.checked })}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              )}

              {enabled.readingGuide && (
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-50">
                  <span className="font-bold text-slate-800">Reading Focus Guide</span>
                  <input
                    type="checkbox"
                    checked={prefs.readingGuideEnabled}
                    onChange={(e) => handleUpdate({ readingGuideEnabled: e.target.checked })}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              )}

              {enabled.keyboardAssist && (
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-50">
                  <span className="font-bold text-slate-800">Enhanced Keyboard Focus</span>
                  <input
                    type="checkbox"
                    checked={prefs.enhancedFocus}
                    onChange={(e) => handleUpdate({ enhancedFocus: e.target.checked, keyboardAssist: e.target.checked })}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              )}
            </div>

            {/* F-378 Reset Button */}
            {enabled.reset && (
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  🔄 Reset Accessibility Settings
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
