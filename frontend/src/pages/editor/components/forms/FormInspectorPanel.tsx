import { useState } from "react";
import type {
  FormWidgetConfig,
  FormFieldConfig,
  FormFieldType,
  FieldColumnWidth,
  PostSubmitActionType,
  FormConditionalLogic,
  ConditionalRule,
  LogicActionType,
  LogicOperator,
} from "../../../../types/form.types";
import { generateFieldId, generateLogicRuleId } from "../../../../types/form.types";
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
  const [activeTab, setActiveTab] = useState<"fields" | "steps" | "actions" | "logic" | "spam">("fields");
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

  const handleAddLogicBlock = () => {
    const firstField = config.fields[0];
    const newLogic: FormConditionalLogic = {
      id: generateLogicRuleId(),
      action: "show",
      targetFieldId: firstField?.id || "",
      matchType: "all",
      rules: [
        {
          id: generateLogicRuleId(),
          fieldId: firstField?.id || "",
          operator: "equals",
          value: "",
        },
      ],
    };
    updateConfig({ conditionalLogic: [...(config.conditionalLogic || []), newLogic] });
  };

  const handleUpdateLogicBlock = (blockId: string, partial: Partial<FormConditionalLogic>) => {
    const updated = (config.conditionalLogic || []).map((l) =>
      l.id === blockId ? { ...l, ...partial } : l
    );
    updateConfig({ conditionalLogic: updated });
  };

  const handleDeleteLogicBlock = (blockId: string) => {
    const updated = (config.conditionalLogic || []).filter((l) => l.id !== blockId);
    updateConfig({ conditionalLogic: updated });
  };

  const handleDuplicateLogicBlock = (blockId: string) => {
    const target = (config.conditionalLogic || []).find((l) => l.id === blockId);
    if (!target) return;
    const dup: FormConditionalLogic = {
      ...target,
      id: generateLogicRuleId(),
      rules: target.rules.map((r) => ({ ...r, id: generateLogicRuleId() })),
    };
    updateConfig({ conditionalLogic: [...(config.conditionalLogic || []), dup] });
  };

  const handleAddRuleToBlock = (blockId: string) => {
    const firstField = config.fields[0];
    const updated = (config.conditionalLogic || []).map((l) => {
      if (l.id !== blockId) return l;
      return {
        ...l,
        rules: [
          ...l.rules,
          {
            id: generateLogicRuleId(),
            fieldId: firstField?.id || "",
            operator: "equals" as LogicOperator,
            value: "",
          },
        ],
      };
    });
    updateConfig({ conditionalLogic: updated });
  };

  const handleUpdateRuleInBlock = (
    blockId: string,
    ruleId: string,
    partial: Partial<ConditionalRule>
  ) => {
    const updated = (config.conditionalLogic || []).map((l) => {
      if (l.id !== blockId) return l;
      return {
        ...l,
        rules: l.rules.map((r) => (r.id === ruleId ? { ...r, ...partial } : r)),
      };
    });
    updateConfig({ conditionalLogic: updated });
  };

  const handleDeleteRuleFromBlock = (blockId: string, ruleId: string) => {
    const updated = (config.conditionalLogic || []).map((l) => {
      if (l.id !== blockId) return l;
      return {
        ...l,
        rules: l.rules.filter((r) => r.id !== ruleId),
      };
    });
    updateConfig({ conditionalLogic: updated });
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

        <div className="grid grid-cols-5 gap-1 mt-3 rounded-lg bg-slate-200/70 p-1 text-[11px] font-semibold">
          {[
            { id: "fields", label: "Fields" },
            { id: "steps", label: "Steps" },
            { id: "actions", label: "Actions" },
            { id: "logic", label: "Logic" },
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
                  { id: "webhook", label: "Generic Webhook" },
                  { id: "google_sheets", label: "Google Sheets" },
                  { id: "mailchimp", label: "Mailchimp" },
                  { id: "zapier", label: "Zapier Connector" },
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

            {/* Google Sheets Connector Config */}
            {config.actions.activeActions.includes("google_sheets") && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-700 font-bold text-xs">📊 Google Sheets Real-Time Sync</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Google Web App / Sheet Webhook URL:
                  </label>
                  <input
                    type="text"
                    value={config.actions.googleSheetsConfig?.webhookUrl || ""}
                    onChange={(e) =>
                      updateConfig({
                        actions: {
                          ...config.actions,
                          googleSheetsConfig: {
                            ...(config.actions.googleSheetsConfig || {}),
                            webhookUrl: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full rounded border border-slate-300 p-1.5 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Rows will be appended automatically with matching form field slugs.
                  </p>
                </div>
              </div>
            )}

            {/* Mailchimp Connector Config */}
            {config.actions.activeActions.includes("mailchimp") && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-800 font-bold text-xs">🐵 Mailchimp Audience Sync</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Mailchimp API Key:
                    </label>
                    <input
                      type="password"
                      value={config.actions.mailchimpConfig?.apiKey || ""}
                      onChange={(e) =>
                        updateConfig({
                          actions: {
                            ...config.actions,
                            mailchimpConfig: {
                              ...(config.actions.mailchimpConfig || { listId: "" }),
                              apiKey: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="key-us1"
                      className="w-full rounded border border-slate-300 p-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Audience List ID:
                    </label>
                    <input
                      type="text"
                      value={config.actions.mailchimpConfig?.listId || ""}
                      onChange={(e) =>
                        updateConfig({
                          actions: {
                            ...config.actions,
                            mailchimpConfig: {
                              ...(config.actions.mailchimpConfig || { apiKey: "" }),
                              listId: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="e.g. 84a7e3d1c9"
                      className="w-full rounded border border-slate-300 p-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Zapier Connector Config */}
            {config.actions.activeActions.includes("zapier") && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-700 font-bold text-xs">⚡ Zapier Catch Hook</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                    Zapier Webhook Catch URL:
                  </label>
                  <input
                    type="text"
                    value={config.actions.zapierConfig?.webhookUrl || ""}
                    onChange={(e) =>
                      updateConfig({
                        actions: {
                          ...config.actions,
                          zapierConfig: {
                            ...(config.actions.zapierConfig || {}),
                            webhookUrl: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
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

        {/* Logic Tab (Conditional Logic Engine) */}
        {activeTab === "logic" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h4 className="font-bold text-slate-800 text-xs">Conditional Logic Rules</h4>
                <p className="text-[11px] text-slate-500">
                  Dynamically show, hide, or require fields based on user answers
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddLogicBlock}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 active:scale-95 transition"
              >
                <span>+</span> Add Rule
              </button>
            </div>

            {(!config.conditionalLogic || config.conditionalLogic.length === 0) ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center bg-slate-50/50">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-lg mb-2">
                  ⇄
                </div>
                <p className="text-xs font-bold text-slate-700">No conditional rules defined</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[240px] mx-auto">
                  Create "If This, Then That" rules to make your forms adaptive and high-converting.
                </p>
                <button
                  type="button"
                  onClick={handleAddLogicBlock}
                  className="mt-3.5 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition"
                >
                  <span>+</span> Create First Rule
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {config.conditionalLogic.map((logicBlock, blockIndex) => {
                  return (
                    <div
                      key={logicBlock.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3 transition hover:border-slate-300"
                    >
                      {/* Block Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-700">
                            {blockIndex + 1}
                          </span>
                          <span className="font-bold text-xs text-slate-800">Rule #{blockIndex + 1}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateLogicBlock(logicBlock.id)}
                            title="Duplicate Rule"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M7 3.5A1.5 1.5 0 018.5 2h7A1.5 1.5 0 0117 3.5v7a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 10.5v-7z" />
                              <path d="M3 7.5A1.5 1.5 0 014.5 6H5v5a3 3 0 003 3h5v.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 14.5v-7z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLogicBlock(logicBlock.id)}
                            title="Delete Rule"
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Action & Target Selector */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
                            Then Action
                          </label>
                          <select
                            value={logicBlock.action}
                            onChange={(e) =>
                              handleUpdateLogicBlock(logicBlock.id, {
                                action: e.target.value as LogicActionType,
                              })
                            }
                            className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs font-semibold text-slate-800"
                          >
                            <option value="show">Show Field</option>
                            <option value="hide">Hide Field</option>
                            <option value="require">Mark as Required</option>
                            {config.isMultiStep && <option value="skip_to_step">Skip to Step</option>}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
                            {logicBlock.action === "skip_to_step" ? "Target Step" : "Target Field"}
                          </label>
                          {logicBlock.action === "skip_to_step" ? (
                            <select
                              value={logicBlock.targetStepIndex ?? 0}
                              onChange={(e) =>
                                handleUpdateLogicBlock(logicBlock.id, {
                                  targetStepIndex: Number(e.target.value),
                                })
                              }
                              className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs font-semibold text-slate-800"
                            >
                              {(config.steps || []).map((step, idx) => (
                                <option key={idx} value={idx}>
                                  Step {idx + 1}: {step.title || `Step ${idx + 1}`}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={logicBlock.targetFieldId}
                              onChange={(e) =>
                                handleUpdateLogicBlock(logicBlock.id, {
                                  targetFieldId: e.target.value,
                                })
                              }
                              className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs font-semibold text-slate-800"
                            >
                              {config.fields.map((field) => (
                                <option key={field.id} value={field.id}>
                                  {field.label} ({field.name})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Matching Type Toggle: ALL vs ANY */}
                      <div className="flex items-center justify-between text-[11px] px-1">
                        <span className="font-semibold text-slate-600">Execute when:</span>
                        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateLogicBlock(logicBlock.id, { matchType: "all" })}
                            className={`rounded-md px-2 py-0.5 font-bold transition text-[10px] ${
                              logicBlock.matchType === "all"
                                ? "bg-white text-blue-700 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Match ALL (AND)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateLogicBlock(logicBlock.id, { matchType: "any" })}
                            className={`rounded-md px-2 py-0.5 font-bold transition text-[10px] ${
                              logicBlock.matchType === "any"
                                ? "bg-white text-blue-700 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Match ANY (OR)
                          </button>
                        </div>
                      </div>

                      {/* Conditions list */}
                      <div className="space-y-2">
                        {logicBlock.rules.map((rule) => {
                          const triggerField = config.fields.find((f) => f.id === rule.fieldId);
                          const isNoValOp = rule.operator === "is_empty" || rule.operator === "is_not_empty";

                          return (
                            <div
                              key={rule.id}
                              className="flex items-center gap-1.5 bg-slate-50/80 p-2 rounded-lg border border-slate-200/80"
                            >
                              {/* Trigger field */}
                              <select
                                value={rule.fieldId}
                                onChange={(e) =>
                                  handleUpdateRuleInBlock(logicBlock.id, rule.id, {
                                    fieldId: e.target.value,
                                  })
                                }
                                className="w-1/3 rounded border border-slate-300 bg-white p-1 text-[11px] text-slate-800 font-medium"
                              >
                                {config.fields.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>

                              {/* Operator */}
                              <select
                                value={rule.operator}
                                onChange={(e) =>
                                  handleUpdateRuleInBlock(logicBlock.id, rule.id, {
                                    operator: e.target.value as LogicOperator,
                                  })
                                }
                                className="w-1/3 rounded border border-slate-300 bg-white p-1 text-[11px] text-slate-800 font-medium"
                              >
                                <option value="equals">Equals</option>
                                <option value="not_equals">Does Not Equal</option>
                                <option value="contains">Contains</option>
                                <option value="greater_than">Greater Than</option>
                                <option value="less_than">Less Than</option>
                                <option value="is_empty">Is Empty</option>
                                <option value="is_not_empty">Is Not Empty</option>
                              </select>

                              {/* Comparison Value (if applicable) */}
                              {!isNoValOp ? (
                                triggerField?.options && triggerField.options.length > 0 ? (
                                  <select
                                    value={String(rule.value ?? "")}
                                    onChange={(e) =>
                                      handleUpdateRuleInBlock(logicBlock.id, rule.id, {
                                        value: e.target.value,
                                      })
                                    }
                                    className="flex-1 rounded border border-slate-300 bg-white p-1 text-[11px] text-slate-800"
                                  >
                                    <option value="">Select option...</option>
                                    {triggerField.options.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={triggerField?.type === "number" ? "number" : "text"}
                                    value={String(rule.value ?? "")}
                                    placeholder="Value..."
                                    onChange={(e) =>
                                      handleUpdateRuleInBlock(logicBlock.id, rule.id, {
                                        value: e.target.value,
                                      })
                                    }
                                    className="flex-1 rounded border border-slate-300 bg-white p-1 text-[11px] text-slate-800 placeholder-slate-400"
                                  />
                                )
                              ) : (
                                <span className="flex-1 text-[10px] text-slate-400 italic px-1">
                                  No value needed
                                </span>
                              )}

                              {/* Delete Condition Button */}
                              {logicBlock.rules.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRuleFromBlock(logicBlock.id, rule.id)}
                                  className="text-slate-400 hover:text-red-500 p-0.5 rounded transition"
                                  title="Remove Condition"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add condition button */}
                      <button
                        type="button"
                        onClick={() => handleAddRuleToBlock(logicBlock.id)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition"
                      >
                        <span>+</span> Add Condition (AND/OR)
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
