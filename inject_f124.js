const fs = require('fs');

let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

// 1. Insert State
const stateInjection = `  // F-124 Command Palette State
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);`;

con = con.replace(
    '  const [isBpModalOpen, setIsBpModalOpen] = useState(false);',
    `  const [isBpModalOpen, setIsBpModalOpen] = useState(false);\n\n${stateInjection}`
);

// 2. Insert Command Palette Hotkey logic
const logicInjection = `
  // F-124: Command Palette Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showCommandPalette && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCommandPalette]);

  const commandList = [
    { name: "Add Section", action: () => { handleAddElement('section'); setShowCommandPalette(false); }, icon: "⚡" },
    { name: "Add Heading", action: () => { handleAddElement('heading'); setShowCommandPalette(false); }, icon: "H" },
    { name: "Add Button", action: () => { handleAddElement('button'); setShowCommandPalette(false); }, icon: "🖱️" },
    { name: "Add Container", action: () => { handleAddElement('container'); setShowCommandPalette(false); }, icon: "📦" },
    { name: "HTML Widget", action: () => { handleAddElement('html'); setShowCommandPalette(false); }, icon: "🧑‍💻" },
    { name: "Preview Desktop", action: () => { setActiveBreakpointId('desktop'); setShowCommandPalette(false); }, icon: "💻" },
    { name: "Preview Mobile", action: () => { setActiveBreakpointId('mobile-portrait'); setShowCommandPalette(false); }, icon: "📱" },
    { name: "Publish Site", action: () => { handleSave(true); setShowCommandPalette(false); }, icon: "🚀" },
    { name: "Global CSS Settings", action: () => { setActiveSidebarTab('global'); setExpandedGlobalControls(prev => ({...prev, advanced: true})); setShowCommandPalette(false); }, icon: "🎨" },
  ].filter(c => c.name.toLowerCase().includes(commandQuery.toLowerCase()));
`;

con = con.replace(
    '  // F-110: Sync htmlContent',
    `${logicInjection}\n  // F-110: Sync htmlContent`
);


// 3. Insert Command Palette UI
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

con = con.replace(
    '{/* Top Navigation Bar */}',
    `${uiInjection}\n      {/* Top Navigation Bar */}`
);

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
console.log('Command Palette F-124 INJECTED.');
