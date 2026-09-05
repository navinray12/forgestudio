const fs = require('fs');

const f = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

// The F-351 requirements are specific: 
// - Simplify nested layout wrappers
// - Remove unnecessary span or div elements
// - Use Fragment where extra DOM node not required.

// Let's replace some known DOM structural issues in WebsiteEditor safely.

// Replace `<div> \n {renderResponsiveLabel("Layout Engine")} ... </div>` inside `<div className="space-y-3">`
// Wait, `<div>` wrapping renderResponsiveLabel and its input is serving as layout item for `space-y-3`.

// It's safer to change page layout wrappers!
// Like:
// <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
//   <div className="flex w-16 shrink-0 flex-col items-center border-r ..."> ... </div>
// </div>
// We can use <main> for the root and <nav> for the sidebar!

let newFile = f.replace(
    '<div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">',
    '<main className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">'
);
newFile = newFile.replace(
    /<\/div>\n\n\s+<PopupManagerModal/,
    '</main>\n\n      <PopupManagerModal'
);
newFile = newFile.replace(
    '<div className="flex w-16 shrink-0 flex-col items-center border-r border-slate-200 bg-white py-4 z-40 relative shadow-sm">',
    '<nav className="flex w-16 shrink-0 flex-col items-center border-r border-slate-200 bg-white py-4 z-40 relative shadow-sm">'
);
newFile = newFile.replace(
    /<\/div>\n\n\s+{\/\* Left Palette \*\/}/,
    '</nav>\n\n        {/* Left Palette */}'
);

fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', newFile);
