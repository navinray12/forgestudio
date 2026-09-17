import React, { useState } from "react";
import type { FormContainerConfig } from "../types/atomicForm.types";
import { validateFormValues } from "../utils/formValidation.utils";
import { PhoneInput } from "../../../components/phone-input";

interface FormPreviewProps {
  form: FormContainerConfig;
}

export const FormPreview: React.FC<FormPreviewProps> = ({ form }) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputChange = (fieldName: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setSubmitError(null);

    const validation = validateFormValues(form.fields, formValues);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 800);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>👁️</span>
          <span>Live Form Preview</span>
        </span>
        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
          {form.fields.length} Fields
        </span>
      </div>

      {submitSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-center space-y-2">
          <span className="text-2xl">🎉</span>
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
            {form.submission.successMessage}
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitSuccess(false);
              setFormValues({});
            }}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
          >
            Reset Form
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              ⚠️ {submitError}
            </div>
          )}

          {form.fields.map((field) => {
            const hasError = Boolean(fieldErrors[field.name]);
            const errorMsg = fieldErrors[field.name];

            return (
              <div key={field.id} className="space-y-1">
                <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  <span>
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 font-normal">
                    [{field.name}]
                  </span>
                </label>

                {/* Input Render Logic */}
                {field.type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={formValues[field.name] || ""}
                    placeholder={field.placeholder}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none transition ${
                      hasError
                        ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-purple-500"
                    }`}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={formValues[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none transition cursor-pointer ${
                      hasError
                        ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-purple-500"
                    }`}
                  >
                    <option value="">Select option...</option>
                    {field.options?.map((opt, i) => (
                      <option key={i} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(formValues[field.name])}
                      onChange={(e) => handleInputChange(field.name, e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <span>{field.label}</span>
                  </label>
                ) : field.type === "radio" ? (
                  <div className="space-y-1 pt-1">
                    {field.options?.map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name={field.name}
                          value={opt.value}
                          checked={formValues[field.name] === opt.value}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className="text-purple-600 focus:ring-purple-500 h-4 w-4"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === "tel" ? (
                  <PhoneInput
                    id={`preview_field_${field.name}`}
                    required={field.required}
                    value={formValues[field.name] || ""}
                    onChange={(val) => handleInputChange(field.name, val.fullNumber)}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={formValues[field.name] || ""}
                    placeholder={field.placeholder}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 outline-none transition ${
                      hasError
                        ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-purple-500"
                    }`}
                  />
                )}

                {hasError && <p className="text-[10px] font-semibold text-red-500 mt-0.5">{errorMsg}</p>}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-700 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Sending...</span>
              </>
            ) : (
              <span>{form.submitButton.text}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
