import React from "react";
import type { FormContainerConfig } from "../types/atomicForm.types";

interface FormSubmissionSettingsProps {
  form: FormContainerConfig;
  onUpdateForm: (updated: Partial<FormContainerConfig>) => void;
}

export const FormSubmissionSettings: React.FC<FormSubmissionSettingsProps> = ({
  form,
  onUpdateForm,
}) => {
  return (
    <div className="space-y-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <span>🚀</span>
          <span>Submit Button & Response Settings</span>
        </span>
      </div>

      <div className="space-y-3">
        {/* Submit Button Text */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Submit Button Text
          </label>
          <input
            type="text"
            value={form.submitButton.text}
            onChange={(e) =>
              onUpdateForm({
                submitButton: { ...form.submitButton, text: e.target.value },
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Success Message */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Success Message
          </label>
          <input
            type="text"
            value={form.submission.successMessage}
            onChange={(e) =>
              onUpdateForm({
                submission: { ...form.submission, successMessage: e.target.value },
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>

        {/* Endpoint Action URL */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Action URL / Endpoint
          </label>
          <input
            type="text"
            value={form.submission.actionUrl || ""}
            placeholder="/api/submit"
            onChange={(e) =>
              onUpdateForm({
                submission: { ...form.submission, actionUrl: e.target.value },
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
          />
        </div>
      </div>
    </div>
  );
};
