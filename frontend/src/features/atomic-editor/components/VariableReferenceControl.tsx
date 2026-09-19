import React from "react";
import type { AtomicVariable, VariableType } from "../types/variables.types";
import { isVariableReference, extractVariableKey, resolveVariableValue } from "../utils/variableClassResolver";

interface VariableReferenceControlProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  variables: AtomicVariable[];
  supportedType?: VariableType | VariableType[];
  directInputType?: "color" | "text";
  placeholder?: string;
}

export const VariableReferenceControl: React.FC<VariableReferenceControlProps> = ({
  label,
  value = "",
  onChange,
  variables,
  supportedType,
  directInputType = "text",
  placeholder,
}) => {
  const isVarRef = isVariableReference(value);
  const currentKey = extractVariableKey(value);
  const cleanKey = currentKey.startsWith("--") ? currentKey.slice(2) : currentKey;

  // Filter variables by type if specified
  const filteredVariables = variables.filter((v) => {
    if (!supportedType) return true;
    if (Array.isArray(supportedType)) {
      return supportedType.includes(v.type);
    }
    return v.type === supportedType;
  });

  const resolutionResult = resolveVariableValue(value, variables);

  const handleToggleSource = (useVar: boolean) => {
    if (useVar) {
      if (filteredVariables.length > 0) {
        onChange(`var(--${filteredVariables[0].key})`);
      } else {
        onChange("var(--var-name)");
      }
    } else {
      onChange(resolutionResult.isMissing || resolutionResult.isCircular ? "" : resolutionResult.value || "#000000");
    }
  };

  const handleSelectVariable = (varKey: string) => {
    onChange(`var(--${varKey})`);
  };

  return (
    <div className="space-y-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {/* Toggle Mode Pills */}
        <div className="flex items-center rounded-lg bg-slate-200 dark:bg-slate-800 p-0.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => handleToggleSource(false)}
            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
              !isVarRef
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Direct
          </button>
          <button
            type="button"
            onClick={() => handleToggleSource(true)}
            className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
              isVarRef
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>🎨 Variable</span>
          </button>
        </div>
      </div>

      {/* Input Mode 1: Direct Value */}
      {!isVarRef && (
        <div className="flex items-center gap-2">
          {directInputType === "color" && (
            <input
              type="color"
              value={value.startsWith("#") ? value : "#4f46e5"}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-8 rounded border border-slate-300 dark:border-slate-700 bg-transparent p-0.5 cursor-pointer"
            />
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || (directInputType === "color" ? "#4F46E5" : "e.g. 16px")}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>
      )}

      {/* Input Mode 2: Variable Reference */}
      {isVarRef && (
        <div className="space-y-1.5">
          {filteredVariables.length > 0 ? (
            <select
              value={cleanKey}
              onChange={(e) => handleSelectVariable(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-mono font-semibold text-purple-600 dark:text-purple-400 outline-none focus:border-purple-500 cursor-pointer"
            >
              {filteredVariables.map((v) => (
                <option key={v.id} value={v.key}>
                  --{v.key} ({v.value})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium py-1">
              ⚠️ No compatible Variables available.
            </div>
          )}

          {/* Resolved Value Display */}
          <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 font-medium">Resolved Value:</span>
            {resolutionResult.isMissing ? (
              <span className="text-red-500 font-bold">⚠ Missing Variable ({resolutionResult.variableKey})</span>
            ) : resolutionResult.isCircular ? (
              <span className="text-amber-500 font-bold">⚠ Circular Reference</span>
            ) : (
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700 dark:text-slate-200">
                {resolutionResult.rawVariable?.type === "color" && (
                  <span
                    className="h-3 w-3 rounded-full border border-slate-300"
                    style={{ backgroundColor: resolutionResult.value }}
                  />
                )}
                <span>{resolutionResult.value}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
