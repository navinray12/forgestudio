/**
 * @file F354 layout: frontend/ agent module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
const fs = require('fs');
let file = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

file = file.replace(
    'let containerLayoutStyles: React.CSSProperties = {};',
    'let containerLayoutStyles: React.CSSProperties;'
);
fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', file);
