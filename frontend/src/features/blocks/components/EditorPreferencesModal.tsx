import React, { useState } from "react";
import type { EditorPreferences } from "../types/block.types";
import { DEFAULT_COMMANDS } from "../services/shortcutRegistry";
import { EditorPreferencesService } from "../services/editorPreferencesService";
import { Settings, Keyboard, Sliders, X, RotateCcw, Check, Sun, Maximize2, Layout, EyeOff } from "lucide-react";

interface EditorPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: EditorPreferences;
  onSavePreferences: (updated: EditorPreferences) => void;
  workspaceId?: string;
}

export const EditorPreferencesModal: React.FC<EditorPreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  workspaceId,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "shortcuts">("general");
  const [localPrefs, setLocalPrefs] = useState<EditorPreferences>(preferences);

  if (!isOpen) return null;

  const handleTogglePreference = (key: keyof EditorPreferences) => {
    const updated = {
      ...localPrefs,
      [key]: !localPrefs[key],
    };
    setLocalPrefs(updated);
    onSavePreferences(updated);
  };

  const handleShortcutChange = (commandId: string, newKey: string) => {
    const updated = {
      ...localPrefs,
      keyboardShortcuts: {
        ...localPrefs.keyboardShortcuts,
        [commandId]: newKey,
      },
    };
    setLocalPrefs(updated);
    onSavePreferences(updated);
  };

  const handleResetDefaults = () => {
    const reset = EditorPreferencesService.resetPreferences(workspaceId);
    setLocalPrefs(reset);
    onSavePreferences(reset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-100">Editor Preferences & Keybindings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 pt-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "general"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            General Editor Features
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shortcuts")}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "shortcuts"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Keyboard Shortcuts
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "general" && (
            <div className="space-y-3">
              {/* Spotlight Mode Toggle (F-533) */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                <div className="flex items-start gap-3">
                  <Sun className="w-4 h-4 text-amber-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Spotlight Mode (F-533)</div>
                    <div className="text-[11px] text-slate-400">Dim all blocks except the currently active block node.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference("spotlightMode")}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    localPrefs.spotlightMode ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      localPrefs.spotlightMode ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Fullscreen Mode Toggle (F-534) */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                <div className="flex items-start gap-3">
                  <Maximize2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Fullscreen Workspace (F-534)</div>
                    <div className="text-[11px] text-slate-400">Expand editor to fill screen (Press Esc to exit).</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference("fullscreen")}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    localPrefs.fullscreen ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      localPrefs.fullscreen ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Top Toolbar Mode Toggle (F-535) */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                <div className="flex items-start gap-3">
                  <Layout className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Top Toolbar Mode (F-535)</div>
                    <div className="text-[11px] text-slate-400">Dock block action toolbar to top editor bar.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference("topToolbarMode")}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    localPrefs.topToolbarMode ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      localPrefs.topToolbarMode ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Distraction Free Mode Toggle (F-532) */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
                <div className="flex items-start gap-3">
                  <EyeOff className="w-4 h-4 text-sky-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Distraction-Free Workspace (F-532)</div>
                    <div className="text-[11px] text-slate-400">Hide sidebars and Chrome header toolbars.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference("distractionFree")}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    localPrefs.distractionFree ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      localPrefs.distractionFree ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === "shortcuts" && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Registered Keyboard Commands (F-537)
              </div>

              {DEFAULT_COMMANDS.map((cmd) => {
                const currentBinding = localPrefs.keyboardShortcuts[cmd.id] || cmd.defaultKey;
                return (
                  <div
                    key={cmd.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{cmd.name}</div>
                      <div className="text-[11px] text-slate-400">{cmd.description}</div>
                    </div>
                    <input
                      type="text"
                      value={currentBinding}
                      onChange={(e) => handleShortcutChange(cmd.id, e.target.value)}
                      className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-mono text-indigo-400 font-semibold text-xs"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
