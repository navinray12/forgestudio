const fs = require('fs');
let con = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');
con = con.replace(/\$\{websiteIdStr \|\| "active"\}/g, '${websiteId || "active"}');
fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', con);
console.log('Fixed websiteId compilation bug');
