const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

code = code.replace(
    'customClass?: string; // Legacy\\n  customClasses?: string[]; // F-106',
    'customClass?: string; // Legacy\n  customClasses?: string[]; // F-106'
);

fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', code);
console.log("Fixed backslash");
