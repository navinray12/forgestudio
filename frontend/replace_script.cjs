const fs = require('fs');
let code = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

const startLabel = '{/* F-107: Element Custom CSS & Selectors */}';
const endLabel = '{/* Global Custom CSS (F-104) */}';


const startIdx = code.indexOf(startLabel);
const endIdx = code.indexOf(endLabel);

if (startIdx === -1 || endIdx === -1) {
    console.log('Failed to find boundaries', startIdx, endIdx);
    process.exit(1);
}

const replacement = `
                      {/* ==== Developer Module Toolset (F-102 to F-109) ==== */}
                      {activeDeveloperModule === 'none' ? (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm mt-4 p-4">
                          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-3">Developer Tools</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setActiveDeveloperModule('css-rules')} className="flex flex-col items-center p-3 border border-indigo-100 bg-indigo-50/50 rounded-xl hover:border-indigo-400 hover:shadow-sm transition">
                              <span className="text-xl font-bold text-indigo-500">{'{ }'}</span>
                              <span className="mt-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-widest text-center">Custom CSS</span>
                            </button>
                            <button onClick={() => setActiveDeveloperModule('css-id')} className="flex flex-col items-center p-3 border border-indigo-100 bg-indigo-50/50 rounded-xl hover:border-indigo-400 hover:shadow-sm transition">
                              <span className="text-xl font-bold text-indigo-500">#</span>
                              <span className="mt-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-widest text-center">CSS ID</span>
                            </button>
                            <button onClick={() => setActiveDeveloperModule('css-classes')} className="flex flex-col items-center p-3 border border-indigo-100 bg-indigo-50/50 rounded-xl hover:border-indigo-400 hover:shadow-sm transition">
                              <span className="text-xl font-bold text-indigo-500">.</span>
                              <span className="mt-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-widest text-center">Classes</span>
                            </button>
                            <button onClick={() => setActiveDeveloperModule('attributes')} className="flex flex-col items-center p-3 border border-indigo-100 bg-indigo-50/50 rounded-xl hover:border-indigo-400 hover:shadow-sm transition">
                              <span className="text-xl font-bold text-indigo-500">="</span>
                              <span className="mt-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-widest text-center">Attributes</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm mt-4 p-4">
                          <button onClick={() => setActiveDeveloperModule('none')} className="mb-4 text-xs font-bold text-blue-600 hover:underline flex items-center justify-start">
                            &larr; Back to Dev Tools
                          </button>
                          
                          {activeDeveloperModule === 'css-rules' && (() => {
                            const legacyCss = getStyleVal(selectedElement, 'customCss', activeBreakpointId, breakpoints) || '';
                            const rules: { id: string, selector: string, css: string }[] = getStyleVal(selectedElement, 'customCssRules', activeBreakpointId, breakpoints) || [];
                            const validLegacy = legacyCss === '' || (legacyCss.match(/\\{/g) || []).length === (legacyCss.match(/\\}/g) || []).length;
                            return (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-semibold text-slate-700">CSS Selectors (F-107)</label>
                                  <button onClick={() => {
                                      const newRule = { id: generateId(), selector: '&', css: '' };
                                      updateSelectedStyle('customCssRules', [...rules, newRule]);
                                  }} className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">
                                    + Add Rule
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  {rules.map(rule => (
                                    <div key={rule.id} className="border border-slate-700 rounded-md bg-slate-800 overflow-hidden shadow-sm">
                                      <div className="flex bg-slate-900 border-b border-slate-700 p-1.5 gap-2 items-center">
                                        <span className="text-[10px] text-slate-400 font-mono pl-1">Target</span>
                                        <input type="text" value={rule.selector} onChange={(e) => {
                                          const updated = rules.map(r => r.id === rule.id ? { ...r, selector: e.target.value } : r);
                                          updateSelectedStyle('customCssRules', updated);
                                        }} placeholder="& (Current Element)" className="flex-1 bg-slate-900 text-[11px] text-emerald-400 font-mono outline-none border-none"/>
                                        <button onClick={() => {
                                          if (window.confirm('Delete this CSS Rule?')) {
                                            updateSelectedStyle('customCssRules', rules.filter(r => r.id !== rule.id));
                                          }
                                        }} className="text-slate-500 hover:text-red-500 px-1 font-bold">×</button>
                                      </div>
                                      <textarea value={rule.css} onChange={(e) => {
                                        const updated = rules.map(r => r.id === rule.id ? { ...r, css: e.target.value } : r);
                                        updateSelectedStyle('customCssRules', updated);
                                      }} placeholder="border-radius: 20px;" className="w-full min-h-[60px] p-2 text-[11px] font-mono bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none" spellCheck={false} />
                                    </div>
                                  ))}
                                </div>
                                {(legacyCss !== '' || rules.length === 0) && (
                                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-semibold text-slate-600">Base CSS (Standalone F-102)</span>
                                      <span className={\`text-[9px] font-bold \${legacyCss === '' ? 'text-slate-400' : validLegacy ? 'text-emerald-500' : 'text-red-500'}\`}>
                                        {legacyCss === '' ? 'Empty' : validLegacy ? '✓ Valid' : '⚠ Invalid'}
                                      </span>
                                    </div>
                                    <textarea value={legacyCss} onChange={(e) => updateSelectedStyle('customCss', e.target.value)} placeholder="/* Target: Current Element */\nborder-radius: 20px;" className="w-full min-h-[80px] p-2 text-[11px] font-mono rounded bg-slate-800 text-slate-100 border border-slate-700 placeholder-slate-500 focus:outline-none focus:border-blue-500" spellCheck={false} />
                                  </div>
                                )}
                              </div>
                            )
                          })()}

                          {activeDeveloperModule === 'css-id' && (() => {
                            const cssIdVal = selectedElement.cssId || '';
                            const isValid = cssIdVal === '' || /^[A-Za-z][A-Za-z0-9_-]*$/.test(cssIdVal);
                            let isDuplicate = false;
                            if (cssIdVal !== '') {
                              const hasDupe = (elementsList: EditorElement[]): boolean => {
                                for (const el of elementsList) {
                                  if (el.id !== selectedElement.id && el.cssId === cssIdVal) return true;
                                  if (el.children && hasDupe(el.children)) return true;
                                } return false;
                              };
                              isDuplicate = hasDupe(elements);
                            }
                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-semibold text-slate-700">CSS ID (F-105)</label>
                                  <span className={\`text-[10px] font-bold \${cssIdVal === '' ? 'text-slate-400' : isDuplicate ? 'text-amber-500' : !isValid ? 'text-red-500' : 'text-emerald-500'}\`}>
                                    {cssIdVal === '' ? 'Empty' : isDuplicate ? '⚠ Duplicate ID' : !isValid ? '✕ Invalid format' : '✓ Valid ID'}
                                  </span>
                                </div>
                                <input type="text" value={cssIdVal} onChange={(e) => {
                                  setUnifiedElements(prev => {
                                    const newTree = JSON.parse(JSON.stringify(prev));
                                    const updateCssId = (list: EditorElement[]): boolean => {
                                      for (let idx = 0; idx < list.length; idx++) {
                                        if (list[idx].id === selectedElement.id) { list[idx].cssId = e.target.value.trim(); return true; }
                                        if (list[idx].children && updateCssId(list[idx].children)) return true;
                                      } return false;
                                    };
                                    updateCssId(newTree); return newTree;
                                  });
                                }} placeholder="e.g. hero-section" className={\`w-full rounded border px-2 py-1.5 text-xs font-mono outline-none \${!isValid || isDuplicate ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-slate-300 focus:border-blue-500'}\`}/>
                                <p className="mt-1.5 text-[9px] text-slate-500 leading-tight">Give this element a unique ID.</p>
                              </div>
                            )
                          })()}

                          {activeDeveloperModule === 'css-classes' && (() => {
                            return (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-[11px] font-semibold text-slate-700">CSS Classes (F-106)</label>
                                  <span className="text-[10px] text-slate-500 font-semibold">{selectedElement.cssClasses?.length || 0} classes</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {selectedElement.cssClasses?.map(cls => (
                                    <span key={cls} className="flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">
                                      {cls}
                                      <button onClick={() => {
                                        setUnifiedElements(prev => {
                                          const newTree = JSON.parse(JSON.stringify(prev));
                                          const removeCls = (list: EditorElement[]): boolean => {
                                            for (let idx = 0; idx < list.length; idx++) {
                                              if (list[idx].id === selectedElement.id) { list[idx].cssClasses = list[idx].cssClasses?.filter((c: string) => c !== cls) || []; return true; }
                                              if (list[idx].children && removeCls(list[idx].children)) return true;
                                            } return false;
                                          };
                                          removeCls(newTree); return newTree;
                                        });
                                      }} className="text-slate-500 hover:text-red-500 font-bold ml-1 text-xs">×</button>
                                    </span>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <input type="text" value={tempCssClass} onChange={(e) => setTempCssClass(e.target.value)} onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = tempCssClass.trim();
                                      if (!val) return;
                                      if (!/^[A-Za-z_-][A-Za-z0-9_-]*$/.test(val)) { alert('Invalid class syntax'); return; }
                                      if (selectedElement.cssClasses?.includes(val)) return;
                                      setUnifiedElements(prev => {
                                        const newTree = JSON.parse(JSON.stringify(prev));
                                        const addCls = (list: EditorElement[]): boolean => {
                                          for (let idx = 0; idx < list.length; idx++) {
                                            if (list[idx].id === selectedElement.id) { list[idx].cssClasses = [...(list[idx].cssClasses || []), val]; return true; }
                                            if (list[idx].children && addCls(list[idx].children)) return true;
                                          } return false;
                                        };
                                        addCls(newTree); return newTree;
                                      });
                                      setTempCssClass('');
                                    }
                                  }} placeholder="e.g. margin-auto" className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs font-mono outline-none"/>
                                  <button onClick={() => {
                                    const val = tempCssClass.trim();
                                    if (!val) return;
                                    setUnifiedElements(prev => {
                                      const newTree = JSON.parse(JSON.stringify(prev));
                                      const addCls = (list: EditorElement[]): boolean => {
                                        for (let idx = 0; idx < list.length; idx++) {
                                          if (list[idx].id === selectedElement.id) { list[idx].cssClasses = [...(list[idx].cssClasses || []), val]; return true; }
                                          if (list[idx].children && addCls(list[idx].children)) return true;
                                        } return false;
                                      };
                                      addCls(newTree); return newTree;
                                    });
                                    setTempCssClass('');
                                  }} className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white">Add</button>
                                </div>
                              </div>
                            )
                          })()}

                          {activeDeveloperModule === 'attributes' && (() => {
                            const customAttrs = selectedElement.customAttributes || [];
                            return (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-semibold text-slate-700">Custom Attributes (F-108/F-109)</label>
                                  <button onClick={() => {
                                    setUnifiedElements(prev => {
                                      const newTree = JSON.parse(JSON.stringify(prev));
                                      const addAttr = (list: EditorElement[]): boolean => {
                                        for (let idx = 0; idx < list.length; idx++) {
                                          if (list[idx].id === selectedElement.id) { list[idx].customAttributes = [...(list[idx].customAttributes || []), {name:'', value:'', enabled:true}]; return true; }
                                          if (list[idx].children && addAttr(list[idx].children)) return true;
                                        } return false;
                                      }; addAttr(newTree); return newTree;
                                    });
                                  }} className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200">+ Add Attr</button>
                                </div>
                                <div className="space-y-2">
                                  {customAttrs.map((attr, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                      <input type="checkbox" checked={attr.enabled !== false} onChange={(e) => {
                                        setUnifiedElements(prev => {
                                          const newTree = JSON.parse(JSON.stringify(prev));
                                          const setEnabled = (list: EditorElement[]): boolean => {
                                            for (let i = 0; i < list.length; i++) {
                                              if (list[i].id === selectedElement.id) { list[i].customAttributes[idx].enabled = e.target.checked; return true; }
                                              if (list[i].children && setEnabled(list[i].children)) return true;
                                            } return false;
                                          }; setEnabled(newTree); return newTree;
                                        });
                                      }} className="mr-1"/>
                                      <input type="text" placeholder="key (target)" value={attr.name} onChange={(e) => {
                                        setUnifiedElements(prev => {
                                          const newTree = JSON.parse(JSON.stringify(prev));
                                          const setName = (list: EditorElement[]): boolean => {
                                            for (let i = 0; i < list.length; i++) {
                                              if (list[i].id === selectedElement.id) { list[i].customAttributes[idx].name = e.target.value.toLowerCase().trim(); return true; }
                                              if (list[i].children && setName(list[i].children)) return true;
                                            } return false;
                                          }; setName(newTree); return newTree;
                                        });
                                      }} className="flex-1 rounded border border-slate-300 px-1.5 py-1 text-[11px] font-mono outline-none w-1/3"/>
                                      <input type="text" placeholder="value (_blank)" value={attr.value} onChange={(e) => {
                                        setUnifiedElements(prev => {
                                          const newTree = JSON.parse(JSON.stringify(prev));
                                          const setVal = (list: EditorElement[]): boolean => {
                                            for (let i = 0; i < list.length; i++) {
                                              if (list[i].id === selectedElement.id) { list[i].customAttributes[idx].value = e.target.value; return true; }
                                              if (list[i].children && setVal(list[i].children)) return true;
                                            } return false;
                                          }; setVal(newTree); return newTree;
                                        });
                                      }} className="flex-[1.5] rounded border border-slate-300 px-1.5 py-1 text-[11px] font-mono outline-none"/>
                                      <button onClick={() => {
                                        setUnifiedElements(prev => {
                                          const newTree = JSON.parse(JSON.stringify(prev));
                                          const remVal = (list: EditorElement[]): boolean => {
                                            for (let i = 0; i < list.length; i++) {
                                              if (list[i].id === selectedElement.id) { list[i].customAttributes = list[i].customAttributes.filter((_, localIdx) => localIdx !== idx); return true; }
                                              if (list[i].children && remVal(list[i].children)) return true;
                                            } return false;
                                          }; remVal(newTree); return newTree;
                                        });
                                      }} className="text-red-500 font-bold px-1 hover:text-red-700">×</button>
                                    </div>
                                  ))}
                                  {customAttrs.length === 0 && (
                                    <p className="text-[10px] text-slate-400 font-semibold italic text-center py-2">No custom attributes configured.</p>
                                  )}
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}
                      {/* ==== End Developer Modules ==== */}
`;

const finalCode = code.slice(0, startIdx) + replacement + code.slice(endIdx);
fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', finalCode);
console.log('Successfully injected Developer Module Grid!');
