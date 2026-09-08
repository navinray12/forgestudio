import { useState, useEffect } from"react";
import MonacoEditor from"@monaco-editor/react";

export type DeveloperModalMode =
  |"element-css"
  |"css-id"
  |"css-classes"
  |"css-selectors"
  |"custom-attributes"
  |"page-css"
  |"global-css";

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: DeveloperModalMode;
  initialValue: any;
  onSave: (val: any) => void;
  title?: string;
}

export default function DeveloperModal({
  isOpen,
  onClose,
  mode,
  initialValue,
  onSave,
  title,
}: DeveloperModalProps) {
  const [value, setValue] = useState<any>(initialValue);

  // Sync state if modal opens with a new initialValue
  useEffect(() => {
    setValue(initialValue ||"");
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  const getTitle = () => {
    if (title) return title;
    switch (mode) {
      case"element-css": return"Element Custom CSS";
      case"page-css": return"Page Custom CSS";
      case"global-css": return"Global Custom CSS";
      case"css-id": return"Custom CSS ID";
      case"css-classes": return"Custom CSS Classes";
      case"css-selectors": return"CSS Selectors";
      case"custom-attributes": return"Custom Attributes";
      default: return"Developer Settings";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="text-blue-600">{"</>"}</span>
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded transition"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex-1 min-h-[300px] flex flex-col bg-slate-50">
          {["element-css","page-css","global-css"].includes(mode) && (
            <div className="flex-1 flex flex-col border border-slate-300 rounded-lg overflow-hidden bg-white">
              <MonacoEditor
                height="300px"
                language="css"
                theme="vs-dark"
                value={typeof value === 'string' ? value :""}
                onChange={(val: string | undefined) => setValue(val ||"")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers:"on",
                  scrollBeyondLastLine: false,
                  wordWrap:"on",
                }}
              />
            </div>
          )}

          {mode ==="css-id" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">CSS ID (without #)</label>
              <input
                type="text"
                value={typeof value ==="string" ? value :""}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. hero-section"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                A unique identifier for this element. Used for anchor links and deep targeting.
              </p>
            </div>
          )}

          {mode ==="css-classes" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">CSS Classes (space separated)</label>
              <input
                type="text"
                value={typeof value ==="string" ? value : (Array.isArray(value) ? value.join("") :"")}
                onChange={(e) => setValue(e.target.value.split("").filter(Boolean))}
                placeholder="e.g. mb-4 shadow hover:bg-slate-100"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Attach multiple custom framework classes (like Tailwind) or global css classes.
              </p>
            </div>
          )}

          {mode ==="css-selectors" && (
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-2">
                Define advanced structural CSS targets (e.g. <code>:hover</code>, <code>::before</code>, <code>&gt; div</code>) to bind to specific child or pseudo-elements.
              </p>
              <textarea
                value={typeof value === 'string' ? value :""}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ex: &:hover .child { opacity: 1; }"
                className="w-full h-[200px] font-mono text-sm p-4 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-300 transition"
              />
            </div>
          )}

          {mode ==="custom-attributes" && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-700">DOM Attributes</label>
              {(Array.isArray(value) ? value : []).map((attr: { name: string, value: string }, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={attr.name}
                    onChange={(e) => {
                      const newArr = [...value];
                      newArr[idx].name = e.target.value;
                      setValue(newArr);
                    }}
                    placeholder="data-id"
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm font-mono"
                  />
                  <span className="text-slate-400">=</span>
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => {
                      const newArr = [...value];
                      newArr[idx].value = e.target.value;
                      setValue(newArr);
                    }}
                    placeholder="12345"
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm font-mono"
                  />
                  <button
                    className="text-red-500 font-bold px-2 hover:bg-red-50 rounded"
                    onClick={() => {
                      const newArr = [...value];
                      newArr.splice(idx, 1);
                      setValue(newArr);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="self-start text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded hover:bg-blue-100"
                onClick={() => {
                  const arr = Array.isArray(value) ? [...value] : [];
                  setValue([...arr, { name:"", value:"" }]);
                }}
              >
                + Add Attribute
              </button>
            </div>
          )}

        </div>

        <div className="flex items-center justify-end px-5 py-4 border-t border-slate-100 bg-white gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white shadow hover:bg-blue-700 transition"
          >
            Save Options
          </button>
        </div>
      </div>
    </div>
  );
}
