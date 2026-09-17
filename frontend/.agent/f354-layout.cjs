const fs = require('fs');
let file = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

file = file.replace(
    'let containerLayoutStyles: React.CSSProperties = {};',
    'let containerLayoutStyles: React.CSSProperties;'
);
fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', file);
