import React, { useState, useEffect } from "react";
import type { GlobalElementDefinition, GlobalElementType, CreateGlobalElementPayload } from "../types/globalElements.types";
import type { ElementStyles } from "../../../pages/editor/WebsiteEditor";
import { useVariables } from "../hooks/useVariables";
import { VariableReferenceControl } from "./VariableReferenceControl";

interface GlobalElementFormModalProps {
  isOpen: boolean;
  elementToEdit?: GlobalElementDefinition | null;
  onClose: () => void;
  onSubmit: (payload: CreateGlobalElementPayload) => Promise<void>;
}

export const GlobalElementFormModal: React.FC<GlobalElementFormModalProps> = ({
  isOpen,
  elementToEdit,
  onClose,
  onSubmit,
}) => {
  const { variables } = useVariables();

  const [name, setName] = useState<string>("");
  const [elementType, setElementType] = useState<GlobalElementType>("button");
  const [content, setContent] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [styles, setStyles] = useState<Partial<ElementStyles>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (elementToEdit) {
      setName(elementToEdit.name);
      setElementType(elementToEdit.elementType);
      setContent(elementToEdit.content || "");
      setDescription(elementToEdit.description || "");
      setStyles(elementToEdit.styles || {});
    } else {
      setName("");
      setElementType("button");
      setContent("Get Started Now");
      setDescription("");
      setStyles({
        backgroundColor: "#4f46e5",
        color: "#ffffff",
        padding: "12px 24px",
        borderRadius: "8px",
      });
    }
    setErrorMsg(null);
  }, [elementToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        elementType,
        content,
        styles,
        description,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save Global Element.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        aria-labelledby="global-element-form-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 id="global-element-form-modal-title" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🌐</span>
            <span>{elementToEdit ? "EDIT GLOBAL ELEMENT" : "CREATE GLOBAL ELEMENT"}</span>
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
          {/* Element Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Global Element Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Primary CTA Button"
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Element Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Element Type
            </label>
            <select
              value={elementType}
              onChange={(e) => setElementType(e.target.value as GlobalElementType)}
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="button">Button Element</option>
              <option value="heading">Heading Element</option>
              <option value="paragraph">Paragraph Text</option>
              <option value="container">Container Box</option>
              <option value="card">Card Component</option>
              <option value="badge">Tag / Badge</option>
            </select>
          </div>

          {/* Text Content */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Text / Label Content
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. Get Started Now →"
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
            />
          </div>

          {/* Style Controls Grid */}
          <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Element Styles</span>
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

              {/* Padding */}
              <VariableReferenceControl
                label="Padding"
                value={styles.padding || ""}
                onChange={(val) => updateStyleProp("padding", val)}
                variables={variables}
                supportedType={["spacing", "number"]}
                placeholder="e.g. 12px 24px"
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
              placeholder="e.g. Primary website high-conversion CTA button definition"
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
                <span>{elementToEdit ? "Update Global Element" : "Create Global Element"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
