import type { FormWidgetConfig } from "../../../../types/form.types";
import { FORM_TEMPLATES } from "../../../../types/form.types";

interface FormTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (config: FormWidgetConfig) => void;
}

export default function FormTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: FormTemplatesModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
              📋
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Form Templates Library</h2>
              <p className="text-xs text-slate-500">Choose a conversion-optimized form layout to insert</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORM_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-400 hover:shadow-lg transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                      {tmpl.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{tmpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{tmpl.description}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => {
                      onSelectTemplate(tmpl.create());
                      onClose();
                    }}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
                  >
                    Use This Template →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
