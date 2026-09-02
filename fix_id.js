const fs = require('fs');
let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');
con = con.replace('compileScopedCss(blockContent, id, customId)', 'compileScopedCss(blockContent, elementId, customId)');
fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
