import React, { useState } from "react";
import { useAtomicForm } from "../hooks/useAtomicForm";
import { FormPreview } from "./FormPreview";
import { FormFieldList } from "./FormFieldList";
import { FormFieldSettings } from "./FormFieldSettings";
import { FormSubmissionSettings } from "./FormSubmissionSettings";
import type { FormFieldConfig } from "../types/atomicForm.types";

export const AtomicFormPanel: React.FC = () => {
  const {
    filteredForms,
    activeForm,
    setActiveForm,
    createForm,
    updateActiveForm,
    deleteForm,
  } = useAtomicForm();

  const [selectedField, setSelectedField] = useState<FormFieldConfig | null>(null);
  const [newFormName, setNewFormName] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormName.trim()) return;
    await createForm({ name: newFormName.trim() });
    setNewFormName("");
    setIsCreating(false);
  };

  const handleAddField = (newField: FormFieldConfig) => {
    if (!activeForm) return;
    const updatedFields = [...activeForm.fields, newField];
    updateActiveForm({ fields: updatedFields });
    setSelectedField(newField);
  };

  const handleRemoveField = (id: string) => {
    if (!activeForm) return;
    const updatedFields = activeForm.fields.filter((f) => f.id !== id);
    updateActiveForm({ fields: updatedFields });
    if (selectedField?.id === id) {
      setSelectedField(null);
    }
  };

  const handleUpdateField = (updatedField: FormFieldConfig) => {
    if (!activeForm) return;
    const updatedFields = activeForm.fields.map((f) => (f.id === updatedField.id ? updatedField : f));
    updateActiveForm({ fields: updatedFields });
    setSelectedField(updatedField);
  };

  return (
    <div className="flex flex-col flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>📝</span>
          <span>ATOMIC FORMS SYSTEM</span>
        </h3>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition flex items-center gap-1 cursor-pointer"
        >
          <span>+</span>
          <span>Create Form</span>
        </button>
      </div>

      {/* Inline Create Input */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="flex items-center gap-2 p-3 rounded-xl border border-purple-300 bg-purple-50/50 dark:bg-purple-950/30">
          <input
            type="text"
            required
            value={newFormName}
            onChange={(e) => setNewFormName(e.target.value)}
            placeholder="Form Name e.g. Feedback Form"
            className="flex-1 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-700 cursor-pointer"
          >
            Save Form
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Form selector dropdown */}
      <div className="flex items-center gap-2">
        <select
          value={activeForm?.id || ""}
          onChange={(e) => {
            const found = filteredForms.find((f) => f.id === e.target.value);
            if (found) {
              setActiveForm(found);
              setSelectedField(null);
            }
          }}
          className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
        >
          {filteredForms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.fields.length} Fields)
            </option>
          ))}
        </select>
        {activeForm && (
          <button
            type="button"
            onClick={() => deleteForm(activeForm.id)}
            className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white transition cursor-pointer"
          >
            Delete
          </button>
        )}
      </div>

      {activeForm ? (
        <div className="space-y-4">
          {/* Live Preview */}
          <FormPreview form={activeForm} />

          {/* Form Field List */}
          <FormFieldList
            fields={activeForm.fields}
            selectedFieldId={selectedField?.id}
            onSelectField={(field) => setSelectedField(field)}
            onAddField={handleAddField}
            onRemoveField={handleRemoveField}
          />

          {/* Selected Field Inspector */}
          {selectedField && (
            <FormFieldSettings
              field={selectedField}
              onUpdateField={handleUpdateField}
            />
          )}

          {/* Submission & Button Settings */}
          <FormSubmissionSettings
            form={activeForm}
            onUpdateForm={updateActiveForm}
          />
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-slate-400">
          No Forms available. Click "+ Create Form" to begin.
        </div>
      )}
    </div>
  );
};
