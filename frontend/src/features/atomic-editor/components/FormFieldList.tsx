import React, { useState } from "react";
import type { FormFieldConfig, FormFieldType } from "../types/atomicForm.types";
import { createDefaultField } from "../utils/formField.utils";

interface FormFieldListProps {
  fields: FormFieldConfig[];
  selectedFieldId?: string | null;
  onSelectField: (field: FormFieldConfig) => void;
  onAddField: (newField: FormFieldConfig) => void;
  onRemoveField: (id: string) => void;
}

export const FormFieldList: React.FC<FormFieldListProps> = ({
  fields,
  selectedFieldId,
  onSelectField,
  onAddField,
  onRemoveField,
}) => {
  const [newLabel, setNewLabel] = useState<string>("");
  const [newType, setNewType] = useState<FormFieldType>("text");
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const created = createDefaultField(newLabel.trim(), newType);
    onAddField(created);
    setNewLabel("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>📋</span>
          <span>Form Fields</span>
        </span>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-purple-700 transition cursor-pointer"
        >
          + Add Field
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddSubmit} className="space-y-2 p-3 rounded-xl border border-purple-300 bg-purple-50/50 dark:bg-purple-950/30">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Field Label e.g. Phone"
              className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-purple-500"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as FormFieldType)}
              className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="number">Number</option>
              <option value="tel">Telephone</option>
              <option value="url">URL</option>
              <option value="textarea">Textarea</option>
              <option value="select">Select Dropdown</option>
              <option value="checkbox">Checkbox</option>
              <option value="radio">Radio Buttons</option>
            </select>
          </div>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-purple-700 cursor-pointer"
            >
              Save Field
            </button>
          </div>
        </form>
      )}

      {/* Field Cards */}
      <div className="space-y-2">
        {fields.map((field) => {
          const isSelected = selectedFieldId === field.id;

          return (
            <div
              key={field.id}
              onClick={() => onSelectField(field)}
              className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-semibold transition cursor-pointer ${
                isSelected
                  ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-2xs"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-200 hover:border-purple-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs">📌</span>
                <span>{field.label}</span>
                {field.required && <span className="text-red-500 font-bold text-[10px]">*</span>}
                <span className="font-mono text-[9px] font-normal text-slate-400">({field.type})</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveField(field.id);
                }}
                className="text-slate-400 hover:text-red-500 text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
