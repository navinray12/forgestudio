const fs = require('fs');

let userDash = fs.readFileSync('src/pages/dashboard/UserDashboard.tsx', 'utf8');

// Restore Composer Panel
userDash = userDash.replace(
    'import { useAuth } from "../../context/AuthContext";',
    'import { useAuth } from "../../context/AuthContext";\nimport DeveloperApiSettings from "./components/DeveloperApiSettings";\nimport ComposerPanel from "./components/ComposerPanel";'
);

userDash = userDash.replace(
    '<DeveloperApiSettings />',
    '<DeveloperApiSettings />\n            <ComposerPanel />'
);

// F-351: DOM Reduction optimizations
// 1. Convert <div className="min-h-screen bg-slate-50 p-6 sm:p-10"> to <main ...>
userDash = userDash.replace(
    '<div className="min-h-screen bg-slate-50 p-6 sm:p-10">',
    '<main className="min-h-screen bg-slate-50 p-6 sm:p-10">'
);
userDash = userDash.replace(
    '          </div>\n        </div>\n      </div>\n    );',
    '          </div>\n        </div>\n      </main>\n    );'
);

// 2. Reduce empty wrappers around dashboard widgets
// e.g. <div className="mt-10"><h2 className="...">Your Websites</h2> ... </div>
userDash = userDash.replace(
    '<div className="mt-10">\n            <h2 className="text-lg font-bold text-slate-900">Your Websites</h2>',
    '<section className="mt-10">\n            <h2 className="text-lg font-bold text-slate-900">Your Websites</h2>'
);

userDash = userDash.replace(
    /<\/div>\n\n\s+<\/div>\n\s+<\/div>\n\s+<\/main>/,
    '</section>\n        </div>\n      </main>'
);

fs.writeFileSync('src/pages/dashboard/UserDashboard.tsx', userDash);
