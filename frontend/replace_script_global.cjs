const fs = require('fs');
let code = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

if (!code.includes('const [activeSidebarDevModule')) {
    code = code.replace(
        'const [activeDeveloperModule, setActiveDeveloperModule]',
        'const [activeSidebarDevModule, setActiveSidebarDevModule] = useState<"none" | "global-css" | "page-css">("none");\n  const [activeDeveloperModule, setActiveDeveloperModule]'
    );
}

const startLabel = '{/* Global Custom CSS (F-104) */}';
const endLabel = '{/* Site Identity */}';

const startIdx = code.indexOf(startLabel);
const endIdx = code.indexOf(endLabel);

if (startIdx === -1 || endIdx === -1) {
    console.log('Failed to find boundaries');
    process.exit(1);
}

const replacement = `
                      {/* ==== Developer Module Toolset (F-103 to F-104) ==== */}
                      {activeSidebarDevModule === 'none' ? (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm mt-4 p-4 mb-4">
                          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-3">Global / Page Styles</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setActiveSidebarDevModule('global-css')} className="flex flex-col items-center p-3 border border-indigo-100 bg-indigo-50/50 rounded-xl hover:border-indigo-400 hover:shadow-sm transition">
                              <span className="text-xl font-bold text-indigo-500">🌍</span>
                              <span className="mt-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-widest text-center">Global CSS</span>
                            </button>
                            <button onClick={() => setActiveSidebarDevModule('page-css')} className="flex flex-col items-center p-3 border border-blue-100 bg-blue-50/50 rounded-xl hover:border-blue-400 hover:shadow-sm transition">
                              <span className="text-xl font-bold text-blue-500">📄</span>
                              <span className="mt-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-widest text-center">Page CSS</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm mt-4 p-4 mb-4">
                          <button onClick={() => setActiveSidebarDevModule('none')} className="mb-4 text-xs font-bold text-blue-600 hover:underline flex items-center justify-start">
                            &larr; Back to Settings
                          </button>
                          
                          {activeSidebarDevModule === 'global-css' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-tighter">Global Custom CSS</h3>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-500">Applies to all pages</span>
                                  {(() => {
                                    const cssValue = globalSettings.globalCustomCss || '';
                                    const openBraces = (cssValue.match(/\\{/g) || []).length;
                                    const closeBraces = (cssValue.match(/\\}/g) || []).length;
                                    const isValid = openBraces === closeBraces;
                                    return (
                                      <span className={\`text-[10px] font-bold \${cssValue === '' ? 'text-slate-400' : isValid ? 'text-emerald-500' : 'text-red-500'}\`}>
                                        {cssValue === '' ? 'Empty' : isValid ? '✓ Valid CSS' : '⚠ Invalid CSS'}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <textarea
                                  value={globalSettings.globalCustomCss || ''}
                                  onChange={(e) => setGlobalSettings((prev: any) => ({ ...prev, globalCustomCss: e.target.value }))}
                                  placeholder="/* Write custom CSS for the entire website */\nbody {\n  font-family: 'Inter', sans-serif;\n}"
                                  className="w-full min-h-[150px] p-2 text-[11px] font-mono rounded bg-slate-800 text-slate-100 border border-slate-700 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                  spellCheck={false}
                                />
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] text-slate-500 font-semibold max-w-[140px] leading-tight">💡 Scoped to website content only.</span>
                                  <button
                                    onClick={() => {
                                      if (globalSettings.globalCustomCss && window.confirm('Remove all global custom CSS from this website?')) {
                                        setGlobalSettings((prev: any) => ({ ...prev, globalCustomCss: '' }));
                                      }
                                    }}
                                    className={\`text-[10px] font-bold hover:underline \${globalSettings.globalCustomCss ? 'text-red-500 cursor-pointer' : 'text-slate-400 cursor-not-allowed'}\`}
                                    disabled={!globalSettings.globalCustomCss}
                                  >Reset CSS</button>
                                </div>
                              </div>
                            </div>
                          )}

                          {activeSidebarDevModule === 'page-css' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold text-blue-700">Page Custom CSS</h3>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase font-bold text-slate-500">Page: {activePage.name}</span>
                                  {(() => {
                                    const cssValue = activePage.customCss || '';
                                    const openBraces = (cssValue.match(/\\{/g) || []).length;
                                    const closeBraces = (cssValue.match(/\\}/g) || []).length;
                                    const isValid = openBraces === closeBraces;
                                    return (
                                      <span className={\`text-[10px] font-bold \${cssValue === '' ? 'text-slate-400' : isValid ? 'text-emerald-500' : 'text-red-500'}\`}>
                                        {cssValue === '' ? 'Empty' : isValid ? '✓ Valid CSS' : '⚠ Invalid CSS'}
                                      </span>
                                    );
                                  })()}
                                </div>
                                <textarea
                                  value={activePage.customCss || ''}
                                  onChange={(e) => setPages((prev) => prev.map((p) => p.id === activePageId ? { ...p, customCss: e.target.value } : p))}
                                  placeholder={\`/* Write custom CSS specifically for \${activePage.name} */\n.hero-title {\n  letter-spacing: 2px;\n}\`}
                                  className="w-full min-h-[150px] p-2 text-[11px] font-mono rounded bg-slate-800 text-slate-100 border border-slate-700 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                  spellCheck={false}
                                />
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] text-slate-500 font-semibold">💡 Applied only to this page.</span>
                                  <button
                                    onClick={() => {
                                      if (activePage.customCss && window.confirm(\`Remove all custom CSS from the \${activePage.name} page?\`)) {
                                        setPages((prev) => prev.map((p) => p.id === activePageId ? { ...p, customCss: '' } : p));
                                      }
                                    }}
                                    className={\`text-[10px] font-bold hover:underline \${activePage.customCss ? 'text-red-500 cursor-pointer' : 'text-slate-400 cursor-not-allowed'}\`}
                                    disabled={!activePage.customCss}
                                  >Reset CSS</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
`;

const finalCode = code.slice(0, startIdx) + replacement + code.slice(endIdx);
fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', finalCode);
console.log('Successfully injected Global and Page CSS UI grids!');
