const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

// 1. Interface
code = code.replace('customClass?: string; // F-068', 'customClasses?: string[]; // F-106');

// 2. Usages in className
code = code.replace(/\$\{el\.customClass \|\| ""\}/g, '${el.customClasses?.join(" ") || ""}');

// 3. UI block replace
const uiBlockOld = `{selectedElement.customClass ? (
                          <div className="flex flex-wrap gap-1.5 mb-2 p-1.5 bg-slate-50/50 rounded-lg border border-slate-200/60 max-h-24 overflow-y-auto">
                            {selectedElement.customClass
                              .split(" ")
                              .filter(Boolean)
                              .map((cls, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/80 hover:bg-red-50 hover:text-red-650 hover:border-red-200/50 border border-slate-300/40 text-[9px] font-bold text-slate-700 transition cursor-pointer select-none group"
                                  onClick={() => {
                                    const classList = selectedElement.customClass?.split(" ").filter(Boolean) || [];
                                    const updated = classList.filter((_, i) => i !== idx).join(" ");
                                    updateSelectedProp("customClass", updated);
                                  }}
                                  title="Click to remove class"
                                >
                                  <span>{cls}</span>
                                  <span className="text-[10px] font-bold opacity-60 group-hover:opacity-100">×</span>
                                </span>
                              ))}
                          </div>
                        ) : null}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newClassInput}
                            onChange={(e) => {
                              const val = e.target.value
                                .replace(/\\s+/g, "-")
                                .replace(/[^a-zA-Z0-9_-]/g, "");
                              setNewClassInput(val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                const trimmed = newClassInput.replace(/\\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "").trim();
                                if (trimmed) {
                                  const classList = selectedElement.customClass ? selectedElement.customClass.split(" ").filter(Boolean) : [];
                                  if (!classList.includes(trimmed)) {
                                    const updated = [...classList, trimmed].join(" ");
                                    updateSelectedProp("customClass", updated);
                                  }
                                  setNewClassInput("");
                                }
                              }
                            }}
                            placeholder="Add class..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newClassInput.replace(/\\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "").trim();
                              if (trimmed) {
                                const classList = selectedElement.customClass ? selectedElement.customClass.split(" ").filter(Boolean) : [];
                                if (!classList.includes(trimmed)) {
                                  const updated = [...classList, trimmed].join(" ");
                                  updateSelectedProp("customClass", updated);
                                }
                                setNewClassInput("");
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition rounded-lg outline-none select-none cursor-pointer"
                          >
                            Add
                          </button>
                        </div>`;

const uiBlockNew = `{selectedElement.customClasses && selectedElement.customClasses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mb-2 p-1.5 bg-slate-50/50 rounded-lg border border-slate-200/60 max-h-24 overflow-y-auto">
                            {selectedElement.customClasses.map((cls, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-200/80 hover:bg-red-50 hover:text-red-650 hover:border-red-200/50 border border-slate-300/40 text-[9px] font-bold text-slate-700 transition cursor-pointer select-none group"
                                  onClick={() => {
                                    const classList = [...selectedElement.customClasses!];
                                    classList.splice(idx, 1);
                                    updateSelectedProp("customClasses", classList);
                                  }}
                                  title="Click to remove class"
                                >
                                  <span>{cls}</span>
                                  <span className="text-[10px] font-bold opacity-60 group-hover:opacity-100">×</span>
                                </span>
                              ))}
                          </div>
                        ) : null}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newClassInput}
                            onChange={(e) => {
                              const val = e.target.value
                                .replace(/\\s+/g, "-")
                                .replace(/[^a-zA-Z0-9_-]/g, "");
                              setNewClassInput(val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                const trimmed = newClassInput.replace(/\\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "").trim();
                                if (trimmed) {
                                  const classList = selectedElement.customClasses || [];
                                  if (!classList.includes(trimmed)) {
                                    updateSelectedProp("customClasses", [...classList, trimmed]);
                                  }
                                  setNewClassInput("");
                                }
                              }
                            }}
                            placeholder="Add class..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = newClassInput.replace(/\\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "").trim();
                              if (trimmed) {
                                const classList = selectedElement.customClasses || [];
                                if (!classList.includes(trimmed)) {
                                  updateSelectedProp("customClasses", [...classList, trimmed]);
                                }
                                setNewClassInput("");
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition rounded-lg outline-none select-none cursor-pointer"
                          >
                            Add
                          </button>
                        </div>`;

code = code.replace(uiBlockOld, uiBlockNew);

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', code);
console.log("Done");
