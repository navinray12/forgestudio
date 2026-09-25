import React, { useState } from "react";
import type {
  EditorElement,
  MotionConfig,
  InteractionRule,
  EntranceAnimationType,
  InteractionTriggerType,
  InteractionActionType,
  ScrollTransparencyMode,
  StickyPositionMode,
} from "../types";
import { Sparkles, Move, Play, Plus, Trash2, Zap, Compass, Pin } from "lucide-react";

interface MotionInteractionInspectorProps {
  selectedElement: EditorElement;
  updateSelectedProp: (key: keyof EditorElement | string, value: any) => void;
  updateSelectedStyle?: (key: any, value: any) => void;
}

export const MotionInteractionInspector: React.FC<MotionInteractionInspectorProps> = ({
  selectedElement,
  updateSelectedProp,
  updateSelectedStyle,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "entrance" | "hover" | "sticky" | "mouse" | "scroll" | "interactions"
  >("entrance");

  const motion: MotionConfig = selectedElement.motionConfig || {};
  const legacyStyles = selectedElement.styles || {};

  // Helper to update motionConfig canonically while maintaining backward-compatible styles
  const updateMotion = (updater: (prev: MotionConfig) => MotionConfig) => {
    const nextMotion = updater(motion);
    updateSelectedProp("motionConfig", nextMotion);
  };

  // Helper for interactions array
  const interactions: InteractionRule[] = selectedElement.interactions || (() => {
    if (
      legacyStyles.interactionTrigger &&
      legacyStyles.interactionTrigger !== "none" &&
      legacyStyles.interactionAction &&
      legacyStyles.interactionAction !== "none"
    ) {
      return [
        {
          id: "rule_legacy",
          trigger: legacyStyles.interactionTrigger as InteractionTriggerType,
          action: legacyStyles.interactionAction as InteractionActionType,
          targetSelector: legacyStyles.interactionTargetId,
          actionValue: legacyStyles.interactionActionValue,
        },
      ];
    }
    return [];
  })();

  const updateInteractionsList = (newRules: InteractionRule[]) => {
    updateSelectedProp("interactions", newRules);
  };

  // Values with legacy fallback
  const entranceAnim = motion.entranceAnimation ?? legacyStyles.entranceAnimation ?? "none";
  const entranceDur = motion.entranceDurationMs ?? legacyStyles.entranceDuration ?? "600";
  const entranceDelay = motion.entranceDelayMs ?? legacyStyles.entranceDelay ?? "0";
  const entranceReplay = motion.entranceReplay ?? false;

  const hoverScale = motion.hover?.scale ?? legacyStyles.hoverScale ?? "";
  const hoverRotate = motion.hover?.rotate ?? legacyStyles.hoverRotate ?? "";
  const hoverTranslateY = motion.hover?.translateY ?? legacyStyles.hoverTranslateY ?? "";
  const hoverOpacity = motion.hover?.opacity ?? legacyStyles.hoverOpacity ?? "";
  const hoverDuration = motion.hover?.durationMs ?? legacyStyles.hoverTransitionDuration ?? "300";

  const stickyPosition = motion.stickyPosition ?? legacyStyles.stickyPosition ?? "none";
  const stickyOffset = motion.stickyOffset ?? legacyStyles.stickyOffset ?? "0px";

  const mouseTrackEnabled = motion.mouseTrack?.enabled ?? (legacyStyles.mouseTrackEnabled === "true");
  const mouseTrackSpeed = motion.mouseTrack?.speed ?? legacyStyles.mouseTrackSpeed ?? "0.1";

  const tiltEnabled = motion.tilt?.enabled ?? (legacyStyles.tilt3DEnabled === "true");
  const tiltMaxDeg = motion.tilt?.maxDeg ?? legacyStyles.tilt3DMax ?? "15";

  const scrollEnabled = motion.scroll?.enabled ?? (legacyStyles.scrollEffectsEnabled === "true");
  const scrollSpeedX = motion.scroll?.speedX ?? legacyStyles.scrollSpeedX ?? "0";
  const scrollSpeedY = motion.scroll?.speedY ?? legacyStyles.scrollSpeedY ?? "0.3";
  const scrollTransparency = motion.scroll?.transparency ?? legacyStyles.scrollTransparency ?? "none";
  const scrollRotate = motion.scroll?.rotateDeg ?? legacyStyles.scrollRotate ?? "0";
  const scrollScale = motion.scroll?.scaleTarget ?? legacyStyles.scrollScale ?? "1";
  const scrollBlur = motion.scroll?.blurPx ?? legacyStyles.scrollBlur ?? "0";

  return (
    <div className="space-y-4">
      {/* Sub-navigation pills */}
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab("entrance")}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
            activeSubTab === "entrance"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Play className="h-3 w-3" />
          <span>Entrance</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("hover")}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
            activeSubTab === "hover"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Move className="h-3 w-3" />
          <span>Hover</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("sticky")}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
            activeSubTab === "sticky"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Pin className="h-3 w-3" />
          <span>Sticky</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("mouse")}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
            activeSubTab === "mouse"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Compass className="h-3 w-3" />
          <span>Mouse & Tilt</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("scroll")}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
            activeSubTab === "scroll"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          <span>Scroll</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("interactions")}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
            activeSubTab === "interactions"
              ? "bg-white text-blue-600 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Zap className="h-3 w-3" />
          <span>Interactions ({interactions.length})</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. ENTRANCE ANIMATIONS                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "entrance" && (
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Entrance Animation</span>
            <span className="text-[10px] text-slate-500 font-medium">Viewport Observer</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Animation Type</label>
            <select
              value={entranceAnim}
              onChange={(e) => {
                const val = e.target.value as EntranceAnimationType;
                updateMotion((m) => ({ ...m, entranceAnimation: val }));
                if (updateSelectedStyle) updateSelectedStyle("entranceAnimation", val);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="none">None (No entrance effect)</option>
              <option value="fade-in">Fade In</option>
              <option value="fade-in-up">Fade In Up</option>
              <option value="fade-in-down">Fade In Down</option>
              <option value="zoom-in">Zoom In</option>
              <option value="slide-up">Slide Up</option>
              <option value="slide-down">Slide Down</option>
              <option value="bounce-in">Bounce In</option>
            </select>
          </div>

          {entranceAnim !== "none" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (ms)</label>
                  <input
                    type="number"
                    min="100"
                    max="5000"
                    step="50"
                    value={entranceDur.replace("ms", "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMotion((m) => ({ ...m, entranceDurationMs: val }));
                      if (updateSelectedStyle) updateSelectedStyle("entranceDuration", `${val}ms`);
                    }}
                    placeholder="600"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delay (ms)</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="50"
                    value={entranceDelay.replace("ms", "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMotion((m) => ({ ...m, entranceDelayMs: val }));
                      if (updateSelectedStyle) updateSelectedStyle("entranceDelay", `${val}ms`);
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={entranceReplay}
                  onChange={(e) => updateMotion((m) => ({ ...m, entranceReplay: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Replay on Viewport Re-entry</span>
              </label>
            </>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. HOVER EFFECTS                                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "hover" && (
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Hover Transform & Transition</span>
            <span className="text-[10px] text-slate-500 font-medium">CSS GPU Accelerated</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scale (e.g. 1.05)</label>
              <input
                type="text"
                value={hoverScale}
                onChange={(e) => {
                  const val = e.target.value;
                  updateMotion((m) => ({ ...m, hover: { ...(m.hover || {}), scale: val } }));
                  if (updateSelectedStyle) updateSelectedStyle("hoverScale", val);
                }}
                placeholder="1.05"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rotate (deg)</label>
              <input
                type="text"
                value={hoverRotate}
                onChange={(e) => {
                  const val = e.target.value;
                  updateMotion((m) => ({ ...m, hover: { ...(m.hover || {}), rotate: val } }));
                  if (updateSelectedStyle) updateSelectedStyle("hoverRotate", val);
                }}
                placeholder="5"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Translate Y (px)</label>
              <input
                type="text"
                value={hoverTranslateY}
                onChange={(e) => {
                  const val = e.target.value;
                  updateMotion((m) => ({ ...m, hover: { ...(m.hover || {}), translateY: val } }));
                  if (updateSelectedStyle) updateSelectedStyle("hoverTranslateY", val);
                }}
                placeholder="-4"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Opacity (0 - 1)</label>
              <input
                type="text"
                value={hoverOpacity}
                onChange={(e) => {
                  const val = e.target.value;
                  updateMotion((m) => ({ ...m, hover: { ...(m.hover || {}), opacity: val } }));
                  if (updateSelectedStyle) updateSelectedStyle("hoverOpacity", val);
                }}
                placeholder="0.9"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (ms)</label>
            <input
              type="number"
              min="50"
              max="2000"
              step="50"
              value={hoverDuration.replace("ms", "")}
              onChange={(e) => {
                const val = e.target.value;
                updateMotion((m) => ({ ...m, hover: { ...(m.hover || {}), durationMs: val } }));
                if (updateSelectedStyle) updateSelectedStyle("hoverTransitionDuration", `${val}ms`);
              }}
              placeholder="300"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. STICKY POSITIONING                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "sticky" && (
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Sticky Positioning</span>
            <span className="text-[10px] text-slate-500 font-medium">CSS Sticky</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sticky Position</label>
            <select
              value={stickyPosition}
              onChange={(e) => {
                const val = e.target.value as StickyPositionMode;
                updateMotion((m) => ({ ...m, stickyPosition: val }));
                if (updateSelectedStyle) updateSelectedStyle("stickyPosition", val);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="none">None (Standard flow)</option>
              <option value="top">Sticky to Top</option>
              <option value="bottom">Sticky to Bottom</option>
            </select>
          </div>

          {stickyPosition !== "none" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Offset (e.g. 0px, 20px)</label>
              <input
                type="text"
                value={stickyOffset}
                onChange={(e) => {
                  const val = e.target.value;
                  updateMotion((m) => ({ ...m, stickyOffset: val }));
                  if (updateSelectedStyle) updateSelectedStyle("stickyOffset", val);
                }}
                placeholder="0px"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MOUSE TRACK & 3D TILT                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "mouse" && (
        <div className="space-y-4">
          {/* Mouse Track */}
          <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mouseTrackEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    updateMotion((m) => ({
                      ...m,
                      mouseTrack: { ...(m.mouseTrack || {}), enabled },
                    }));
                    if (updateSelectedStyle) updateSelectedStyle("mouseTrackEnabled", enabled ? "true" : "false");
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Mouse Track (Follow Cursor)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">rAF Damped</span>
            </div>

            {mouseTrackEnabled && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Damping / Speed Factor</label>
                  <span className="text-xs font-mono text-slate-500">{mouseTrackSpeed}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.5"
                  step="0.02"
                  value={mouseTrackSpeed}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateMotion((m) => ({
                      ...m,
                      mouseTrack: { enabled: !!(m.mouseTrack?.enabled), ...(m.mouseTrack || {}), speed: val },
                    }));
                    if (updateSelectedStyle) updateSelectedStyle("mouseTrackSpeed", val);
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* 3D Tilt */}
          <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tiltEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    updateMotion((m) => ({
                      ...m,
                      tilt: { enabled, ...(m.tilt || {}) },
                    }));
                    if (updateSelectedStyle) updateSelectedStyle("tilt3DEnabled", enabled ? "true" : "false");
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>3D Interactive Tilt</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">Perspective 800px</span>
            </div>

            {tiltEnabled && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Max Tilt Angle</label>
                  <span className="text-xs font-mono text-slate-500">{tiltMaxDeg}°</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="1"
                  value={tiltMaxDeg}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateMotion((m) => ({
                      ...m,
                      tilt: { enabled: !!(m.tilt?.enabled), ...(m.tilt || {}), maxDeg: val },
                    }));
                    if (updateSelectedStyle) updateSelectedStyle("tilt3DMax", val);
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. SCROLLING EFFECTS                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "scroll" && (
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={scrollEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  updateMotion((m) => ({
                    ...m,
                    scroll: { ...(m.scroll || { enabled }), enabled },
                  }));
                  if (updateSelectedStyle) updateSelectedStyle("scrollEffectsEnabled", enabled ? "true" : "false");
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Enable Scroll Effects</span>
            </label>
            <span className="text-[10px] text-slate-500 font-medium">Scroll Progress</span>
          </div>

          {scrollEnabled && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parallax Speed X</label>
                  <input
                    type="number"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={scrollSpeedX}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMotion((m) => ({ ...m, scroll: { ...(m.scroll || { enabled: true }), speedX: val } }));
                      if (updateSelectedStyle) updateSelectedStyle("scrollSpeedX", val);
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parallax Speed Y</label>
                  <input
                    type="number"
                    min="-2"
                    max="2"
                    step="0.1"
                    value={scrollSpeedY}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMotion((m) => ({ ...m, scroll: { ...(m.scroll || { enabled: true }), speedY: val } }));
                      if (updateSelectedStyle) updateSelectedStyle("scrollSpeedY", val);
                    }}
                    placeholder="0.3"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scroll Transparency</label>
                <select
                  value={scrollTransparency}
                  onChange={(e) => {
                    const val = e.target.value as ScrollTransparencyMode;
                    updateMotion((m) => ({ ...m, scroll: { ...(m.scroll || { enabled: true }), transparency: val } }));
                    if (updateSelectedStyle) updateSelectedStyle("scrollTransparency", val);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="none">None (Fixed opacity)</option>
                  <option value="fade-in">Fade In (Transparent to solid)</option>
                  <option value="fade-out">Fade Out (Solid to transparent)</option>
                  <option value="fade-in-out">Fade In & Out (Peak at viewport center)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rotate (°)</label>
                  <input
                    type="number"
                    min="-180"
                    max="180"
                    step="5"
                    value={scrollRotate}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMotion((m) => ({ ...m, scroll: { ...(m.scroll || { enabled: true }), rotateDeg: val } }));
                      if (updateSelectedStyle) updateSelectedStyle("scrollRotate", val);
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Scale Target</label>
                  <input
                    type="number"
                    min="0.5"
                    max="2"
                    step="0.05"
                    value={scrollScale}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMotion((m) => ({ ...m, scroll: { ...(m.scroll || { enabled: true }), scaleTarget: val } }));
                      if (updateSelectedStyle) updateSelectedStyle("scrollScale", val);
                    }}
                    placeholder="1"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Blur Max (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={scrollBlur}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMotion((m) => ({ ...m, scroll: { ...(m.scroll || { enabled: true }), blurPx: val } }));
                      if (updateSelectedStyle) updateSelectedStyle("scrollBlur", val);
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. INTERACTIONS ENGINE (MULTI-RULE)                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "interactions" && (
        <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Element Interaction Rules</span>
            <button
              type="button"
              onClick={() => {
                const newRule: InteractionRule = {
                  id: "rule_" + Math.random().toString(36).substring(2, 9),
                  trigger: "click",
                  action: "toggle-class",
                  targetSelector: "",
                  toggleClass: "active",
                };
                updateInteractionsList([...interactions, newRule]);
              }}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-bold text-white shadow hover:bg-blue-700 transition cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Add Rule</span>
            </button>
          </div>

          {interactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
              <span className="block text-xs font-semibold text-slate-500">No interaction rules defined</span>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                Add triggers like Click, Hover, or Focus to show/hide, toggle classes, or scroll to elements.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map((rule, idx) => (
                <div
                  key={rule.id || idx}
                  className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-700">Rule #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = interactions.filter((_, i) => i !== idx);
                        updateInteractionsList(next);
                      }}
                      className="text-slate-400 hover:text-red-600 transition cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Trigger Event</label>
                      <select
                        value={rule.trigger}
                        onChange={(e) => {
                          const val = e.target.value as InteractionTriggerType;
                          const next = [...interactions];
                          next[idx] = { ...next[idx], trigger: val };
                          updateInteractionsList(next);
                        }}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="click">On Click</option>
                        <option value="hover">On Hover (Enter)</option>
                        <option value="dblclick">On Double Click</option>
                        <option value="focus">On Focus</option>
                        <option value="blur">On Blur</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Action</label>
                      <select
                        value={rule.action}
                        onChange={(e) => {
                          const val = e.target.value as InteractionActionType;
                          const next = [...interactions];
                          next[idx] = { ...next[idx], action: val };
                          updateInteractionsList(next);
                        }}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="toggle-class">Toggle CSS Class</option>
                        <option value="show">Show Element</option>
                        <option value="hide">Hide Element</option>
                        <option value="toggle-visibility">Toggle Visibility</option>
                        <option value="scroll-to">Smooth Scroll To</option>
                        <option value="open-url">Open URL</option>
                        <option value="copy-text">Copy Text to Clipboard</option>
                      </select>
                    </div>
                  </div>

                  {/* Target Selector */}
                  {["toggle-class", "show", "hide", "toggle-visibility", "scroll-to"].includes(rule.action) && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Target Element (CSS Selector or ID)
                      </label>
                      <input
                        type="text"
                        value={rule.targetSelector || ""}
                        onChange={(e) => {
                          const next = [...interactions];
                          next[idx] = { ...next[idx], targetSelector: e.target.value };
                          updateInteractionsList(next);
                        }}
                        placeholder="e.g. #my-modal or .faq-answer"
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* Action-specific fields */}
                  {rule.action === "toggle-class" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Class to Toggle</label>
                      <input
                        type="text"
                        value={rule.toggleClass || ""}
                        onChange={(e) => {
                          const next = [...interactions];
                          next[idx] = { ...next[idx], toggleClass: e.target.value };
                          updateInteractionsList(next);
                        }}
                        placeholder="e.g. is-active or open"
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {rule.action === "open-url" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Destination URL</label>
                      <input
                        type="text"
                        value={rule.actionValue || ""}
                        onChange={(e) => {
                          const next = [...interactions];
                          next[idx] = { ...next[idx], actionValue: e.target.value };
                          updateInteractionsList(next);
                        }}
                        placeholder="https://example.com"
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {rule.action === "copy-text" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Text to Copy</label>
                      <input
                        type="text"
                        value={rule.actionValue || ""}
                        onChange={(e) => {
                          const next = [...interactions];
                          next[idx] = { ...next[idx], actionValue: e.target.value };
                          updateInteractionsList(next);
                        }}
                        placeholder="Copied coupon code or text"
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
