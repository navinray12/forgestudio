import React, { useState, useEffect } from "react";
import type { ReusableComponentDefinition } from "../types/reusableComponents.types";
import { DEFAULT_PROPERTY_CONFIGS } from "../utils/componentOverride.utils";

interface ComponentPropertyLockModalProps {
  isOpen: boolean;
  component: ReusableComponentDefinition | null;
  allowedKeys: string[];
  onClose: () => void;
  onSave: (allowedKeys: string[]) => void;
}

export const ComponentPropertyLockModal: React.FC<ComponentPropertyLockModalProps> = ({
  isOpen,
  component,
  allowedKeys: initialAllowedKeys,
  onClose,
  onSave,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    setSelectedKeys(initialAllowedKeys);
  }, [initialAllowedKeys, isOpen]);

  if (!isOpen || !component) return null;

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    onSave(selectedKeys);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lock-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 id="lock-modal-title" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>⚙️</span>
              <span>CONFIGURE EDITABLE PROPERTIES</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Component: <strong>{component.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Informational Banner */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-xs text-purple-900 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300">
          Check properties that instances are permitted to edit. Unchecked properties remain 🔒 <strong>Locked & Controlled by Component</strong>.
        </div>

        {/* Checkbox List */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {DEFAULT_PROPERTY_CONFIGS.map((prop) => {
            const isChecked = selectedKeys.includes(prop.key);
            return (
              <label
                key={prop.key}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                  isChecked
                    ? "border-purple-300 bg-purple-50/30 dark:border-purple-800 dark:bg-purple-950/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 opacity-70"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleKey(prop.key)}
                    className="h-4 w-4 rounded-md border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {prop.label}
                    </span>
                    <span className="ml-2 text-[9px] uppercase tracking-wider font-mono text-slate-400">
                      ({prop.category})
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold">
                  {isChecked ? (
                    <span className="text-purple-600 dark:text-purple-400">☑ Editable</span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">🔒 Locked</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition cursor-pointer"
          >
            Save Lock Settings
          </button>
        </div>
      </div>
    </div>
  );
};
