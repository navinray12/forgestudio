import React, { useState } from "react";
import { AccessibilityService } from "../../services/AccessibilityService";
import type { SiteAccessibilitySettings, SiteI18nSettings } from "../../types";

export const AccessibilitySettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"widget" | "i18n" | "analytics">("widget");
  const [settings, setSettings] = useState<SiteAccessibilitySettings>(() => AccessibilityService.getSiteSettings());
  const [i18n, setI18n] = useState<SiteI18nSettings>(() => AccessibilityService.getI18nSettings());

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    AccessibilityService.saveSiteSettings(settings);
    AccessibilityService.saveI18nSettings(i18n);
    onClose();
  };

  const analytics = AccessibilityService.getAnalyticsSummary();
  const adapterInfo = AccessibilityService.getMultilingualAdapter(i18n.translationProvider);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white font-bold text-lg shadow-sm">
              ⚙️
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Accessibility & Language Settings</h2>
              <p className="text-xs text-slate-500 font-medium">Configure Widget, i18n Separation & Multilingual Integrations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-6 text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("widget")}
            className={`py-3.5 border-b-2 transition ${activeTab === "widget"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            Accessibility Widget
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("i18n")}
            className={`py-3.5 border-b-2 transition ${activeTab === "i18n"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            i18n & RTL Configuration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`py-3.5 border-b-2 transition ${activeTab === "analytics"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            Accessibility Analytics
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: WIDGET CUSTOMIZATION */}
          {activeTab === "widget" && (
            <div className="space-y-5 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 cursor-pointer">
                <span>Enable Visitor Accessibility Widget</span>
                <input
                  type="checkbox"
                  checked={settings.widgetEnabled}
                  onChange={(e) => setSettings({ ...settings, widgetEnabled: e.target.checked })}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Widget Placement</label>
                  <select
                    value={settings.widgetPosition}
                    onChange={(e) => setSettings({ ...settings, widgetPosition: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="bottom-right">Bottom-Right</option>
                    <option value="bottom-left">Bottom-Left</option>
                    <option value="top-right">Top-Right</option>
                    <option value="top-left">Top-Left</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Button Label</label>
                  <input
                    type="text"
                    value={settings.widgetLabel}
                    onChange={(e) => setSettings({ ...settings, widgetLabel: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Button Color</label>
                  <input
                    type="color"
                    value={settings.buttonBgColor}
                    onChange={(e) => setSettings({ ...settings, buttonBgColor: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Text Color</label>
                  <input
                    type="color"
                    value={settings.buttonTextColor}
                    onChange={(e) => setSettings({ ...settings, buttonTextColor: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Icon Emoji</label>
                  <input
                    type="text"
                    value={settings.widgetIcon}
                    onChange={(e) => setSettings({ ...settings, widgetIcon: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-center focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm">Enabled Controls in Visitor Panel</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(settings.enabledControls).map(([key, val]) => (
                    <label key={key} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 capitalize font-medium text-slate-700 cursor-pointer">
                      <span>{key.replace(/([A-Z])/g, " $1")}</span>
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            enabledControls: { ...settings.enabledControls, [key]: e.target.checked }
                          })
                        }
                        className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: i18n & RTL CONFIGURATION */}
          {activeTab === "i18n" && (
            <div className="space-y-5 text-xs">
              {/* Editor vs Site Language Separation */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
                  <span>🌐</span>
                  <h3>Editor & Frontend Language Separation</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Admin/Editor UI Language</label>
                    <select
                      value={i18n.editorLanguage}
                      onChange={(e) => setI18n({ ...i18n, editorLanguage: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    >
                      <option value="en">English (US)</option>
                      <option value="fr">French (Français)</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Published Site Primary Language</label>
                    <select
                      value={i18n.frontendLanguage}
                      onChange={(e) => setI18n({ ...i18n, frontendLanguage: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    >
                      {i18n.enabledLanguages.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.flag} {l.name} ({l.dir.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* RTL Configuration */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-sm">RTL Support Settings</h4>
                <label className="flex items-center justify-between font-bold text-slate-700 cursor-pointer">
                  <span>Auto-detect RTL text direction from active language (Arabic, Hebrew, etc.)</span>
                  <input
                    type="checkbox"
                    checked={i18n.rtlAutoDetect}
                    onChange={(e) => setI18n({ ...i18n, rtlAutoDetect: e.target.checked })}
                    className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                </label>
              </div>

              {/* Multilingual Plugin Compatibility Layer */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-sm">Multilingual Integration Provider</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${adapterInfo.isDetected ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-800"}`}>
                    {adapterInfo.isDetected ? "Detected Plugin Active" : "Native Compatibility Adapter Mode"}
                  </span>
                </div>
                <select
                  value={i18n.translationProvider}
                  onChange={(e) => setI18n({ ...i18n, translationProvider: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value="native">Native Builder i18n Framework</option>
                  <option value="wpml">WPML Compatibility Adapter</option>
                  <option value="polylang">Polylang Compatibility Adapter</option>
                  <option value="translatepress">TranslatePress Compatibility Adapter</option>
                  <option value="weglot">Weglot Compatibility Adapter</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Privacy-Conscious Accessibility Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">Widget Opened</span>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">{analytics.totalOpens}</h4>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">Text Rescaled</span>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">{analytics.textScaling}</h4>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">Contrast Toggles</span>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">{analytics.contrast}</h4>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">Font Changes</span>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">{analytics.fontOption}</h4>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">Animations Paused</span>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">{analytics.animationsPaused}</h4>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-xs font-bold text-slate-500 uppercase">Resets Performed</span>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">{analytics.resetCount}</h4>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-6 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-md hover:bg-purple-700 transition cursor-pointer"
          >
            Save Configurations
          </button>
        </div>
      </div>
    </div>
  );
};
