/**
 * @file Final dash ui: frontend/ agent module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
const fs = require('fs');

const f = fs.readFileSync('src/pages/dashboard/UserDashboard.tsx', 'utf8');

let newFile = f.replace(
    'import DeveloperApiSettings from "./components/DeveloperApiSettings";',
    'import DeveloperApiSettings from "./components/DeveloperApiSettings";\nimport ComposerPanel from "./components/ComposerPanel";'
);

newFile = newFile.replace(
    '<DeveloperApiSettings />',
    '<DeveloperApiSettings />\n            <ComposerPanel />'
);

fs.writeFileSync('src/pages/dashboard/UserDashboard.tsx', newFile);
