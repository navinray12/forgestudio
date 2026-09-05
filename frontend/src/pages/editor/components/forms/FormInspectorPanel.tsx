import { useState } from "react";
import type {
  FormWidgetConfig,
  FormFieldConfig,
  FormFieldType,
  FieldColumnWidth,
  PostSubmitActionType,
} from "../../../../types/form.types";
import { generateFieldId } from "../../../../types/form.types";
import type { PopupConfig } from "../../../../types/popup.types";

interface FormInspectorPanelProps {
  config: FormWidgetConfig;
  onChange: (updatedConfig: FormWidgetConfig) => void;
  popups?: PopupConfig[];
}

export default function FormInspectorPanel({
  config,
  onChange,
  popups = [],
}: FormInspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<"fields" | "steps" | "actions" | "spam">("fields");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const updateConfig = (partial: Partial<FormWidgetConfig>) => {
    onChange({ ...config, ...partial });
  };

  const handleAddField = (type: FormFieldType = "text") => {
    const newField: FormFieldConfig = {
      id: generateFieldId(),
      name: `field_${Math.random().toString(36).substring(2, 7)}`,
      type,
      label: type === "email" ? "Email Address" : type === "tel" ? "Phone Number" : "New Field",
      placeholder: "",
      required: false,
      width: "100%",
      stepIndex: 0,
      options:
        type === "select" || type === "radio"
          ? [
              { label: "Option 1", value: "opt_1" },
              { label: "Option 2", value: "opt_2" },
            ]
          : undefined,
    };
    const updated = [...config.fields, newField];
    updateConfig({ fields: updated });
    setEditingFieldId(newField.id);
  };

  const handleUpdateField = (fieldId: string, partial: Partial<FormFieldConfig>) => {
    const updated = config.fields.map((f) => (f.id === fieldId ? { ...f, ...partial } : f));
    updateConfig({ fields: updated });
  };

  const handleDeleteField = (fieldId: string) => {
    const updated = config.fields.filter((f) => f.id !== fieldId);
    updateConfig({ fields: updated });
    if (editingFieldId === fieldId) setEditingFieldId(null);
  };

  const toggleAction = (actionType: PostSubmitActionType) => {
    const current = config.actions.activeActions || [];
    const updated = current.includes(actionType)
      ? current.filter((a) => a !== actionType)
      : [...current, actionType];
    updateConfig({ actions: { ...config.actions, activeActions: updated } });
  };

  const editingField = config.fields.find((f) => f.id === editingFieldId);

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden text-xs">
      {/* Inspector Tabs */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Form Inspector
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            {config.fields.length} Fields
          </span>
        </div>
        <input
          type="text"
          value={config.formName}
          onChange={(e) => updateConfig({ formName: e.target.value })}
          className="w-full font-bold text-sm text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none transition"
        />

        <div className="grid grid-cols-4 gap-1 mt-3 rounded-lg bg-slate-200/70 p-1 text-[11px] font-semibold">
          {[
            { id: "fields", label: "Fields" },
            { id: "steps", label: "Steps" },
            { id: "actions", label: "Actions" },
            { id: "spam", label: "Spam & UI" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setEditingFieldId(null);
              }}
              className={`py-1 rounded-md text-center transition ${
                activeTab === tab.id
                  ? "bg-white text-slate-800 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Fields Tab (F-271, F-272) */}
        {activeTab === "fields" && (
          <div>
            {editingField ? (
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 text-xs">Edit Field: {editingField.label}</span>
                  <button
                    onClick={() => setEditingFieldId(null)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    ← Back to List
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Field Label</label>
                  <input
                    type="text"
                    value={editingField.label}
                    onChange={(e) => handleUpdateField(editingField.id, { label: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Form Data Key (name)
                  </label>
                  <input
                    type="text"
                    value={editingField.name}
                    onChange={(e) => handleUpdateField(editingField.id, { name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Field Type</label>
                    <select
                      value={editingField.type}
                      onChange={(e) =>
                        handleUpdateField(editingField.id, { type: e.target.value as FormFieldType })
                      }
                      className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                    >
                      <option value="text">Text Input</option>
                      <option value="email">Email Address</option>
                      <option value="tel">Telephone / Phone</option>
                      <option value="textarea">Textarea (Multiline)</option>
                      <option value="select">Dropdown Select</option>
                      <option value="radio">Radio Buttons</option>
                      <option value="checkbox">Checkbox (Single/Consent)</option>
                      <option value="number">Number</option>
                      <option value="date">Date Picker</option>
                      <option value="hidden">Hidden Input</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Column Width</label>
                    <select
                      value={editingField.width}
                      onChange={(e) =>
                        handleUpdateField(editingField.id, { width: e.target.value as FieldColumnWidth })
                      }
                      className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                    >
                      <option value="100%">100% (Full Row)</option>
                      <option value="50%">50% (Half Row)</option>
                      <option value="33.33%">33.33% (1/3 Row)</option>
                      <option value="66.66%">66.66% (2/3 Row)</option>
                      <option value="25%">25% (1/4 Row)</option>
                      <option value="75%">75% (3/4 Row)</option>
                      <option value="20%">20% (1/5 Row)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={editingField.placeholder || ""}
                    onChange={(e) => handleUpdateField(editingField.id, { placeholder: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={editingField.required}
                    onChange={(e) => handleUpdateField(editingField.id, { required: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <span className="font-semibold text-slate-700">Required Field</span>
                </label>

                {/* Validation Regex & Error Message (F-272) */}
                <div className="border-t border-slate-200 pt-2 space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Custom Regex Pattern (Optional)
                    </label>
                    <input
                      type="text"
                      value={editingField.validationRegex || ""}
                      onChange={(e) =>
                        handleUpdateField(editingField.id, { validationRegex: e.target.value })
                      }
                      placeholder="^[A-Z0-9]{5,10}$"
                      className="w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Custom Error Message
                    </label>
                    <input
                      type="text"
                      value={editingField.customErrorMessage || ""}
                      onChange={(e) =>
                        handleUpdateField(editingField.id, { customErrorMessage: e.target.value })
                      }
                      placeholder="Please enter a valid code"
                      className="w-full rounded-lg border border-slate-300 p-1.5 text-xs"
                    />
                  </div>
                </div>

                {/* Select / Radio Options */}
                {(editingField.type === "select" || editingField.type === "radio") && (
                  <div className="border-t border-slate-200 pt-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Options (Label : Value)
                    </label>
                    <div className="space-y-1.5">
                      {editingField.options?.map((opt, idx) => (
                        <div key={idx} className="flex gap-1.5">
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => {
                              const newOpts = [...(editingField.options || [])];
                              newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                              handleUpdateField(editingField.id, { options: newOpts });
                            }}
                            placeholder="Label"
                            className="flex-1 rounded border border-slate-300 p-1 text-xs"
                          />
                          <input
                            type="text"
                            value={opt.value}
                            onChange={(e) => {
                              const newOpts = [...(editingField.options || [])];
                              newOpts[idx] = { ...newOpts[idx], value: e.target.value };
                              handleUpdateField(editingField.id, { options: newOpts });
                            }}
                            placeholder="Value"
                            className="w-24 rounded border border-slate-300 p-1 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = (editingField.options || []).filter((_, i) => i !== idx);
                              handleUpdateField(editingField.id, { options: newOpts });
                            }}
                            className="text-red-500 hover:text-red-700 px-1 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = [
                            ...(editingField.options || []),
                            {
                              label: `Option ${(editingField.options?.length || 0) + 1}`,
                              value: `opt_${(editingField.options?.length || 0) + 1}`,
                            },
                          ];
                          handleUpdateField(editingField.id, { options: newOpts });
                        }}
                        className="text-blue-600 hover:underline font-bold text-[11px] mt-1"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Configured Fields
                  </span>
                  <button
                    onClick={() => handleAddField("text")}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                  >
                    + Add Field
                  </button>
                </div>

                <div className="space-y-2">
                  {config.fields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 hover:border-slate-300 transition"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{field.label}</span>
                          {field.required && <span className="text-red-500 font-bold">*</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span className="capitalize">{field.type}</span>
                          <span>•</span>
                          <span>{field.width}</span>
                          {config.isMultiStep && (
                            <>
                              <span>•</span>
                              <span>Step {(field.stepIndex ?? 0) + 1}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingFieldId(field.id)}
                          className="rounded p-1 text-slate-600 hover:text-blue-600"
                          title="Edit Field"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          disabled={config.fields.length <= 1}
                          className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                          title="Delete Field"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Steps Tab (F-275) */}
        {activeTab === "steps" && (
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer border-b border-slate-100 pb-3">
              <div>
                <span className="font-bold text-slate-800 block">Multi-Step Form Mode</span>
                <span className="text-[11px] text-slate-500">
                  Break long forms into interactive wizard steps
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.isMultiStep}
                onChange={(e) => updateConfig({ isMultiStep: e.target.checked })}
                className="h-4 w-4 rounded text-blue-600"
              />
            </label>

            {config.isMultiStep && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                    Form Steps ({config.steps.length})
                  </span>
                  <button
                    onClick={() => {
                      const newStepIndex = config.steps.length;
                      const newStep = {
                        stepIndex: newStepIndex,
                        title: `Step ${newStepIndex + 1}`,
                        description: "",
                      };
                      updateConfig({ steps: [...config.steps, newStep] });
                    }}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {config.steps.map((step, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Step {idx + 1}</span>
                        {config.steps.length > 2 && (
                          <button
                            onClick={() => {
                              const updatedSteps = config.steps
                                .filter((_, i) => i !== idx)
                                .map((s, i) => ({ ...s, stepIndex: i }));
                              updateConfig({ steps: updatedSteps });
                            }}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const updated = [...config.steps];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          updateConfig({ steps: updated });
                        }}
                        placeholder="Step Title"
                        className="w-full rounded border border-slate-300 p-1.5 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        value={step.description || ""}
                        onChange={(e) => {
                          const updated = [...config.steps];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          updateConfig({ steps: updated });
                        }}
                        placeholder="Step description (optional)"
                        className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions After Submit Tab (F-276, F-280, F-281) */}
        {activeTab === "actions" && (
          <div className="space-y-4">
            <div>
              <span className="block font-bold text-slate-800 mb-1">Post-Submit Actions</span>
              <p className="text-[11px] text-slate-500 mb-3">
                Choose what happens when visitors submit this form
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "database", label: "Save to Leads DB" },
                  { id: "email", label: "Email Notification" },
                  { id: "redirect", label: "Redirect to URL" },
                  { id: "popup", label: "Open Popup Modal" },
                  { id: "webhook", label: "Send Webhook (Zapier/Make)" },
                ].map((act) => {
                  const isActive = config.actions.activeActions.includes(act.id as any);
                  return (
                    <button
                      key={act.id}
                      onClick={() => toggleAction(act.id as PostSubmitActionType)}
                      className={`p-2 rounded-xl border text-left font-semibold transition ${
                        isActive
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      {act.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Action Config (F-280) */}
            {config.actions.activeActions.includes("email") && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <h4 className="font-bold text-slate-800">Email Notification Settings</h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Send to Email:
                  </label>
                  <input
                    type="email"
                    value={config.actions.emailConfig?.toEmail || ""}
                    onChange={(e) =>
                      updateConfig({
                        actions: {
                          ...config.actions,
                          emailConfig: {
                            ...(config.actions.emailConfig || { includeMetadata: true, subject: "New Lead" }),
                            toEmail: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="admin@yourcompany.com"
                    className="w-full rounded border border-slate-300 p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Email Subject:
                  </label>
                  <input
                    type="text"
                    value={config.actions.emailConfig?.subject || ""}
                    onChange={(e) =>
                      updateConfig({
                        actions: {
                          ...config.actions,
                          emailConfig: {
                            ...(config.actions.emailConfig || { toEmail: "", includeMetadata: true }),
                            subject: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="New Website Lead"
                    className="w-full rounded border border-slate-300 p-1.5 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Redirect Action Config */}
            {config.actions.activeActions.includes("redirect") && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <h4 className="font-bold text-slate-800">Redirect Settings</h4>
                <input
                  type="text"
                  value={config.actions.redirectConfig?.url || ""}
                  onChange={(e) =>
                    updateConfig({
                      actions: {
                        ...config.actions,
                        redirectConfig: {
                          openInNewTab: config.actions.redirectConfig?.openInNewTab || false,
                          url: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="https://example.com/thank-you"
                  className="w-full rounded border border-slate-300 p-1.5 text-xs font-mono"
                />
              </div>
            )}

            {/* Popup Action Config (F-279) */}
            {config.actions.activeActions.includes("popup") && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <h4 className="font-bold text-slate-800">Open Popup Modal</h4>
                <select
                  value={config.actions.popupConfig?.popupId || ""}
                  onChange={(e) =>
                    updateConfig({
                      actions: {
                        ...config.actions,
                        popupConfig: { popupId: e.target.value },
                      },
                    })
                  }
                  className="w-full rounded border border-slate-300 p-1.5 text-xs"
                >
                  <option value="">-- Select a Popup to Open --</option>
                  {popups.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Webhook Action Config (F-281) */}
            {config.actions.activeActions.includes("webhook") && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <h4 className="font-bold text-slate-800">Webhook Integration</h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Endpoint URL (POST JSON):
                  </label>
                  <input
                    type="text"
                    value={config.actions.webhookConfig?.endpointUrl || ""}
                    onChange={(e) =>
                      updateConfig({
                        actions: {
                          ...config.actions,
                          webhookConfig: {
                            ...(config.actions.webhookConfig || {}),
                            endpointUrl: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="w-full rounded border border-slate-300 p-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Secret Key / Header Token (Optional):
                  </label>
                  <input
                    type="text"
                    value={config.actions.webhookConfig?.secretKey || ""}
                    onChange={(e) =>
                      updateConfig({
                        actions: {
                          ...config.actions,
                          webhookConfig: {
                            ...(config.actions.webhookConfig || { endpointUrl: "" }),
                            secretKey: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Secret Key Header"
                    className="w-full rounded border border-slate-300 p-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* Custom Messages */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <label className="block font-bold text-slate-700">Success Message</label>
              <textarea
                rows={2}
                value={config.actions.successMessage}
                onChange={(e) =>
                  updateConfig({ actions: { ...config.actions, successMessage: e.target.value } })
                }
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>
          </div>
        )}

        {/* Spam & UI Tab (F-277) */}
        {activeTab === "spam" && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800">Spam Protection & Security</h4>

            <label className="flex items-center justify-between cursor-pointer border-b border-slate-100 pb-3">
              <div>
                <span className="font-bold text-slate-800 block">Honeypot Trap Field</span>
                <span className="text-[11px] text-slate-500">
                  Invisible decoy field that blocks automated spam bots
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.spamProtection.enableHoneypot}
                onChange={(e) =>
                  updateConfig({
                    spamProtection: { ...config.spamProtection, enableHoneypot: e.target.checked },
                  })
                }
                className="h-4 w-4 rounded text-blue-600"
              />
            </label>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                IP Rate Limit (Max submissions/min)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={config.spamProtection.rateLimitPerMinute}
                onChange={(e) =>
                  updateConfig({
                    spamProtection: {
                      ...config.spamProtection,
                      rateLimitPerMinute: Number(e.target.value),
                    },
                  })
                }
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <h4 className="font-bold text-slate-800">Button Styling</h4>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Submit Button Text</label>
                <input
                  type="text"
                  value={config.submitButtonText}
                  onChange={(e) => updateConfig({ submitButtonText: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Submit Button Width</label>
                <select
                  value={config.submitButtonWidth}
                  onChange={(e) => updateConfig({ submitButtonWidth: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                >
                  <option value="100%">100% Full Width</option>
                  <option value="auto">Auto Width</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
