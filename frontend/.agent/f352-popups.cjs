/**
 * @file F352 popups: frontend/ agent module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
const fs = require('fs');
let modal = fs.readFileSync('src/pages/editor/components/PopupManagerModal.tsx', 'utf8');

modal = modal.replace(
    '<img src={tpl.previewImg} alt={tpl.name} className="w-full h-full object-cover" />',
    '<img src={tpl.previewImg} alt={tpl.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />'
);

fs.writeFileSync('src/pages/editor/components/PopupManagerModal.tsx', modal);
