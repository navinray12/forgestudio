const fs = require('fs');
const filePath = 'frontend/src/pages/editor/WebsiteEditor.tsx';
let con = fs.readFileSync(filePath, 'utf8');

const replacementHtml = `                  {/* HTML Type Settings (F-110) */}
                  {selectedElement.type === "html" && (
                    <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                        HTML Widget Studio
                      </span>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">
                            RAW SOURCE EDITOR
                          </label>
                          {(() => {
                            const { isValid, errorMsg } = getHtmlValidity(tempHtml);
                            if (!tempHtml) return <span className="text-[9px] font-bold text-slate-400">Empty</span>;
                            if (isValid) return <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✓ Valid HTML</span>;
                            return <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded cursor-help" title={errorMsg}>⚠️ Parse Warning</span>;
                          })()}
                        </div>
                        
                        <div className="rounded-lg border border-slate-700 bg-[#0d1117] overflow-hidden shadow-inner flex flex-col">
                          <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-slate-800">
                             <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                                <span className="ml-2 text-[9px] font-mono text-slate-400">index.html</span>
                             </div>
                          </div>
                          <textarea
                            rows={12}
                            value={tempHtml}
                            onChange={(e) => setTempHtml(e.target.value)}
                            placeholder="<!-- Pro Tip: Paste custom embeddings here -->\n<section class='custom-section'>\n  <h2>My Section</h2>\n</section>"
                            className="w-full bg-transparent p-3 font-mono text-xs font-medium text-[#7ee787] outline-none leading-relaxed resize-y min-h-[150px] placeholder:text-slate-600"
                            spellCheck={false}
                          />
                        </div>
                        
                        <div className="flex items-center flex-wrap gap-1.5 pt-1">
                           <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Snippets:</span>
                           <button onClick={() => setTempHtml('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="100%" height="300" frameborder="0" allowfullscreen></iframe>')} className="px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded text-[9px] font-bold border border-slate-200 transition">▶ YouTube</button>
                           <button onClick={() => setTempHtml('<iframe src="https://www.google.com/maps/embed?pb=" width="100%" height="300" style="border:0;" allowfullscreen="" loading="lazy"></iframe>')} className="px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded text-[9px] font-bold border border-slate-200 transition">📍 Google Map</button>
                           <button onClick={() => setTempHtml('<div class="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg border border-blue-400/50 flex flex-col items-center justify-center text-center"><h3 class="text-xl font-bold mb-2">✨ Premium Feature</h3><p class="text-blue-100 text-sm opacity-90 max-w-sm">Upgrade your account to unlock this exclusive component.</p></div>')} className="px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded text-[9px] font-bold border border-slate-200 transition">✨ Promo Card</button>
                        </div>
                      </div>

                      <div className="mt-1">
                        <label className="flex items-center gap-2 cursor-pointer bg-red-50/40 hover:bg-red-50 p-2.5 rounded-lg border border-red-100 transition" title="Bypasses sanitization in preview mode">
                          <input
                             type="checkbox"
                             checked={!!selectedElement.htmlAllowScripts}
                             onChange={(e) => updateSelectedProp("htmlAllowScripts", e.target.checked)}
                             className="accent-red-600 w-3.5 h-3.5"
                          />
                          <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-red-700 leading-none mb-0.5">Allow Raw Scripts & Iframes</span>
                             <span className="text-[8px] font-semibold text-red-400">Required for dynamic embeds (Twitter, Stripe)</span>
                          </div>
                        </label>
                      </div>

                      <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setTempHtml("");
                            updateSelectedProp("htmlContent", "");
                          }}
                          className="rounded-md hover:bg-slate-100 text-slate-500 font-bold px-3 py-1.5 text-xs transition cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateSelectedProp("htmlContent", tempHtml);
                          }}
                          className="rounded-md bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 text-white font-bold px-5 py-1.5 text-[11px] transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Save & Apply</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Shortcode Type Settings (F-111) */}
                  {selectedElement.type === "shortcode" && (
                    <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1">
                        Shortcode Integrations
                      </span>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">
                            DYNAMIC SHORTCODE TAG
                          </label>
                          {(() => {
                            const { isValid, errorMsg } = getShortcodeValidity(tempShortcode);
                            if (!tempShortcode) return <span className="text-[9px] font-bold text-slate-400">Empty</span>;
                            if (isValid) return <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✓ Valid Tag</span>;
                            return <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded cursor-help" title={errorMsg}>⚠️ Malformed</span>;
                          })()}
                        </div>
                        
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">[</div>
                          <input
                            type="text"
                            value={tempShortcode.replace(/\\[|\\]/g, '')}
                            onChange={(e) => setTempShortcode(\`[\${e.target.value}]\`)}
                            placeholder="contact-form"
                            className="w-full rounded-lg border border-slate-300 bg-white p-2.5 pl-6 pr-6 font-mono text-xs font-semibold text-blue-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">]</div>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-2">
                           <span className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Available Integrations:</span>
                           <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => setTempShortcode('[contact-form]')} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] font-bold border border-slate-200 transition text-left">
                                <span className="text-blue-500 text-xs">✉️</span> Contact Form
                             </button>
                             <button onClick={() => setTempShortcode('[blog-feed]')} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] font-bold border border-slate-200 transition text-left">
                                <span className="text-orange-500 text-xs">📰</span> Latest News
                             </button>
                             <button onClick={() => setTempShortcode('[pricing-table]')} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] font-bold border border-slate-200 transition text-left">
                                <span className="text-emerald-500 text-xs">💳</span> Pricing Tiers
                             </button>
                             <button onClick={() => setTempShortcode('[user-profile]')} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md text-[10px] font-bold border border-slate-200 transition text-left">
                                <span className="text-purple-500 text-xs">👤</span> User Profile
                             </button>
                           </div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setTempShortcode("");
                            updateSelectedProp("shortcode", "");
                          }}
                          className="rounded-md hover:bg-slate-100 text-slate-500 font-bold px-3 py-1.5 text-xs transition cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateSelectedProp("shortcode", tempShortcode);
                          }}
                          className="rounded-md bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 text-white font-bold px-5 py-1.5 text-[11px] transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Save & Apply</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
`;

const startMarker = '{/* HTML Type Settings (F-110) */}';
const endMarker = '{/* 1. Layout & Spacing */}';

const startIndex = con.indexOf(startMarker);
const endIndex = con.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const before = con.substring(0, startIndex);
    const after = con.substring(endIndex);
    con = before + replacementHtml + '\n\n                    ' + after;
    fs.writeFileSync(filePath, con);
    console.log("Successfully upgraded F-110 and F-111 settings UI!");
} else {
    console.log("Could not find markers!");
}
