import React, { useState, useRef, useEffect } from "react";
import type { EditorElement, ElementStyles, DeviceMode, ElementState } from "../types";
import { getControlStyleValue, hasStyleOverride, hasHoverStyleOverride, parseSpacingUnit, isControlStyleConfigured } from "../utils";

export interface ScrubbableNumberInputProps {
  value: string | number;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
}

export const ScrubbableNumberInput: React.FC<ScrubbableNumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = "0",
  className = "w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500",
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState<string | null>(null);

  const startXRef = useRef(0);
  const startValRef = useRef(0);
  const latestValRef = useRef<string>(String(value ?? ""));
  const lastCommittedValRef = useRef<string>(String(value ?? ""));
  const rafIdRef = useRef<number | null>(null);

  const onChangeRef = useRef(onChange);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);

  useEffect(() => {
    onChangeRef.current = onChange;
    minRef.current = min;
    maxRef.current = max;
    stepRef.current = step;
  });

  const displayValue = isScrubbing && scrubValue !== null ? scrubValue : value;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const initialVal = typeof value === "number" ? value : parseFloat(String(value)) || 0;
    startXRef.current = e.clientX;
    startValRef.current = initialVal;
    latestValRef.current = String(initialVal);
    lastCommittedValRef.current = String(initialVal);
    setScrubValue(String(initialVal));
    setIsScrubbing(true);
  };

  // Window drag listener effect with automatic cleanup
  useEffect(() => {
    if (!isScrubbing) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      let multiplier = stepRef.current;
      if (moveEvent.shiftKey) multiplier = stepRef.current * 10;
      if (moveEvent.altKey || moveEvent.ctrlKey) multiplier = stepRef.current * 0.1;

      let newVal = startValRef.current + deltaX * multiplier;
      if (minRef.current !== undefined) newVal = Math.max(minRef.current, newVal);
      if (maxRef.current !== undefined) newVal = Math.min(maxRef.current, newVal);

      const roundedVal = stepRef.current < 1 ? Math.round(newVal * 10) / 10 : Math.round(newVal);
      const formatted = String(roundedVal);
      latestValRef.current = formatted;

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const valToCommit = latestValRef.current;
          setScrubValue(valToCommit);
          if (valToCommit !== lastCommittedValRef.current) {
            lastCommittedValRef.current = valToCommit;
            onChangeRef.current(valToCommit);
          }
        });
      }
    };

    const onMouseUp = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setIsScrubbing(false);
      setScrubValue(null);

      const finalVal = latestValRef.current;
      if (finalVal !== lastCommittedValRef.current) {
        lastCommittedValRef.current = finalVal;
        onChangeRef.current(finalVal);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isScrubbing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    latestValRef.current = val;
    lastCommittedValRef.current = val;
    onChange(val);
  };

  return (
    <div className="relative flex items-center w-full group">
      <input
        type="number"
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`${className} ${isScrubbing ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/50" : ""}`}
      />
      <div
        onMouseDown={handleMouseDown}
        title="Drag horizontally to scrub value (Shift for 10x, Alt for 0.1x)"
        className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-ew-resize px-0.5 text-[9px] font-bold text-slate-400 hover:text-blue-600 transition select-none"
      >
        ↔
      </div>
    </div>
  );
};

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
