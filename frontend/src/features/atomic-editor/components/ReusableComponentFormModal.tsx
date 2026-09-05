import React, { useState, useEffect } from "react";
import type { ReusableComponentDefinition, CreateReusableComponentPayload } from "../types/reusableComponents.types";

interface ReusableComponentFormModalProps {
  isOpen: boolean;
  componentToEdit?: ReusableComponentDefinition | null;
  onClose: () => void;
  onSubmit: (payload: CreateReusableComponentPayload) => Promise<void>;
}

export const ReusableComponentFormModal: React.FC<ReusableComponentFormModalProps> = ({
  isOpen,
  componentToEdit,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState<string>("");
  const [category, setCategory] = useState<string>("Cards");
  const [description, setDescription] = useState<string>("");
  const [rootTitle, setRootTitle] = useState<string>("Heading Title");
  const [rootContent, setRootContent] = useState<string>("Content paragraph description...");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (componentToEdit) {
      setName(componentToEdit.name);
      setCategory(componentToEdit.category || "Cards");
      setDescription(componentToEdit.description || "");
      setRootTitle(componentToEdit.rootElement?.children?.[0]?.content || "Heading Title");
      setRootContent(componentToEdit.rootElement?.children?.[1]?.content || "Content description...");
    } else {
      setName("");
      setCategory("Cards");
      setDescription("");
      setRootTitle("Pro Feature Card");
      setRootContent("High performance modular UI component definition.");
    }
    setErrorMsg(null);
  }, [componentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const rootElement = componentToEdit
        ? {
            ...componentToEdit.rootElement,
            children: [
              {
                ...(componentToEdit.rootElement.children?.[0] || {
                  id: `node-${Date.now()}-1`,
                  type: "heading",
                  name: "Heading",
                }),
                content: rootTitle,
              },
              {
                ...(componentToEdit.rootElement.children?.[1] || {
                  id: `node-${Date.now()}-2`,
                  type: "paragraph",
                  name: "Paragraph",
                }),
                content: rootContent,
              },
              ...(componentToEdit.rootElement.children?.slice(2) || []),
            ],
          }
        : {
            id: `node-root-${Date.now()}`,
            type: "container",
            name: `${name || "Component"} Container`,
            styles: {
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
            },
            children: [
              {
                id: `node-title-${Date.now()}`,
                type: "heading",
                name: "Heading",
                content: rootTitle,
                styles: { fontSize: "20px", fontWeight: "800" },
              },
              {
                id: `node-desc-${Date.now()}`,
                type: "paragraph",
                name: "Description",
                content: rootContent,
                styles: { fontSize: "14px", color: "#64748b" },
              },
            ],
          };

      await onSubmit({
        name,
        category,
        description,
        rootElement,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save Reusable Component.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 text-slate-800 dark:text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reusable-component-form-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 id="reusable-component-form-modal-title" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>🧩</span>
            <span>{componentToEdit ? "EDIT REUSABLE COMPONENT" : "CREATE REUSABLE COMPONENT"}</span>
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
          {/* Component Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Component Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pricing Card"
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="Cards">Cards & Containers</option>
              <option value="Headers">Header & Hero</option>
              <option value="Features">Feature Blocks</option>
              <option value="Testimonials">Testimonials & Reviews</option>
              <option value="Footers">Footers & CTA</option>
            </select>
          </div>

          {/* Root Heading Text */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Component Heading Content
            </label>
            <input
              type="text"
              value={rootTitle}
              onChange={(e) => setRootTitle(e.target.value)}
              placeholder="e.g. Pro Tier"
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
            />
          </div>

          {/* Description Text */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Component Body Description
            </label>
            <textarea
              rows={2}
              value={rootContent}
              onChange={(e) => setRootContent(e.target.value)}
              placeholder="e.g. High performance modular UI component definition."
              className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Library Note (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Reusable pricing tier container for product checkout pages."
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
                <span>{componentToEdit ? "Update Component" : "Create Component"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
