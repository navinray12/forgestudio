const fs = require('fs');
let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');
con = con.replace(`{ name: "Add Section", action: () => { handleAddElement('section'); setShowCommandPalette(false); }, icon: "⚡" },`, '');
fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
