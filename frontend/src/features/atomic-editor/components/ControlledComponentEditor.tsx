import React from "react";
import type { ReusableComponentDefinition } from "../types/reusableComponents.types";
import { useControlledComponent } from "../hooks/useControlledComponent";

interface ControlledComponentEditorProps {
  component: ReusableComponentDefinition;
  instanceId?: string;
  onBack?: () => void;
}

export const ControlledComponentEditor: React.FC<ControlledComponentEditorProps> = ({
  component,
  instanceId = "instance-demo-1",
  onBack,
}) => {
  const {
    resolvedProperties,
    setPropertyOverride,
    resetPropertyOverride,
    setIsLockModalOpen,
  } = useControlledComponent(component, instanceId);

  const editableProps = resolvedProperties.filter((p) => p.isEditable);
  const lockedProps = resolvedProperties.filter((p) => !p.isEditable);

  return (
    <div className="flex flex-col flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              ← Back
            </button>
          )}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>🎛️</span>
              <span>INSTANCE EDITOR: {component.name}</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Instance ID: {instanceId}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLockModalOpen(true)}
          className="rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/60 dark:border-purple-800 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white transition flex items-center gap-1 cursor-pointer"
        >
          <span>⚙️ Lock Settings</span>
        </button>
      </div>

      {/* Allowed Instance Editable Properties Section */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
          <span>Allowed Instance Properties</span>
          <span className="text-[10px] text-slate-400 font-normal">
            {editableProps.length} property controls available
          </span>
        </h4>

        {editableProps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-400">
            No editable properties configured for this component.
          </div>
        ) : (
          <div className="space-y-3">
            {editableProps.map((prop) => (
              <div
                key={prop.key}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>{prop.label}</span>
                    {prop.isOverridden ? (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        Overridden
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        Inherited
                      </span>
                    )}
                  </label>

                  {prop.isOverridden && (
                    <button
                      type="button"
                      onClick={() => resetPropertyOverride(prop.key)}
                      className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      ↺ Reset to Default
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={prop.effectiveValue}
                  onChange={(e) => setPropertyOverride(prop.key, e.target.value)}
                  placeholder={`Default: ${prop.defaultValue}`}
                  className="w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Locked Component Properties Section */}
      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Locked Properties</span>
          <span className="text-[10px] text-slate-400 font-normal">🔒 Controlled by Component</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {lockedProps.map((prop) => (
            <div
              key={prop.key}
              className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2.5 opacity-80"
            >
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {prop.label}
                </p>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                  {prop.defaultValue}
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>🔒</span>
                <span>Controlled</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
