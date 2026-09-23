const fs = require('fs');
let f = fs.readFileSync('src/pages/dashboard/UserDashboard.tsx', 'utf8');

f = f.replace(
    /onClick=\{\(\) => navigate\(\`\/editor\/\$\{site\.id\}\`\)\}/,
    `onClick={() => navigate(\`/dashboard/cpts/\${site.id}\`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition mr-2"
                          >
                            <span>Content</span>
                        </button>
                        <button
                          onClick={() => navigate(\`/editor/\${site.id}\`)}`
);

fs.writeFileSync('src/pages/dashboard/UserDashboard.tsx', f);
