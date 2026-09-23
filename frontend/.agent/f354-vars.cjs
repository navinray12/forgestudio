const fs = require('fs');
let file = fs.readFileSync('src/pages/editor/WebsiteEditor.tsx', 'utf8');

file = file.replace(
    'label: string,\n    _styleKey?: keyof ElementStyles,\n    _layoutKey?: keyof ContainerLayout\n  ) => {',
    'label: string\n  ) => {'
);
fs.writeFileSync('src/pages/editor/WebsiteEditor.tsx', file);
