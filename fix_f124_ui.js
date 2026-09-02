const fs = require('fs');

let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

const uiInjection = `
      {/* F-124: macOS style Command Palette Overlay */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-slate-900/40 backdrop-blur-sm"
             onClick={() => setShowCommandPalette(false)}>
          <div className="w-full max-w-lg bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col"
               onClick={(e) => e.stopPropagation()}
               style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
            
            <div className="relative border-b border-slate-700/50">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                ref={inputRef}
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Search commands... (e.g. Add Button, Preview)" 
                className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 py-4 pl-12 pr-4 outline-none text-lg font-medium"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50">
                <span className="px-1.5 py-0.5 border border-slate-600 rounded text-[10px] font-bold text-slate-300">ESC</span>
                <span className="text-[10px] text-slate-400 font-semibold">to close</span>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2 layout-scroll">
              {commandList.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm font-medium">No commands found.</div>
              ) : (
                commandList.map((cmd, i) => (
                  <button 
                    key={i}
                    onClick={cmd.action}
                    className="w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 rounded-lg transition-colors"
                  >
                    <span className="text-xl opacity-80">{cmd.icon}</span>
                    <span className="font-semibold text-sm">{cmd.name}</span>
                  </button>
                ))
              )}
            </div>
            <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700/50 text-xs text-slate-400 flex items-center justify-between">
              <span>Command Palette</span>
              <span><strong>Cmd/Ctrl + K</strong> to launch anytime.</span>
            </div>
          </div>
        </div>
      )}
`;

const anchor = '    <div className="flex h-screen flex-col overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans">';

if (!con.includes('macOS style Command Palette Overlay')) {
    con = con.replace(anchor, anchor + '\n' + uiInjection);
    fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
    console.log('UI injected.');
} else {
    console.log('UI already injected.');
}
