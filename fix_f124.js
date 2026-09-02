const fs = require('fs');

let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

const faultyLogic = `  // F-124: Command Palette Keyboard Shortcuts
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

// Remove faulty logic
con = con.replace(faultyLogic, '');

// Re-inject at line 2200, but we will find `const handleAddElement` and insert after it.
const addElementRegex = /const handleAddElement = \([^)]*\) => {[\s\S]*?};\n/;
const match = con.match(addElementRegex);

if (match) {
    const fixedLogic = `
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
    { name: "Publish Site", action: () => { handleSave(); setShowCommandPalette(false); }, icon: "🚀" },
    { name: "Global Settings", action: () => { setActiveSidebarTab('global'); setShowCommandPalette(false); }, icon: "🎨" },
  ].filter(c => c.name.toLowerCase().includes(commandQuery.toLowerCase()));
`;
    con = con.replace(match[0], match[0] + fixedLogic);
}

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
console.log('Fixed typescript errors!');
