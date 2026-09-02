const fs = require('fs');

let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

// The old misleading heading icon (Hamburger menu / Drag Grip handle)
const oldIcon = `                {el.type === 'heading' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h16" />
                )`;

// The new correct Heading icon (A capitalized 'H' drawn in SVG)
const newIcon = `                {el.type === 'heading' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14M16 5v14M8 12h8" />
                )`;

con = con.replace(oldIcon, newIcon);

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
console.log('Fixed misleading drag-like icon for heading');
