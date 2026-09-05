import React from "react";
import type { FormFieldConfig, FormFieldType, SelectOption } from "../types/atomicForm.types";

interface FormFieldSettingsProps {
  field: FormFieldConfig;
  onUpdateField: (updated: FormFieldConfig) => void;
}

export const FormFieldSettings: React.FC<FormFieldSettingsProps> = ({
  field,
  onUpdateField,
}) => {
  const handleChange = (key: keyof FormFieldConfig, value: any) => {
    onUpdateField({
      ...field,
      [key]: value,
    });
  };

  const handleOptionChange = (idx: number, key: keyof SelectOption, val: string) => {
    const updatedOptions = [...(field.options || [])];
    updatedOptions[idx] = { ...updatedOptions[idx], [key]: val };
    onUpdateField({ ...field, options: updatedOptions });
  };

  const handleAddOption = () => {
    const nextIdx = (field.options?.length || 0) + 1;
    const newOpt: SelectOption = { label: `Option ${nextIdx}`, value: `option-${nextIdx}` };
    onUpdateField({ ...field, options: [...(field.options || []), newOpt] });
  };

  const handleRemoveOption = (idx: number) => {
    const updatedOptions = field.options?.filter((_, i) => i !== idx);
    onUpdateField({ ...field, options: updatedOptions });
  };

  return (
    <div className="space-y-3.5 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800/60 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
          <span>⚙️</span>
          <span>Field Settings: {field.label}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Label */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Label
          </label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => handleChange("label", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Field Name */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Field Key Name
          </label>
          <input
            type="text"
            value={field.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Field Type */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Field Type
          </label>
          <select
            value={field.type}
            onChange={(e) => handleChange("type", e.target.value as FormFieldType)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer"
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

        {/* Placeholder */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Placeholder
          </label>
          <input
            type="text"
            value={field.placeholder || ""}
            onChange={(e) => handleChange("placeholder", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Required Toggle */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id={`req-${field.id}`}
          checked={field.required}
          onChange={(e) => handleChange("required", e.target.checked)}
          className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
        />
        <label htmlFor={`req-${field.id}`} className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
          Required Field
        </label>
      </div>

      {/* Option List Manager for Select & Radio */}
      {(field.type === "select" || field.type === "radio") && (
        <div className="space-y-2 border-t border-purple-200 dark:border-purple-800/60 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300">
              Dropdown / Radio Options
            </span>
            <button
              type="button"
              onClick={handleAddOption}
              className="text-[10px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              + Add Option
            </button>
          </div>

          <div className="space-y-1.5">
            {field.options?.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={opt.label}
                  placeholder="Label"
                  onChange={(e) => handleOptionChange(idx, "label", e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none"
                />
                <input
                  type="text"
                  value={opt.value}
                  placeholder="Value"
                  onChange={(e) => handleOptionChange(idx, "value", e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="text-red-500 text-xs px-1 hover:text-red-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
