import React from "react";
import { EditorElement, ElementStyles, DeviceMode, ElementState } from "../types";
import { getControlStyleValue, hasStyleOverride, hasHoverStyleOverride } from "../utils";

interface SpacingControlProps {
  title: string;
  type: "margin" | "padding";
  isLinked: boolean;
  setIsLinked: (val: boolean) => void;
  selectedElement: EditorElement | null;
  activeDevice: DeviceMode;
  activeElementState: ElementState;
  handleSideChange: (sideKey: keyof ElementStyles, numVal: string, unitVal: string) => void;
  handleUnitChange: (newUnit: string) => void;
  handleResetAll: () => void;
}

export const SpacingControl: React.FC<SpacingControlProps> = ({
  title,
  type,
  isLinked,
  setIsLinked,
  selectedElement,
  activeDevice,
  activeElementState,
  handleSideChange,
  handleUnitChange,
  handleResetAll
}) => {
  ) => {
    if (!selectedElement) return null;

    const topKey = (type === "margin" ? "marginTop" : "paddingTop") as keyof ElementStyles;
    const rightKey = (type === "margin" ? "marginRight" : "paddingRight") as keyof ElementStyles;
    const bottomKey = (type === "margin" ? "marginBottom" : "paddingBottom") as keyof ElementStyles;
    const leftKey = (type === "margin" ? "marginLeft" : "paddingLeft") as keyof ElementStyles;

    const currentTop = getControlStyleValue(selectedElement, activeDevice, activeElementState, topKey) || "";
    const currentRight = getControlStyleValue(selectedElement, activeDevice, activeElementState, rightKey) || "";
    const currentBottom = getControlStyleValue(selectedElement, activeDevice, activeElementState, bottomKey) || "";
    const currentLeft = getControlStyleValue(selectedElement, activeDevice, activeElementState, leftKey) || "";

    const parsedTop = parseSpacingUnit(String(currentTop));
    const parsedRight = parseSpacingUnit(String(currentRight));
    const parsedBottom = parseSpacingUnit(String(currentBottom));
    const parsedLeft = parseSpacingUnit(String(currentLeft));

    const activeUnit = parsedTop.unit || parsedRight.unit || parsedBottom.unit || parsedLeft.unit || "px";

    const isOverridden = activeElementState === "hover"
      ? hasHoverStyleOverride(selectedElement, activeDevice, topKey) ||
        hasHoverStyleOverride(selectedElement, activeDevice, rightKey) ||
        hasHoverStyleOverride(selectedElement, activeDevice, bottomKey) ||
        hasHoverStyleOverride(selectedElement, activeDevice, leftKey)
      : hasStyleOverride(selectedElement, activeDevice, topKey) ||
        hasStyleOverride(selectedElement, activeDevice, rightKey) ||
        hasStyleOverride(selectedElement, activeDevice, bottomKey) ||
        hasStyleOverride(selectedElement, activeDevice, leftKey);

    const isConfigured =
      isControlStyleConfigured(selectedElement, activeDevice, activeElementState, topKey) ||
      isControlStyleConfigured(selectedElement, activeDevice, activeElementState, rightKey) ||
      isControlStyleConfigured(selectedElement, activeDevice, activeElementState, bottomKey) ||
      isControlStyleConfigured(selectedElement, activeDevice, activeElementState, leftKey);

    const handleSideChange = (sideKey: keyof ElementStyles, numVal: string, unitVal: string) => {
      const formattedVal = numVal.trim() === "" ? "" : `${numVal}${unitVal}`;
      if (isLinked) {
        updateSelectedStyle(topKey, formattedVal);
        updateSelectedStyle(rightKey, formattedVal);
        updateSelectedStyle(bottomKey, formattedVal);
        updateSelectedStyle(leftKey, formattedVal);
      } else {
        updateSelectedStyle(sideKey, formattedVal);
      }
    };

    const handleUnitChange = (newUnit: string) => {
      const applyUnit = (parsed: { num: string; unit: string }, sideKey: keyof ElementStyles) => {
        if (parsed.num) {
          updateSelectedStyle(sideKey, `${parsed.num}${newUnit}`);
        }
      };
      applyUnit(parsedTop, topKey);
      applyUnit(parsedRight, rightKey);
      applyUnit(parsedBottom, bottomKey);
      applyUnit(parsedLeft, leftKey);
    };

    const handleResetAll = () => {
      resetSelectedStyle(topKey);
      resetSelectedStyle(rightKey);
      resetSelectedStyle(bottomKey);
      resetSelectedStyle(leftKey);
    };

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800">{title}</span>
            {isOverridden && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                {activeDevice}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(isConfigured || isOverridden) && (
              <button
                type="button"
                onClick={handleResetAll}
                title={`Reset ${title} to Default`}
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:underline transition"
              >
                ↺ Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsLinked(!isLinked)}
              title={isLinked ? "Unlink Spacing Values" : "Link Spacing Values"}
              className={`flex h-6 w-6 items-center justify-center rounded border transition text-xs ${
                isLinked
                  ? "bg-blue-50 border-blue-300 text-blue-600 font-bold shadow-xs"
                  : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600"
              }`}
            >
              {isLinked ? "🔗" : "🔓"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Top", key: topKey, parsed: parsedTop },
            { label: "Right", key: rightKey, parsed: parsedRight },
            { label: "Bottom", key: bottomKey, parsed: parsedBottom },
            { label: "Left", key: leftKey, parsed: parsedLeft },
          ].map(({ label, key, parsed }) => (
            <div key={label} className="flex flex-col items-center">
              <ScrubbableNumberInput
                value={parsed.num}
                onChange={(val) => handleSideChange(key, val, parsed.unit || activeUnit)}
                placeholder="0"
                min={0}
              />
              <span className="mt-1 text-[10px] font-semibold text-slate-400 uppercase">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-500">Unit</span>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {["px", "%", "rem", "em"].map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => handleUnitChange(u)}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                  activeUnit === u
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

