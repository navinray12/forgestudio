import React, { useState, useEffect } from "react";
import type { AtomicClass } from "../types/classes.types";
import type { ElementStyles } from "../../../pages/editor/WebsiteEditor";
import { formatClassName } from "../utils/class.utils";
import { useVariables } from "../hooks/useVariables";
import { VariableReferenceControl } from "./VariableReferenceControl";

interface ClassFormModalProps {
  isOpen: boolean;
  classToEdit?: AtomicClass | null;
  defaultIsGlobal?: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; styles: Partial<ElementStyles>; description?: string; isGlobal: boolean }) => Promise<void>;
}

export const ClassFormModal: React.FC<ClassFormModalProps> = ({
  isOpen,
  classToEdit,
  defaultIsGlobal = true,
  onClose,
  onSubmit,
}) => {
  const { variables } = useVariables();

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isGlobal, setIsGlobal] = useState<boolean>(true);
  const [styles, setStyles] = useState<Partial<ElementStyles>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (classToEdit) {
      setName(classToEdit.name);
      setDescription(classToEdit.description || "");
      setIsGlobal(Boolean(classToEdit.isGlobal || classToEdit.scope === "global"));
      setStyles(classToEdit.styles || {});
    } else {
      setName("");
      setDescription("");
      setIsGlobal(defaultIsGlobal);
      setStyles({
        backgroundColor: "#ffffff",
        color: "#0f172a",
        padding: "16px",
        borderRadius: "8px",
      });
    }
    setErrorMsg(null);
  }, [classToEdit, defaultIsGlobal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ name, styles, description, isGlobal });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to save class.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewClassKey = name.trim() ? `.${formatClassName(name)}` : ".class-name";

  const updateStyleProp = (key: keyof ElementStyles, value: any) => {
    setStyles((prev) => ({
      ...prev,
      [key]: value !== "" ? value : undefined,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-form-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 id="class-form-modal-title" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🌐</span>
            <span>{classToEdit ? (isGlobal ? "EDIT GLOBAL CLASS" : "EDIT LOCAL CLASS") : (isGlobal ? "CREATE GLOBAL CLASS" : "CREATE LOCAL CLASS")}</span>
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
          {/* Class Scope Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Class Scope
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsGlobal(true)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isGlobal
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <span>🌐 Global Class</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGlobal(false)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isGlobal
                    ? "bg-slate-700 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <span>🏠 Local Class</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {isGlobal
                ? "Global classes are defined once in your design system and available across your entire website."
                : "Local classes are scoped to specific page contexts."}
            </p>
          </div>

          {/* Class Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isGlobal ? "e.g. Heading Primary" : "e.g. Card Accent"}
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
            <p className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
              CSS Class Selector: {previewClassKey}
            </p>
          </div>

          {/* Style Controls Grid */}
          <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Class Style Properties</span>
              <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400">⚡ Variable Sync Enabled</span>
            </h4>

            <div className="grid grid-cols-1 gap-3">
              {/* Text Color */}
              <VariableReferenceControl
                label="Text Color"
                value={styles.color || ""}
                onChange={(val) => updateStyleProp("color", val)}
                variables={variables}
                supportedType="color"
                directInputType="color"
              />

              {/* Background Color */}
              <VariableReferenceControl
                label="Background Color"
                value={styles.backgroundColor || ""}
                onChange={(val) => updateStyleProp("backgroundColor", val)}
                variables={variables}
                supportedType="color"
                directInputType="color"
              />

              {/* Font Size */}
              <VariableReferenceControl
                label="Font Size"
                value={styles.fontSize || ""}
                onChange={(val) => updateStyleProp("fontSize", val)}
                variables={variables}
                supportedType={["font", "number", "spacing"]}
                placeholder="e.g. 18px"
              />

              {/* Padding */}
              <VariableReferenceControl
                label="Padding"
                value={styles.padding || ""}
                onChange={(val) => updateStyleProp("padding", val)}
                variables={variables}
                supportedType={["spacing", "number"]}
                placeholder="e.g. 16px"
              />

              {/* Border Radius */}
              <VariableReferenceControl
                label="Border Radius"
                value={styles.borderRadius || ""}
                onChange={(val) => updateStyleProp("borderRadius", val)}
                variables={variables}
                supportedType={["spacing", "number"]}
                placeholder="e.g. 8px"
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
              placeholder="e.g. Global primary heading reusable design style"
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
                <span>{classToEdit ? "Update Class" : isGlobal ? "Create Global Class" : "Create Class"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
