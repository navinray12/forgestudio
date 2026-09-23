import React, { useState, useEffect } from "react";
import type { AtomicVariable, VariableType } from "../types/variables.types";
import { formatVariableKey } from "../utils/variable.utils";

interface VariableFormModalProps {
  isOpen: boolean;
  variableToEdit?: AtomicVariable | null;
  onClose: () => void;
  onSubmit: (payload: { name: string; type: VariableType; value: string; description?: string }) => Promise<void>;
}

export const VariableFormModal: React.FC<VariableFormModalProps> = ({
  isOpen,
  variableToEdit,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<VariableType>("color");
  const [value, setValue] = useState<string>("#2563eb");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (variableToEdit) {
      setName(variableToEdit.name);
      setType(variableToEdit.type);
      setValue(variableToEdit.value);
      setDescription(variableToEdit.description || "");
    } else {
      setName("");
      setType("color");
      setValue("#2563eb");
      setDescription("");
    }
    setErrorMsg(null);
  }, [variableToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name, type, value, description });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to save variable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewKey = name.trim() ? formatVariableKey(name) : "--variable-name";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="variable-form-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 id="variable-form-modal-title" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🎨</span>
            <span>{variableToEdit ? "EDIT VARIABLE" : "CREATE VARIABLE"}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Variable Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Variable Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Primary Brand Color"
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
            <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
              CSS Key: {previewKey}
            </p>
          </div>

          {/* Variable Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Variable Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as VariableType;
                setType(newType);
                if (newType === "color" && !value.startsWith("#")) setValue("#2563eb");
                if (newType === "font") setValue("Inter, sans-serif");
                if (newType === "spacing") setValue("16px");
                if (newType === "number") setValue("12px");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
            >
              <option value="color">Color 🎨</option>
              <option value="font">Font Family 🔤</option>
              <option value="spacing">Spacing 📐</option>
              <option value="number">Size / Number 🔢</option>
            </select>
          </div>

          {/* Variable Value */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Variable Value <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {type === "color" && (
                <input
                  type="color"
                  value={value.startsWith("#") ? value : "#2563eb"}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0.5"
                />
              )}
              <input
                type="text"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  type === "color"
                    ? "#2563eb"
                    : type === "font"
                    ? "Inter, sans-serif"
                    : type === "spacing"
                    ? "16px"
                    : "12px"
                }
                className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Main brand color for primary CTAs"
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{variableToEdit ? "Update Variable" : "Create Variable"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
