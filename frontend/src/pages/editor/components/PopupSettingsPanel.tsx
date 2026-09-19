import { useState } from "react";
import type {
  PopupConfig,
  PopupLayoutMode,
  PopupTriggerConfig,
  PopupTriggerType,
  SlideInPosition,
  HelloBarPosition,
} from "../../../types/popup.types";

interface PopupSettingsPanelProps {
  popup: PopupConfig;
  onUpdatePopup: (updater: (prev: PopupConfig) => PopupConfig) => void;
  onExitPopupEdit: () => void;
}

export default function PopupSettingsPanel({
  popup,
  onUpdatePopup,
  onExitPopupEdit,
}: PopupSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"layout" | "triggers" | "rules" | "stats">("layout");

  const updateProp = <K extends keyof PopupConfig>(key: K, value: PopupConfig[K]) => {
    onUpdatePopup((prev) => ({ ...prev, [key]: value }));
  };

  const updateTrigger = (index: number, updated: Partial<PopupTriggerConfig>) => {
    onUpdatePopup((prev) => {
      const newTriggers = [...prev.triggers];
      newTriggers[index] = { ...newTriggers[index], ...updated };
      return { ...prev, triggers: newTriggers };
    });
  };

  const addTrigger = (type: PopupTriggerType) => {
    onUpdatePopup((prev) => {
      if (prev.triggers.some((t) => t.type === type)) return prev;
      const newTrigger: PopupTriggerConfig = {
        type,
        delaySeconds: type === "load" ? 3 : undefined,
        scrollPercentage: type === "scroll" ? 50 : undefined,
        inactivitySeconds: type === "inactivity" ? 20 : undefined,
        selector: type === "click" ? ".open-popup-btn" : undefined,
      };
      return { ...prev, triggers: [...prev.triggers, newTrigger] };
    });
  };

  const removeTrigger = (index: number) => {
    onUpdatePopup((prev) => ({
      ...prev,
      triggers: prev.triggers.filter((_, i) => i !== index),
    }));
  };

  const toggleDevice = (device: "desktop" | "tablet" | "mobile") => {
    onUpdatePopup((prev) => {
      const current = prev.targeting.devices || [];
      const updated = current.includes(device)
        ? current.filter((d) => d !== device)
        : [...current, device];
      return {
        ...prev,
        targeting: { ...prev.targeting, devices: updated.length > 0 ? updated : ["desktop"] },
      };
    });
  };

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onExitPopupEdit}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            ‹ Back to Page Canvas
          </button>
          <span className="rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-bold text-blue-800 uppercase">
            Popup Mode
          </span>
        </div>
        <input
          type="text"
          value={popup.name}
          onChange={(e) => updateProp("name", e.target.value)}
          className="w-full font-bold text-sm text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none transition"
        />

        {/* Sub-Tabs */}
        <div className="grid grid-cols-4 gap-1 mt-3 rounded-lg bg-slate-200/70 p-1 text-[11px] font-semibold">
          {[
            { id: "layout", label: "Layout" },
            { id: "triggers", label: "Triggers" },
            { id: "rules", label: "Targeting" },
            { id: "stats", label: "Analytics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-1 rounded-md text-center transition ${
                activeTab === tab.id ? "bg-white text-slate-800 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === "layout" && (
          <div className="space-y-4">
            {/* Layout Mode (F-282, F-286, F-288) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                Layout Framework
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "modal", label: "Center Modal" },
                  { id: "slide-in", label: "Slide-In Drawer" },
                  { id: "hello-bar", label: "Hello / Alert Bar" },
                  { id: "full-screen", label: "Full Screen" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      updateProp("layoutMode", mode.id as PopupLayoutMode);
                      if (mode.id === "slide-in" && !popup.slidePosition) {
                        updateProp("slidePosition", "bottom-right");
                      }
                      if (mode.id === "hello-bar") {
                        updateProp("width", "100%");
                        updateProp("backdropOverlay", false);
                        if (!popup.helloBarPosition) updateProp("helloBarPosition", "top");
                      }
                    }}
                    className={`p-2 rounded-xl border text-left font-semibold transition ${
                      popup.layoutMode === mode.id
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Slide-In Specific Position (F-286) */}
            {popup.layoutMode === "slide-in" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  Slide-In Position
                </label>
                <select
                  value={popup.slidePosition || "bottom-right"}
                  onChange={(e) => updateProp("slidePosition", e.target.value as SlideInPosition)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                >
                  <option value="left">Left Drawer (Off-Canvas)</option>
                  <option value="right">Right Drawer (Off-Canvas)</option>
                  <option value="bottom-right">Bottom Right Corner</option>
                  <option value="bottom-left">Bottom Left Corner</option>
                </select>
              </div>
            )}

            {/* Hello Bar Position (F-288) */}
            {popup.layoutMode === "hello-bar" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  Hello Bar Docking
                </label>
                <select
                  value={popup.helloBarPosition || "top"}
                  onChange={(e) => updateProp("helloBarPosition", e.target.value as HelloBarPosition)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                >
                  <option value="top">Top (Header Dock)</option>
                  <option value="bottom">Bottom (Footer Dock)</option>
                </select>
              </div>
            )}

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Width
                </label>
                <input
                  type="text"
                  value={popup.width}
                  onChange={(e) => updateProp("width", e.target.value)}
                  placeholder="e.g. 580px, 90vw"
                  className="w-full rounded-xl border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Height
                </label>
                <input
                  type="text"
                  value={popup.height}
                  onChange={(e) => updateProp("height", e.target.value)}
                  placeholder="auto or 500px"
                  className="w-full rounded-xl border border-slate-300 p-2"
                />
              </div>
            </div>

            {/* Entrance Animation */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                Entrance Animation
              </label>
              <select
                value={popup.entranceAnimation}
                onChange={(e) => updateProp("entranceAnimation", e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 p-2"
              >
                <option value="fade">Fade In</option>
                <option value="zoom">Zoom Scale In</option>
                <option value="slide-up">Slide Up From Bottom</option>
                <option value="slide-down">Slide Down From Top</option>
                <option value="slide-left">Slide In From Left</option>
                <option value="slide-right">Slide In From Right</option>
              </select>
            </div>

            {/* Overlay & Backdrop Options */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-700">Backdrop Overlay</span>
                <input
                  type="checkbox"
                  checked={popup.backdropOverlay}
                  onChange={(e) => updateProp("backdropOverlay", e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>

              {popup.backdropOverlay && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Overlay Color
                  </label>
                  <input
                    type="text"
                    value={popup.backdropColor}
                    onChange={(e) => updateProp("backdropColor", e.target.value)}
                    placeholder="rgba(15, 23, 42, 0.65)"
                    className="w-full rounded-xl border border-slate-300 p-2 font-mono text-[11px]"
                  />
                </div>
              )}

              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-700">Close on Backdrop Click</span>
                <input
                  type="checkbox"
                  checked={popup.closeOnBackdropClick}
                  onChange={(e) => updateProp("closeOnBackdropClick", e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-700">Display Close Button</span>
                <input
                  type="checkbox"
                  checked={popup.closeButton}
                  onChange={(e) => updateProp("closeButton", e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>

              {popup.closeButton && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Close Button Position
                  </label>
                  <select
                    value={popup.closeButtonPosition}
                    onChange={(e) => updateProp("closeButtonPosition", e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 p-2"
                  >
                    <option value="inside">Inside Popup Box</option>
                    <option value="outside">Outside Floating Top Right</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "triggers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Triggers ({popup.triggers.length})
              </span>
            </div>

            {popup.triggers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center bg-slate-50 text-slate-500">
                No triggers configured. Add a trigger below so the popup displays to visitors.
              </div>
            ) : (
              <div className="space-y-3">
                {popup.triggers.map((trigger, idx) => (
                  <div
                    key={trigger.type + idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 relative space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 capitalize">
                        {trigger.type === "load" && "⏱ On Page Load"}
                        {trigger.type === "scroll" && "📜 On Scroll Depth"}
                        {trigger.type === "exit-intent" && "🚪 On Exit Intent"}
                        {trigger.type === "click" && "🖱 On Element Click"}
                        {trigger.type === "inactivity" && "💤 On User Inactivity"}
                      </span>
                      <button
                        onClick={() => removeTrigger(idx)}
                        className="text-red-500 hover:text-red-700 font-bold text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    {trigger.type === "load" && (
                      <div className="flex items-center gap-2">
                        <label className="text-slate-600 text-[11px]">Delay (seconds):</label>
                        <input
                          type="number"
                          min={0}
                          value={trigger.delaySeconds ?? 3}
                          onChange={(e) => updateTrigger(idx, { delaySeconds: Number(e.target.value) })}
                          className="w-20 rounded-lg border border-slate-300 p-1 text-xs"
                        />
                      </div>
                    )}

                    {trigger.type === "scroll" && (
                      <div className="flex items-center gap-2">
                        <label className="text-slate-600 text-[11px]">Scroll Percentage (%):</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={trigger.scrollPercentage ?? 50}
                          onChange={(e) => updateTrigger(idx, { scrollPercentage: Number(e.target.value) })}
                          className="w-20 rounded-lg border border-slate-300 p-1 text-xs"
                        />
                      </div>
                    )}

                    {trigger.type === "inactivity" && (
                      <div className="flex items-center gap-2">
                        <label className="text-slate-600 text-[11px]">Idle Time (seconds):</label>
                        <input
                          type="number"
                          min={1}
                          value={trigger.inactivitySeconds ?? 20}
                          onChange={(e) => updateTrigger(idx, { inactivitySeconds: Number(e.target.value) })}
                          className="w-20 rounded-lg border border-slate-300 p-1 text-xs"
                        />
                      </div>
                    )}

                    {trigger.type === "click" && (
                      <div>
                        <label className="block text-slate-600 text-[11px] mb-1">CSS Selector:</label>
                        <input
                          type="text"
                          value={trigger.selector ?? ".open-popup-btn"}
                          onChange={(e) => updateTrigger(idx, { selector: e.target.value })}
                          placeholder=".promo-btn, #claim-offer"
                          className="w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Trigger Selector */}
            <div className="border-t border-slate-100 pt-3">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2">
                + Add Trigger
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: "load", label: "Page Load Timer" },
                  { type: "scroll", label: "Scroll Depth %" },
                  { type: "exit-intent", label: "Exit Intent Mouse" },
                  { type: "inactivity", label: "User Idle Timer" },
                  { type: "click", label: "Element Selector Click" },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => addTrigger(item.type as PopupTriggerType)}
                    disabled={popup.triggers.some((t) => t.type === item.type)}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:border-blue-400 disabled:opacity-40 disabled:hover:border-slate-200 text-left font-semibold text-slate-700 transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-4">
            {/* Device Targeting (F-285) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                Target Devices
              </label>
              <div className="flex gap-2">
                {(["desktop", "tablet", "mobile"] as const).map((device) => {
                  const isChecked = popup.targeting.devices?.includes(device);
                  return (
                    <button
                      key={device}
                      onClick={() => toggleDevice(device)}
                      className={`flex-1 py-1.5 rounded-xl border capitalize font-semibold transition ${
                        isChecked
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {device}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frequency Capping (F-285) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                Display Frequency Capping
              </label>
              <select
                value={popup.targeting.frequencyCap}
                onChange={(e) =>
                  onUpdatePopup((prev) => ({
                    ...prev,
                    targeting: { ...prev.targeting, frequencyCap: e.target.value as any },
                  }))
                }
                className="w-full rounded-xl border border-slate-300 p-2"
              >
                <option value="every-time">Show Every Time (No Limit)</option>
                <option value="once-per-session">Show Once Per Browser Session</option>
                <option value="once-every-x-days">Show Once Every X Days</option>
              </select>
            </div>

            {popup.targeting.frequencyCap === "once-every-x-days" && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Interval Days:
                </label>
                <input
                  type="number"
                  min={1}
                  value={popup.targeting.frequencyDays ?? 7}
                  onChange={(e) =>
                    onUpdatePopup((prev) => ({
                      ...prev,
                      targeting: { ...prev.targeting, frequencyDays: Number(e.target.value) },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 p-2"
                />
              </div>
            )}

            {/* Page Conditions (F-284) */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-semibold text-slate-700">Apply to All Pages</span>
                <input
                  type="checkbox"
                  checked={popup.conditions.allPages}
                  onChange={(e) =>
                    onUpdatePopup((prev) => ({
                      ...prev,
                      conditions: { ...prev.conditions, allPages: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded text-blue-600"
                />
              </label>

              {!popup.conditions.allPages && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Specific Included Paths (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={popup.conditions.includePaths.join(", ")}
                    onChange={(e) =>
                      onUpdatePopup((prev) => ({
                        ...prev,
                        conditions: {
                          ...prev.conditions,
                          includePaths: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        },
                      }))
                    }
                    placeholder="/pricing, /blog, /checkout"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">Conversion Performance</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                <span className="block text-base font-bold text-slate-800">{popup.viewsCount || 0}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Views</span>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-center">
                <span className="block text-base font-bold text-blue-600">{popup.clicksCount || 0}</span>
                <span className="text-[10px] uppercase font-bold text-blue-400">CTA Clicks</span>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                <span className="block text-base font-bold text-emerald-600">
                  {(popup.viewsCount || 0) > 0
                    ? (((popup.clicksCount || 0) / (popup.viewsCount || 1)) * 100).toFixed(1)
                    : "0.0"}
                  %
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-500">Conv. Rate</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  onUpdatePopup((prev) => ({ ...prev, viewsCount: 0, clicksCount: 0 }));
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Reset Analytics Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
