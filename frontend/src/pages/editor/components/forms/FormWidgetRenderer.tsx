import { useState, useId } from "react";
import type {
  FormWidgetConfig,
  FormFieldConfig,
  FieldColumnWidth,
} from "../../../../types/form.types";

interface FormWidgetRendererProps {
  config: FormWidgetConfig;
  websiteId?: string;
  isPreview?: boolean;
  onOpenPopup?: (popupId: string) => void;
  apiUrl?: string;
}

export default function FormWidgetRenderer({
  config,
  websiteId = "default-site",
  isPreview = false,
  onOpenPopup,
  apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000",
}: FormWidgetRendererProps) {
  const formKey = useId();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypotVal, setHoneypotVal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const isMultiStep = config.isMultiStep && config.steps && config.steps.length > 1;
  const totalSteps = isMultiStep ? config.steps.length : 1;

  // Filter fields for current step in multi-step mode
  const currentFields = isMultiStep
    ? config.fields.filter((f) => (f.stepIndex ?? 0) === currentStep)
    : config.fields;

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error on change
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const validateField = (field: FormFieldConfig, value: any): string | null => {
    // 1. Required Check
    if (field.required) {
      if (value === undefined || value === null || String(value).trim() === "") {
        return field.customErrorMessage || `${field.label} is required`;
      }
      if (field.type === "checkbox" && !value) {
        return field.customErrorMessage || `${field.label} must be checked`;
      }
    }

    if (!value || String(value).trim() === "") return null;

    // 2. Email Validation
    if (field.type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        return field.customErrorMessage || "Please enter a valid email address";
      }
    }

    // 3. Tel / Phone Validation
    if (field.type === "tel") {
      const telRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
      if (!telRegex.test(String(value).replace(/[\s()-]/g, ""))) {
        return field.customErrorMessage || "Please enter a valid phone number";
      }
    }

    // 4. Custom Regex Validation
    if (field.validationRegex) {
      try {
        const customReg = new RegExp(field.validationRegex);
        if (!customReg.test(String(value))) {
          return field.customErrorMessage || `Invalid format for ${field.label}`;
        }
      } catch (err) {
        console.error("Custom regex error:", err);
      }
    }

    return null;
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    currentFields.forEach((field) => {
      const val = formData[field.name];
      const err = validateField(field, val);
      if (err) {
        newErrors[field.name] = err;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const handlePrevStep = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionStatus("idle");
      setStatusMessage("");

      const payload = {
        websiteId,
        formId: config.id,
        formName: config.formName,
        fields: formData,
        actions: config.actions,
        spamProtection: config.spamProtection,
        honeypotValue: honeypotVal,
      };

      const res = await fetch(`${apiUrl}/api/forms/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || config.actions.errorMessage || "Submission failed");
      }

      setSubmissionStatus("success");
      setStatusMessage(data.message || config.actions.successMessage || "Thank you! Submission received.");
      setFormData({});

      // Post-Submit Action Handling (F-276, F-279)
      if (data.redirectUrl) {
        if (data.openInNewTab) {
          window.open(data.redirectUrl, "_blank");
        } else {
          window.location.href = data.redirectUrl;
        }
      }

      if (data.popupId) {
        if (onOpenPopup) onOpenPopup(data.popupId);
        window.dispatchEvent(
          new CustomEvent("forge:open-popup", { detail: { popupId: data.popupId } })
        );
      }
    } catch (err: any) {
      console.error("Form submission error:", err);
      setSubmissionStatus("error");
      setStatusMessage(err.message || config.actions.errorMessage || "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWidthClass = (width: FieldColumnWidth) => {
    switch (width) {
      case "20%":
        return "w-full sm:w-1/5";
      case "25%":
        return "w-full sm:w-1/4";
      case "33.33%":
        return "w-full sm:w-1/3";
      case "50%":
        return "w-full sm:w-1/2";
      case "66.66%":
        return "w-full sm:w-2/3";
      case "75%":
        return "w-full sm:w-3/4";
      case "100%":
      default:
        return "w-full";
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200/80 text-slate-800 font-sans">
      {/* Form Header */}
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h3 className="text-xl font-bold text-slate-900">{config.formName}</h3>
        {isMultiStep && config.steps[currentStep] && (
          <p className="text-xs text-slate-500 mt-1">
            {config.steps[currentStep].description || `Step ${currentStep + 1} of ${totalSteps}`}
          </p>
        )}
      </div>

      {/* Multi-Step Progress Indicator (F-275) */}
      {isMultiStep && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
            <span>
              Step {currentStep + 1}: {config.steps[currentStep]?.title || `Step ${currentStep + 1}`}
            </span>
            <span className="text-blue-600 font-bold">
              {Math.round(((currentStep + 1) / totalSteps) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Success / Error Banners */}
      {submissionStatus === "success" && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 font-medium flex items-center gap-3 animate-in fade-in">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs">
            ✓
          </span>
          <div>{statusMessage}</div>
        </div>
      )}

      {submissionStatus === "error" && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 font-medium flex items-center gap-3 animate-in fade-in">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white font-bold text-xs">
            ✕
          </span>
          <div>{statusMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Honeypot Spam Trap Field (Visually Hidden, F-277) */}
        {config.spamProtection?.enableHoneypot !== false && (
          <div style={{ display: "none", position: "absolute", left: "-9999px" }} aria-hidden="true">
            <label htmlFor={`${formKey}-hp`}>Leave this field blank</label>
            <input
              id={`${formKey}-hp`}
              type="text"
              name={config.spamProtection?.honeypotFieldName || "_form_hp_trap"}
              value={honeypotVal}
              onChange={(e) => setHoneypotVal(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
        )}

        {/* Fields Grid Layout */}
        <div className="flex flex-wrap -mx-2 gap-y-4">
          {currentFields.map((field) => {
            const hasError = !!errors[field.name];
            const widthClass = getWidthClass(field.width);
            const value = formData[field.name] ?? field.defaultValue ?? "";

            if (field.type === "hidden") {
              return (
                <input
                  key={field.id}
                  type="hidden"
                  name={field.name}
                  value={value}
                />
              );
            }

            return (
              <div key={field.id} className={`px-2 ${widthClass}`}>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    rows={4}
                    placeholder={field.placeholder || ""}
                    value={value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition outline-none resize-y ${
                      hasError
                        ? "border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500"
                        : "border-slate-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition outline-none ${
                      hasError
                        ? "border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500"
                        : "border-slate-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  >
                    <option value="">{field.placeholder || "-- Select an option --"}</option>
                    {field.options?.map((opt, i) => (
                      <option key={opt.value + i} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={!!value}
                      onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-600 font-medium">
                      {field.placeholder || field.label}
                    </span>
                  </label>
                ) : field.type === "radio" ? (
                  <div className="space-y-1.5 mt-1">
                    {field.options?.map((opt, i) => (
                      <label key={opt.value + i} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={field.name}
                          value={opt.value}
                          checked={value === opt.value}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-700 font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder || ""}
                    value={value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition outline-none ${
                      hasError
                        ? "border-red-500 bg-red-50/20 focus:ring-1 focus:ring-red-500"
                        : "border-slate-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    }`}
                  />
                )}

                {hasError && <p className="mt-1 text-[11px] font-bold text-red-500">{errors[field.name]}</p>}
              </div>
            );
          })}
        </div>

        {/* Form Controls / Buttons */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {isMultiStep && currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {isMultiStep && currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
            >
              Next Step →
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !isPreview}
              style={{ width: config.submitButtonWidth === "100%" ? "100%" : "auto" }}
              className={`rounded-xl bg-blue-600 px-7 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2 ${
                !isPreview ? "cursor-default" : "cursor-pointer"
              }`}
            >
              {isSubmitting && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {config.submitButtonText || "Submit"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
