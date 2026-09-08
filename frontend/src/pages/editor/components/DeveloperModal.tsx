import { useState, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";
import {
  generateJSCode,
  generateTSCode,
  generateJSXCode,
  generateTSXCode,
} from "../utils/codeExporter";

export type DeveloperModalMode =
  | "element-css"
  | "css-id"
  | "css-classes"
  | "css-selectors"
  | "custom-attributes"
  | "page-css"
  | "global-css"
  | "export-code";

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: DeveloperModalMode;
  initialValue: any;
  onSave: (val: any) => void;
  title?: string;
  targetElement?: any;
}

export default function DeveloperModal({
  isOpen,
  onClose,
  mode,
  initialValue,
  onSave,
  title,
  targetElement,
}: DeveloperModalProps) {
  const [value, setValue] = useState<any>(initialValue);
  const [codeLanguage, setCodeLanguage] = useState<"js" | "ts" | "jsx" | "tsx">("tsx");
  const [copied, setCopied] = useState<boolean>(false);

  // Sync state if modal opens with a new initialValue
  useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  const getTitle = () => {
    if (title) return title;
    switch (mode) {
      case "element-css": return "Element Custom CSS";
      case "page-css": return "Page Custom CSS";
      case "global-css": return "Global Custom CSS";
      case "css-id": return "Custom CSS ID";
      case "css-classes": return "Custom CSS Classes";
      case "css-selectors": return "CSS Selectors";
      case "custom-attributes": return "Custom Attributes";
      case "export-code": return "Export Component Code (JS / TS / JSX / TSX)";
      default: return "Developer Settings";
    }
  };

  const getGeneratedCode = (): string => {
    if (!targetElement) {
      if (typeof value === "string") return value;
      return "// Select an element to view clean generated code";
    }
    switch (codeLanguage) {
      case "js": return generateJSCode(targetElement);
      case "ts": return generateTSCode(targetElement);
      case "jsx": return generateJSXCode(targetElement);
      case "tsx": return generateTSXCode(targetElement);
      default: return generateTSXCode(targetElement);
    }
  };

  const handleCopyCode = () => {
    const code = getGeneratedCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="text-blue-600">{"</>"}</span>
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex-1 min-h-[350px] flex flex-col bg-slate-50">
          {mode === "export-code" && (
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between bg-slate-200/80 p-1.5 rounded-lg border border-slate-300">
                <div className="flex items-center gap-1">
                  {(["js", "ts", "jsx", "tsx"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setCodeLanguage(lang)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase transition cursor-pointer ${
                        codeLanguage === lang
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-300/60"
                      }`}
                    >
                      {lang === "js"
                        ? "JavaScript (.js)"
                        : lang === "ts"
                        ? "TypeScript (.ts)"
                        : lang === "jsx"
                        ? "React (.jsx)"
                        : "React + TSX (.tsx)"}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-black text-xs font-bold px-3 py-1.5 rounded-md transition shadow-xs cursor-pointer"
                >
                  <span>{copied ? "✓ Copied!" : "📋 Copy Code"}</span>
                </button>
              </div>

              <div className="flex-1 border border-slate-300 rounded-lg overflow-hidden bg-slate-900">
                <MonacoEditor
                  height="340px"
                  language={codeLanguage === "js" || codeLanguage === "ts" ? "typescript" : "javascript"}
                  theme="vs-dark"
                  value={getGeneratedCode()}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                  }}
                />
              </div>
            </div>
          )}

          {["element-css", "page-css", "global-css"].includes(mode) && (
            <div className="flex-1 flex flex-col border border-slate-300 rounded-lg overflow-hidden bg-white">
              <MonacoEditor
                height="300px"
                language="css"
                theme="vs-dark"
                value={typeof value === 'string' ? value : ""}
                onChange={(val: string | undefined) => setValue(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                }}
              />
            </div>
          )}

          {mode === "css-id" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">CSS ID (without #)</label>
              <input
                type="text"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. hero-section"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                A unique identifier for this element. Used for anchor links and deep targeting.
              </p>
            </div>
          )}

          {mode === "css-classes" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">CSS Classes (space separated)</label>
              <input
                type="text"
                value={typeof value === "string" ? value : (Array.isArray(value) ? value.join(" ") : "")}
                onChange={(e) => setValue(e.target.value.split(" ").filter(Boolean))}
                placeholder="e.g. mb-4 shadow hover:bg-slate-100"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Attach multiple custom framework classes (like Tailwind) or global css classes.
              </p>
            </div>
          )}

          {mode === "css-selectors" && (
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-2">
                Define advanced structural CSS targets (e.g. <code>:hover</code>, <code>::before</code>, <code>&gt; div</code>) to bind to specific child or pseudo-elements.
              </p>
              <textarea
                value={typeof value === 'string' ? value : ""}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ex: &:hover .child { opacity: 1; }"
                className="w-full h-[200px] font-mono text-sm p-4 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-300 transition"
              />
            </div>
          )}

          {mode === "custom-attributes" && (
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
                  setValue([...arr, { name: "", value: "" }]);
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
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            {mode === "export-code" ? "Close" : "Cancel"}
          </button>
          {mode !== "export-code" && (
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white shadow hover:bg-blue-700 transition cursor-pointer"
            >
              Save Options
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
