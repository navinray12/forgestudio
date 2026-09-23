/**
 * @file F351 admins header2: frontend/ agent module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
const fs = require('fs');

['src/pages/dashboard/AdminDashboard.tsx', 'src/pages/dashboard/SuperAdminDashboard.tsx'].forEach(path => {
    let dash = fs.readFileSync(path, 'utf8');

    dash = dash.replace(
        /<\/div>([\s\r\n]*?)<\/main>/,
        '</header>$1</main>'
    );

    fs.writeFileSync(path, dash);
});
