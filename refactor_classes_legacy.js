const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', 'utf8');

// Also handle the case where el.customClass exists on legacy data
code = code.replace(
    '${el.customClasses?.join(" ") || ""}',
    '${el.customClasses ? el.customClasses.join(" ") : (el.customClass || "")}'
);
code = code.replace(
    '${el.customClasses?.join(" ") || ""}',
    '${el.customClasses ? el.customClasses.join(" ") : (el.customClass || "")}'
);

// Bring back customClass to the interface so ts doesn't complain about legacy data access
code = code.replace(
    'customClasses?: string[]; // F-106',
    'customClass?: string; // Legacy\\n  customClasses?: string[]; // F-106'
);

// Map it for UI
code = code.replace(
    'const classList = selectedElement.customClasses || [];',
    'const classList = selectedElement.customClasses || (selectedElement.customClass ? selectedElement.customClass.split(" ").filter(Boolean) : []);'
);
code = code.replace(
    'const classList = selectedElement.customClasses || [];',
    'const classList = selectedElement.customClasses || (selectedElement.customClass ? selectedElement.customClass.split(" ").filter(Boolean) : []);'
);
code = code.replace(
    'selectedElement.customClasses && selectedElement.customClasses.length > 0',
    '(selectedElement.customClasses && selectedElement.customClasses.length > 0) || (selectedElement.customClass)'
);
code = code.replace(
    '{selectedElement.customClasses.map((cls, idx) => (',
    '{(selectedElement.customClasses || (selectedElement.customClass ? selectedElement.customClass.split(" ").filter(Boolean) : [])).map((cls, idx) => ('
);


fs.writeFileSync('frontend/src/pages/editor/WebsiteEditor.tsx', code);
console.log("Legacy fallback added");
