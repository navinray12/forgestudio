import { useState, useEffect, useCallback, useMemo } from "react";
import MonacoEditor from "@monaco-editor/react";
import {
  generateJSCode,
  generateTSCode,
  generateJSXCode,
  generateTSXCode,
} from "../utils/codeExporter";
import {
  importCodeToElement,
  validateCodeSyntax,
  type ImportResult,
} from "../utils/codeImporter";

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
  const [editedCode, setEditedCode] = useState<string>("");
  const [applyMessage, setApplyMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Generate current canvas code for a given language
  const getCanvasGeneratedCode = useCallback(
    (lang: "js" | "ts" | "jsx" | "tsx"): string => {
      if (!targetElement) {
        if (typeof value === "string") return value;
        return "// Select an element to view and edit clean generated code";
      }
      switch (lang) {
        case "js":
          return generateJSCode(targetElement);
        case "ts":
          return generateTSCode(targetElement);
        case "jsx":
          return generateJSXCode(targetElement);
        case "tsx":
          return generateTSXCode(targetElement);
        default:
          return generateTSXCode(targetElement);
      }
    },
    [targetElement, value]
  );

  // Sync state if modal opens with a new initialValue or element
  useEffect(() => {
    setValue(initialValue || "");
    if (mode === "export-code") {
      const code = getCanvasGeneratedCode(codeLanguage);
      setEditedCode(code);
      setApplyMessage(null);
    }
  }, [initialValue, isOpen, mode, targetElement, getCanvasGeneratedCode]);

  // Handle switching language tabs in export-code mode
  const handleLanguageChange = (newLang: "js" | "ts" | "jsx" | "tsx") => {
    setCodeLanguage(newLang);
    const code = getCanvasGeneratedCode(newLang);
    setEditedCode(code);
    setApplyMessage(null);
  };

  // Reset edited code back to canvas state
  const handleResetCode = () => {
    const code = getCanvasGeneratedCode(codeLanguage);
    setEditedCode(code);
    setApplyMessage({ text: "Reset to current canvas state", type: "success" });
    setTimeout(() => setApplyMessage(null), 2500);
  };

  // Real-time AST syntax and import validation
  const validation = useMemo(() => {
    if (mode !== "export-code") return null;
    if (!editedCode.trim()) {
      return { status: "INVALID" as const, errors: ["Code is empty"], warnings: [] };
    }

    const syntaxCheck = validateCodeSyntax(editedCode, codeLanguage);
    if (!syntaxCheck.isValid) {
      return {
        status: "INVALID" as const,
        errors: syntaxCheck.errors,
        warnings: [],
      };
    }

    // Check if code can be imported cleanly
    const importPreview = importCodeToElement(editedCode, {
      existingElement: targetElement,
      language: codeLanguage,
    });

    return {
      status: importPreview.status,
      errors: importPreview.errors,
      warnings: importPreview.warnings,
    };
  }, [mode, editedCode, codeLanguage, targetElement]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (mode === "export-code") {
      handleApplyCode();
    } else {
      onSave(value);
      onClose();
    }
  };

  // Apply code to canvas
  const handleApplyCode = () => {
    if (mode !== "export-code") return;

    const result: ImportResult = importCodeToElement(editedCode, {
      existingElement: targetElement,
      language: codeLanguage,
    });

    if (!result.success || !result.element) {
      setApplyMessage({
        text: result.errors[0] || "Failed to parse code into canvas element",
        type: "error",
      });
      return;
    }

    // Successful import: push to canvas tree
    onSave(result.element);
    setApplyMessage({
      text: "Code successfully applied to canvas!",
      type: "success",
    });
    setTimeout(() => {
      onClose();
    }, 600);
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
      case "export-code": return "Dev Mode — Two-Way Code ↔ Canvas Sync";
      default: return "Developer Settings";
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(editedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="text-blue-600 font-mono font-black">{"</>"}</span>
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex-1 min-h-[380px] flex flex-col bg-slate-50">
          {mode === "export-code" && (
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between bg-slate-200/80 p-1.5 rounded-lg border border-slate-300">
                <div className="flex items-center gap-1">
                  {(["tsx", "jsx", "ts", "js"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLanguageChange(lang)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase transition cursor-pointer ${
                        codeLanguage === lang
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-300/60"
                      }`}
                    >
                      {lang === "tsx"
                        ? "React TSX (.tsx)"
                        : lang === "jsx"
                        ? "React JSX (.jsx)"
                        : lang === "ts"
                        ? "TypeScript (.ts)"
                        : "JavaScript (.js)"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Indicator Badge */}
                  {validation && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                        validation.status === "VALID"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : validation.status === "PARTIAL"
                          ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      }`}
                      title={
                        validation.errors.length > 0
                          ? validation.errors.join("\n")
                          : validation.warnings.join("\n") || "Syntax is valid"
                      }
                    >
                      <span className="w-2 h-2 rounded-full inline-block bg-current" />
                      {validation.status === "VALID"
                        ? "VALID AST"
                        : validation.status === "PARTIAL"
                        ? "PARTIAL"
                        : "SYNTAX ERROR"}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleResetCode}
                    className="flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-300/60 text-xs font-semibold px-2.5 py-1.5 rounded-md transition cursor-pointer"
                    title="Reset to current canvas state"
                  >
                    <span>🔄</span>
                    <span>Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-black text-xs font-bold px-3 py-1.5 rounded-md transition shadow-xs cursor-pointer"
                  >
                    <span>{copied ? "✓ Copied!" : "📋 Copy Code"}</span>
                  </button>
                </div>
              </div>

              {/* Editable Monaco Editor */}
              <div className="flex-1 border border-slate-300 rounded-lg overflow-hidden bg-slate-900">
                <MonacoEditor
                  height="360px"
                  language={codeLanguage === "js" || codeLanguage === "ts" ? "typescript" : "javascript"}
                  theme="vs-dark"
                  value={editedCode}
                  onChange={(val) => {
                    setEditedCode(val || "");
                    setApplyMessage(null);
                  }}
                  options={{
                    readOnly: false,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    tabSize: 2,
                    automaticLayout: true,
                  }}
                />
              </div>

              {/* Diagnostics / Alert Messages */}
              {applyMessage && (
                <div
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                    applyMessage.type === "success"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-rose-100 text-rose-800 border border-rose-200"
                  }`}
                >
                  <span>{applyMessage.type === "success" ? "✓" : "⚠️"}</span>
                  <span>{applyMessage.text}</span>
                </div>
              )}

              {validation && validation.status === "INVALID" && (
                <div className="px-3 py-2 rounded-lg text-xs bg-rose-50 text-rose-800 border border-rose-200 font-mono">
                  <div className="font-bold text-[11px] mb-1 text-rose-900 uppercase">Syntax Diagnostics:</div>
                  {validation.errors.slice(0, 3).map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              {validation && validation.status === "PARTIAL" && validation.warnings.length > 0 && (
                <div className="px-3 py-2 rounded-lg text-xs bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="font-bold">Notice:</span> {validation.warnings[0]}
                </div>
              )}
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

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-white gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            {mode === "export-code" && (
              <>
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                <span>Edits in Dev Mode sync directly back to visual canvas</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            {mode === "export-code" ? (
              <button
                onClick={handleApplyCode}
                disabled={validation?.status === "INVALID"}
                className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow transition cursor-pointer ${
                  validation?.status === "INVALID"
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <span>⚡</span>
                <span>Apply Code to Canvas</span>
              </button>
            ) : (
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
    </div>
  );
}
